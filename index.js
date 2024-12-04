// Proper app variable creation
const express = require("express");
const app = express();
const path = require("path");

// Establishes port using .env file
const port = process.env.PORT || 3000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for form handling
app.use(express.urlencoded({ extended: true }));

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Connect to PostgreSQL using Knex object
const knex = require("knex")({
  client: "pg",
  connection: {
    host:
      process.env.RDS_HOSTNAME ||
      "awseb-e-it3xmpabbx-stack-awsebrdsdatabase-5vjxonr0zyvk.chiykskmafi4.us-east-1.rds.amazonaws.com",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "gocougs123",
    database: process.env.RDS_DB_NAME || "ebdb",
    port: process.env.RDS_PORT || 5432,
    ssl: { rejectUnauthorized: false }, // Adjust SSL as needed
  },
  pool: {
    min: 0, // Allow releasing connections when not needed
    max: 15, // Allow a maximum of 15 connections
    acquireTimeoutMillis: 30000, // Timeout if unable to acquire connection after 30 seconds
  },
});

// Test the connection
knex
  .raw("SELECT 1")
  .then(() => {
    console.log("Database connection successful!");
  })
  .catch((err) => {
    console.error("Database connection failed:", err);
  });

// Routes

// Login Page Route (GET)
app.get("/login", (req, res) => {
  res.render("login", { title: "Admin Login", errorMessage: null }); // Render login page
});

// Login Submit Route (POST)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    console.log("Received login request:", username);

    // Query the database for admin credentials
    const admin = await knex("admins").where({ username }).first();
    console.log("Admin record found:", admin);

    if (!admin) {
      console.log("Username not found");
      return res.render("login", {
        title: "Admin Login",
        errorMessage: "Invalid username or password.",
      });
    }

    if (admin.password === password) {
      console.log("Login successful!");
      res.redirect("/admin");
    } else {
      console.log("Password mismatch");
      res.render("login", {
        title: "Admin Login",
        errorMessage: "Invalid username or password.",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).render("login", {
      title: "Admin Login",
      errorMessage: "An unexpected error occurred. Please try again later.",
    });
  }
});

// Admin Page Route
app.get("/admin", async (req, res) => {
  try {
    // Fetch admin data ordered by first name
    const admins = await knex("admins").select("*").orderBy("adminid", "asc");

    // Fetch event request data (unchanged)
    const eventRequests = await knex("eventrequests").select("*");

    // Fetch volunteer data ordered by first name
    const volunteers = await knex("volunteers")
      .join("zipcodes", "volunteers.zipcode", "=", "zipcodes.zipcode")
      .select(
        "volunteers.volunteerid",
        "volunteers.volfirstname",
        "volunteers.vollastname",
        "volunteers.phone",
        "volunteers.email",
        "volunteers.sewinglevel",
        "volunteers.monthlyhours",
        "volunteers.heardaboutopportunity",
        "volunteers.zipcode",
        "zipcodes.city",
        "zipcodes.state"
      )
      .orderBy("volunteers.volfirstname", "asc");

    // Render the admin dashboard with all data
    res.render("admin", {
      title: "Admin Dashboard",
      admins,
      eventRequests,
      volunteers,
    });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

app.get("/editAdmin/:id", async (req, res) => {
  const adminid = req.params.id;

  try {
    // Fetch the admin record by ID
    const admin = await knex("admins").where({ adminid }).first();

    // If the admin record is not found, return a 404 error
    if (!admin) {
      return res.status(404).send("Admin not found.");
    }

    // Render the editAdmin page with the admin data
    res.render("editAdmin", {
      title: `Edit Admin - ${admin.firstname} ${admin.lastname}`,
      admin,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).send("Failed to load admin data.");
  }
});

// Edit Admin (Update/Delete) Route
app.post("/editAdmin", async (req, res) => {
  const {
    adminid,
    username,
    password,
    firstname,
    lastname,
    email,
    phonenumber,
  } = req.body;

  try {
    // Update the admin record in the database
    await knex("admins").where({ adminid }).update({
      username,
      password,
      firstname,
      lastname,
      email,
      phonenumber,
    });

    // Redirect back to the admin dashboard after successful update
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating admin data:", error);
    res.status(500).send("Failed to update admin data.");
  }
});

// Add Admin Route
app.post("/addAdmin", async (req, res) => {
  const { username, password, firstname, lastname, email, phone } = req.body;

  try {
    await knex("admins").insert({
      username,
      password,
      firstname,
      lastname,
      email,
      phonenumber: phone,
    });
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding new admin:", error);
    res.status(500).send("Failed to add new admin.");
  }
});

app.get("/addAdmin", (req, res) => {
  res.render("addAdmin", { title: "Add New Admin" });
});

app.post("/updateEventStatus", async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    for (const [key, value] of updates) {
      if (key.startsWith("status_")) {
        const requestid = key.split("_")[1]; // Extract request ID from the key
        await knex("eventrequests")
          .where({ requestid })
          .update({ eventreqstatus: value });
      }
    }

    res.redirect("/admin"); // Redirect back to the admin page
  } catch (error) {
    console.error("Error updating event request status:", error);
    res.status(500).send("Failed to update event request status.");
  }
});

// Landing Page Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// About Page Route
app.get("/about", (req, res) => {
  res.render("about", { title: "About - Turtle Shelter Project" });
});

// Jen's Story Page Route
app.get("/jen-story", (req, res) => {
  res.render("jen", { title: "Jen's Story" });
});

// Event Request Page Route
app.get("/help", (req, res) => {
  res.render("help", { title: "Request Event" });
});

// Donations Page Route
app.get("/donate", (req, res) => {
  res.render("donate", { title: "Donate Today" });
});

// Get Involved Route
app.get("/get-involved", (req, res) => {
  res.render("volunteer", { title: "Volunteer Today" });
});

// Error Handling Middleware
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}!`);
});
