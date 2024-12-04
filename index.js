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
    host: process.env.RDS_HOSTNAME || "awseb-e-it3xmpabbx-stack-awsebrdsdatabase-5vjxonr0zyvk.chiykskmafi4.us-east-1.rds.amazonaws.com",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "gocougs123",
    database: process.env.RDS_DB_NAME || "ebdb",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_SSL === "true" ? { rejectUnauthorized: false } : false,
  },
  pool: {
    min: 2, // Minimum connections in the pool
    max: 10, // Maximum connections in the pool
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
    console.log("Received login request:", username, password);

    // Query the database for the admin credentials
    const admin = await knex("admin").where({ username }).first();
    console.log("Admin record found:", admin);

    if (!admin) {
      console.log("Username not found");
      return res.render("login", {
        title: "Admin Login",
        error: "Invalid username or password.",
      });
    }

    if (admin.password === password) {
      console.log("Login successful!");
      res.redirect("/admin");
    } else {
      console.log("Password mismatch");
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
  } finally {
    // Ensure the connection is released back to the pool
    knex.destroy();
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

// Jen's Story Get Route
app.get("/jen-story", (req, res) => {
  res.render("jen", { title: "Jen's Story" });
});

//request event route
app.get("/help", (req, res) => {
  res.render("help", { title: "Request Event" }); 
});

//donations
app.get("/donate", (req, res) => {
  res.render("donate", { title: "Donate Today" }); 
});

// sends user to the real donation page 
app.get("/realDonate", (req, res) => {
  res.redirect("https://turtleshelterproject.org/checkout/donate?donatePageId=5b6a44c588251b72932df5a0"); 
});


// Confirmation message
app.listen(port, () =>
  console.log(`Server is up and running on port ${port}!`)
);