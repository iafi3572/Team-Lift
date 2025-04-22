CREATE TABLE IF NOT EXISTS users (
    username VARCHAR(50) PRIMARY KEY,
    hash_password VARCHAR(255) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    birthday DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS workouts (
    workout_id SERIAL PRIMARY KEY,
    username VARCHAR(50), 
    workout_name VARCHAR(255) NOT NULL, 
    time_hours INT,
    time_minutes INT,
    FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS workout_schedule (
    schedule_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    workout_id INT NOT NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN 
        ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (workout_id) REFERENCES workouts(workout_id)
);

CREATE TABLE IF NOT EXISTS workout_exercises (
    workout_id INT,
    exercise_name VARCHAR(255),
    muscle_target VARCHAR(255),
    PRIMARY KEY (workout_id, exercise_name),
    FOREIGN KEY (workout_id) REFERENCES workouts(workout_id)
);

CREATE TABLE IF NOT EXISTS goals (
    goal_id SERIAL PRIMARY KEY,
    username VARCHAR(50) REFERENCES users(username),
    goal_text TEXT NOT NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercise_log (
    log_id SERIAL PRIMARY KEY,
    username VARCHAR(50) REFERENCES users(username),
    exercise_name VARCHAR(255) NOT NULL,
    reps INT,
    weight DECIMAL,
    log_date DATE DEFAULT CURRENT_DATE
);

CREATE OR REPLACE FUNCTION refresh_avg_cache()
RETURNS TRIGGER AS $$
BEGIN
    NOTIFY refresh_averages;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER exercise_log_update
AFTER INSERT OR UPDATE OR DELETE ON exercise_log
FOR EACH STATEMENT EXECUTE FUNCTION refresh_avg_cache();
CREATE TABLE IF NOT EXISTS default_workouts (
    workout_name VARCHAR(255) PRIMARY KEY,
    time_hours INT,
    time_minutes INT,
    num_exercises INT
);

CREATE TABLE IF NOT EXISTS default_workout_exercises (
    workout_name VARCHAR(255),
    exercise_name VARCHAR(255),
    muscle_target VARCHAR(255),
    PRIMARY KEY (workout_name, exercise_name),
    FOREIGN KEY (workout_name) REFERENCES default_workouts(workout_name)
);


CREATE TABLE exercises (
  bodyPart VARCHAR(50),
  equipment VARCHAR(50),
  gifUrl VARCHAR(255),
  id INT PRIMARY KEY,
  exercise_name VARCHAR(50),
  muscle_target VARCHAR(50),
  instructions TEXT
);
