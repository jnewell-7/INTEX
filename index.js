let express = require("express");
let app = express();
let path = require("path");

const port = process.env.PORT || 3000;

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, "public")));

const knex = require("knex")({
  client: "pg",
  connection: {
    host: process.env.RDS_HOSTNAME || "localhost",
    user: process.env.RDS_USERNAME || "postgres",
    password: process.env.RDS_PASSWORD || "I3atorang3s!",
    database: process.env.RDS_DB_NAME || "intex",
    port: process.env.RDS_PORT || 5434,
    ssl: process.env.DB_INTEX ? { rejectUnauthorized: false } : false,
  },
});



app.listen(port, () => console.log('Ready to go to work!'));