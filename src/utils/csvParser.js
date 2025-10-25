// Utility helpers for CSV parsing
// src/utils/csvParser.js

// Split a CSV line into fields, handling quoted values and escaped quotes
/**
 * Example: `"A-563, Rakshak Society", Pune` → ["A-563, Rakshak Society", "Pune"]
 */
function splitCsvLine(line) {
  const result = [];
  let curr = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      // Handle escaped quotes ("")
      if (inQuotes && line[i + 1] === '"') {
        curr += '"';
        i++; // skip next quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(curr);
      curr = "";
    } else {
      curr += ch;
    }
  }

  result.push(curr);
  return result.map(s => s.trim());
}

// Set a nested property using dot notation (e.g., "address.city")
/**
 * Example: setNested(obj, "address.line1", "abc") → obj = { address: { line1: "abc" } }
 */
function setNested(obj, path, value) {
  const keys = path.split(".");
  let curr = obj;

  for (let i = 0; i < keys.length - 1; i++) {
    if (!curr[keys[i]]) curr[keys[i]] = {};
    curr = curr[keys[i]];
  }

  curr[keys[keys.length - 1]] = value;
}

// Parse an entire CSV string into an array of user objects
/**
 * Converts CSV text into structured JSON, handles nested headers and basic validation
 */
export const parseCsvToJson = (csvText) => {
  // Normalize CRLF and split lines so parser works on Windows and Unix files
  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = splitCsvLine(lines[0]).map(h => h.trim());
  const result = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    const values = splitCsvLine(line);
    const obj = {};

    headers.forEach((header, j) => {
      let val = values[j] ?? "";

      // Remove surrounding quotes, if any
      if (val.startsWith('"') && val.endsWith('"')) {
        val = val.slice(1, -1);
      }

      setNested(obj, header, val);
    });

    const { name, age, address, ...rest } = obj;

    // ✅ Safety checks
    const firstName = name?.firstName ?? "";
    const lastName = name?.lastName ?? "";
  const numericAge = parseInt(age, 10);

    if (!firstName && !lastName) {
      console.warn(`⚠️ Row ${i + 1}: Missing name — skipping.`);
      continue;
    }

    if (isNaN(numericAge) || numericAge <= 0 || numericAge > 120) {
      console.warn(`⚠️ Row ${i + 1}: Invalid age '${age}' — skipping.`);
      continue;
    }

    result.push({
      name: `${firstName} ${lastName}`.trim(),
      age: numericAge,
      address: address || {},
      additional_info: rest,
    });
  }

  return result;
};

// Streaming parser: yields one validated user at a time to keep memory use low
// Note: assumes no newline characters inside quoted CSV fields
import fs from "fs";
import readline from "readline";

// Async generator that streams the CSV file and yields validated user objects
export async function* streamParseCsv(filePath) {
  let stream, rl;
  try {
    stream = fs.createReadStream(filePath, { encoding: "utf8" });
    rl = readline.createInterface({ input: stream, crlfDelay: Infinity });
  } catch (err) {
    console.error('❌ Error opening CSV file:', err);
    throw new Error('Failed to open CSV file');
  }

  let headers = null;
  let lineIndex = 0;

  try {
    for await (const rawLine of rl) {
      const line = rawLine.trim();
      if (lineIndex === 0) {
        headers = splitCsvLine(line).map(h => h.trim());
        lineIndex++;
        continue;
      }

      lineIndex++;
      if (!line) continue;

      const values = splitCsvLine(line);
      const obj = {};

      headers.forEach((header, j) => {
        let val = values[j] ?? "";
        if (val.startsWith('"') && val.endsWith('"')) {
          val = val.slice(1, -1);
        }
        setNested(obj, header, val);
      });

      // Validate parsed fields and skip invalid rows
      const { name, age, address, ...rest } = obj;
      const firstName = name?.firstName ?? "";
      const lastName = name?.lastName ?? "";
      const numericAge = parseInt(age, 10);

      if (!firstName && !lastName) {
        // skip invalid record
        continue;
      }

      if (isNaN(numericAge) || numericAge <= 0 || numericAge > 120) {
        continue;
      }

      // Yield a normalized user object for insertion/processing
      yield {
        name: `${firstName} ${lastName}`.trim(),
        age: numericAge,
        address: address || {},
        additional_info: rest,
      };
    }
  } catch (err) {
    console.error('❌ Error reading/parsing CSV file:', err);
    throw new Error('CSV file read/parse failed');
  }
}
