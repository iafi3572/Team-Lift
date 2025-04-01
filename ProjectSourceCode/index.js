// run "npm install express to your local repo"
// *****************************************************
// <!-- Section 1 : Import Dependencies -->
// *****************************************************

const express = require('express'); // To build an application server or API
const app = express();
const handlebars = require('express-handlebars');
const Handlebars = require('handlebars');
const path = require('path');
const pgp = require('pg-promise')(); // To connect to the Postgres DB from the node server
const bodyParser = require('body-parser');
const session = require('express-session'); // To set the session object. To store or access session data, use the `req.session`, which is (generally) serialized as JSON by the store.
const bcrypt = require('bcryptjs'); //  To hash passwords
const req = require('express/lib/request');

// *****************************************************
// <!-- Section 2 : Connect to DB -->
// *****************************************************

// create `ExpressHandlebars` instance and configure the layouts and partials dir.
const hbs = handlebars.create({
  extname: 'hbs',
  layoutsDir: __dirname + '/views/layouts',
  partialsDir: __dirname + '/views/partials',
});

// database configuration
const dbConfig = {
  host: 'db', // the database server
  port: 5432, // the database port
  database: process.env.POSTGRES_DB, // the database name
  user: process.env.POSTGRES_USER, // the user account to connect with
  password: process.env.POSTGRES_PASSWORD, // the password of the user account
};

const db = pgp(dbConfig);

// test your database
db.connect()
  .then(obj => {
    console.log('Database connection successful'); // you can view this message in the docker compose logs
    obj.done(); // success, release the connection;
  })
  .catch(error => {
    console.log('ERROR:', error.message || error);
  });

// *****************************************************
// <!-- Section 3 : App Settings -->
// *****************************************************

// Register `hbs` as our view engine using its bound `engine()` function.
app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));
app.use(bodyParser.json()); // specify the usage of JSON for parsing request body.

// initialize session variables
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    saveUninitialized: false,
    resave: false,
  })
);

app.use(
  bodyParser.urlencoded({
    extended: true,
  })
);

// *****************************************************
// <!-- Section 4 : API Routes -->
// *****************************************************

// TODO - Include your API routes here
//Register
app.get('/register', (req, res) => {
  res.render('pages/register.hbs')
});

app.post('/register', async (req, res) =>{
  let password = req.body.password;
  let confirmPassword = req.body.confirmPassword;
  let username = req.body.username;
  let email = req.body.email;
  let birthday = req.body.birthday;

  //checks that password and confirm password are the same
  if (password !== confirmPassword) {
    res.render('pages/register',{
      error:true,
      message: 'Passwords do not match',
      username: username,
      email:email,
      birthday:birthday
    });
  }

  
  const hash = await bcrypt.hash(req.body.password, 10);

  try {
    //adds data into user database then redirects user to login page
    await db.none(`
      INSERT INTO users (username, hash_password, email, birthday) VALUES ($1, $2, $3, $4);`, [username, hash, email, birthday]);
      res.status(201).redirect('/login');
  }

  catch(err) {
    console.error('error', err);
    res.redirect('/register');
  }
});

//login
app.get('/login', (req, res) => {
  res.render('pages/login.hbs')
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests
app.listen(3000);
console.log('Server is listening on port 3000');
