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