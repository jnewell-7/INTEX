const express = require("express");
const session = require("express-session");
const path = require("path");
const axios = require("axios"); // Added for external API calls

const app = express();

// Establishes port using .env file or default
const port = process.env.PORT || 3000;

// Set EJS as the view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Middleware for form handling
app.use(express.urlencoded({ extended: true }));
app.use(express.json()); // Add this to parse JSON requests

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

// FUNCTION: Fetch city/state from external API if not found in DB
async function getCityStateFromApi(zipcode) {
  const apiKey = process.env.ZIP_API_KEY || "d4af938dbc584fa1e4a4a39ad492c315"; // Set this in your EB environment
  if (!apiKey) {
    throw new Error("ZIP_API_KEY is not set. Please configure it in EB.");
  }

  // Example: Adjust the URL based on the chosen API's documentation
  const url = `http://api.positionstack.com/v1/forward
  ? access_key = d4af938dbc584fa1e4a4a39ad492c315
  & query = 1600 Pennsylvania Ave NW, Washington DC`;

  const response = await axios.get(url);
  // Adjust according to API response structure
  const { city, state } = response.data;
  return { city, state };
}

// Routes

// Landing Page Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// Route to render the volunteer form page at /volunteer
app.get("/volunteer", (req, res) => {
  res.render("volunteer", { title: "Join Us as a Volunteer" });
});

// About Page Route
app.get("/about", (req, res) => {
  res.render("about", { title: "About - Turtle Shelter Project" });
});

// Jen's Story Page Get Route
app.get("/jen-story", (req, res) => {
  res.render("jen", { title: "Jen's Story" });
});

// Get Involved Page Get Route
app.get("/get-involved", (req, res) => {
  res.render("get-involved", {
    title: "Get Involved - Turtle Shelter Project",
  });
});

// Event Request Page Route
app.get("/reqEvent", (req, res) => {
  res.render("reqEvent", { title: "Request Event" });
});

app.post("/submitEventRequest", async (req, res) => {
  const {
    eventdate,
    eventtime,
    proposedeventaddress,
    city,
    state,
    zipcode,
    estimatedattendance,
    activitytype,
    contactfirstname,
    contactlastname,
    contactphone,
    contactemail,
    jenstoryrequest,
  } = req.body;

  try {
    let zipcodeRecord = await knex("zipcodes").where({ zipcode }).first();

    // If ZIP code not in DB, just verify the city/state input.
    // (No external API call here, but you could add one if desired.)
    if (!zipcodeRecord) {
      await knex("zipcodes").insert({
        zipcode,
        city: city.toUpperCase(),
        state: state.toUpperCase(),
      });
    } else {
      // Verify the city and state match the existing ZIP code record
      if (
        city &&
        state &&
        (zipcodeRecord.city.toUpperCase() !== city.toUpperCase() ||
          zipcodeRecord.state.toUpperCase() !== state.toUpperCase())
      ) {
        return res
          .status(400)
          .send("City and state do not match the existing ZIP code.");
      }
    }

    // Insert event request
    await knex("eventrequests").insert({
      eventdate,
      eventtime,
      proposedeventaddress: proposedeventaddress.toUpperCase(),
      zipcode,
      estimatedattendance: parseInt(estimatedattendance, 10),
      activitytype,
      contactfirstname: contactfirstname.toUpperCase(),
      contactlastname: contactlastname.toUpperCase(),
      contactphone,
      contactemail: contactemail.toLowerCase(),
      jenstoryrequest: jenstoryrequest === "Y",
      eventreqstatus: "Pending",
    });

    res.redirect("/");
  } catch (error) {
    console.error("Error submitting event request:", error);
    res.status(500).send("Failed to submit event request.");
  }
});

// API Route: Get City/State from Zip
app.get("/api/zip/:zipcode", async (req, res) => {
  const { zipcode } = req.params;
  try {
    // Check DB first
    let zipcodeRecord = await knex("zipcodes").where({ zipcode }).first();
    if (!zipcodeRecord) {
      // Not in DB, fetch from external API
      const { city, state } = await getCityStateFromApi(zipcode);
      if (!city || !state) {
        return res
          .status(404)
          .json({ error: "No city/state found for this ZIP code." });
      }

      // Insert into DB
      await knex("zipcodes").insert({
        zipcode,
        city: city.toUpperCase(),
        state: state.toUpperCase(),
      });

      zipcodeRecord = {
        zipcode,
        city: city.toUpperCase(),
        state: state.toUpperCase(),
      };
    }

    // Return JSON response
    res.json({
      zipcode: zipcodeRecord.zipcode,
      city: zipcodeRecord.city,
      state: zipcodeRecord.state,
    });
  } catch (error) {
    console.error("Error fetching city/state:", error);
    res.status(500).json({ error: "Internal server error" });
  }
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
      res.render("login", {
        title: "Admin Login",
        errorMessage: "Invalid username or password.",
      });
    }
  } catch (error) {
    console.error("Error during login:", error);
    res.status(500).render("login", {
      title: "Admin Login",
      errorMessage: "An error occurred.",
    });
  }
});

// Admin Page Route
app.get("/admin", isAuthenticated, async (req, res) => {
  try {
    // (Existing Admin, Event Requests, Volunteers, Events fetch code unchanged)
    const admins = await knex("admins")
      .select(
        "admins.adminid",
        knex.raw("CONCAT(admins.firstname, ' ', admins.lastname) AS name"),
        "admins.username",
        "admins.password",
        "admins.email",
        "admins.phonenumber"
      )
      .orderBy("admins.adminid", "asc");

    const eventRequests = await knex("eventrequests")
      .join("zipcodes", "eventrequests.zipcode", "=", "zipcodes.zipcode")
      .select(
        "eventrequests.requestid",
        knex.raw(
          "TO_CHAR(eventrequests.eventdate, 'MM/DD/YYYY') || ' ' || TO_CHAR(eventrequests.eventtime, 'HH:MI AM') AS eventdatetime"
        ),
        "eventrequests.estimatedattendance",
        "eventrequests.activitytype",
        knex.raw(
          "CONCAT(eventrequests.contactfirstname, ' ', eventrequests.contactlastname) AS name"
        ),
        "eventrequests.contactemail",
        "eventrequests.contactphone",
        "eventrequests.proposedeventaddress",
        "zipcodes.city",
        "zipcodes.state",
        "eventrequests.zipcode",
        "eventrequests.eventreqstatus",
        "eventrequests.jenstoryrequest"
      )
      .orderBy("eventrequests.requestid", "asc");

    const volunteers = await knex("volunteers")
      .join("zipcodes", "volunteers.zipcode", "=", "zipcodes.zipcode")
      .select(
        "volunteers.volunteerid",
        knex.raw(
          "CONCAT(volunteers.volfirstname, ' ', volunteers.vollastname) AS name"
        ),
        "volunteers.phone",
        "volunteers.email",
        "volunteers.sewinglevel",
        "volunteers.monthlyhours",
        "volunteers.heardaboutopportunity",
        "volunteers.zipcode",
        "zipcodes.city",
        "zipcodes.state"
      )
      .orderBy([
        { column: "volunteers.volfirstname", order: "asc" },
        { column: "volunteers.vollastname", order: "asc" },
      ]);

    const events = await knex("events")
      .join("zipcodes", "events.zipcode", "=", "zipcodes.zipcode")
      .leftJoin("eventproduction", "events.eventid", "eventproduction.eventid")
      .leftJoin(
        "produceditems",
        "eventproduction.produceditemid",
        "produceditems.produceditemid"
      )
      .select(
        "events.eventid",
        knex.raw("TO_CHAR(events.eventdate, 'MM/DD/YYYY') AS eventdate"),
        knex.raw(
          "CONCAT(events.eventaddress, '<br>', zipcodes.city, ', ', zipcodes.state, '<br>', events.zipcode) AS fulladdress"
        ),
        "events.totalparticipants",
        "events.eventstatus",
        knex.raw(
          "SUM(CASE WHEN TRIM(produceditems.produceditemname) = 'Pockets' THEN COALESCE(eventproduction.quantityproduced, 0) ELSE 0 END) AS pockets"
        ),
        knex.raw(
          "SUM(CASE WHEN TRIM(produceditems.produceditemname) = 'Collars' THEN COALESCE(eventproduction.quantityproduced, 0) ELSE 0 END) AS collars"
        ),
        knex.raw(
          "SUM(CASE WHEN TRIM(produceditems.produceditemname) = 'Envelopes' THEN COALESCE(eventproduction.quantityproduced, 0) ELSE 0 END) AS envelopes"
        ),
        knex.raw(
          "SUM(CASE WHEN TRIM(produceditems.produceditemname) = 'Vests' THEN COALESCE(eventproduction.quantityproduced, 0) ELSE 0 END) AS vests"
        ),
        knex.raw(
          "SUM(COALESCE(eventproduction.quantityproduced, 0)) AS total_items_produced"
        )
      )
      .groupBy(
        "events.eventid",
        "events.eventdate",
        "events.eventaddress",
        "zipcodes.city",
        "zipcodes.state",
        "events.zipcode",
        "events.totalparticipants",
        "events.eventstatus"
      )
      .orderBy("events.eventid", "asc");

    // Render the Admin Dashboard
    res.render("admin", {
      title: "Admin Dashboard",
      admins,
      eventRequests,
      volunteers,
      events,
    });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
  }
});

// ... [The rest of your routes remain unchanged]

// Redirect to Real Donation Page
app.get("/realDonate", (req, res) => {
  res.redirect(
    "https://turtleshelterproject.org/checkout/donate?donatePageId=5b6a44c588251b72932df5a0"
  );
});

// Route to render the volunteer form page
app.get("/volunteer/add", (req, res) => {
  res.render("volunteer", { title: "Add New Volunteer" });
});

// Route to render the admin form page
app.get("/admin/add", isAuthenticated, (req, res) => {
  res.render("addAdmin", { title: "Add New Admin" });
});

// Logout Route
app.post("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) return res.status(500).send("Failed to log out.");
    res.redirect("/login");
  });
});

// Admin Dashboard Get Route
app.get('/dashboard', (req, res) => {
  res.render('dashboard'); // Render the dashboard.ejs
});

// Error Handling
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Start Server
app.listen(port, () => console.log(`Server is running on port ${port}!`));
