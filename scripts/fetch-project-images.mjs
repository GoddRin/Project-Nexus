/**
 * Project photographs for the Atlas, taken from Sta. Clara International Corporation's own
 * website (staclara.com.ph): for each project, the pictures shown under that project's heading on
 * the company's "What we do" pages or in its news post. Nothing is taken from third-party sites.
 *
 *   node scripts/fetch-project-images.mjs            # download + optimise (skips files already made)
 *
 * Each picture is saved as public/project-images/<slug>-<n>.jpg, at most 1280 px wide (ffmpeg on
 * PATH). The first is the project's main image, the rest its gallery. The list this script writes
 * (.cache/project-images.json) is applied to the records by scripts/apply-project-images.ts.
 * Mapping checked on 2026-10-05; the page each came from is beside it.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const UP = "https://staclara.com.ph/wp-content/uploads/";
const OUT = path.join(process.cwd(), "public", "project-images");
const TMP = path.join(process.cwd(), ".cache", "site", "img");

// slug -> [page it is shown on, ...files under wp-content/uploads]
const IMAGES = {
  // completed/buildings
  "monde-nissin": ["completed/buildings", "2021/12/2021-06-28_Alviera-1-scaled-990x446.jpg"],
  "jti-flex": ["completed/buildings", "2021/12/BatangasJTI-5-scaled-768x361.jpg", "2021/09/viber_image_2021-09-10_00-22-51-371-768x432.jpg", "2021/09/viber_image_2021-09-10_00-22-29-807-768x432.jpg"],
  "subic-flour-mill": ["completed/buildings", "2021/09/SubicFLOUR-3-scaled-768x575.jpg", "2021/09/SubicFLOUR-1-1-scaled-768x575.jpg"],
  "monde-nissin-megamall-sta-rosa": ["completed/buildings", "2021/08/building-4-990x685.jpg"],
  "sr-cebu": ["completed/buildings", "2021/08/snr-cebu-768x531.jpg"],
  "sr-davao": ["completed/buildings", "2021/08/snr-davao-768x531.jpg"],
  "sr-pampanga": ["completed/buildings", "2021/08/snr-pampanga-768x531.jpg"],
  "sr-shaw": ["completed/buildings", "2021/08/snr-shaw-768x531.jpg"],
  "hq-mandaluyong": ["completed/buildings", "2021/12/Highway-54-990x742.jpg"],
  // completed/energy
  "coron-bunker-power-plant": ["completed/energy-power-plants-transmission-lines-and-substations", "2021/08/diesel-01-1-768x531.png", "2021/08/diesel-02-1-768x531.png", "2021/08/diesel-03-1-768x531.jpg"],
  "balingasag-thermal": ["completed/energy-power-plants-transmission-lines-and-substations", "2021/08/coal-01-1-2-768x531.jpg", "2021/08/coal-01-2-1-768x531.jpg", "2021/08/coal-01-3-1-768x531.jpg"],
  "mariveles-500kv": ["completed/energy-power-plants-transmission-lines-and-substations", "2023/08/DJI_0261-Enhanced-scaled-768x576.jpg", "2023/08/DSC_6210-Enhanced-scaled-768x513.jpg"],
  "masinloc-bess-10mw": ["completed/energy-power-plants-transmission-lines-and-substations", "2021/08/battery-01-1-1-768x531.jpg", "2021/08/battery-01-2-1-768x531.jpg"],
  // completed/flood control
  "laoag-bongo": ["completed/flood-control-and-dams", "2021/08/road-5-1-990x685.png"],
  // completed/mining and tunnelling
  "apex-mining-maco": ["completed/mining-and-tunnelling-works", "2021/08/mining-01-1-1-990x990.jpg"],
  "sfex-tunnel": ["completed/roads-bridges-and-railways", "2021/11/SFEX1-scaled-768x511.jpg", "2021/08/tunneling-01-1-2-768x768.jpg", "2021/11/SFEX2-scaled-768x576.jpg", "2021/11/SFEX3-scaled-768x576.jpg"],
  "bakun-hydro": ["completed/mining-and-tunnelling-works", "2021/08/tunneling-05-1-2-768x768.jpg", "2021/08/tunneling-05-2-3-768x768.jpg", "2021/08/tunneling-05-3-2-768x768.jpg"],
  // completed/renewable
  "cabulig-hydro": ["completed/renewable-energy-power-plants", "2021/09/1.png"],
  "loboc-hydro": ["completed/renewable-energy-power-plants", "2021/09/2-1.png"],
  "catuiran-hydro": ["completed/renewable-energy-power-plants", "2021/09/3-3.png", "2021/09/viber_image_2021-09-10_00-05-26-138-768x432.jpg", "2021/08/tunneling-03-1-990x990.jpg"],
  "caliraya-hydro": ["completed/renewable-energy-power-plants", "2021/09/4-1.png"],
  "botocan-hydro": ["completed/renewable-energy-power-plants", "2021/09/5.png"],
  "kalayaan-hydro": ["completed/renewable-energy-power-plants", "2021/09/6-1.png"],
  "sabangan-hydro": ["completed/renewable-energy-power-plants", "2021/09/7.png", "2021/08/tunneling-02-1-990x990.png"],
  "manolo-fortich": ["completed/renewable-energy-power-plants", "2021/09/8.png", "2021/08/tunneling-04-1-768x768.jpg"],
  "bubunawan-hepp-rehab": ["completed/renewable-energy-power-plants", "2021/09/9.png"],
  "irisan-1-hepp": ["completed/renewable-energy-power-plants", "2021/09/10.png"],
  "puerto-galera-wind": ["completed/renewable-energy-power-plants", "2021/09/1-9.png"],
  "pililla-wind-farm": ["completed/renewable-energy-power-plants", "2021/09/2-7.png"],
  "san-lorenzo-wind-farm": ["completed/renewable-energy-power-plants", "2021/09/3-2-1.png"],
  "toledo-solar": ["completed/renewable-energy-power-plants", "2021/09/ToledoSPP-1-1-scaled-768x432.jpg", "2021/09/ToledoSPP-2-768x432.png", "2021/09/ToledoSPP-3-768x432.png"],
  "morong-solar-pv": ["completed/renewable-energy-power-plants", "2021/09/2-7-1.png"],
  // completed/roads
  "sctex-pkg1": ["completed/roads-bridges-and-railways", "2021/08/road-2-1-2-768x531.jpg", "2021/08/road-2-2-2-768x531.jpg", "2021/08/road-2-3-2-768x531.jpg"],
  "urgent-bridges-package-3": ["completed/roads-bridges-and-railways", "2021/08/road-3-1-2-990x685.jpg"],
  // completed/site development
  "sta-rita-ccpp": ["completed/site-development-works", "2021/09/2-7-2.png"],
  "pagbilao-unit3": ["completed/site-development-works", "2021/09/4-1-1-768x456.png"],
  // completed/water
  "rizal-province-water-supply": ["completed/water-and-wastewater-systems", "2021/09/DESIGN-AND-BUILD-OF-RIZAL-PROVINCE-WATER-SUPPLY-IMPROVEMENT-PROJECT-–-PHASE-1-2.png"],
  "morong-wtp": ["completed/water-and-wastewater-systems", "2021/09/0-02-04-de53edeaa4923411c5866185dbc901f94339d66c04acc8c84f3e17940760597a_202bc0e10497d3b4-768x512.jpg", "2021/08/water-03-2-1-768x531.png", "2021/08/water-03-3-1-768x531.png"],
  "marikina-north-stp": ["completed/water-and-wastewater-systems", "2021/11/100-MLD-MARIKINA-NORTH-STP-2-scaled-768x576.jpg", "2021/11/100-MLD-MARIKINA-NORTH-STP-3-scaled-768x576.jpg", "2021/11/100-MLD-MARIKINA-NORTH-STP-4-scaled-768x513.jpg"],
  "bahay-toro-stp": ["completed/water-and-wastewater-systems", "2021/08/sewage-02-2-1-768x531.jpg", "2021/08/sewage-02-1-1-768x531.jpg", "2021/08/sewage-02-3-1-768x531.png"],
  "marikina-north-pumping-station": ["completed/water-and-wastewater-systems", "2021/08/pump-01-2-1-768x531.jpg", "2021/08/pump-01-1-1-768x531.jpg"],
  // ongoing pages
  "tuguegarao-lallo-230kv": ["ongoing/energy-power-plants-transmission-lines-and-substations", "2021/09/TuguegaraoTRANS-1-scaled-990x557.jpg", "2021/09/IMG_20210730_155305-scaled-990x743.jpg"],
  "marilao-substation": ["ongoing/energy-power-plants-transmission-lines-and-substations", "2021/09/3-1.png"],
  "masinloc-bess": ["ongoing/energy-power-plants-transmission-lines-and-substations", "2021/08/battery01-1-768x531.png", "2021/08/battery01-2-768x531.jpg", "2021/08/battery01-3-768x531.jpg"],
  "meralco-hdd-pnr-north-1-batch-1": ["ongoing/hdd-projects", "2021/08/01-990x685.png", "2021/09/1-8.png"],
  "meralco-hdd-pnr-north-1-batch-2": ["ongoing/hdd-projects", "2021/08/02-990x685.png", "2021/09/2-6.png"],
  "maco-tmf": ["ongoing/mining-and-tunnelling-works", "2021/09/1-7.png"],
  "lake-mainit-hepp": ["ongoing/mining-and-tunnelling-works", "2021/09/2-5.png"],
  "siguil-hydro": ["ongoing/renewable-energy-power-plants", "2021/09/1-5.png"],
  "kiangan-mini-hydro": ["ongoing/renewable-energy-power-plants", "2021/09/SECTOR-3_2021-05-28_13-27-58-990x609.jpg"],
  "slex-tr4": ["ongoing/roads-bridges-and-railways", "2021/09/1-3.png"],
  "upper-wawa-roads": ["ongoing/roads-bridges-and-railways", "2021/09/2-2.png"],
  "lrt1-cavite": ["ongoing/roads-bridges-and-railways", "2021/09/1-6.png"],
  "nscr-cp02": ["ongoing/roads-bridges-and-railways", "2021/09/2-4-990x758.png"],
  "ilijan-lng-site-development": ["ongoing/site-development-works", "2021/09/1-2-990x743.png"],
  "project-epic-bauan": ["ongoing/site-development-works", "2021/09/2-1-2-990x537.png"],
  "batangas-ccpp-site-development": ["ongoing/site-development-works", "2021/09/20210817_CCPP_Panorama-EDIT-990x342.jpg"],
  "la-mesa-wtp": ["ongoing/water-and-wastewater-systems", "2021/09/LaMesaWTP-2-1-768x432.jpg", "2021/09/LaMesaWTP-3-1-768x432.jpg", "2021/09/Overview-1-768x432.png"],
  "valenzuela-sewerage-interceptor": ["ongoing/water-and-wastewater-systems", "2021/09/0-02-04-24d4e7cabc2a5581ee34ddcf0dfe6d09a5896eb59fe7a905206f2dbbe3e5ce55_ddbc4119ff87dfaf-768x576.jpg", "2021/09/0-02-04-903ea22e470e7204aae16b32630776d62531676867d201683bbf000079331278_c954851f8c6b03ff-768x576.jpg"],
  "valenzuela-stp": ["ongoing/water-and-wastewater-systems", "2021/09/1-1.png"],
  "magdiwang-reservoir": ["ongoing/water-and-wastewater-systems", "2021/09/4.png"],
  // news posts
  "davao-wtp": ["news: Tapped by Apo Agua for the Davao City Bulk Water Supply Project", "2022/12/viber_image_2022-11-18_07-56-53-917.jpg"],
  "pmftc-tanauan": ["news: SCIC Secures Deal for PMFTC Batangas Factory Extension Project", "2022/12/IMG_2701-1-scaled.jpg"],
  "maladugao-hydro": ["news: 8.4MW Maladugao Hydroelectric Power Project - A Sealed Deal", "2022/10/20221011_091259-Enhanced-1-scaled.jpg"],
};

fs.mkdirSync(OUT, { recursive: true });
fs.mkdirSync(TMP, { recursive: true });
const result = {};
let made = 0, failed = 0;
for (const [slug, [page, ...files]] of Object.entries(IMAGES)) {
  result[slug] = { page, images: [] };
  for (let i = 0; i < files.length; i++) {
    const out = path.join(OUT, `${slug}-${i + 1}.jpg`);
    const publicPath = `/project-images/${slug}-${i + 1}.jpg`;
    if (fs.existsSync(out) && fs.statSync(out).size > 2000) {
      result[slug].images.push(publicPath);
      continue;
    }
    const url = UP + files[i].split("/").map(encodeURIComponent).join("/");
    try {
      const res = await fetch(url, { headers: { "User-Agent": "Mozilla/5.0 SCIC-Atlas-data-check" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const raw = path.join(TMP, `${slug}-${i + 1}${path.extname(files[i]) || ".img"}`);
      fs.writeFileSync(raw, Buffer.from(await res.arrayBuffer()));
      // at most 1280 px wide, never enlarged; a white ground under transparent PNGs
      execFileSync("ffmpeg", ["-hide_banner", "-loglevel", "error", "-y", "-i", raw, "-vf", "scale='min(1280,iw)':-2", "-q:v", "4", "-frames:v", "1", out]);
      result[slug].images.push(publicPath);
      made += 1;
    } catch (e) {
      failed += 1;
      console.log(`FAILED ${slug} ${files[i]}: ${e.message}`);
    }
    await new Promise((r) => setTimeout(r, 350));
  }
}
fs.writeFileSync(path.join(process.cwd(), ".cache", "project-images.json"), JSON.stringify(result, null, 2));
const total = Object.values(result).reduce((n, r) => n + r.images.length, 0);
console.log(`${Object.keys(result).length} projects, ${total} pictures (${made} new, ${failed} failed)`);
