// Database configuration and helper to ensure required tables exist
// src/config/db.js
import pkg from "pg";
import dotenv from "dotenv";
dotenv.config();

const { Pool } = pkg;

// Create a PostgreSQL connection pool using DATABASE_URL from .env
export const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // from .env
  ssl: { rejectUnauthorized: false }, // Supabase requires SSL
});

// Create the users table if it does not already exist
// This table is exactly as given in the task and has not additional data checks or modifications
export async function createUsersTable() {
  const createTableQuery = `
    CREATE TABLE IF NOT EXISTS public.users (
      id SERIAL PRIMARY KEY,
      name VARCHAR NOT NULL,
      age INT NOT NULL,
      address JSONB,
      additional_info JSONB
    );
  `;

  try {
    await pool.query(createTableQuery);
    console.log("✅ Table 'public.users' checked/created successfully");
  } catch (err) {
    console.error("❌ Error creating 'public.users' table:", err.message);
  }
}
