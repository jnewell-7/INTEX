// Proper app variable creation
let express = require("express");
let app = express();
let path = require("path");

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
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "gocougs123",
    database: process.env.RDS_DB_NAME || "intex",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_INTEX ? { rejectUnauthorized: false } : false,
  },
});

// Routes

// Login Page Route (GET)
app.get("/login", (req, res) => {
  res.render("login", { title: "Admin Login", error: null }); // Render login page
});

// Login Submit Route (POST)
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    // Query the database for the admin credentials
    const admin = await knex("admin").where({ username }).first();

    if (!admin) {
      // Username not found
      return res.render("login", {
        title: "Admin Login",
        error: "Invalid username or password.",
      });
    }

    // Verify the password (replace with hashing in production)
    if (admin.password === password) {
      // Successful login
      res.redirect("/admin"); // Redirect to admin page or dashboard
    } else {
      // Invalid password
      res.render("login", {
        title: "Admin Login",
        error: "Invalid username or password.",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).render("login", {
      title: "Admin Login",
      error: "An unexpected error occurred. Please try again later.",
    });
  }
});

// Admin Page Route
app.get("/admin", (req, res) => {
  res.render("admin", { title: "Admin Dashboard" }); // Placeholder admin dashboard
});

// Landing Page Get Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// Confirmation message
app.listen(port, () =>
  console.log(`Server is up and running on port ${port}!`)
);