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
    host: process.env.RDS_HOSTNAME || "awseb-e-fzr58sdsxd-stack-awsebrdsdatabase-2vdqecpsp679.chiykskmafi4.us-east-1.rds.amazonaws.com",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "gocougs123",
    database: process.env.RDS_DB_NAME || "intex",
    port: process.env.RDS_PORT || 5432,
    ssl: process.env.DB_INTEX ? { rejectUnauthorized: false } : false,
  },
});

// Routes


//Login Route

app.get('/login', (req, res) => {
  knex('admin')
      .select('username', 'password')
      .then(adminCredentials => {
          res.render('login', { adminCredentials });
      })
      .catch(error => {
          console.error("Error fetching admin credentials: ", error);
          res.status(500).send('Internal Server Error');
      });
});


app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  if (username === adminCredentials.username && password === adminCredentials.password) {
    res.render('admin'); // Render the admin page if credentials are correct
  } else {
    res.send('Invalid username or password');
  }
});

// Landing Page Get Route
app.get("/", (req, res) => {
  res.render("index", { title: "Welcome to the Turtle Shelter Project" });
});

// Confirmation message
app.listen(port, () =>
  console.log(`Server is up and running on port ${port}!`)
);
