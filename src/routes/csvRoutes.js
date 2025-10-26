/*
	src/routes/csvRoutes.js
	- Defines CSV-related HTTP routes
	- Currently exposes GET /api/csv/upload which calls the controller to process the CSV
*/
import express from "express";
import { uploadCsv } from "../controllers/csvController.js";

const router = express.Router();

// GET /api/csv/upload — trigger CSV processing and DB insert
router.get("/upload", uploadCsv);

export default router;
