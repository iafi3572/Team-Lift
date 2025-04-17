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
  helpers: {
    ifEquals: function (a, b, options) {
      return a === b ? options.fn(this) : options.inverse(this);
    }
    // You can add more helpers here
  },
});

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

app.use("/img", express.static(path.join(__dirname, "resources/img")));

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
    // console.log(mergedExercises);

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

const weekLabels = [
  { id: "sun", label: "Sunday" },
  { id: "mon", label: "Monday" },
  { id: "tues", label: "Tuesday" },
  { id: "wed", label: "Wednesday" },
  { id: "thurs", label: "Thursday" },
  { id: "fri", label: "Friday" },
  { id: "sat", label: "Saturday" },
];

app.get("/home", async (req, res) => {
  const username = req.session.user?.username;
  if (!username) return res.redirect("/login");

  try {
    const date = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Denver",
    });
    const today = new Date().toLocaleDateString("en-US", {
      timeZone: "America/Denver",
      weekday: "long",
    });

    // Get today's scheduled workouts
    const scheduledSets = await db.any(
      `
      SELECT
        ws.start_time,
        w.workout_name,
        w.time_hours AS duration_hours,
        w.time_minutes AS duration_minutes,
        w.workout_id
      FROM workout_schedule ws
      JOIN workouts w ON ws.workout_id = w.workout_id
      WHERE ws.username = $1 AND ws.day_of_week = $2
      ORDER BY ws.start_time;
    `,
      [username, today]
    );

    // Add exercises to each workout
    for (const set of scheduledSets) {
      const exercises = await db.any(
        `
        SELECT exercise_name, muscle_target
        FROM workout_exercises
        WHERE workout_id = $1;
      `,
        [set.workout_id]
      );

      set.exercises = exercises;
      set.start_time = set.start_time.slice(0, 5); // format time
    }

    res.render("pages/home", {
      date: date,
      scheduledSets,
    });
  } catch (err) {
    console.error("Error loading home page:", err);
    res.render("pages/home", {
      date: "",
      scheduledSets: [],
      message: "Error loading today’s plan.",
      error: true,
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

app.get("/myplan", async (req, res) => {
  const username = req.session.user?.username;
  if (!username) return res.redirect("/login");

  try {
    // Step 1: Get scheduled workouts for the user
    const scheduledWorkouts = await db.any(
      `
      SELECT
        ws.schedule_id,
        ws.day_of_week,
        ws.start_time,
        w.workout_id,
        w.workout_name,
        w.time_hours,
        w.time_minutes
      FROM workout_schedule ws
      JOIN workouts w ON ws.workout_id = w.workout_id
      WHERE ws.username = $1
      ORDER BY ws.day_of_week, ws.start_time;
    `,
      [username]
    );

    // Step 2: Attach exercises to each scheduled workout individually
    for (const workout of scheduledWorkouts) {
      const exercises = await db.any(
        `
        SELECT exercise_name, muscle_target
        FROM workout_exercises
        WHERE workout_id = $1;
      `,
        [workout.workout_id]
      );

      workout.exercises = exercises;
      workout.start_time = workout.start_time.slice(0, 5); // format to HH:MM
    }

    // Step 3: Group workouts by day
    const scheduleByDay = {};
    for (const workout of scheduledWorkouts) {
      if (!scheduleByDay[workout.day_of_week]) {
        scheduleByDay[workout.day_of_week] = [];
      }
      scheduleByDay[workout.day_of_week].push(workout);
    }

    // Step 4: Map into final format using external weekLabels
    const weekdays = weekLabels.map((day) => ({
      ...day,
      scheduledWorkouts: scheduleByDay[day.label] || [],
    }));

    // Step 5: Fetch user-created workouts
    const allWorkouts = await db.any(
      `
      SELECT workout_id, workout_name
      FROM workouts
      WHERE username = $1
        AND EXISTS (
          SELECT 1 FROM workout_exercises
          WHERE workout_exercises.workout_id = workouts.workout_id
        )
      ORDER BY workout_name;
    `,
      [username]
    );

    res.render("pages/myplan", {
      weekdays,
      allWorkouts,
    });
  } catch (err) {
    console.error("Error loading schedule:", err);
    res.render("pages/myplan", {
      weekdays: [],
      allWorkouts: [],
      message: "Failed to load schedule.",
      error: true,
    });
  }
});

app.post("/myplan/add", async (req, res) => {
  try {
    const username = req.session.user?.username;
    if (!username) return res.redirect("/login");

    const { day_of_week, start_time, workout_id } = req.body;

    if (!day_of_week || !start_time || !workout_id) {
      throw new Error("Missing required fields");
    }

    await db.none(
      `INSERT INTO workout_schedule (username, workout_id, day_of_week, start_time)
       VALUES ($1, $2, $3, $4)`,
      [username, workout_id, day_of_week, start_time]
    );

    res.redirect("/myplan");
  } catch (err) {
    console.error("Error adding workout to schedule:", err);
    res.status(400).render("pages/myplan", {
      message: "Failed to add workout. Please check your inputs.",
      error: true,
      weekdays: [],
      allWorkouts: [],
    });
  }
});


//delete a workout from schedule
app.post('/myplan/deleteWorkout', async (req, res) => {
  const { scheduleId } = req.body;
  
  try {
    await db.query('DELETE FROM workout_schedule WHERE schedule_id = $1', [scheduleId]);
    
    res.redirect('/myplan?message=Workout Deleted from Schedule');
  
  } catch (err) {
      res.status(500).render("pages/myplan", {
      message: `Error deleting workout from workout. Please try again`,
      error: true,
  })
  }
});

//edit workout date/time
app.post('/myplan/editWorkout', async (req, res) => {
  const { scheduleId } = req.body;
  let day_of_week = req.body.day_of_week;
  let start_time = req.body.start_time;

  try {

    await db.query(`UPDATE workout_schedule SET day_of_week = $1, start_time = $2 WHERE schedule_id = $3`, [day_of_week, start_time, scheduleId]);
    
    res.redirect('/myplan?message=Workout Edited');
  
  } catch (err) {
      res.status(500).render("pages/myplan", {
      message: `Error editing workout in schedule. Please try again`,
      error: true,
  })
  }
});



//myworkouts page
//adds default workouts
app.post("/add_default_workout", async (req, res) => {
  try {
    const workouts = req.body;
    const username = req.session.user.username;

    let defaultWorkout = await db.one(
      `SELECT * FROM default_workouts WHERE workout_name = $1;`,
      [workouts.workouts]
    );

    let workoutName = defaultWorkout.workout_name;
    let hour = defaultWorkout.time_hours;
    let min = defaultWorkout.time_minutes;
    workout_id = await db.one(
      `INSERT INTO workouts (username, workout_name,time_hours, time_minutes) VALUES ($1, $2, $3, $4) RETURNING workout_id;`,
      [username, workoutName, hour, min]
    );

    const exercises = await db.any(
      `SELECT exercise_name, muscle_target FROM default_workout_exercises 
      WHERE workout_name = $1;`,
      [workoutName]
    );

    for (const exercise of exercises) {
      await db.none(
        `
        INSERT INTO workout_exercises (workout_id,exercise_name,muscle_target) VALUES ($1, $2,$3);`,
        [workout_id.workout_id, exercise.exercise_name, exercise.muscle_target]
      );
    }

    res.redirect("/myworkouts");
  } catch (err) {
    console.log(err);
    res.redirect("/myworkouts");
  }
});

//adds new workouts
app.post("/myworkouts", async (req, res) => {
  let workoutName = req.body.workoutName;
  let hour = req.body.hour;
  let min = req.body.min;
  const username = req.session.user.username;

  const selectedExercises = req.body.exercises;

  try {
    //adds data into workout database
    workout_id = await db.one(
      `
      INSERT INTO workouts (username, workout_name,time_hours, time_minutes) VALUES ($1, $2, $3, $4) RETURNING workout_id;`,
      [username, workoutName, hour, min]
    );

    //adds the exercises from the workout into the workout_exercises database
    for (const exercise of selectedExercises) {
      muscle_group = await db.one(
        `SELECT muscle_target FROM exercises WHERE exercise_name = $1;`,
        [exercise]
      );

      await db.none(
        `
        INSERT INTO workout_exercises (workout_id,exercise_name,muscle_target) VALUES ($1, $2,$3);`,
        [workout_id.workout_id, exercise, muscle_group.muscle_target]
      );
    }

    res.redirect("/myworkouts");
  } catch (err) {
    res.status(500).render("pages/myworkouts", {
      message: `Error saving workout. Please try again`,
      error: true,
    });
  }
});

app.get("/myworkouts", async (req, res) => {
  const message = req.query.message;
  const username = req.session.user.username;

  try {
    //gets the workouts for the user to display
    const workouts = await db.any(
      "SELECT * FROM workouts WHERE username = $1;",
      [username]
    );

    for (const workout of workouts) {
      // gets the exercises for each workout based on workout_id
      const exercises = await db.any(
        `
        SELECT exercise_name, muscle_target FROM workout_exercises 
        WHERE workout_id = $1;`,
        [workout.workout_id]
      );

      // Add the exercises to the workout
      workout.exercises = exercises;
    }

    //gets all muscle target groups
    const muscleTarget = await db.any(
      "SELECT DISTINCT muscle_target FROM exercises;"
    );

    //gets all the exercises within each muscle target group
    const exercisesByMuscleTarget = [];
    for (const workout of workouts) {
      // gets the exercises for each workout based on workout_id
      const exercises = await db.any(
        `
        SELECT exercise_name, muscle_target FROM workout_exercises 
        WHERE workout_id = $1;`,
        [workout.workout_id]
      );

      // Add the exercises to the workout
      workout.exercises = exercises;
    }
    for (const muscle of muscleTarget) {
      const exercises = await db.any(
        `SELECT exercise_name FROM exercises WHERE muscle_target = $1`,
        [muscle.muscle_target]
      );

      exercisesByMuscleTarget.push({
        muscleTarget: muscle.muscle_target,
        exercises: exercises,
      });
    }
    //gets all default workouts
    const defaultWorkouts = await db.any(`SELECT * FROM default_workouts;`);

    //gets exercises for default workouts
    for (const workout of defaultWorkouts) {
      // gets the exercises for each workout based on workout_id
      const exercises = await db.any(
        `
        SELECT exercise_name, muscle_target FROM default_workout_exercises 
        WHERE workout_name = $1;`,
        [workout.workout_name]
      );
      // Add the exercises to the workout
      workout.exercises = exercises;
    }

    res.render("pages/myworkouts", {
      workouts,
      exercisesByMuscleTarget,
      defaultWorkouts,
      message,
    });
  } catch (err) {
    res.status(500).render("pages/myworkouts", {
      error: true,
      message: "Could not load workouts. Please try again",
    });
  }
});

//delete a workout
app.post("/deleteWorkout", async (req, res) => {
  const { workoutId } = req.body;

  try {

    await db.query('DELETE FROM workout_exercises WHERE workout_id = $1', [workoutId]);
    await db.query('DELETE FROM workout_schedule WHERE workout_id = $1', [workoutId]);
    await db.query('DELETE FROM workouts WHERE workout_id = $1', [workoutId]);
    
    res.redirect('/myworkouts?message=Workout Deleted');
  

    await db.query("DELETE FROM workout_schedule WHERE workout_id = $1", [
      workoutId,
    ]);
    await db.query("DELETE FROM workout_exercises WHERE workout_id = $1", [
      workoutId,
    ]);
    await db.query("DELETE FROM workouts WHERE workout_id = $1", [workoutId]);

    res.redirect("/myworkouts?message=Workout Deleted");

  } catch (err) {
    res.status(500).render("pages/myworkouts", {
      message: `Error deleting workout. Please try again`,
      error: true,
    });
  }
});

//edit a workout
app.post("/editWorkout", async (req, res) => {
  const { workoutId } = req.body;
  let workoutName = req.body.workoutName;
  let hour = req.body.hour;
  let min = req.body.min;
  console.log(workoutId, workoutName, hour, min);
  try {
    await db.query(
      `UPDATE workouts SET workout_name = $1, time_hours = $2, time_minutes = $3 WHERE workout_id = $4`,
      [workoutName, hour, min, workoutId]
    );

    res.redirect("/myworkouts?message=Workout Edited");
  } catch (err) {
    res.status(500).render("pages/myworkouts", {
      message: `Error editing workout. Please try again`,
      error: true,
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

app.get("/myplan", (req, res) => {
  res.render("pages/myplan.hbs");
});

// Goals endpoints
app.get('/api/goals', async (req, res) => {
  try {
      const goals = await db.any(
          'SELECT * FROM goals WHERE username = $1 ORDER BY created_at DESC',
          [req.session.user.username]
      );
      res.json(goals);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.post('/api/goals', async (req, res) => {
  try {
      const newGoal = await db.one(
          'INSERT INTO goals (username, goal_text) VALUES ($1, $2) RETURNING *',
          [req.session.user.username, req.body.goalText]
      );
      res.json(newGoal);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.put('/api/goals/:id', async (req, res) => {
  try {
      await db.none(
          'UPDATE goals SET completed = $1 WHERE goal_id = $2 AND username = $3',
          [req.body.completed, req.params.id, req.session.user.username]
      );
      res.sendStatus(200);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.delete('/api/goals/:id', async (req, res) => {
  try {
      await db.none(
          'DELETE FROM goals WHERE goal_id = $1 AND username = $2',
          [req.params.id, req.session.user.username]
      );
      res.sendStatus(200);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// Exercise log endpoints
app.post('/api/exercise-log', async (req, res) => {
  try {
      await db.none(
          `INSERT INTO exercise_log (username, exercise_name, reps, weight)
           VALUES ($1, $2, $3, $4)`,
          [req.session.user.username, req.body.name, req.body.reps, req.body.weight]
      );
      
      // Force refresh the averages calculation
      await db.none('NOTIFY refresh_averages');
      
      res.sendStatus(201);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get('/api/averages/:exercise', async (req, res) => {
  try {
      const avg = await db.oneOrNone(
          `SELECT AVG(reps) as avg_reps, AVG(weight) as avg_weight 
           FROM exercise_log 
           WHERE username = $1 AND exercise_name = $2`,
          [req.session.user.username, req.params.exercise]
      );
      res.json(avg);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

app.get("/tracking", async (req, res) => {
  try {
      const username = req.session.user.username;
      const today = new Date().toLocaleDateString('en-US', { weekday: 'long' });
      
      // Get today's scheduled workouts
      const scheduledWorkouts = await db.any(`
          SELECT we.exercise_name
          FROM workout_schedule ws
          JOIN workout_exercises we ON ws.workout_id = we.workout_id
          WHERE ws.username = $1 AND ws.day_of_week = $2
      `, [username, today]);

      res.render("pages/tracking", {
          exercises: scheduledWorkouts.map(w => w.exercise_name)
      });
  } catch (error) {
      console.error(error);
      res.render("pages/tracking", { exercises: [] });
  }
});

app.get('/api/history/:exercise', async (req, res) => {
  try {
      const history = await db.any(
          `SELECT reps, weight, log_date 
           FROM exercise_log 
           WHERE username = $1 AND exercise_name = $2
           ORDER BY log_date ASC`,
          [req.session.user.username, req.params.exercise]
      );
      res.json(history);
  } catch (error) {
      res.status(500).json({ error: error.message });
  }
});

// *****************************************************
// <!-- Section 5 : Start Server-->
// *****************************************************
// starting the server and keeping the connection open to listen for more requests

module.exports = app.listen(3000);
console.log("Server is listening on port 3000");
