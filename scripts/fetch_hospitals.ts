import fetch from "node-fetch";
import * as fs from "fs";
import * as path from "path";

const OVERPASS_URL = "https://overpass-api.de/api/interpreter";
const CENTER_LAT = 28.5450;
const CENTER_LON = 77.1900;
const RADIUS_METERS = 15000; // 15 km around New Delhi center

// Overpass QL Query
const query = `
  [out:json];
  nwr(around:${RADIUS_METERS}, ${CENTER_LAT}, ${CENTER_LON})[amenity=hospital];
  out center;
`;

async function fetchRealHospitals() {
  console.log(`Querying OpenStreetMap Overpass API for hospitals within ${RADIUS_METERS / 1000}km of Delhi...`);
  try {
    const response = await fetch(OVERPASS_URL, {
      method: "POST",
      body: query,
      headers: { "Content-Type": "application/x-www-form-urlencoded" }
    });

    if (!response.ok) {
      throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
    }

    const data: any = await response.json();
    const elements = data.elements || [];
    console.log(`Retrieved ${elements.length} elements from OpenStreetMap.`);

    // Filter elements that have a valid name and coordinate
    const hospitals = elements
      .filter((el: any) => {
        const hasCoords = el.lat || (el.center && el.center.lat);
        const hasName = el.tags && el.tags.name;
        return hasCoords && hasName;
      })
      .map((el: any) => {
        const lat = el.lat || el.center.lat;
        const lon = el.lon || el.center.lon;
        const name = el.tags.name;
        
        // Build a readable address from OSM tags
        const street = el.tags["addr:street"] || "";
        const city = el.tags["addr:city"] || "New Delhi";
        const postcode = el.tags["addr:postcode"] || "";
        const address = el.tags["addr:full"] || [street, city, postcode].filter(Boolean).join(", ") || "New Delhi, Delhi";

        return {
          id: `hosp-osm-${el.id}`,
          name: name,
          latitude: lat,
          longitude: lon,
          address: address,
          contact_phone: el.tags["contact:phone"] || el.tags.phone || "011-XXXXXXXX"
        };
      })
      .slice(0, 10); // Keep top 10 hospitals for performance and clarity

    console.log(`Parsed ${hospitals.length} valid hospitals.`);

    const outputDir = path.join(__dirname, "../src/data");
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const outputPath = path.join(outputDir, "delhi_hospitals.json");
    fs.writeFileSync(outputPath, JSON.stringify(hospitals, null, 2), "utf8");
    console.log(`Successfully saved ${hospitals.length} hospitals to ${outputPath}`);
  } catch (err) {
    console.error("OSM Sync Failed:", err);
  }
}

fetchRealHospitals();
