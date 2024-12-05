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
    // Check if the ZIP code exists in the zipcodes table
    let zipcodeRecord = await knex("zipcodes").where({ zipcode }).first();

    if (!zipcodeRecord) {
      // Insert ZIP code into zipcodes table
      await knex("zipcodes").insert({
        zipcode,
        city: city.toUpperCase(),
        state: state.toUpperCase(),
      });
    } else {
      // Verify the city and state match the existing ZIP code record
      if (
        zipcodeRecord.city.toUpperCase() !== city.toUpperCase() ||
        zipcodeRecord.state.toUpperCase() !== state.toUpperCase()
      ) {
        return res
          .status(400)
          .send("City and state do not match the existing ZIP code.");
      }
    }

    // Insert event request into eventrequests table
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
    // Fetch Admins Data
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

    // Fetch Event Requests Data
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

    // Fetch Volunteers Data
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

    // Fetch Events Data with Produced Items and Totals
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

// Route to render the Add Event page
app.get("/addEvent", isAuthenticated, (req, res) => {
  res.render("addEvent", { title: "Add New Event" });
});

// Route to handle the Add Event form submission
app.post("/addEvent", isAuthenticated, async (req, res) => {
  const {
    requestid,
    eventdate,
    eventaddress,
    eventstatus,
    totalparticipants,
    zipcode,
    adminid,
    pockets,
    collars,
    envelopes,
    vests,
  } = req.body;

  try {
    // Format eventdate
    const formattedDate = new Date(eventdate).toISOString().split("T")[0];

    // Insert the event into the events table without specifying eventid
    const [event] = await knex("events")
      .insert({
        requestid: requestid || null, // Store requestid if available
        eventdate: formattedDate,
        eventaddress,
        eventstatus: eventstatus || "Pending",
        totalparticipants: parseInt(totalparticipants, 10) || 0,
        zipcode,
        adminid: adminid || null,
      })
      .returning("*");

    const eventid = event.eventid;

    // Prepare produced items data
    const producedItems = [
      { name: "Pockets", quantity: parseInt(pockets || 0, 10) },
      { name: "Collars", quantity: parseInt(collars || 0, 10) },
      { name: "Envelopes", quantity: parseInt(envelopes || 0, 10) },
      { name: "Vests", quantity: parseInt(vests || 0, 10) },
    ];

    // Insert produced items into the eventproduction table
    for (const item of producedItems) {
      if (item.quantity > 0) {
        const producedItem = await knex("produceditems")
          .select("produceditemid")
          .where({ produceditemname: item.name })
          .first();

        if (producedItem) {
          await knex("eventproduction").insert({
            eventid,
            produceditemid: producedItem.produceditemid,
            quantityproduced: item.quantity,
          });
        } else {
          console.warn(`Produced item '${item.name}' not found in database.`);
        }
      }
    }

    res.redirect("/admin"); // Redirect back to Admin Dashboard
  } catch (error) {
    console.error("Error adding event:", error);
    res.status(500).send("Failed to add event.");
  }
});

// Route to render the Update Event page
app.get("/updateEvent/:requestid", isAuthenticated, async (req, res) => {
  const { requestid } = req.params;

  try {
    const request = await knex("eventrequests")
      .select(
        "eventrequests.requestid",
        "eventrequests.eventdate",
        "eventrequests.proposedeventaddress",
        "eventrequests.zipcode"
      )
      .where({ requestid })
      .first();

    if (!request) {
      return res.status(404).send("Event request not found.");
    }

    res.render("updateEvent", {
      title: "Complete Event",
      event: request,
    });
  } catch (error) {
    console.error("Error fetching event request:", error);
    res.status(500).send("Failed to load event request.");
  }
});

// Route to handle saving the event and produced items
app.post("/saveEvent", isAuthenticated, async (req, res) => {
  const {
    requestid,
    eventdate,
    eventaddress,
    zipcode,
    totalparticipants,
    pockets,
    collars,
    envelopes,
    vests,
  } = req.body;

  try {
    // Format eventdate
    const formattedDate = new Date(eventdate).toISOString().split("T")[0];

    // Insert the event into the events table without specifying eventid
    const [event] = await knex("events")
      .insert({
        requestid, // Store requestid as a foreign key
        eventdate: formattedDate,
        eventaddress,
        zipcode,
        totalparticipants: parseInt(totalparticipants, 10),
        eventstatus: "Completed",
      })
      .returning("*");

    const eventid = event.eventid; // Auto-generated eventid

    // Insert produced items into the eventproduction table
    const producedItems = [
      { name: "Pockets", quantity: parseInt(pockets || 0, 10) },
      { name: "Collars", quantity: parseInt(collars || 0, 10) },
      { name: "Envelopes", quantity: parseInt(envelopes || 0, 10) },
      { name: "Vests", quantity: parseInt(vests || 0, 10) },
    ];

    for (const item of producedItems) {
      if (item.quantity > 0) {
        const producedItem = await knex("produceditems")
          .select("produceditemid")
          .where({ produceditemname: item.name })
          .first();

        if (producedItem) {
          await knex("eventproduction").insert({
            eventid,
            produceditemid: producedItem.produceditemid,
            quantityproduced: item.quantity,
          });
        } else {
          console.warn(`Produced item '${item.name}' not found in database.`);
        }
      }
    }

    // Delete the original event request
    await knex("eventrequests").where({ requestid }).del();

    res.redirect("/admin");
  } catch (error) {
    console.error("Error saving event:", error);
    res.status(500).send("Failed to save event.");
  }
});

// Update Event Request Status
app.post("/updateEventStatus", isAuthenticated, async (req, res) => {
  try {
    const updates = Object.entries(req.body);

    for (const [key, value] of updates) {
      if (key.startsWith("status_")) {
        const requestid = key.split("_")[1];

        // Update the event request status
        await knex("eventrequests")
          .where({ requestid })
          .update({ eventreqstatus: value });
      }
    }

    res.redirect("/admin");
  } catch (error) {
    console.error("Error updating event request status:", error);
    res.status(500).send("Failed to update event request status.");
  }
});

// Delete Admin Route
app.post("/deleteAdmin/:adminid", isAuthenticated, async (req, res) => {
  const { adminid } = req.params;
  try {
    await knex("admins").where("adminid", adminid).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting admin:", error);
    res.status(500).send("Failed to delete admin.");
  }
});

// Delete Volunteer Route
app.post("/deleteVolunteer/:volunteerid", isAuthenticated, async (req, res) => {
  const { volunteerid } = req.params;
  try {
    await knex("volunteers").where("volunteerid", volunteerid).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting volunteer:", error);
    res.status(500).send("Failed to delete volunteer.");
  }
});

// Delete EventRequest Route
app.post("/deleteEventReq/:requestid", isAuthenticated, async (req, res) => {
  const { requestid } = req.params;

  try {
    await knex("eventrequests").where("requestid", requestid).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting event request:", error);
    res.status(500).send("Failed to delete event request.");
  }
});

// Delete Event Route
app.post("/deleteEvent/:eventid", isAuthenticated, async (req, res) => {
  const { eventid } = req.params;
  try {
    await knex("events").where("eventid", eventid).del();
    res.redirect("/admin");
  } catch (error) {
    console.error("Error deleting event:", error);
    res.status(500).send("Failed to delete event.");
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
app.get("/addAdmin", isAuthenticated, (req, res) => {
  res.render("addAdmin", { title: "Add Admin" });
});

// Add Admin Route
app.post("/addAdmin", isAuthenticated, async (req, res) => {
  const { username, password, firstname, lastname, email, phonenumber } =
    req.body;
  try {
    // Directly insert the provided password without hashing
    await knex("admins").insert({
      username,
      password,
      firstname,
      lastname,
      email,
      phonenumber,
    });

    res.redirect("/admin"); // Redirect to the admin list after adding
  } catch (error) {
    console.error("Error adding admin:", error);
    res.status(500).send("Failed to create a new admin.");
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
  const { username, password, firstname, lastname, email, phonenumber } =
    req.body;
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

// Error Handling
app.use((req, res) => {
  res.status(404).send("Page not found.");
});

// Start Server
app.listen(port, () => console.log(`Server is running on port ${port}!`));