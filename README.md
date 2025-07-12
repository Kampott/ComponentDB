# pg-client
PostgreSQL web-based abstraction layer

## Setup:
### 1. Download and install Docker
### 2. Setup .env file in main folder:
Setup your own variables, or use these:

`BACKEND_PORT=8000`

`FRONTEND_PORT=3000`

`POSTGRES_USER=postgres`

`POSTGRES_PASSWORD=postgres`

`POSTGRES_DB=mydb`

`PGADMIN_EMAIL=admin@admin.com`

`PGADMIN_PASSWORD=admin`

`PGADMIN_PORT=5000`
### 3. Setup .env file in /backend folder:
Setup your own variables, or use these:
`DATABASE_URL=postgresql+asyncpg://postgres:postgres@db:5432/mydb`

`BACKEND_PORT=8000`
### 4. Setup .env file in /frontend folder:
Setup your own variables, or use these:
`VITE_API_BASE_URL=http://localhost:8000`
### 4. Install by running in main directory:
on Windows:
`docker compose up --build -d`
on Linux:
`sudo docker compose up --build -d`
### 5. To shut off the webapp:
`docker compose down`

## Access

After starting the project, open in browser:

- Frontend: [http://localhost:3000](http://localhost:3000)
- Backend (API): [http://localhost:8000/docs](http://localhost:8000/docs) (Swagger UI)
- pgAdmin: [http://localhost:5000](http://localhost:5000)  
  - Email: `admin@admin.com`, Password: `admin`