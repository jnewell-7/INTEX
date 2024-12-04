// Proper app variable creation
const express = require("express");
const session = require("express-session");
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

// Session configuration for user authentication
app.use(
  session({
    secret: "turtle_shelter_secret", // Replace with a secure secret in production
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 1000 * 60 * 60 }, // 1-hour session lifespan
  })
);

// Connect to PostgreSQL using Knex object
const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || "awseb-e-it3xmpabbx-stack-awsebrdsdatabase-5vjxonr0zyvk.chiykskmafi4.us-east-1.rds.amazonaws.com",
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

// Middleware to check if a user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isLoggedIn) {
    return next();
  }
  res.redirect("/login");
}

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
      req.session.isLoggedIn = true; // Mark user as logged in
      req.session.username = admin.username; // Store username in session
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

// Admin Page Route (Protected)
app.get("/admin", isAuthenticated, async (req, res) => {
  try {
    // Fetch admin data
    const admins = await knex("admins").select(
      "adminid",
      "username",
      "password",
      "firstname",
      "lastname",
      "email",
      "phonenumber"
    );

    // Fetch event request data
    const eventRequests = await knex("eventrequests").select(
      "requestid",
      "eventdate",
      "zipcode",
      "estimatedattendance",
      "activitytype",
      "contactfirstname",
      "contactlastname",
      "contactemail",
      "contactphone",
      "proposedeventaddress",
      "jenstoryrequest",
      "eventreqstatus"
    );

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

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error during logout:", err);
      return res.status(500).send("Failed to log out.");
    }
    res.redirect("/login");
  });
});

// Edit Admin (Update/Delete) Route
app.post("/editAdmin", isAuthenticated, async (req, res) => {
  const actions = Object.entries(req.body);

  try {
    for (const [action, value] of actions) {
      if (action.startsWith("update_")) {
        const adminid = action.split("_")[1];
        const updatedFields = {
          username: req.body[`username_${adminid}`],
          password: req.body[`password_${adminid}`],
          firstname: req.body[`firstname_${adminid}`],
          lastname: req.body[`lastname_${adminid}`],
          email: req.body[`email_${adminid}`],
          phonenumber: req.body[`phone_${adminid}`],
        };
        await knex("admins").where({ adminid }).update(updatedFields);
      }

      if (action.startsWith("delete_")) {
        const adminid = action.split("_")[1];
        await knex("admins").where({ adminid }).del();
      }
    }
    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating admin data:", error);
    res.status(500).send("Failed to update admin data.");
  }
});

// Add Admin Route
app.post("/addAdmin", isAuthenticated, async (req, res) => {
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

app.get("/addAdmin", isAuthenticated, (req, res) => {
  res.render("addAdmin", { title: "Add New Admin" });
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
