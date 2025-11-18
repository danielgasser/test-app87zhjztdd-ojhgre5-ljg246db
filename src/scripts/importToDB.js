#!/usr/bin/env node

/**
 * Import Locations and Reviews CSVs to Supabase
 *
 * Usage:
 *   node scripts/importToDatabase.js Locations_FILLED.csv Reviews_Import_Reviews.csv
 */

require("dotenv").config({ path: ".env.local" });
const fs = require("fs");
const { createClient } = require("@supabase/supabase-js");

// Initialize Supabase client
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("❌ Error: Supabase credentials not found in .env.local");
  console.error(
    "   Need: EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY"
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",").map((h) => h.trim());
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",");
    const row = {};

    headers.forEach((header, index) => {
      row[header] = values[index] ? values[index].trim() : "";
    });

    // Skip completely empty rows
    const hasData = Object.values(row).some((v) => v !== "");
    if (hasData) {
      rows.push(row);
    }
  }

  return { headers, rows };
}

// Get user UUID by email
// Get user UUID by email and ensure profile exists
async function getUserByEmail(email) {
  if (!email || email === "") return null;

  try {
    // Step 1: Get user from auth.users by email
    const {
      data: { users },
      error: userError,
    } = await supabase.auth.admin.listUsers();

    if (userError) {
      console.error(`   ❌ Error fetching users:`, userError.message);
      return null;
    }

    const user = users.find((u) => u.email === email);

    if (!user) {
      console.warn(`   ⚠️  User not found in auth: ${email}`);
      return null;
    }

    const userId = user.id;

    // Step 2: Check if profile exists
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("user_id", userId)
      .single();

    // Step 3: Create profile if it doesn't exist
    if (profileError && profileError.code === "PGRST116") {
      console.log(`   📝 Creating profile for ${email}...`);

      const { error: insertError } = await supabase.from("profiles").insert({
        user_id: userId,
        demographics: {},
        onboarding_complete: false,
      });

      if (insertError) {
        console.error(`   ❌ Error creating profile:`, insertError.message);
        return null;
      }
    }

    return userId;
  } catch (error) {
    console.error(`   ❌ Error in getUserByEmail:`, error.message);
    return null;
  }
}

// Import locations
async function importLocations(locationsFile) {
  console.log("\n📍 Importing Locations...\n");

  const csvText = fs.readFileSync(locationsFile, "utf-8");
  const { rows } = parseCSV(csvText);

  const locationIdMap = {}; // CSV location_id → DB UUID
  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const csvLocationId = row.location_id;

    // Skip rows without name
    if (!row.name || row.name === "") {
      skipCount++;
      continue;
    }

    console.log(`${i + 1}. Processing: ${row.name}...`);

    // Prepare location data
    const locationData = {
      name: row.name,
      description: row.description || null,
      address: row["address (LEAVE EMPTY)"] || row.name,
      city: row["city (LEAVE EMPTY)"] || "Unknown",
      state_province: row["state_province  (LEAVE EMPTY)"] || "Unknown",
      country: row["country (LEAVE EMPTY)"] || "US",
      postal_code: row["postal_code  (LEAVE EMPTY)"] || null,
      place_type: row.place_type || "other",
      created_by: null,
      verified: false,
      active: true,
    };

    // Coordinates are REQUIRED
    const lat = parseFloat(row.lat);
    const lng = parseFloat(row.lng);

    if (isNaN(lat) || isNaN(lng)) {
      console.error(`   ❌ Error: Invalid coordinates for ${row.name}`);
      skipCount++;
      continue;
    }

    locationData.coordinates = `POINT(${lng} ${lat})`;

    // Insert to database
    const { data, error } = await supabase
      .from("locations")
      .insert(locationData)
      .select("id")
      .single();

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      skipCount++;
    } else {
      console.log(`   ✓ Created with ID: ${data.id}`);
      if (csvLocationId) {
        locationIdMap[csvLocationId] = data.id;
      }
      successCount++;
    }

    // Small delay to avoid rate limits
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Locations Import Complete!`);
  console.log(`   - ${successCount} locations created`);
  console.log(`   - ${skipCount} rows skipped\n`);

  return locationIdMap;
}

// Import reviews
async function importReviews(reviewsFile, locationIdMap) {
  console.log("📝 Importing Reviews...\n");

  const csvText = fs.readFileSync(reviewsFile, "utf-8");
  const { rows } = parseCSV(csvText);

  let successCount = 0;
  let skipCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const csvLocationId = row.location_id;

    // Get the real location UUID
    const locationUuid = locationIdMap[csvLocationId];
    if (!locationUuid) {
      console.log(
        `${i + 1}. ⊘ Skipped - Location ID "${csvLocationId}" not found in map`
      );
      skipCount++;
      continue;
    }

    console.log(`${i + 1}. Processing review for location ${csvLocationId}...`);

    let userId = null;
    if (row.user_email) {
      userId = await getUserByEmail(row.user_email);
    }

    if (!userId) {
      console.log(`   ⚠️  User not found: ${row.user_email} - skipping review`);
      skipCount++;
      continue;
    }
    // Prepare review data
    const reviewData = {
      location_id: locationUuid,
      user_id: userId,
      title: row.title || "Review",
      content: row.content,
      overall_rating: parseFloat(row.overall_rating),
      safety_rating: parseInt(row.safety_rating),
      comfort_rating: parseInt(row.comfort_rating),
      accessibility_rating: row.accessibility_rating
        ? parseInt(row.accessibility_rating)
        : null,
      service_rating: row.service_rating ? parseInt(row.service_rating) : null,
      visit_type: row.visit_type
        ? row.visit_type.toLowerCase().trim().replace(/\r/g, "")
        : null,
      visited_at: row.visited_at || null,
      status: "active",
    };

    // Insert to database
    const { data, error } = await supabase
      .from("reviews")
      .insert(reviewData)
      .select("id")
      .single();

    if (error) {
      console.error(`   ❌ Error: ${error.message}`);
      skipCount++;
    } else {
      console.log(`   ✓ Created review ${data.id}`);
      successCount++;
    }

    // Small delay
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Reviews Import Complete!`);
  console.log(`   - ${successCount} reviews created`);
  console.log(`   - ${skipCount} reviews skipped\n`);
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node scripts/importToDatabase.js <locations.csv> <reviews.csv>"
    );
    console.error("");
    console.error("Example:");
    console.error(
      "  node scripts/importToDatabase.js Locations_FILLED.csv Reviews_Import_Reviews.csv"
    );
    process.exit(1);
  }

  const locationsFile = args[0];
  const reviewsFile = args[1];

  // Check files exist
  if (!fs.existsSync(locationsFile)) {
    console.error(`❌ Error: Locations file not found: ${locationsFile}`);
    process.exit(1);
  }

  if (!fs.existsSync(reviewsFile)) {
    console.error(`❌ Error: Reviews file not found: ${reviewsFile}`);
    process.exit(1);
  }

  console.log("🚀 CSV to Database Importer");
  console.log("===========================");
  console.log(`📂 Locations: ${locationsFile}`);
  console.log(`📂 Reviews:   ${reviewsFile}`);

  // Import locations first
  const locationIdMap = await importLocations(locationsFile);

  // Import reviews
  await importReviews(reviewsFile, locationIdMap);

  console.log("✨ Import Complete!\n");
}

// Run
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
