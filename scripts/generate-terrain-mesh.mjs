import fs from "fs";
import path from "path";

const PUBLIC_DATA_DIR = path.join(process.cwd(), "public", "data");
const PUBLIC_MODELS_DIR = path.join(process.cwd(), "public", "models");
const HEIGHTMAP_PATH = path.join(PUBLIC_DATA_DIR, "terrain-heightmap.json");
const MESH_DATA_PATH = path.join(PUBLIC_DATA_DIR, "gis-terrain-mesh.json");

// Land-Use Zone Muted Color Palette (RGB floats 0.0 -> 1.0)
const PALETTE = {
  // Zone 1: Cleared construction / plant pad & TEMFACIL (rich natural forest earth)
  padGravel: [0.18, 0.24, 0.16],
  padEarth:  [0.22, 0.20, 0.16],
  
  // Zone 2: Access road (unpaved mountain red/brown clay road base)
  roadBase:  [0.26, 0.16, 0.10],

  // Zone 3: Dense surrounding forest clearing (rich dark tropical earth green)
  forestBase: [0.14, 0.22, 0.12],
  forestDeep: [0.10, 0.16, 0.09],
  steepRock:  [0.24, 0.22, 0.18],

  // Zone 4: River channel / tailrace outflow bed (wet riverbed silt & rock)
  riverBed:   [0.18, 0.26, 0.22],
  riverEdge:  [0.28, 0.34, 0.28]
};

function lerp(a, b, t) {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

function lerpColor(c1, c2, t) {
  const clampedT = Math.max(0, Math.min(1, t));
  return [
    lerp(c1[0], c2[0], clampedT),
    lerp(c1[1], c2[1], clampedT),
    lerp(c1[2], c2[2], clampedT)
  ];
}

function smoothstep(min, max, value) {
  const x = Math.max(0, Math.min(1, (value - min) / (max - min)));
  return x * x * (3 - 2 * x);
}

function main() {
  console.log("=== PHASE 2: AUTOMATED TERRAIN MESH CONSTRUCTION PIPELINE ===");

  if (!fs.existsSync(HEIGHTMAP_PATH)) {
    throw new Error(`Heightmap dataset not found at ${HEIGHTMAP_PATH}. Run Phase 1 script first.`);
  }

  const heightmap = JSON.parse(fs.readFileSync(HEIGHTMAP_PATH, "utf-8"));
  const gridSize = heightmap.gridSize || 65;
  const elevations = heightmap.elevations;
  const minElev = heightmap.elevationRangeMeters.min;
  const deltaElev = heightmap.elevationRangeMeters.delta;

  console.log(`Input DEM Dataset: ${gridSize}x${gridSize} grid (${elevations.length} vertices)`);
  console.log(`RAW Elevation Delta: ${minElev.toFixed(1)}m to ${heightmap.elevationRangeMeters.max.toFixed(1)}m`);

  // ═════════════════════════════════════════════════════════════════════
  // GIS TO MODEL-SPACE SCALE CONSTANTS (EXPLICIT SCALE FACTORS)
  // ═════════════════════════════════════════════════════════════════════
  // 1. Real-World GIS Footprint: ~1,590m (West-East) x ~1,554m (South-North)
  // 2. Model-Space Scene Footprint: 160.0m x 160.0m
  // 3. HORIZONTAL_SCALE_FACTOR = 160.0 / 1590.0 = 0.10063 (1 : 9.94 scale)
  // 4. Real-World GIS Elevation Delta: 355.0m (204m -> 559m)
  // 5. Model-Space Target Y-Span: 48.0m (-5.0m -> +43.0m)
  // 6. VERTICAL_SCALE_FACTOR = 48.0 / 355.0 = 0.13521 (1 : 7.40 scale)
  // 7. VERTICAL_EXAGGERATION_RATIO = VERTICAL_SCALE_FACTOR / HORIZONTAL_SCALE_FACTOR = 1.3435x
  // ═════════════════════════════════════════════════════════════════════

  const REAL_GIS_WIDTH_METERS = 1590.0;
  const REAL_GIS_DEPTH_METERS = 1554.0;
  const REAL_GIS_DELTA_ELEV_METERS = deltaElev || 355.0;

  const SCENE_WIDTH_METERS = 360.0;
  const SCENE_DEPTH_METERS = 360.0;
  const SCENE_TARGET_Y_SPAN_METERS = 54.0;

  const HORIZONTAL_SCALE_FACTOR = SCENE_WIDTH_METERS / REAL_GIS_WIDTH_METERS;
  const VERTICAL_SCALE_FACTOR = SCENE_TARGET_Y_SPAN_METERS / REAL_GIS_DELTA_ELEV_METERS;
  const VERTICAL_EXAGGERATION_RATIO = VERTICAL_SCALE_FACTOR / HORIZONTAL_SCALE_FACTOR;

  // Powerhouse Terrace Pad
  const PAD_X_MIN = -14.0;
  const PAD_X_MAX = 37.0;
  const PAD_Z_MIN = -12.0;
  const PAD_Z_MAX = 15.0;
  const FALLOFF_DISTANCE = 10.0;
  const TARGET_PAD_ELEV_Y = -0.5;

  // Penstock corridor terrace
  const PENSTOCK_X_MIN = -12.0;
  const PENSTOCK_X_MAX = 0.0;
  const PENSTOCK_Z_MIN = -32.0;
  const PENSTOCK_Z_MAX = -10.0;
  const PENSTOCK_FALLOFF = 6.0;

  // TEMFACIL Terrace Compound (North-East mountain clearing footprint with entrance apron)
  const TEMFACIL_X_MIN = 70.0;
  const TEMFACIL_X_MAX = 138.0;
  const TEMFACIL_Z_MIN = -125.0;
  const TEMFACIL_Z_MAX = -60.0;
  const TEMFACIL_FALLOFF = 14.0;
  const TEMFACIL_TARGET_Y = 14.0; // Completely flat, level compound bench level at Y = 14.0m

  const positions = [];
  const colors = [];
  const normals = [];
  const uvs = [];
  const indices = [];

  const rawYValues = [];
  const terracedYValues = [];

  // Helper: signed distance from point to axis-aligned rectangle (negative = inside)
  function rectSignedDist(px, pz, xMin, xMax, zMin, zMax) {
    const dx = Math.max(xMin - px, 0, px - xMax);
    const dz = Math.max(zMin - pz, 0, pz - zMax);
    if (dx === 0 && dz === 0) {
      // Inside: return negative distance to nearest edge
      return -Math.min(px - xMin, xMax - px, pz - zMin, zMax - pz);
    }
    return Math.hypot(dx, dz);
  }

  // Step 1: Compute Terraced & Graded Vertices
  for (let r = 0; r < gridSize; r++) {
    const zFrac = r / (gridSize - 1);
    const z = (zFrac - 0.5) * SCENE_DEPTH_METERS;

    for (let c = 0; c < gridSize; c++) {
      const xFrac = c / (gridSize - 1);
      const x = (xFrac - 0.5) * SCENE_WIDTH_METERS;

      const idx = r * gridSize + c;
      const realElev = elevations[idx];

      // Convert real SRTM elevation meters (204m -> 559m) using VERTICAL_SCALE_FACTOR
      const rawY = ((realElev - minElev) * VERTICAL_SCALE_FACTOR) - 5.0;
      rawYValues.push(rawY);

      // Main plant pad: rectangular signed distance
      const dMain = rectSignedDist(x, z, PAD_X_MIN, PAD_X_MAX, PAD_Z_MIN, PAD_Z_MAX);

      // TEMFACIL compound: rectangular signed distance
      const dTemfacil = rectSignedDist(x, z, TEMFACIL_X_MIN, TEMFACIL_X_MAX, TEMFACIL_Z_MIN, TEMFACIL_Z_MAX);

      // ── Surge Tank & Penstock Corridor Elevation Grading ──
      // Surge Tank Foundation Center: X = -6.0, Z = -26.0 (Radius ~ 5.0m, Bench Y = 17.0m)
      const distFromSurgeCenter = Math.hypot(x - (-6.0), z - (-26.0));

      // Compute target height along the penstock / surge tank axis
      let targetCorridorY = rawY;
      if (z <= -26.0) {
        // At or behind surge tank: bench at 17.0m, rising behind into mountain
        const distBehind = -26.0 - z;
        targetCorridorY = Math.max(17.0, 17.0 + distBehind * 0.65);
      } else if (z > -26.0 && z < -10.0) {
        // Along penstock slope: ramp linearly from 17.0m (at Z=-26) to -0.5m (at Z=-10)
        const rampFrac = (z - (-10.0)) / (-26.0 - (-10.0)); // 0 at Z=-10, 1 at Z=-26
        targetCorridorY = lerp(TARGET_PAD_ELEV_Y, 17.0, rampFrac);
      } else {
        // In front of penstock (near powerhouse pad)
        targetCorridorY = TARGET_PAD_ELEV_Y;
      }

      let finalY = rawY;

      // Apply main plant pad terrace (Y = -0.5m)
      if (dMain <= 0) {
        finalY = TARGET_PAD_ELEV_Y;
      } else if (dMain < FALLOFF_DISTANCE) {
        const blendFactor = smoothstep(0, FALLOFF_DISTANCE, dMain);
        finalY = lerp(TARGET_PAD_ELEV_Y, rawY, blendFactor);
      }

      // Apply surge tank bench & penstock corridor elevation grading
      const dPenstock = rectSignedDist(x, z, PENSTOCK_X_MIN, PENSTOCK_X_MAX, PENSTOCK_Z_MIN, PENSTOCK_Z_MAX);
      
      if (dPenstock <= 0 || distFromSurgeCenter <= 6.0) {
        // Fully inside surge tank / penstock corridor: set to targetCorridorY
        finalY = targetCorridorY;
      } else if (dPenstock < PENSTOCK_FALLOFF) {
        // In corridor falloff zone: smoothly blend from targetCorridorY to existing finalY/rawY
        const blendFactor = smoothstep(0, PENSTOCK_FALLOFF, dPenstock);
        finalY = lerp(targetCorridorY, finalY, blendFactor);
      }

      // Apply TEMFACIL compound terrace (Y = 16.0m) with smooth organic Hermite blend
      if (dTemfacil <= 0) {
        finalY = TEMFACIL_TARGET_Y;
      } else if (dTemfacil < TEMFACIL_FALLOFF) {
        const blendFactor = smoothstep(0, TEMFACIL_FALLOFF, dTemfacil);
        // Smoothly blend TEMFACIL bench level into raw natural mountain elevation
        finalY = lerp(TEMFACIL_TARGET_Y, rawY, blendFactor * blendFactor);
      }

      terracedYValues.push(parseFloat(finalY.toFixed(2)));
      positions.push(x, parseFloat(finalY.toFixed(2)), z);
      uvs.push(xFrac, zFrac);
    }
  }

  // Step 2: Land-Use Zone Vertex Color Assignment & Blending
  for (let r = 0; r < gridSize; r++) {
    for (let c = 0; c < gridSize; c++) {
      const idx = r * gridSize + c;
      const x = positions[idx * 3];
      const y = positions[idx * 3 + 1];
      const z = positions[idx * 3 + 2];

      // Compute local slope steepness (approximate gradient)
      let slope = 0;
      if (r > 0 && r < gridSize - 1 && c > 0 && c < gridSize - 1) {
        const dy1 = terracedYValues[idx + 1] - terracedYValues[idx - 1];
        const dy2 = terracedYValues[idx + gridSize] - terracedYValues[idx - gridSize];
        slope = Math.hypot(dy1, dy2);
      }

      // Zone Distances:
      // 1. Cleared Plant Pad: rectangular signed distance
      const dPadColor = rectSignedDist(x, z, PAD_X_MIN, PAD_X_MAX, PAD_Z_MIN, PAD_Z_MAX);
      const padFactor = 1.0 - smoothstep(-2.0, 8.0, dPadColor); // Strong inside pad, fading out

      // 1b. Penstock corridor pad factor
      const dPenstockColor = rectSignedDist(x, z, PENSTOCK_X_MIN, PENSTOCK_X_MAX, PENSTOCK_Z_MIN, PENSTOCK_Z_MAX);
      const penstockPadFactor = 1.0 - smoothstep(-1.0, 6.0, dPenstockColor);

      // 1c. TEMFACIL compound factor
      const dTemfacilColor = rectSignedDist(x, z, TEMFACIL_X_MIN, TEMFACIL_X_MAX, TEMFACIL_Z_MIN, TEMFACIL_Z_MAX);
      const temfacilPadFactor = 1.0 - smoothstep(-1.0, 5.0, dTemfacilColor);

      const combinedPadFactor = Math.min(1.0, Math.max(padFactor, penstockPadFactor, temfacilPadFactor));

      // 2. Unpaved Red-Clay Dirt Access Road Corridor
      const padCenterX = (PAD_X_MIN + PAD_X_MAX) / 2;
      const padCenterZ = (PAD_Z_MIN + PAD_Z_MAX) / 2;
      const roadT1 = Math.max(0, Math.min(1, (z + 80) / 95));
      const expectedRoadX1 = lerp(-60, padCenterX, roadT1);
      const distFromRoad1 = Math.hypot(x - expectedRoadX1, z - lerp(80, padCenterZ, roadT1));

      // Path 2: Winding mountain road from Powerhouse entrance [X:-14, Z:20] -> TEMFACIL Gate Entrance [X:82, Z:-65]
      const ROAD_SEGMENTS = [
        [-14.0, 20.0],
        [8.0, 20.0],
        [25.0, 15.0],
        [42.0, 5.0],
        [60.0, -18.0],
        [78.0, -42.0],
        [82.0, -65.0],
      ];
      let distFromRoad2 = 999;
      for (let s = 0; s < ROAD_SEGMENTS.length - 1; s++) {
        const ax = ROAD_SEGMENTS[s][0], az = ROAD_SEGMENTS[s][1];
        const bx = ROAD_SEGMENTS[s+1][0], bz = ROAD_SEGMENTS[s+1][1];
        const dx = bx - ax, dz = bz - az;
        const lenSq = dx * dx + dz * dz;
        let t = lenSq === 0 ? 0 : Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / lenSq));
        const segDist = Math.hypot(x - (ax + t * dx), z - (az + t * dz));
        if (segDist < distFromRoad2) distFromRoad2 = segDist;
      }

      const roadFactor = ((distFromRoad1 < 6.0) || (distFromRoad2 < 5.0))
        ? (1.0 - combinedPadFactor)
        : 0;

      // 3. Tailrace / River Channel: Running out front of powerhouse (z = 15 to 35, x = -8 to 8)
      const distFromRiverCenter = Math.abs(x - 0);
      const isRiverZone = z > 14 && z < 35 && x > -14 && x < 14;
      const riverFactor = isRiverZone ? (1.0 - smoothstep(4.0, 12.0, distFromRiverCenter)) * (1.0 - combinedPadFactor) : 0;

      // Base Zone 3 Color: Dense Forest Clearing (Muted Natural Earth Greens)
      let finalColor = PALETTE.forestBase;

      // High elevation / deep forest variation
      if (y > 18.0) {
        finalColor = lerpColor(PALETTE.forestBase, PALETTE.forestDeep, (y - 18.0) / 14.0);
      }

      // Exposed Rock Face on steep mountain slopes
      if (slope > 2.2) {
        const rockFactor = Math.min(1.0, (slope - 2.2) / 2.5);
        finalColor = lerpColor(finalColor, PALETTE.steepRock, rockFactor);
      }

      // Blend Zone 4: River Bed
      if (riverFactor > 0) {
        const riverCol = lerpColor(PALETTE.riverEdge, PALETTE.riverBed, riverFactor);
        finalColor = lerpColor(finalColor, riverCol, riverFactor);
      }

      // Blend Zone 2: Access Road
      if (roadFactor > 0) {
        finalColor = lerpColor(finalColor, PALETTE.roadBase, roadFactor);
      }

      // Blend Zone 1: Cleared Construction Pad (Packed Earth & Gravel)
      if (combinedPadFactor > 0) {
        const padCol = lerpColor(PALETTE.padEarth, PALETTE.padGravel, combinedPadFactor);
        finalColor = lerpColor(finalColor, padCol, combinedPadFactor);
      }

      // Add natural micro-noise variation to prevent flat monochrome ground
      const noiseVal = (Math.sin(x * 0.18 + z * 0.22) * 0.5 + Math.cos(x * 0.35 - z * 0.15) * 0.5);
      const noiseScale = 0.035 * noiseVal;
      finalColor = [
        Math.max(0, Math.min(1, finalColor[0] + noiseScale)),
        Math.max(0, Math.min(1, finalColor[1] + noiseScale * 0.9)),
        Math.max(0, Math.min(1, finalColor[2] + noiseScale * 0.7))
      ];

      colors.push(
        parseFloat(finalColor[0].toFixed(3)),
        parseFloat(finalColor[1].toFixed(3)),
        parseFloat(finalColor[2].toFixed(3))
      );
    }
  }

  // Step 3: Triangle Indices Construction
  for (let r = 0; r < gridSize - 1; r++) {
    for (let c = 0; c < gridSize - 1; c++) {
      const i0 = r * gridSize + c;
      const i1 = i0 + 1;
      const i2 = (r + 1) * gridSize + c;
      const i3 = i2 + 1;

      // Two triangles per grid cell quad
      indices.push(i0, i2, i1);
      indices.push(i1, i2, i3);
    }
  }

  // Save GIS Terrain Mesh Dataset
  const meshData = {
    siteName: "Tumauini HEPP Leveled Terrace & 4-Zone GIS Terrain Mesh",
    gridSize,
    totalVertices: gridSize * gridSize,
    totalTriangles: indices.length / 3,
    scaleFactors: {
      horizontalScaleFactor: parseFloat(HORIZONTAL_SCALE_FACTOR.toFixed(5)),
      horizontalRatio: `1 : ${(1 / HORIZONTAL_SCALE_FACTOR).toFixed(2)}`,
      verticalScaleFactor: parseFloat(VERTICAL_SCALE_FACTOR.toFixed(5)),
      verticalRatio: `1 : ${(1 / VERTICAL_SCALE_FACTOR).toFixed(2)}`,
      verticalExaggerationRatio: parseFloat(VERTICAL_EXAGGERATION_RATIO.toFixed(4)),
      realGisBoundsMeters: { width: REAL_GIS_WIDTH_METERS, depth: REAL_GIS_DEPTH_METERS, elevationDelta: REAL_GIS_DELTA_ELEV_METERS },
      modelSpaceBoundsMeters: { width: SCENE_WIDTH_METERS, depth: SCENE_DEPTH_METERS, targetYSpan: SCENE_TARGET_Y_SPAN_METERS }
    },
    terracePad: {
      type: "rectangular",
      mainPad: { xMin: PAD_X_MIN, xMax: PAD_X_MAX, zMin: PAD_Z_MIN, zMax: PAD_Z_MAX },
      penstockCorridor: { xMin: PENSTOCK_X_MIN, xMax: PENSTOCK_X_MAX, zMin: PENSTOCK_Z_MIN, zMax: PENSTOCK_Z_MAX },
      falloffDistance: FALLOFF_DISTANCE,
      penstockFalloff: PENSTOCK_FALLOFF,
      targetPadY: TARGET_PAD_ELEV_Y
    },
    landUseZones: [
      "Zone 1: Cleared Construction/Plant Pad (Packed Earth/Gravel)",
      "Zone 2: Access Road (Compacted Road Base)",
      "Zone 3: Dense Forest Clearing (Muted Natural Earth Greens)",
      "Zone 4: River/Tailrace Outflow Bed (Wet Riverbed Silt & Rock)"
    ],
    positions,
    colors,
    uvs,
    indices,
    generatedAt: new Date().toISOString()
  };

  if (!fs.existsSync(PUBLIC_DATA_DIR)) {
    fs.mkdirSync(PUBLIC_DATA_DIR, { recursive: true });
  }

  fs.writeFileSync(MESH_DATA_PATH, JSON.stringify(meshData, null, 2));

  console.log(`\nSUCCESSFULLY BUILT GIS TERRAIN MESH DATASET:`);
  console.log(`  File -> ${MESH_DATA_PATH} (${(fs.statSync(MESH_DATA_PATH).size / 1024).toFixed(1)} KB)`);
  console.log(`  Vertices: ${positions.length / 3} | Triangles: ${indices.length / 3}`);
  console.log(`  Terrace Pad: Rectangular [X: ${PAD_X_MIN}..${PAD_X_MAX}, Z: ${PAD_Z_MIN}..${PAD_Z_MAX}] at Y=${TARGET_PAD_ELEV_Y}m, ${FALLOFF_DISTANCE}m falloff`);
  console.log(`  4 Land-Use Zones: Cleared Pad, Access Road, Dense Forest, Tailrace River Bed`);
}

main();
