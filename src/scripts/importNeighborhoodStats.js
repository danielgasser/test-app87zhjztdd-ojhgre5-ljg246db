/**
 * Import neighborhood_stats data into Supabase
 *
 * Usage:
 *   node scripts/importNeighborhoodStats.js
 *
 * Requires:
 *   - neighborhood_stats_data.json in same directory
 *   - SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env
 *   - Run the migration first: create_batch_insert_neighborhood_stats_function.sql
 */

const { createClient } = require("@supabase/supabase-js");
const fs = require("fs");
const path = require("path");

require("dotenv").config({ path: ".env.local" });

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
console.log("Using Supabase URL:", SUPABASE_URL);
console.log("Using Supabase Service Key:", SUPABASE_SERVICE_KEY ? "YES" : "NO");
if (!SUPABASE_SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const BATCH_SIZE = 100;

async function importData() {
  const dataPath = path.join(__dirname, "neighborhood_stats_data.json");

  if (!fs.existsSync(dataPath)) {
    console.error(`Data file not found: ${dataPath}`);
    console.error(
      "Make sure neighborhood_stats_data.json is in the scripts folder"
    );
    process.exit(1);
  }

  const records = JSON.parse(fs.readFileSync(dataPath, "utf-8"));

  console.log(`Loaded ${records.length} records`);
  console.log(`Processing in batches of ${BATCH_SIZE}...`);

  let imported = 0;
  let errors = 0;
  const startTime = Date.now();

  for (let i = 0; i < records.length; i += BATCH_SIZE) {
    const batch = records.slice(i, i + BATCH_SIZE);

    const { data, error } = await supabase.rpc(
      "batch_insert_neighborhood_stats",
      {
        p_records: batch,
      }
    );

    if (error) {
      console.error(
        `\nBatch ${Math.floor(i / BATCH_SIZE) + 1} error:`,
        error.message
      );
      errors += batch.length;
    } else {
      imported += data || batch.length;
    }

    const progress = Math.round(((i + batch.length) / records.length) * 100);
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
    process.stdout.write(
      `\rProgress: ${progress}% | ${imported} imported | ${elapsed}s elapsed`
    );
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log(`\n\n✅ Import complete!`);
  console.log(`   Records: ${imported.toLocaleString()}`);
  console.log(`   Errors: ${errors}`);
  console.log(`   Time: ${totalTime}s`);
}

importData().catch(console.error);
