const express = require("express");
const session = require("express-session");
const app = express();
const path = require("path");

// Establishes port using .env file or default
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
    min: 2,
    max: 10,
  },
});

// Test the connection
knex
  .raw("SELECT 1")
  .then(() => console.log("Database connection successful!"))
  .catch((err) => console.error("Database connection failed:", err));

// Middleware to check if a user is authenticated
function isAuthenticated(req, res, next) {
  if (req.session && req.session.isLoggedIn) return next();
  res.redirect("/login");
}

// Routes

// Landing Page Route (GET)
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to Turtle Shelter" });
});

// Login Page Route (GET)
app.get("/login", (req, res) => {
  res.render("login", { title: "Admin Login", errorMessage: null });
});

// Login Submit Route (POST)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const admin = await knex("admins").where({ username }).first();
    if (admin && admin.password === password) {
      req.session.isLoggedIn = true;
      req.session.username = admin.username;
      res.redirect("/admin");
    } else {
      res.render("login", { title: "Admin Login", errorMessage: "Invalid username or password." });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).render("login", { title: "Admin Login", errorMessage: "An error occurred." });
  }
});

// Admin Page Route
app.get("/admin", isAuthenticated, async (req, res) => {
  try {
    const admins = await knex("admins").select("*").orderBy("adminid", "asc");
    res.render("admin", { title: "Admin Dashboard", admins });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Failed to log out.");
    res.redirect("/login");
  });
});

// Error Handling
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Start Server
app.listen(port, () => console.log(`Server is running on port ${port}!`));