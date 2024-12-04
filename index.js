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
    host: process.env.RDS_HOSTNAME || "awseb-e-it3xmpabbx-stack-awsebrdsdatabase-5vjxonr0zyvk.chiykskmafi4.us-east-1.rds.amazonaws.com",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "gocougs123",
    database: process.env.RDS_DB_NAME || "ebdb",
    port: process.env.RDS_PORT || 5432,
    ssl: { rejectUnauthorized: false }, // Adjust SSL as needed
  },
  pool: {
    min: 2, // Minimum connections in the pool
    max: 10, // Maximum connections in the pool
  },
});

// Test the connection
knex.raw('SELECT 1')
  .then(() => {
    console.log('Connection successful!');
    knex.destroy(); // Close the connection
  })
  .catch((err) => {
    console.error('Connection failed:', err);
    knex.destroy(); // Ensure connection is closed
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
    // Fetch admin records and event requests from the database
    const admins = await knex("admin").select("*");
    const eventRequests = await knex("eventrequest").select("*");

    // Render the admin page with fetched data
    res.render("admin", {
      title: "Admin Dashboard",
      admins: admins,
      eventRequests: eventRequests,
    });
  } catch (error) {
    console.error("Error fetching data for admin page:", error); // Log full error details
    res.status(500).send("An error occurred while loading the admin dashboard."); // Display a generic error message
  }
});

// Landing Page Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// About Get Route
app.get('/about', (req, res) => {
  res.render('about', { title: 'About - Turtle Shelter Project' });
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



// Error Handling Middleware
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Start Server
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}!`);
});