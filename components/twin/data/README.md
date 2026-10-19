# Twin v2 site data

Formats are fixed by `docs/twin-v2/CONTRACTS.md` section 4. Files here are written by scripts; edit the script, not the JSON.

| File | Written by | Loaded by the app | Status after P00a |
| --- | --- | --- | --- |
| `people.json` | `scripts/twin/extract-v1.mts` | yes | 35 people, v1 ids. `look` is provisional (bodies and outfits arrive in P07); `home` is a zone-based placeholder until P09a; `verified` is empty for everyone; a photo is listed only when its file name is that person's |
| `people.unverified.json` | same | **no, never** | Licence, years of experience, province and v1's descriptive text, all unconfirmed |
| `named-animals.json` | same | yes | The site dog, which v1 kept in the personnel registry |
| `ppe-colours.json` | same | yes | v1's colours by name; P07b replaces them from site photographs |
| `routes.json`, `poles.json`, `cameras.json`, `flow-path.json`, `exclusions.json` | same | yes | v1's layout in the powerhouse frame |
| `locations.json` | `scripts/twin/build-site-data.mts` | yes | Five locations with derived grid origins, latitude and longitude, elevation and error |
| `site-layout.json` | same | yes | v1 facilities and the real structures and roads |
| `structures.json` | same | yes | Ids used by `history.json` and the stage store |
| `progress.json` | same | yes (P14) | Physical percent complete per work front, October 2025 to August 2026 |
| `history.json` | same | yes (P14) | 53 dated events, each with deck and slide |
| `crew.json` | same | yes (P09) | Whole-site head-count by role group |
| `sources/site-plan-georef.json` | `scripts/twin/reference/georef_site_plan.py` | no | Positions and road traces read off the site development plan |
| `types.ts`, `site.ts` | hand-written (P01b) | yes | Types and typed access for `locations.json` and `cameras.json` |
| `assets.json` | `scripts/twin/build-assets.mjs` | yes | Five pipeline test props (P01c) |
| `zones/<zone id>.json` | `scripts/blender/twin/export_zone.py` | yes, one at a time, when the camera is near | `powerhouse.pipeline-test`: 2,500 test placements, loaded only with `?testzone=1` |
| `zones/index.json` | `scripts/twin/build-assets.mjs` | yes | One row per zone: what streaming needs before loading it |
| `stations.json` | `scripts/blender/twin/export_zone.py` | yes (P09) | not yet created: no zone has stations |
| `clips.json`, `activities.json`, `programme.json`, `vehicles.json`, `species.json` | later phases | | not yet created |

Never put cost, margin, billing, KPI ratings, survey scores or incident counts in this folder.
