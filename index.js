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
    acquireTimeoutMillis: 30000 // Timeout if unable to acquire connection after 30 seconds
}
});

// Test the connection
knex
  .raw("SELECT 1")
  .then(() => {
    console.log("Connection successful!");
  })
  .catch((err) => {
    console.error("Connection failed:", err);
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
    console.log("Received login request:", username, password);

    // Query the database for the admin credentials
    const admin = await knex("admin").where({ username }).first();
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
    // Fetch admin data
    const admins = await knex("admin").select(
      "adminid",
      "username",
      "password",
      "firstname",
      "lastname",
      "email",
      "phonenumber"
    );

    // Fetch event request data
    const eventRequests = await knex("eventrequest").select("*");

    // Render the admin dashboard
    res.render("admin", {
      title: "Admin Dashboard",
      admins,
      eventRequests,
    });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

app.post("/editAdmin", async (req, res) => {
  const actions = Object.entries(req.body);

  try {
    for (const [action, value] of actions) {
      if (action.startsWith("update_")) {
        const adminid = action.split("_")[1];
        const updatedFields = {
          username: req.body[`username_${adminid}`],
          password: req.body[`password_${adminid}`],
          firstname: req.body[`firstName_${adminid}`],
          lastname: req.body[`lastName_${adminid}`],
          email: req.body[`email_${adminid}`],
          phonenumber: req.body[`phone_${adminid}`],
        };
        await knex("admin").where({ adminid }).update(updatedFields);
      }

      if (action.startsWith("delete_")) {
        const adminid = action.split("_")[1];
        await knex("admin").where({ adminid }).del();
      }
    }
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating admin data:", error);
    res.status(500).send("Failed to update admin data.");
  }
});

app.post("/addAdmin", async (req, res) => {
  const { username, password, firstName, lastName, email, phone } = req.body;

  try {
    await knex("admin").insert({
      username: username,
      password: password,
      firstname: firstName,
      lastname: lastName,
      email: email,
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

// Landing Page Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// About Get Route
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

// Redirect to Real Donation Page
app.get("/realDonate", (req, res) => {
  res.redirect(
    "https://turtleshelterproject.org/checkout/donate?donatePageId=5b6a44c588251b72932df5a0"
  );
});

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
