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
    workout_muscle VARCHAR(255) NOT NULL,
    time_hours INT,
    time_minutes INT,
    FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS workout_sets (
    set_id SERIAL PRIMARY KEY,
    set_name VARCHAR(255) NOT NULL,
    username VARCHAR(50) NOT NULL,
    FOREIGN KEY (username) REFERENCES users(username)
);

CREATE TABLE IF NOT EXISTS workout_set_items (
    set_id INT NOT NULL,
    workout_id INT NOT NULL,
    order_index INT NOT NULL DEFAULT 1,
    PRIMARY KEY (set_id, workout_id),
    FOREIGN KEY (set_id) REFERENCES workout_sets(set_id),
    FOREIGN KEY (workout_id) REFERENCES workouts(workout_id)
);

CREATE TABLE IF NOT EXISTS workout_schedule (
    schedule_id SERIAL PRIMARY KEY,
    username VARCHAR(50) NOT NULL,
    set_id INT NOT NULL,
    day_of_week VARCHAR(10) NOT NULL CHECK (day_of_week IN 
        ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday')),
    start_time TIME NOT NULL,
    duration_hours INT DEFAULT 0,
    duration_minutes INT DEFAULT 0,
    FOREIGN KEY (username) REFERENCES users(username),
    FOREIGN KEY (set_id) REFERENCES workout_sets(set_id)
);
