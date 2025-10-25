// Route definitions for CSV endpoints
import express from "express";
import { uploadCsv } from "../controllers/csvController.js";

const router = express.Router();

// GET /api/csv/upload — trigger CSV processing and DB insert
router.get("/upload", uploadCsv);

export default router;
