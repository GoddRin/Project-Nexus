// Copies the texture decoder Twin v2 loads by address from the installed three.js into /public,
// so nothing comes from a CDN (docs/twin-v2/MASTER-BRIEF.md section 4).
//
//   public/vendor/twin/basis/basis_transcoder.{js,wasm}   KTX2/Basis textures (engine/assets.ts)
//
// The files must match the installed three.js: KTX2Loader and its transcoder are released together.
// Runs after every install (package.json "postinstall"), the same way as sync-maplibre-worker.mjs.
// The Meshopt geometry decoder is not copied: it is a plain module and is bundled with the app.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..", "..");
const three = join(root, "node_modules", "three");
const from = join(three, "examples", "jsm", "libs", "basis");
const to = join(root, "public", "vendor", "twin", "basis");

if (!existsSync(from)) {
  console.warn("[twin sync-vendor] three is not installed; nothing copied.");
  process.exit(0);
}
mkdirSync(to, { recursive: true });
for (const f of ["basis_transcoder.js", "basis_transcoder.wasm"]) copyFileSync(join(from, f), join(to, f));
const { version } = JSON.parse(readFileSync(join(three, "package.json"), "utf8"));
writeFileSync(join(to, "VERSION.txt"), `Copied from three@${version} (examples/jsm/libs/basis). Basis Universal transcoder, Apache-2.0.\n`);
console.log(`[twin sync-vendor] /public/vendor/twin/basis now matches three ${version}`);
