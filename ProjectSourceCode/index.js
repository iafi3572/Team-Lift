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

app.engine("hbs", hbs.engine);
app.set("view engine", "hbs");

app.use(express.static(path.join(__dirname, "resources")));

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
    url: "https://exercisedb.p.rapidapi.com/exercises?limit=10",
    headers: {
      "X-RapidAPI-Key": process.env.EX_API_KEY,
      "x-rapidapi-host": "exercisedb.p.rapidapi.com",
    },
  };

  try {
    const { data } = await axios.request(options);
    // console.log(data);
    const exerciseNames = data.map((exercise) => exercise.name);

    // console.log(exerciseNames);

    const testerName = "abs workout tutorial";

    const vid_data = [];

    const getVideoId = async (exerciseName) => {
      const ytOptions = {
        method: "GET",
        url: "https://www.googleapis.com/youtube/v3/search",
        params: {
          part: "snippet",
          maxResults: 1,
          type: "video",
          q: exerciseName,
          key: process.env.YT_API_KEY,
        },
      };

      try {
        const response = await axios.request(ytOptions);
        const videoData = response.data;
        if (videoData.items && videoData.items.length > 0) {
          const video = videoData.items[0];
          const videoId = video.id.videoId;
          return videoId;
        } else {
          console.log("No videos found");
          return null;
        }
      } catch (error) {
        console.log(error);
        return null;
      }
    };

    const videoLinks = async () => {
      for (let exercise of exerciseNames) {
        const input = exercise + " workout tutorial";
        const videoId = await getVideoId(input);
        vid_data.push({
          videoId: "https://www.youtube.com/embed/" + videoId,
        });
      }
      // console.log(vid_data);
      return vid_data;
    };

    const videoLinkData = await videoLinks();
    // console.log(videoLinkData);
    const mergedExercises = data.map((exercise, index) => ({
      ...exercise,
      videoId: videoLinkData[index]?.videoId || null, // adds videoId to each object
    }));
    console.log(mergedExercises);

    res.render("pages/exercises.hbs", { mergedExercises });
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
  const today = new Date().toLocaleDateString("en-US", {timeZone: "America/Denver"})
 // Get current date
  res.render("pages/home", { date: today });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.render('pages/home', {
        message: 'Error logging out. Please try again.',
        error: true, // Indicate an error occurred
      });
    }
    res.render('pages/login', {
      message: 'Logged out Successfully',
      error: false,
    });
  });
});

// myplan page

// app.get('/myplan', (req, res) => {
//   // res.render('pages/myplan.hbs')
//   res.render("pages/myplan", {
//     weekdays: [
//       { id: "sun", label: "Sunday", scheduledSets: [] },
//       { id: "mon", label: "Monday", scheduledSets: [] },
//       { id: "tues", label: "Tuesday", scheduledSets: [] },
//       { id: "wed", label: "Wednesday", scheduledSets: [] },
//       { id: "thurs", label: "Thursday", scheduledSets: [] },
//       { id: "fri", label: "Friday", scheduledSets: [] },
//       { id: "sat", label: "Saturday", scheduledSets: [] }
//     ],
//     allWorkouts: [] // make sure this is included too
//   });
  
// });

const weekLabels = [
  { id: 'sun', label: 'Sunday' },
  { id: 'mon', label: 'Monday' },
  { id: 'tues', label: 'Tuesday' },
  { id: 'wed', label: 'Wednesday' },
  { id: 'thurs', label: 'Thursday' },
  { id: 'fri', label: 'Friday' },
  { id: 'sat', label: 'Saturday' }
];

app.get('/myplan', async (req, res) => {
  const username = req.session.user.username; 

  try {
    const scheduleData = await db.any(`
      SELECT
        ws.day_of_week,
        ws.start_time,
        ws.duration_hours,
        ws.duration_minutes,
        s.set_id,
        s.set_name,
        w.workout_id,
        w.workout_name,
        w.workout_muscle,
        wsi.order_index
      FROM workout_schedule ws
      JOIN workout_sets s ON ws.set_id = s.set_id
      JOIN workout_set_items wsi ON s.set_id = wsi.set_id
      JOIN workouts w ON wsi.workout_id = w.workout_id
      WHERE ws.username = $1
      ORDER BY 
        ws.day_of_week,
        ws.start_time,
        wsi.order_index;
    `, [username]);

    // Group schedule by day -> set -> workouts
    const setsByDay = {};

    for (const row of scheduleData) {
      const day = row.day_of_week;
      if (!setsByDay[day]) setsByDay[day] = [];

      let set = setsByDay[day].find(s => s.set_id === row.set_id);
      if (!set) {
        set = {
          set_id: row.set_id,
          set_name: row.set_name,
          start_time: row.start_time.slice(0, 5), // remove seconds
          duration_hours: row.duration_hours,
          duration_minutes: row.duration_minutes,
          workouts: []
        };
        setsByDay[day].push(set);
      }

      set.workouts.push({
        workout_id: row.workout_id,
        workout_name: row.workout_name,
        workout_muscle: row.workout_muscle,
        order_index: row.order_index
      });
    }

    // Merge into full weekdays for template
    const weekdays = weekLabels.map(day => ({
      ...day,
      scheduledSets: setsByDay[day.label] || []
    }));

    // Get all workouts (for modal list)
    const allWorkouts = await db.any(`
      SELECT workout_id, workout_name, workout_muscle
      FROM workouts
      WHERE username = $1
      ORDER BY workout_name;
    `, [username]);

    console.log(username);
    console.log(allWorkouts);
    console.log('All Workouts:', {allWorkouts});

    res.render('pages/myplan', {
      weekdays,
      allWorkouts
    });

    delete req.session.message; // Clear after render
  } catch (err) {
    console.error('Error loading schedule:', err);
    res.render('pages/myplan', {
      weekdays: weekLabels.map(day => ({ ...day, scheduledSets: [] })),
      allWorkouts: [],
      message: 'Failed to load schedule.',
      error: true
    });
  }
});


app.post('/myplan/add', async (req, res) => {
  try {
    const username = req.session.user.username;
    if (!username) return res.redirect('/login');

    const {
      set_name,
      day_of_week,
      start_time,
      duration_hours,
      duration_minutes
    } = req.body;

    const selectedWorkouts = req.body.workouts || []; // array of selected workout_ids
    const workoutsArray = Array.isArray(selectedWorkouts)
      ? selectedWorkouts
      : [selectedWorkouts];

    await db.task(async t => {
      // 1. Insert into workout_sets
      const insertSet = await t.one(
        `INSERT INTO workout_sets (set_name, username)
         VALUES ($1, $2)
         RETURNING set_id`,
        [set_name, username]
      );
      const set_id = insertSet.set_id;

      // 2. Insert into workout_set_items
      for (const workoutId of workoutsArray) {
        const orderKey = `order_${workoutId}`;
        const orderIndex = parseInt(req.body[orderKey]) || 999;
        await t.none(
          `INSERT INTO workout_set_items (set_id, workout_id, order_index)
           VALUES ($1, $2, $3)`,
          [set_id, workoutId, orderIndex]
        );
      }

      // 3. Insert into workout_schedule
      await t.none(
        `INSERT INTO workout_schedule (
          username, set_id, day_of_week, start_time, duration_hours, duration_minutes
        ) VALUES ($1, $2, $3, $4, $5, $6)`,
        [username, set_id, day_of_week, start_time, duration_hours, duration_minutes]
      );
    });

    res.redirect('/myplan');

  } catch (err) {
    console.error('Error adding workout set:', err);
    res.status(400).render('pages/myplan', {
      message: 'Failed to add workout set. Please check your inputs.',
      error: true
    });
  }
});


//myworkouts page
app.post('/myworkouts', async (req, res) =>{
  let workoutName = req.body.workoutName;
  let hour = req.body.hour;
  let min = req.body.min;
  const username = req.session.user.username;

  const selectedExercises = req.body.exercises;
  

  try {
    //adds data into workout database
    workout_id = await db.one(`
      INSERT INTO workouts (username, workout_name,time_hours, time_minutes) VALUES ($1, $2, $3, $4) RETURNING workout_id;`, [username, workoutName, hour, min]);
    
    //adds the exercises from the workout into the workout_exercises database
    for (const exercise of selectedExercises) {
      muscle_group = await db.one(`SELECT muscle_target FROM exercises WHERE exercise_name = $1;`, [exercise]);
    
      await db.none(`
        INSERT INTO workout_exercises (workout_id,exercise_name,muscle_target) VALUES ($1, $2,$3);`, [workout_id.workout_id, exercise, muscle_group.muscle_target]);
    }

    res.redirect('/myworkouts');
  }

  catch(err) {
    res.status(500).render("pages/myworkouts", {
      message: `Error saving workout. Please try again`,
      error: true,
    });
  }
});


app.get('/myworkouts', async (req, res) => {
  const username = req.session.user.username;

  try {
    //gets the workouts for the user to display
    const workouts = await db.any('SELECT * FROM workouts WHERE username = $1;', [username]);

    for (const workout of workouts) {
      // gets the exercises for each workout based on workout_id
      const exercises = await db.any(`
        SELECT exercise_name, muscle_target FROM workout_exercises 
        WHERE workout_id = $1;`, [workout.workout_id]);
      
      // Add the exercises to the workout
      workout.exercises = exercises;
    }
    
    //gets all muscle target groups
    const muscleTarget = await db.any('SELECT DISTINCT muscle_target FROM exercises;');

    //gets all the exercises within each muscle target group
    const exercisesByMuscleTarget = [];
    for (const muscle of muscleTarget) {
      
        const exercises = await db.any(`SELECT exercise_name FROM exercises WHERE muscle_target = $1`, [muscle.muscle_target]);

        exercisesByMuscleTarget.push({
            muscleTarget: muscle.muscle_target,
            exercises: exercises
        });
    }
  
    res.render('pages/myworkouts', {
      workouts,
      exercisesByMuscleTarget
    });
  }


  catch(err) {
    res.status(500).render('pages/myworkouts', {
      error:true,
      message: 'Could not load workouts. Please try again'
    });
  }
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


app.get('/myplan', (req, res) => {
  res.render('pages/myplan.hbs')
});


// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests

module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
