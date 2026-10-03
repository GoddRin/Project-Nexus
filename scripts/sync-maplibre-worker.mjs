// Copies MapLibre's worker files from the installed package into /public.
//
// The map loads its worker from /maplibre-gl-worker.mjs (see setWorkerUrl in ProjectAtlasMap.tsx).
// The worker and the library must be the SAME version: when an install moved maplibre-gl from
// 6.10.0 to 6.11.2 and /public still held the 6.10.0 worker, every tile containing a cluster
// label failed to build and the project markers disappeared from the map.
// Runs after every install (package.json "postinstall").
import { copyFileSync, existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "node_modules", "maplibre-gl", "dist");
const files = ["maplibre-gl-worker.mjs", "maplibre-gl-worker-dev.mjs", "maplibre-gl-shared.mjs", "maplibre-gl-shared-dev.mjs"];

if (!existsSync(dist)) {
  console.warn("[sync-maplibre-worker] maplibre-gl is not installed; nothing copied.");
  process.exit(0);
}
for (const f of files) copyFileSync(join(dist, f), join(root, "public", f));
const { version } = JSON.parse(readFileSync(join(root, "node_modules", "maplibre-gl", "package.json"), "utf8"));
console.log(`[sync-maplibre-worker] /public worker files now match maplibre-gl ${version}`);
