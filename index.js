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
    min: 0,
    max: 15,
    acquireTimeoutMillis: 30000,
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

// Help Page Route
app.get("/help", (req, res) => {
  res.render("help", { title: "Request Event" });
});

// Donate Page Route
app.get("/donate", (req, res) => {
  res.render("donate", { title: "Donate Today" });
});

// Login Page Route
app.get("/login", (req, res) => {
  res.render("login", { title: "Admin Login", errorMessage: null });
});

// Login Submit Route
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
    const eventRequests = await knex("eventrequests").select("*");
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
    const events = await knex("events")
      .join("zipcodes", "events.zipcode", "=", "zipcodes.zipcode")
      .select(
        "events.eventid",
        "events.eventdate",
        "events.eventaddress",
        "events.zipcode",
        "zipcodes.city",
        "zipcodes.state",
        "events.totalparticipants",
        "events.eventstatus"
      )
      .orderBy("events.eventdate", "asc");

    res.render("admin", { title: "Admin Dashboard", admins, eventRequests, volunteers, events });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// Update Event Request Status
app.post("/updateEventStatus", async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    for (const [key, value] of updates) {
      if (key.startsWith("status_")) {
        const requestid = key.split("_")[1];

        if (value === "Completed") {
          const request = await knex("eventrequests").where({ requestid }).first();
          if (request) {
            const totalParticipants = req.body[`participants_${requestid}`] || 0;

            await knex("events").insert({
              eventid: request.requestid,
              eventdate: request.eventdate,
              eventaddress: request.proposedeventaddress,
              eventstatus: value,
              totalparticipants: totalParticipants,
              zipcode: request.zipcode,
            });

            await knex("eventrequests").where({ requestid }).del();
          }
        } else {
          await knex("eventrequests").where({ requestid }).update({ eventreqstatus: value });
        }
      }
    }

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating event request status:", error);
    res.status(500).send("Failed to update event request status.");
  }
});

// Add Volunteer Route
app.post("/submitVolunteerData", async (req, res) => {
  const { first_name, last_name, phone, email, zipcode, sewing_level, monthly_hours, heard_about, city, state } = req.body;

  try {
    let zipcodeRecord = await knex("zipcodes").where({ zipcode }).first();
    if (!zipcodeRecord) {
      await knex("zipcodes").insert({ zipcode, city, state });
    }

    await knex("volunteers").insert({
      volfirstname: first_name.toUpperCase(),
      vollastname: last_name.toUpperCase(),
      phone,
      email: email.toLowerCase(),
      zipcode,
      sewinglevel: sewing_level,
      monthlyhours: parseInt(monthly_hours, 10),
      heardaboutopportunity: heard_about,
    });

    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding volunteer:", error);
    res.status(500).send("Failed to add volunteer.");
  }
});

// Add Admin Route
app.post("/addAdmin", isAuthenticated, async (req, res) => {
  const { username, password } = req.body;
  try {
    await knex("admins").insert({ username, password });
    res.redirect("/admin");
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).send("Failed to add admin.");
  }
});

// Edit Admin Route
app.post("/editAdmin/:adminid", isAuthenticated, async (req, res) => {
  const { adminid } = req.params;
  const { username, password } = req.body;
  try {
    await knex("admins").where({ adminid }).update({ username, password });
    res.redirect("/admin");
  } catch (error) {
    console.error("Error editing admin:", error);
    res.status(500).send("Failed to edit admin.");
  }
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