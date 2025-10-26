/*
  src/index.js
  - Application entry point
  - Loads config, initializes DB schema, registers routes and starts the Express server
*/

import express from "express";
import dotenv from "dotenv";
import csvRoutes from "./routes/csvRoutes.js";
import { createUsersTable } from "./config/db.js"; // ensure DB schema

dotenv.config();
const app = express();
app.use(express.json());

// Register routes for CSV processing
// All CSV-related endpoints are under /api/csv
app.use("/api/csv", csvRoutes);

// Initialize DB schema and then start the server
createUsersTable().then(() => {
  app.listen(process.env.PORT, () => {
    console.log(`✅ Server running on port ${process.env.PORT}`)
    console.log('Waiting for CSV uploads at http://localhost:5000/api/csv/upload');
  });
});
