# Kelp CSV to JSON Converter API

## Project Structure and Code Flow

```
src/
├── index.js              # Entry point: Sets up Express and DB
├── routes/
│   └── csvRoutes.js      # Defines the /api/csv/upload endpoint
├── controllers/
│   └── csvController.js  # Handles file processing and analytics
├── utils/
│   └── csvParser.js      # CSV parsing with streaming support
└── config/
    └── db.js            # Database setup and schema management
```

### Code Flow

1. **App Initialization** (`index.js`)
   - Loads config from `.env`
   - Creates Express app
   - Sets up DB schema via `db.js`
   - Registers routes from `csvRoutes.js`

2. **Request Processing**
   - Request hits `/api/csv/upload` → `csvRoutes.js`
   - Route calls `uploadCsv()` in `csvController.js`
   - Controller uses `csvParser.js` to stream and parse CSV
   - Parsed records are batched and stored via `db.js`
   - Age stats are calculated and returned

3. **CSV Processing** (`csvParser.js`)
   - Streams file line by line to save memory
   - Parses headers for nested fields (dot notation)
   - Validates each record (name, age)
   - Yields clean objects for DB insert

### Database Schema
## Features
- **Custom CSV parser**: Handles dot-separated headers, quoted fields, and nested objects
- **Streaming import**: Processes large files with low memory usage
- **Postgres integration**: Maps mandatory and additional fields to appropriate columns
- **Configurable**: Uses environment variables for DB and CSV file path
- **Age distribution report**: Prints user age group percentages after upload

## Table Structure
The API creates the following table if it does not exist:
```sql
CREATE TABLE IF NOT EXISTS public.users (
  id SERIAL PRIMARY KEY,
  name VARCHAR NOT NULL,
  age INT NOT NULL,
  address JSONB,
  additional_info JSONB
);
```
- `name`: Concatenation of `name.firstName` and `name.lastName`
- `age`: Integer
- `address`: Nested address object (JSONB)
- `additional_info`: All other fields as JSONB

## How It Works
1. On server start, ensures the `public.users` table exists
2. On GET `/api/csv/upload`, reads the CSV file from the path in `.env`
3. Streams and parses each row, mapping fields as described
4. Inserts records into `public.users` in batches for performance
5. After upload, queries `public.users` and prints age distribution to the console
6. Returns a summary JSON response

## Usage
### 1. Clone and Install
```powershell
git clone <your-repo-url>
cd kelp-project
npm install
```

### 2. Configure Environment
Create a `.env` file in the project root:
```
PORT=5000
# If you don't have your own Supabase account, use this ready-to-use database URL:
DATABASE_URL=postgresql://postgres:sarveshhuddar@db.kxyshwheqxmklkkyznbt.supabase.co:5432/postgres
# Or if you have your own Supabase/PostgreSQL database:
# DATABASE_URL=postgres://<user>:<password>@<host>:<port>/<db>
CSV_FILE_PATH=src/data/users.csv
```

### 3. Prepare Your CSV

#### Option 1: Use Sample Data
There's a sample CSV file included for testing:
1. Check `src/data/sample.csv` for example data format
2. In `.env`, the default path points to this sample:
   ```
   CSV_FILE_PATH=src/data/sample.csv
   ```

#### Option 2: Use Your Own CSV
- Place your CSV file in the `src/data` folder
- Update `CSV_FILE_PATH` in `.env` to point to your file
- Example: If your file is `users.csv`, set:
  ```
  CSV_FILE_PATH=src/data/users.csv
  ```

#### CSV Format Requirements
- First line must be headers (e.g. `name.firstName,name.lastName,age,address.line1,...`)
- All sub-properties of a complex property must be grouped together

### 4. Start the Server
```powershell
npm run start
```

### 5. Upload Data
Send a GET request to trigger the upload:
```powershell
curl http://localhost:5000/api/csv/upload
```

### 6. View Age Distribution
After upload, check the console for a report like:
```
📊 Age Distribution Report:
┌─────────┬────────────┐
│ (index) │   Value    │
├─────────┼────────────┤
│  <20    │ 20.00      │
│  20-40  │ 45.00      │
│  40-60  │ 25.00      │
│  >60    │ 10.00      │
└─────────┴────────────┘
```

## Assumptions
- CSV fields do not contain embedded newlines inside quoted fields
- Node.js 18+ is used (for ES modules and async iterators)
- PostgreSQL is accessible and credentials are correct
- No SQL constraints beyond the table definition as per task requirements:
  - Duplicate records are allowed
  - No unique constraints on name or other fields
- Data management limitations:
  - Once data is inserted, it can only be deleted by the database admin
  - No built-in API endpoints for data modification or deletion
  - Direct database access required for data cleanup

## Contact
For questions or improvements, please reach out via GitHub or email.
