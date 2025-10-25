// test-address.js
require("dotenv").config({ path: ".env.local" });

async function testAddress() {
  const apiKey = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;
  const lat = 37.46033;
  const lng = -89.24619;
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;

  console.log("📍 URL being called:");
  console.log(url);
  console.log("\n");

  const response = await fetch(url);
  const data = await response.json();

  console.log("Response:", JSON.stringify(data, null, 2));
}

testAddress();
