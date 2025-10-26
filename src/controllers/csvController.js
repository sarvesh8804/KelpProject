/*
  src/controllers/csvController.js
  - Controller for CSV-related endpoints
  - Exports `uploadCsv` which reads CSV_FILE_PATH, streams parsing, batch-inserts users,
    computes age distribution and returns a summary response
*/
import fs from "fs";
import { pool } from "../config/db.js";
import { streamParseCsv } from "../utils/csvParser.js";

// Endpoint handler: reads a CSV file, parses and inserts users in batches
export const uploadCsv = async (req, res) => {
  try {
    console.log("📥 Started CSV processing");
    const filePath = process.env.CSV_FILE_PATH;
    if (!filePath) {
      return res.status(400).json({ error: "CSV_FILE_PATH not defined in .env" });
    }

  // Stream-parse CSV and batch-insert records for better memory usage
  // Note: table is created at app startup by createUsersTable() in src/config/db.js
  const batchSize = 500;
    let batch = [];
    let insertedCount = 0;

  // Insert a chunk of records into the database using parameterized query
  async function insertBatch(batchToInsert) {
      if (!batchToInsert.length) return;
      const values = [];
      const params = [];

      batchToInsert.forEach((user, idx) => {
        const base = idx * 4;
        values.push(`($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4})`);
        params.push(user.name, user.age, user.address, user.additional_info);
      });

      const query = `INSERT INTO public.users (name, age, address, additional_info) VALUES ${values.join(",")}`;
      try {
        await pool.query(query, params);
      } catch (err) {
        console.error('❌ Error inserting batch:', err);
        throw new Error('Database insert failed');
      }
    }

  // Stream the CSV file and accumulate records into batches
    let parsedAny = false;
    try {
      for await (const user of streamParseCsv(filePath)) {
        parsedAny = true;
        batch.push(user);
        if (batch.length >= batchSize) {
          await insertBatch(batch);
          insertedCount += batch.length;
          batch = [];
        }
      }
    } catch (err) {
      console.error('❌ Error during CSV streaming/parsing:', err);
      return res.status(500).json({ error: 'CSV parsing or reading failed' });
    }

  // Insert any remaining records after streaming completes
    if (batch.length) {
      try {
        await insertBatch(batch);
        insertedCount += batch.length;
      } catch (err) {
        return res.status(500).json({ error: 'Database insert failed (final batch)' });
      }
    }

    if (!parsedAny) {
      return res.status(400).json({ error: "No valid records found in CSV" });
    }

    console.log(`✅ Inserted ${insertedCount} records from CSV`);

  // Calculate age distribution across stored users
  let groups = { "<20": 0, "20-40": 0, "40-60": 0, ">60": 0 };
    try {
  const result = await pool.query("SELECT age FROM public.users");
      const ages = result.rows.map(r => r.age);
      for (const a of ages) {
        if (a < 20) groups["<20"]++;
        else if (a <= 40) groups["20-40"]++;
        else if (a <= 60) groups["40-60"]++;
        else groups[">60"]++;
      }
      const total = ages.length;
      for (let key in groups) {
        groups[key] = total ? ((groups[key] / total) * 100).toFixed(2) : "0.00";
      }
    } catch (err) {
      console.error('❌ Error calculating age distribution:', err);
      groups = { "<20": "N/A", "20-40": "N/A", "40-60": "N/A", ">60": "N/A" };
    }

  // Print age distribution as a simple ASCII table to the console
  console.log("\n📊 Age Distribution Report:");
  // Prepare rows for the table (age group + percentage)
  const tableRows = Object.entries(groups).map(([ageGroup, percent]) => [ageGroup, percent]);
  // Create table borders and print rows without index column
    const header = ["Age-Group", "% Distribution"];
    const colWidths = [12, 14];
    const border = `┌${"─".repeat(colWidths[0])}┬${"─".repeat(colWidths[1])}┐`;
    const midBorder = `├${"─".repeat(colWidths[0])}┼${"─".repeat(colWidths[1])}┤`;
    const footer = `└${"─".repeat(colWidths[0])}┴${"─".repeat(colWidths[1])}┘`;
    console.log(border);
    console.log(`│${header[0].padEnd(colWidths[0])}│${header[1].padEnd(colWidths[1])}│`);
    console.log(midBorder);
    tableRows.forEach(([ageGroup, percent]) => {
      console.log(`│${ageGroup.padEnd(colWidths[0])}│${percent.toString().padEnd(colWidths[1])}│`);
    });
    console.log(footer);

    // --- 8️⃣ Send clean JSON response ---
    res.json({
      message: "✅ Upload complete",
      records_inserted: insertedCount,
      age_distribution: {
        "<20": groups["<20"],
        "20-40": groups["20-40"],
        "40-60": groups["40-60"],
        ">60": groups[">60"]
      }
    });

  } catch (err) {
    console.error("❌ Error:", err);
    res.status(500).json({ error: err.message });
  }
};
