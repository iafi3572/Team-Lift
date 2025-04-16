#!/bin/bash
# DO NOT PUSH THIS FILE TO GITHUB
# This file contains sensitive information and should be kept private
# TODO: Set your PostgreSQL URI - Use the External Database URL from the Render dashboard
PG_URI="postgresql://example_user:5EfBerxd1Z1a71mTV4An5BpCkrJLjMbE@dpg-d000fgs9c44c73fbu490-a.oregon-postgres.render.com/user_db_5uao"
# Execute each .sql file in the directory
for file in src/init_data/*.sql; do
    echo "Executing $file..."
    psql $PG_URI -f "$file"
done