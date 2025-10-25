#!/usr/bin/env node

/**
 * Process CSV and fill missing addresses using Google Geocoding
 *
 * Usage:
 *   node scripts/fillCsvAddresses.js input.csv output.csv
 */
require("dotenv").config({ path: ".env.local" });

const fs = require("fs");
const path = require("path");

// Simple CSV parser
function parseCSV(csvText) {
  const lines = csvText.split("\n");
  const headers = lines[0].split(",");
  const rows = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;

    const values = lines[i].split(",");
    const row = {};

    headers.forEach((header, index) => {
      row[header.trim()] = values[index] ? values[index].trim() : "";
    });

    rows.push(row);
  }

  return { headers, rows };
}

// Convert back to CSV
function toCSV(headers, rows) {
  const lines = [headers.join(",")];

  rows.forEach((row) => {
    const values = headers.map((header) => row[header] || "");
    lines.push(values.join(","));
  });

  return lines.join("\n");
}

// Get address from coordinates using Google Geocoding API
async function getAddressFromCoordinates(latitude, longitude, apiKey) {
  if (!latitude || !longitude || latitude === "0" || longitude === "0") {
    return null;
  }

  const lat = parseFloat(latitude);
  const lng = parseFloat(longitude);

  if (isNaN(lat) || isNaN(lng)) {
    return null;
  }

  try {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== "OK" || !data.results || data.results.length === 0) {
      console.warn(`  ⚠️  No geocoding results for (${lat}, ${lng})`);
      return null;
    }

    // Try to find street address
    const streetAddress = data.results.find(
      (result) =>
        result.types.includes("street_address") ||
        result.types.includes("premise")
    );

    if (streetAddress) {
      const streetNumber = streetAddress.address_components.find((c) =>
        c.types.includes("street_number")
      );
      const route = streetAddress.address_components.find((c) =>
        c.types.includes("route")
      );

      if (streetNumber && route) {
        return `${streetNumber.long_name} ${route.long_name}`;
      }
      if (route) {
        return route.long_name;
      }
    }

    // Look for route/neighborhood/locality
    const locality = data.results.find(
      (result) =>
        result.types.includes("route") ||
        result.types.includes("neighborhood") ||
        result.types.includes("locality")
    );

    if (locality) {
      const name = locality.address_components.find(
        (c) =>
          c.types.includes("route") ||
          c.types.includes("neighborhood") ||
          c.types.includes("locality")
      );
      if (name) {
        return name.long_name;
      }
    }

    // Fallback: use first result
    return data.results[0].formatted_address;
  } catch (error) {
    console.error(`  ❌ Error geocoding (${lat}, ${lng}):`, error.message);
    return null;
  }
}

// Process all rows
async function processRows(rows, apiKey) {
  const processed = [];
  let fillCount = 0;
  let skipCount = 0;

  console.log(`\n🔄 Processing ${rows.length} rows...\n`);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (i === 0) console.log("First row keys:", Object.keys(row));

    // Skip if address already exists
    if (row["address (LEAVE EMPTY)"] && row["address (LEAVE EMPTY)"].trim()) {
      console.log(
        `${i + 1}. ✓ ${row.name || row.location_id} - Address exists: "${
          row["address (LEAVE EMPTY)"]
        }"`
      );
      processed.push(row);
      continue;
    }

    // Check if we have coordinates
    if (!row.lat || !row.lng || row.lat === "0" || row.lng === "0") {
      console.log(
        `${i + 1}. ⊘ ${
          row.name || row.location_id
        } - No coordinates, using city: "${row["city (LEAVE EMPTY)"]}"`
      );
      processed.push({
        ...row,
        "address (LEAVE EMPTY)":
          row["city (LEAVE EMPTY)"] ||
          row["state_province (LEAVE EMPTY)"] ||
          "Unknown Location",
      });
      skipCount++;
      continue;
    }

    // Geocode the coordinates
    console.log(
      `${i + 1}. 🔍 ${row.name || row.location_id} - Geocoding (${row.lat}, ${
        row.lng
      })...`
    );
    const address = await getAddressFromCoordinates(row.lat, row.lng, apiKey);

    if (address) {
      console.log(`      ✓ Found: "${address}"`);
      processed.push({
        ...row,
        "address (LEAVE EMPTY)": address,
      });
      fillCount++;
    } else {
      const fallback =
        row["city (LEAVE EMPTY)"] ||
        row["state_province (LEAVE EMPTY)"] ||
        "Unknown Location";
      console.log(`      ⚠️  Failed, using fallback: "${fallback}"`);
      processed.push({
        ...row,
        "address (LEAVE EMPTY)": fallback,
      });
      skipCount++;
    }

    // Rate limiting: wait 100ms between requests
    await new Promise((resolve) => setTimeout(resolve, 100));
  }

  console.log(`\n✅ Processing complete!`);
  console.log(`   - ${fillCount} addresses filled from geocoding`);
  console.log(`   - ${skipCount} addresses used fallback`);
  console.log(
    `   - ${rows.length - fillCount - skipCount} addresses already existed\n`
  );

  return processed;
}

// Main function
async function main() {
  const args = process.argv.slice(2);

  if (args.length < 2) {
    console.error(
      "Usage: node scripts/fillCsvAddresses.js <input.csv> <output.csv>"
    );
    console.error("");
    console.error("Example:");
    console.error(
      "  node scripts/fillCsvAddresses.js Reviews_Import_-_Locations.csv Locations_Processed.csv"
    );
    process.exit(1);
  }

  const inputFile = args[0];
  const outputFile = args[1];

  // Check for API key
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    console.error(
      "❌ Error: EXPO_PUBLIC_GOOGLE_MAPS_API_KEY not found in environment"
    );
    console.error(
      "   Make sure you have .env file with your Google Maps API key"
    );
    process.exit(1);
  }

  // Check if input file exists
  if (!fs.existsSync(inputFile)) {
    console.error(`❌ Error: Input file not found: ${inputFile}`);
    process.exit(1);
  }

  console.log("🚀 CSV Address Filler");
  console.log("====================");
  console.log(`📂 Input:  ${inputFile}`);
  console.log(`📂 Output: ${outputFile}`);

  // Read CSV
  const csvText = fs.readFileSync(inputFile, "utf-8");
  const { headers, rows } = parseCSV(csvText);

  // Process rows
  const processedRows = await processRows(rows, apiKey);

  // Write output
  const outputCSV = toCSV(headers, processedRows);
  fs.writeFileSync(outputFile, outputCSV);

  console.log(`💾 Saved to: ${outputFile}`);
  console.log("✨ Done!\n");
}

// Run
main().catch((error) => {
  console.error("❌ Fatal error:", error);
  process.exit(1);
});
