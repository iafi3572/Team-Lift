// run "npm install express to your local repo"
// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require("express"); // To build an application server or API
const app = express();
const handlebars = require("express-handlebars");
const Handlebars = require("handlebars");
const path = require("path");
const pgp = require("pg-promise")(); // To connect to the Postgres DB from the node server
const bodyParser = require("body-parser");
const session = require("express-session"); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require("bcryptjs"); //  To hash passwords
const req = require("express/lib/request");
const axios = require("axios").default;

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: "hbs",
  layoutsDir: __dirname + "/views/layouts",
  partialsDir: __dirname + "/views/partials",
});

// database configuration
const dbConfig = {
  host: "db", // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then((obj) => {
    console.log("Database connection successful"); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch((error) => {
    console.log("ERROR:", error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");
app.set("views", path.join(__dirname, "views"));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);
app.use((req, res, next) => {
  res.locals.user = req.session.user;
  next();
});
app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

app.use("/images", express.static(path.join(__dirname, "images")));

app.get("/tracking", (req, res) => {
  res.render("pages/tracking");
  //do something
});

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here
//Register
app.get("/register", (req, res) => {
  res.render("pages/register.hbs");
});

app.get("/welcome", (req, res) => {
  res.json({ status: "success", message: "Welcome!" });
});

app.post("/register", async (req, res) => {
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;
  let username = req.body.username;
  let email = req.body.email;
  let birthday = req.body.birthday;

  //checks that password and confirm password are the same
  if (password !== confirmPassword) {
    return res.status(400).render("pages/register", {
      error: true,
      message: "Passwords do not match",
      username: username,
      email: email,
      birthday: birthday,
    });
  }

  const hash = await bcrypt.hash(req.body.password, 10);

  try {
    //adds data into user database then redirects user to login page
    await db.none(
      `
      INSERT INTO users (username, hash_password, email, birthday) VALUES ($1, $2, $3, $4);`,
      [username, hash, email, birthday]
    );
    res.status(200).redirect("/login");
  } catch (err) {
    if (err.code == "23505") {
      res.render("pages/register", {
        error: true,
        message: "Username already exists",
      });
    } else {
      console.error("error", err);
      res.status(400).redirect("/register");
    }
  }
});

//login
app.get("/login", (req, res) => {
  res.render("pages/login.hbs");
});

app.get("/exercises", async (req, res) => {
  const options = {
    method: "GET",
    url: "https://exercisedb.p.rapidapi.com/exercises?limit=100",
    headers: {
      "X-RapidAPI-Key": process.env.API_KEY,
      "x-rapidapi-host": "exercisedb.p.rapidapi.com",
    },
  };

  try {
    const { data } = await axios.request(options);
    console.log(data);
    res.render("pages/exercises.hbs", { data });
  } catch (error) {
    console.error(error);
    res.status(500).render("pages/exercises.hbs", {
      exercises: [],
    });
  }
});

app.get("/", (req, res) => {
  res.redirect("/login");
});

app.post("/login", async (req, res) => {
  let username = req.body.username;

  try {
    const user = await db.one(`SELECT * FROM users WHERE username= $1;`, [
      username,
    ]);

    // check if password from request matches with password in DB
    const match = await bcrypt.compare(req.body.password, user.hash_password);

    if (match) {
      req.session.user = user;
      req.session.save();

      res.redirect("/home");
      res.status(200);
    } else {
      res.status(400).render("pages/login", {
        message: `Incorrect password`,
        error: true,
      });
    }
  } catch (err) {
    res.status(400).redirect("/register");
  }
});

const auth = (req, res, next) => {
  if (!req.session.user) {
    // Default to login page.
    return res.redirect("/login");
  }
  next();
};

app.use(auth);

app.get("/home", async (req, res) => {
  const today = new Date().toLocaleDateString(); // Get current date
  res.render("pages/home", { date: today });
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.render("pages/home", {
        message: "Error logging out. Please try again.",
        error: true, // Indicate an error occurred
      });
    }
    res.render("pages/login", {
      message: "Logged out Successfully",
      error: false,
    });
  });
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests

module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
