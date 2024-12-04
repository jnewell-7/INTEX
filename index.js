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
    const admin = await knex("admins").where({ username }).first();

    if (admin && admin.password === password) {
      req.session.isLoggedIn = true; // Mark user as logged in
      req.session.username = admin.username; // Store username in session
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
      errorMessage: "An unexpected error occurred. Please try again later.",
    });
  }
});

// Admin Page Route (Protected)
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

    res.render("admin", { title: "Admin Dashboard", admins, eventRequests, volunteers });
  } catch (error) {
    console.error("Error loading admin page:", error);
    res.status(500).send("Error loading admin dashboard.");
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

// Edit Admin (POST)
app.post("/editAdmin", isAuthenticated, async (req, res) => {
  const { adminid, username, password, firstname, lastname, email, phonenumber } = req.body;

  try {
    await knex("admins").where({ adminid }).update({
      username,
      password,
      firstname,
      lastname,
      email,
      phonenumber,
    });

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating admin data:", error);
    res.status(500).send("Failed to update admin data.");
  }
});

// Add Admin (GET)
app.get("/addAdmin", isAuthenticated, (req, res) => {
  res.render("addAdmin", { title: "Add New Admin" });
});

// Add Admin (POST)
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

// Update Event Request Status
app.post("/updateEventStatus", async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    for (const [key, value] of updates) {
      if (key.startsWith("status_")) {
        const requestid = key.split("_")[1]; // Extract request ID from the key

        if (value === "Completed") {
          // Fetch the event request record
          const request = await knex("eventrequests").where({ requestid }).first();

          if (request) {
            // Move the record to the events table
            await knex("events").insert({
              eventid: request.requestid, // Or generate a new ID if necessary
              eventdate: request.eventdate,
              zipcode: request.zipcode,
              estimatedattendance: request.estimatedattendance,
              activitytype: request.activitytype,
              contactfirstname: request.contactfirstname,
              contactlastname: request.contactlastname,
              contactemail: request.contactemail,
              contactphone: request.contactphone,
              proposedeventaddress: request.proposedeventaddress,
            });

            // Delete the record from the eventrequests table
            await knex("eventrequests").where({ requestid }).del();
          }
        } else {
          // Update the event request status if not "Completed"
          await knex("eventrequests").where({ requestid }).update({ eventreqstatus: value });
        }
      }
    }

    res.redirect("/admin"); // Redirect back to the admin page
  } catch (error) {
    console.error("Error updating event request status:", error);
    res.status(500).send("Failed to update event request status.");
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

// Error Handling Middleware
app.use((req, res) => {
  res.status(404).send("Page not found.");
});


// Route to handle adding a new volunteer
app.post('/submitVolunteerData', async (req, res) => {
  try {
      // Extract form values from req.body
      const first_name = req.body.first_name ? req.body.first_name.trim().toUpperCase() : ''; 
      const last_name = req.body.last_name ? req.body.last_name.trim().toUpperCase() : '';
      const phone = req.body.phone ? req.body.phone.trim() : ''; 
      const email = req.body.email ? req.body.email.trim().toLowerCase() : ''; 
      const zipcode = req.body.zipcode ? req.body.zipcode.trim() : ''; 
      const sewing_level = req.body.sewing_level ? req.body.sewing_level.trim() : ''; 
      const monthly_hours = parseInt(req.body.monthly_hours, 10) || 0;
      const heard_about = req.body.heard_about === 'Other' && req.body.other_input
          ? req.body.other_input.trim() 
          : req.body.heard_about;
      
      const city = req.body.city ? req.body.city.trim().toUpperCase() : ''; 
      const state = req.body.state ? req.body.state.trim().toUpperCase() : '';

      // Validate if the zipcode exists in the zipcodes table
      let zipcodeRecord = await knex('zipcodes').where({ zipcode }).first();

      // If the zipcode does not exist, insert it along with city and state into the zipcodes table
      if (!zipcodeRecord) {
          await knex('zipcodes').insert({
              zipcode: zipcode,
              city: city,
              state: state,
          });
      }

      // Insert the new volunteer into the volunteers table
      await knex('volunteers').insert({
          volfirstname: first_name,
          vollastname: last_name,
          phone: phone,
          email: email,
          zipcode: zipcode, // Only store the zipcode here (foreign key)
          sewinglevel: sewing_level,
          monthlyhours: monthly_hours,
          heardaboutopportunity: heard_about,
      });

      res.redirect('/'); // Redirect to the homepage after adding the volunteer
  } catch (error) {
      console.error('Error adding volunteer:', error);
      res.status(500).send('Internal Server Error');
  }
});



// Start Server
app.listen(port, () => {
  console.log(`Server is up and running on port ${port}!`);
});