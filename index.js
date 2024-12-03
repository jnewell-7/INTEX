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
    password: process.env.RDS_PASSWORD || "admin",
    database: process.env.RDS_DB_NAME || "intex",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_INTEX ? { rejectUnauthorized: false } : false,
  },
});



// Routes

// Landing Page Get Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// Confirmation message
app.listen(port, () => console.log(`Server is up and running on port ${port}!`));