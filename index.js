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
    host:
      process.env.RDS_HOSTNAME || "awseb-e-it3xmpabbx-stack-awsebrdsdatabase-5vjxonr0zyvk.chiykskmafi4.us-east-1.rds.amazonaws.com",
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

// event request Page Route
app.get("/reqEvent", (req, res) => {
  res.render("reqEvent", { title: "Request Event" });
});

app.post("/submitEventRequest", async (req, res) => {
  const {
    eventdate,
    eventtime,
    proposedeventaddress,
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
    // Check if zip code exists in the zipcodes table
    let zipcodeRecord = await knex("zipcodes").where({ zipcode }).first();

    if (!zipcodeRecord) {
      return res.status(400).send("Invalid zip code. Please try again.");
    }

    // Insert the event request into the eventrequests table
    await knex("eventrequests").insert({
      eventdate,
      eventtime,
      proposedeventaddress,
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
    res
      .status(500)
      .render("login", {
        title: "Admin Login",
        errorMessage: "An error occurred.",
      });
  }
});

// Admin Page Route
app.get("/admin", isAuthenticated, async (req, res) => {
  try {
    const admins = await knex("admins").select("*").orderBy("adminid", "asc");

    const eventRequests = await knex("eventrequests")
      .join("zipcodes", "eventrequests.zipcode", "=", "zipcodes.zipcode") // Join with zipcodes table
      .select(
        "eventrequests.*", // Select all fields from eventrequests
        "zipcodes.city", // Add city from zipcodes
        "zipcodes.state" // Add state from zipcodes
      );

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

// Update Event Request Status
app.post("/updateEventStatus", async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    for (const [key, value] of updates) {
      if (key.startsWith("status_")) {
        const requestid = key.split("_")[1];

        if (value === "Completed") {
          const request = await knex("eventrequests")
            .where({ requestid })
            .first();
          if (request) {
            const totalParticipants =
              req.body[`participants_${requestid}`] || 0;

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
          await knex("eventrequests")
            .where({ requestid })
            .update({ eventreqstatus: value });
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
  const {
    first_name,
    last_name,
    phone,
    email,
    zipcode,
    sewing_level,
    monthly_hours,
    heard_about,
    city,
    state,
  } = req.body;

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

    res.redirect("/");
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

// Edit Admin (GET)
app.get("/editAdmin/:id", isAuthenticated, async (req, res) => {
  const adminid = req.params.id;

  try {
    const admin = await knex("admins").where({ adminid }).first();

    if (!admin) {
      return res.status(404).send("Admin not found.");
    }

    res.render("editAdmin", {
      title: `Edit Admin - ${admin.firstname} ${admin.lastname}`,
      admin,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).send("Failed to load admin data.");
  }
});

// Edit Admin Route
app.post("/editAdmin/:adminid", isAuthenticated, async (req, res) => {
  const { adminid } = req.params;
  const { username, password, firstname, lastname, email, phonenumber } = req.body; // Include all fields from the form
  try {
    await knex("admins")
      .where({ adminid })
      .update({ username, password, firstname, lastname, email, phonenumber });
    res.redirect("/admin");
  } catch (error) {
    console.error("Error editing admin:", error);
    res.status(500).send("Failed to edit admin.");
  }
});

app.get("/editVolunteer/:volunteerid", isAuthenticated, async (req, res) => {
  const { volunteerid } = req.params;
  try {
    const volunteer = await knex("volunteers").where({ volunteerid }).first();
    if (volunteer) {
      res.render("editVolunteer", { title: "Edit Volunteer", volunteer });
    } else {
      res.status(404).send("Volunteer not found.");
    }
  } catch (error) {
    console.error("Error loading volunteer data:", error);
    res.status(500).send("Error loading volunteer data.");
  }
});

app.post("/editVolunteer/:volunteerid", isAuthenticated, async (req, res) => {
  const { volunteerid } = req.params;
  const {
    first_name,
    last_name,
    phone,
    email,
    sewing_level,
    monthly_hours,
    heard_about,
    zipcode,
  } = req.body;

  try {
    await knex("volunteers")
      .where({ volunteerid })
      .update({
        volfirstname: first_name.toUpperCase(),
        vollastname: last_name.toUpperCase(),
        phone,
        email: email.toLowerCase(),
        sewinglevel: sewing_level,
        monthlyhours: parseInt(monthly_hours, 10),
        heardaboutopportunity: heard_about,
        zipcode,
      });

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating volunteer:", error);
    res.status(500).send("Failed to update volunteer.");
  }
});

app.get("/editEvent/:eventid", isAuthenticated, async (req, res) => {
  const { eventid } = req.params;
  try {
    const event = await knex("events").where({ eventid }).first();
    if (event) {
      res.render("editEvent", { title: "Edit Event", event });
    } else {
      res.status(404).send("Event not found.");
    }
  } catch (error) {
    console.error("Error loading event data:", error);
    res.status(500).send("Error loading event data.");
  }
});

app.post("/editEvent/:eventid", isAuthenticated, async (req, res) => {
  const { eventid } = req.params;
  const {
    event_date,
    event_address,
    zipcode,
    total_participants,
    event_status,
  } = req.body;

  try {
    await knex("events")
      .where({ eventid })
      .update({
        eventdate: event_date,
        eventaddress: event_address,
        zipcode,
        totalparticipants: parseInt(total_participants, 10),
        eventstatus: event_status,
      });

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating event:", error);
    res.status(500).send("Failed to update event.");
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

//Post route to put volunteer data into the database
app.post('/submitVolunteerData', (req, res) => {
  // Extract form values from req.body with necessary validation and transformation
  try {
    const first_name = req.body.first_name?.trim().toUpperCase(); // Ensure first name is uppercase and trimmed
    const last_name = req.body.last_name?.trim().toUpperCase(); // Ensure last name is uppercase and trimmed
    const phone = req.body.phone?.trim(); // Phone number (validated in frontend, ensure trimmed)
    const email = req.body.email?.trim().toLowerCase(); // Ensure email is lowercase and trimmed
    const city = req.body.city?.trim().toUpperCase(); // Ensure city is uppercase and trimmed
    const state = req.body.state?.trim().toUpperCase(); // Ensure state is uppercase and trimmed
    const zipcode = req.body.zipcode?.trim(); // Zipcode
    const sewing_level = req.body.sewing_level?.trim(); // Sewing level (dropdown value)
    const monthly_hours = parseInt(req.body.monthly_hours, 10); // Convert to integer
    const heard_about = req.body.heard_about === 'Other' ? req.body.other_input?.trim() : req.body.heard_about?.trim(); // Handle 'Other' case, ensure trimmed

    // Validate 'Other' input if 'Other' is selected for heard_about
    if (req.body.heard_about === 'Other' && (!req.body.other_input || req.body.other_input.trim() === '')) {
      return res.status(400).send('Please specify how you heard about us.');
    }

    // Insert the new volunteer into the database
    knex('volunteers')
      .insert({
        volfirstname: first_name,
        vollastname: last_name,
        phone: phone,
        email: email,
        city: city,
        state: state,
        zipcode: zipcode,
        sewinglevel: sewing_level,
        monthlyhours: monthly_hours,
        heardaboutopportunity: heard_about,
      })
      .then(() => {
        res.redirect('/'); // Redirect to the homepage after adding the volunteer
      })
      .catch(error => {
        console.error('Error adding volunteer:', error);
        // Handle common errors like duplicate email or database constraint violations
        if (error.code === '23505') { // Assuming 23505 is the unique violation error code for your database
          res.status(400).send('A volunteer with this email already exists.');
        } else {
          res.status(500).send('Internal Server Error');
        }
      });
  } catch (err) {
    console.error('Unexpected error:', err);
    res.status(500).send('Internal Server Error');
  }
});

app.post("/deleteAdmin", isAuthenticated, async (req, res) => {
  const { adminid } = req.body;
  try {
    await knex("admins").where({ adminid }).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).send("Failed to delete admin.");
  }
});

app.post("/deleteVolunteer", isAuthenticated, async (req, res) => {
  const { volunteerid } = req.body;
  try {
    await knex("volunteers").where({ volunteerid }).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting volunteer:", error);
    res.status(500).send("Failed to delete volunteer.");
  }
});

app.post("/deleteEventReq", isAuthenticated, async (req, res) => {
  const { requestid } = req.body;
  try {
    await knex("eventrequests").where({ requestid }).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting event request:", error);
    res.status(500).send("Failed to delete event request.");
  }
});

app.post("/deleteEvent", isAuthenticated, async (req, res) => {
  const { eventid } = req.body;
  try {
    await knex("events").where({ eventid }).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).send("Failed to delete event.");
  }
});



// Start Server
app.listen(port, () => console.log(`Server is running on port ${port}!`));
