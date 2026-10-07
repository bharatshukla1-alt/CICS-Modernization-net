# MG-01-Run-Guide.md

## Overview
This run guide provides the instructions to start the Transaction Type List and Maintenance Details screens locally. It launches the .NET Core 9 backend (`TransactionTypeService`), the React frontend, and connects to the Postgres database.

## Prerequisites
Ensure the following tools and runtimes are installed on your local machine:
- **Node.js**: (v18 or higher recommended) for running the React frontend.
- **.NET SDK**: v9.0 for running the C# backend.
- **Postgres Database**: Running locally or accessible via network.
- **Placeholders**: You must supply the following values before starting:
  - `<DB_PASSWORD>`: Your Postgres database password.
  - `<OAUTH_ISSUER>`: The URL of your OAuth 2.0 Authorization Server (e.g., Keycloak, Auth0, or Azure AD).

## Database
The application requires the Postgres database to be running and seeded with the target schema.
1. Confirm your Postgres instance is running.
2. Ensure the `CARDDEMO` database exists.
3. Verify that the `TRANSACTION_TYPE` table has been created and seeded with initial reference data (this should have been provisioned by the earlier Database migration phase). No specific DDL commands need to be run here if the database is already prepared.

## Backend
The backend is a .NET Core 9 Web API service.
1. Open a terminal and navigate to the backend API directory:
   ```bash
   cd target/MG-01/backend/TransactionTypeService/src/TransactionTypeService.Api
   ```
2. Configure the required environment variables. (You can set these in your shell or update `appsettings.Development.json`):
   ```bash
   export ConnectionStrings__DefaultConnection="Host=localhost;Database=CARDDEMO;Username=postgres;Password=<DB_PASSWORD>"
   export Jwt__Issuer="<OAUTH_ISSUER>"
   ```
3. Start the backend service:
   ```bash
   dotnet run
   ```
4. The backend service will start and listen on port `5001`. The API base URL is: `https://localhost:5001/api/v1`

## Frontend
The frontend is a React SPA using Vite (or similar dev server).
1. Open a new terminal window and navigate to the frontend directory:
   ```bash
   cd target/MG-01/frontend
   ```
2. Create or update the `.env.local` file with the configuration to point to the backend and auth server:
   ```env
   VITE_API_BASE_URL=https://localhost:5001/api/v1
   VITE_AUTH_DOMAIN=<OAUTH_ISSUER>
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Start the frontend development server:
   ```bash
   npm run dev
   ```
5. The frontend will start and typically serve on `http://localhost:5173`.

## Verify the screen
1. Open a web browser and navigate to the frontend URL (e.g., `http://localhost:5173`).
2. If prompted by the application, log in using your OAuth credentials (ensure your test user has the administrative role mapped to `TXN_TYPE_ADMIN`).
3. Navigate to the **Transaction Type List** screen (e.g., `/maintenance`).
4. Verify the screen loads and displays the seeded transaction types in the data table.
5. Perform a primary action round-trip: Click the "Edit" button on a row, change the description slightly, and click "Save". Verify a success message is shown and the change is reflected in the list.

## Start/Stop order & Troubleshooting
### Start Order
1. **Database**: Postgres must be running and accessible.
2. **Backend**: Start the .NET Core API so it can connect to the DB and serve the frontend.
3. **Frontend**: Start the React app last so it can consume the API.

### Stop Order
- Stop the Frontend (`Ctrl+C` in the frontend terminal).
- Stop the Backend (`Ctrl+C` in the backend terminal).
- Stop the Database (if running locally/via Docker).

### Troubleshooting
- **Port already in use**: If `5001` or `5173` is occupied, change the port using `dotnet run --urls=https://localhost:<NEW_PORT>` or Vite's port flag, and update `.env.local` accordingly.
- **Database not reachable (503 Error)**: If the UI shows "The service is temporarily unavailable", double-check the `ConnectionStrings__DefaultConnection` environment variable, ensuring the Host, Port, Username, and `<DB_PASSWORD>` are correct.
- **CORS Errors / Network Failures**: Ensure the backend's CORS policy is configured to allow requests from the frontend's origin (`http://localhost:5173`). Check the browser console for details.
- **401/403 Auth Errors**: Verify that your OAuth token is valid and hasn't expired. Ensure the `<OAUTH_ISSUER>` matches exactly between the frontend `.env.local` and backend environment variables.
