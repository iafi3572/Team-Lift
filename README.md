
# About


## Team-Lift


### DESCRIPTION:
This application offers a personalized fitness experience by requiring users to create unique accounts and log in to access their dashboard. After the user has logged in, they will be directed to a home page where they will be provided with an introduction to their fitness options and their daily schedule. The user will then be able to navigate to the exercises page, tracking page, my workouts page, and my plan page. The exercises page allows users to look for specific exercises and provides them with basic info on them, such as what muscles they work and how to do them through videos, implemented with a Youtube API. The tracking page holds the user's current goals, personal records, and reps and weights of workouts they completed. The my workouts page has presets for various workout types, along with functionality allowing the user to choose from and create presets for different days of workouts. These presets will include all the different workouts that person will do for that day. The my plan page is where the user can assign different workouts to different days and fully modify their weekly schedule.


---


### CONTRIBUTORS:
- Ian Fischer 
- Samuel Hagen 
- Matthew Cooper 
- Lana Reeves 
- Kirin Kawamoto


---




### TECHNOLOGY STACK USED:


**Frontend:** 
- HTML templating with Handlebars + CSS/JS 


**Backend:** 
- Node.js with Express 


**Database:** 
- SQL (PostgreSQL) 


**HTTP Client:** 
- Axios 


**Testing:** 
- Mocha, Chai 


**DevOps:** 
- Docker 


**Version Control:** 
- Git 


---


### Prerequisites to run the application


To run this application, ensure the following software is installed on your system:


- **Git** – To clone the repository. 
- **Node.js and npm** – For running the backend and installing dependencies. 
- **Docker** – To run the app and PostgreSQL in containers.


---


### Instructions on how to run the application locally:


1. **Open a terminal**
2. **Ensure Git is installed** ```bash git --version ```
3. **Clone the repository** ```bash git clone https://github.com/sagen704/Team-Lift.git ```
4. **Navigate to the project directory** ```bash cd ProjectSourceCode ```
5. **Create a `.env` file with necessary variables**


  ```env
  SESSION_SECRET="secretkey"
  POSTGRES_USER="postgres"
  POSTGRES_PASSWORD="password123"
  POSTGRES_DB="database"
  POSTGRES_HOST="db"
  POSTGRES_PORT="5432"


  EX_API_KEY="Your Rapid API Exercise DB Key"
  YT_API_KEY="Your Youtube API Key"


   ```
6. **Make sure Docker is running**
7. **Start the application** ```bash docker compose up ```
