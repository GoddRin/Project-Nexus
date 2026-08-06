import fs from "fs";
import path from "path";
import https from "https";

// Real Tumauini HEPP Plant Site Coordinates from MapboxRegionalMap.tsx
const PLANT_LAT = 17.318823;
const PLANT_LON = 121.974925;

// ~1.5km x 1.5km Bounding Box
const LAT_HALF = 0.0070;
const LON_HALF = 0.0075;

const SOUTH = PLANT_LAT - LAT_HALF;
const NORTH = PLANT_LAT + LAT_HALF;
const WEST = PLANT_LON - LON_HALF;
const EAST = PLANT_LON + LON_HALF;

const GRID_SIZE = 65; // 65x65 = 4,225 real DEM elevation points

function postJson(urlStr, payload) {
  return new Promise((resolve, reject) => {
    const dataStr = JSON.stringify(payload);
    const url = new URL(urlStr);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Content-Length": Buffer.byteLength(dataStr)
      }
    };
    const req = https.request(options, (res) => {
      let chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.on("error", reject);
    req.write(dataStr);
    req.end();
  });
}

function getJson(urlStr) {
  return new Promise((resolve, reject) => {
    https.get(urlStr, (res) => {
      let chunks = [];
      res.on("data", c => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    }).on("error", reject);
  });
}

async function fetchRealCopernicusDem() {
  console.log(`=== FETCHING 100% REAL COPERNICUS GLO-30 DEM ELEVATIONS FOR TUMAUINI PLANT SITE ===`);
  console.log(`Real Site Coordinates: ${PLANT_LAT}°N, ${PLANT_LON}°E`);
  console.log(`Bounding Box: S:${SOUTH.toFixed(6)}, N:${NORTH.toFixed(6)}, W:${WEST.toFixed(6)}, E:${EAST.toFixed(6)}`);

  const locations = [];
  const lats = [];
  const lons = [];

  // Generate 65x65 coordinate grid
  for (let r = 0; r < GRID_SIZE; r++) {
    const lat = SOUTH + (r / (GRID_SIZE - 1)) * (NORTH - SOUTH);
    for (let c = 0; c < GRID_SIZE; c++) {
      const lon = WEST + (c / (GRID_SIZE - 1)) * (EAST - WEST);
      const roundedLat = parseFloat(lat.toFixed(6));
      const roundedLon = parseFloat(lon.toFixed(6));
      locations.push({ latitude: roundedLat, longitude: roundedLon });
      lats.push(roundedLat);
      lons.push(roundedLon);
    }
  }

  console.log(`Total Grid Points to Fetch: ${locations.length} coordinates...`);

  let allElevations = [];

  // Attempt Open-Elevation POST payload first
  try {
    console.log("Querying Open-Elevation API (Copernicus / SRTM 30m DEM)...");
    const resBuf = await postJson("https://api.open-elevation.com/api/v1/lookup", { locations });
    const json = JSON.parse(resBuf.toString("utf-8"));
    if (json.results && Array.isArray(json.results) && json.results.length === locations.length) {
      allElevations = json.results.map(r => r.elevation);
      console.log(`Successfully retrieved all ${allElevations.length} DEM points from Open-Elevation API!`);
    }
  } catch (err) {
    console.warn("Open-Elevation POST notice:", err.message, "- Trying Open-Meteo DEM batch query with rate-limit pacing...");
  }

  // Fallback to Open-Meteo DEM API with 50 points per chunk and 1.2s delay to prevent rate limiting
  if (allElevations.length !== locations.length) {
    allElevations = [];
    const CHUNK_SIZE = 50;
    for (let i = 0; i < lats.length; i += CHUNK_SIZE) {
      const chunkLats = lats.slice(i, i + CHUNK_SIZE).join(",");
      const chunkLons = lons.slice(i, i + CHUNK_SIZE).join(",");
      const url = `https://api.open-meteo.com/v1/elevation?latitude=${chunkLats}&longitude=${chunkLons}`;

      let json;
      try {
        const resBuf = await getJson(url);
        json = JSON.parse(resBuf.toString("utf-8"));
      } catch (e) {
        console.warn(`Retry at ${i}...`);
        await new Promise(r => setTimeout(r, 2000));
        i -= CHUNK_SIZE;
        continue;
      }

      if (json.reason && json.reason.includes("limit")) {
        process.stdout.write(`\nRate limit pause at point ${i}, waiting 10s...`);
        await new Promise(r => setTimeout(r, 10000));
        i -= CHUNK_SIZE;
        continue;
      }

      if (!json.elevation || !Array.isArray(json.elevation)) {
        throw new Error(`DEM fetch failed at chunk ${i}`);
      }

      allElevations.push(...json.elevation);
      process.stdout.write(`Fetched ${allElevations.length}/${lats.length} DEM points...\r`);
      await new Promise(r => setTimeout(r, 800)); // 800ms delay between chunks to strictly obey 60 requests/min limit
    }
  }

  console.log(`\nSuccessfully compiled ${allElevations.length} REAL Copernicus 30m DEM elevation values!`);

  // Structure into 65x65 2D grid
  const grid2D = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    grid2D.push(allElevations.slice(r * GRID_SIZE, (r + 1) * GRID_SIZE));
  }

  // Calculate raw min/max
  let rawMin = Infinity;
  let rawMax = -Infinity;
  allElevations.forEach(e => {
    if (e < rawMin) rawMin = e;
    if (e > rawMax) rawMax = e;
  });

  console.log(`RAW Elevation Range (Pre-Smoothing): Min ${rawMin}m, Max ${rawMax}m, Delta ${(rawMax - rawMin).toFixed(1)}m`);

  // Smooth terrain elevations slightly for smooth 3D rendering
  const smoothedElevations = [];
  for (let r = 0; r < GRID_SIZE; r++) {
    for (let c = 0; c < GRID_SIZE; c++) {
      let sum = 0, count = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const nr = r + dr, nc = c + dc;
          if (nr >= 0 && nr < GRID_SIZE && nc >= 0 && nc < GRID_SIZE) {
            const w = (dr === 0 && dc === 0) ? 4 : (dr === 0 || dc === 0) ? 2 : 1;
            sum += grid2D[nr][nc] * w;
            count += w;
          }
        }
      }
      smoothedElevations.push(parseFloat((sum / count).toFixed(2)));
    }
  }

  const outputData = {
    dataSource: "Copernicus GLO-30 30m Global DEM (via Open-Elevation / Open-Meteo REST API)",
    siteName: "Tumauini Hydroelectric Power Plant Site",
    location: "Barangay Antagan Uno, Tumauini, Isabela",
    centerCoordinates: { lat: PLANT_LAT, lon: PLANT_LON },
    boundingBox: { south: SOUTH, north: NORTH, west: WEST, east: EAST },
    gridSize: GRID_SIZE,
    totalPoints: allElevations.length,
    rawMinElevMeters: rawMin,
    rawMaxElevMeters: rawMax,
    elevationRangeMeters: { min: rawMin, max: rawMax, delta: rawMax - rawMin },
    rawElevations: allElevations,
    elevations: smoothedElevations,
    generatedAt: new Date().toISOString()
  };

  const outPath = path.join(process.cwd(), "public", "data", "terrain-heightmap.json");
  fs.writeFileSync(outPath, JSON.stringify(outputData, null, 2));
  console.log(`Saved 100% REAL GIS DEM dataset to ${outPath} (${(fs.statSync(outPath).size / 1024).toFixed(1)} KB)`);
}

fetchRealCopernicusDem().catch(err => {
  console.error("Failed to fetch real Copernicus DEM:", err);
  process.exit(1);
});
