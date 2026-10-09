# Master brief

Applies to every sub-phase.

## 1. Mission

Rebuild the Tumauini HEPP digital twin as **Twin v2**: a photoreal, smooth, asset-driven 3D site model for clients, lenders, government and the public. Every building, person, animal, plant, vehicle, ground surface and effect is replaced with modelled, PBR-textured assets. People and animals must look and move better than the Atlas Navigator on the SCIC national map does today. It must run well on an office laptop with integrated graphics.

The owner has given full authority over design, added features, effects, interface and tech stack. Use it, and log each decision in `DECISIONS.md`.

## 2. What v1 is (audit summary)

- One React Three Fiber canvas mounted by `app/(dashboard)/digital-twin/page.tsx` from `components/digital-twin/PlantScene.tsx`. The route is public (`proxy.ts`).
- Nearly everything is code primitives written as JSX: 1,170 `<mesh>` in `TemfacilFacility.tsx`, 402 in `TemfacilOfficeInterior.tsx`, 402 in `AnimatedSiteEntities.tsx`, 308 in `PowerhouseGeometry.tsx`. People are cylinders and spheres (`RealisticHumanoidMesh.tsx`, `HydroProjectPersonMesh`). Animals are primitives (`ForestWildlife.tsx`). Trees are merged cones and dodecahedra (`ForestVegetation.tsx`). Most textures are drawn on canvases at run time.
- No shadows (`shadows={false}`), pixel ratio capped at 1.2, four hard-switched times of day, one fixed lighting map.
- Saved benchmark (2026-10-08, Intel Iris Xe, production build): 9.2 fps desktop, 2,535 draw calls with run-time batching (5,743 without), 1.81 million triangles, 197 shader programs, 43 lights, about 5 minutes to settle.
- On-screen figures that are not real: `DEFAULT_EQUIPMENTS`, fixed log times, "28 On-Duty", "69kV Online", the MW chip.
- Worth carrying over: real Copernicus terrain (`public/data/gis-terrain-mesh.json`, `terrain-heightmap.json`, `components/digital-twin/terrainData.ts`), the personnel registry (`personnelData.ts`), site coordinates and dimensions inside the JSX, road and vehicle routes (`uphillRoadConfig.ts`), the tunnel face cycle (`TunnelFaceCycleTypes.ts`, `docs/tunnel-scene-brief.md`), `SierraMadreSoundEngine.ts`, the PAGASA storm link (`/api/weather/pagasa-signals`), the equipment action (`app/(dashboard)/dashboard/sitemap/actions.ts`), and `scripts/bench-twin.mjs`.

## 3. Hard rules

1. **No code-primitive people or animals.** They come from modelled or scanned assets. Hero buildings, vehicles and equipment are modelled in Blender. Primitives are allowed only for invisible helpers and debug.
2. **Free tools and free-licence assets only.** Blender 5.2, MPFB2, Mixamo, Mesh2Motion, Poly Haven, ambientCG, Sketchfab (CC0 or CC BY), Quaternius, KTX-Software, gltf-transform. No paid packs, no paid generators.
3. **Licences.** Every imported asset gets a row in `public/models/twin/CREDITS.md` (title, author, URL, licence, changes made). No NC, ND, editorial-only or unknown licences. Raw Mixamo FBX stay in `assets-src/mixamo/` (git-ignored); only baked clips inside GLBs ship.
4. **Never sign in for the owner.** Where an account is needed, hand over an exact list and wait.
5. **Nothing invented is shown as fact.** A figure comes from a real record or carries a visible "Simulated" tag. The owner has approved showing real physical progress percentages and completion dates publicly (decided 2026-10-09). Cost, margin, billing, KPI ratings, customer-survey scores and incident counts from the monthly reviews are internal and never appear in the twin, in `public/`, in code or in commits.
6. **Staff are shown publicly by name.** The owner has decided names and profiles are public. Show name, role, department and photo. Show licence number, years of experience and home province only for a person whose record the owner has confirmed as real and cleared; until then those fields are hidden, not invented.
7. **Scope.** New code lives in `components/twin/`, `lib/twin/`, `scripts/twin/`, `scripts/blender/twin/`, `public/models/twin/`, `assets-src/twin/` and the digital-twin route. v1 in `components/digital-twin/` is not edited and stays reachable at `?v=1` until P15. No other page changes behaviour.
8. **Free navigation.** Every camera move is interrupted at once by pan, zoom, click or key. Escape returns to the site overview. No tour, follow or transition may lock the user.
9. **This repo's Next.js differs from your training data.** Read the relevant guide in `node_modules/next/dist/docs/` before touching routes or config.
10. **Git.** Branch `twin-v2`, one commit per sub-phase, never push unless asked.
11. **Honest reports.** Measured numbers, what failed, what was skipped, what was not checked.
12. **Lab features.** Supercar, GTA mode and Locomotion Lab are not part of v2's interface. They remain available in v1 (`?v=1`) and are not ported unless the owner asks.

## 4. Tech stack

| Layer | Choice |
| --- | --- |
| Engine | three.js (0.185, already installed) with React Three Fiber 9 and drei 10. React renders the shell and static zones; simulation and animation run outside React's render path |
| Renderer | Decided by measurement in P01a: `WebGPURenderer` (`three/webgpu`, TSL materials, automatic WebGL2 fallback) or `WebGLRenderer`. All custom shading is written so the losing path is not needed |
| Assets | glTF 2.0 binary, Meshopt compression, KTX2/Basis textures, `EXT_mesh_gpu_instancing`, three LODs. Built with `@gltf-transform/cli` plus KTX-Software |
| Level authoring | Blender master scene `assets-src/twin/site_master.blend`; one collection per zone; placements exported as data |
| State | `zustand` store in `components/twin/state/` |
| Navigation mesh | `recast-navigation` (with its three.js helpers), baked at build time |
| Picking | `three-mesh-bvh` |
| Camera | drei `CameraControls` |
| Sun and moon position | `suncalc` |
| Post-processing | Ambient occlusion, bloom, AgX tone mapping, colour grade, SMAA or TAA; implemented for the chosen renderer only |

Decoders (Basis transcoder, Meshopt) are copied into `public/vendor/twin/` so nothing loads from a CDN.

## 5. Performance budget

Starting targets. P02c measures real costs and rewrites this table from evidence; after that it is binding.

| Measure | Medium tier, desktop overview (Iris Xe, 1440x900) | Low tier, phone profile |
| --- | --- | --- |
| Median frame rate | 45 fps or better | 30 fps or better |
| p95 frame time | 33 ms or less | 50 ms or less |
| Draw calls | 350 or fewer | 200 or fewer |
| Triangles in view | 700k or fewer | 300k or fewer |
| Shader programs / pipelines | 40 or fewer | 30 or fewer |
| Real-time lights | 1 sun + fixed pool of 8 | 1 sun + 4 |
| First usable view (warm cache) | 6 s or less | 8 s or less |
| Download to first view / whole site | 12 MB / 70 MB | 8 MB / 40 MB |
| JS heap after 20 minutes | No growth trend | No growth trend |

Tiers: Low, Medium, High, Ultra. Chosen automatically from a 2-second start-up probe, changeable by the user, with dynamic resolution when frames run long.

## 6. How to verify

1. **Blender review** for every asset before export: MCP `look` from front, side, three-quarter and close-up, checked against `QUALITY-BAR.md`.
2. **Build and bench:** `npx next build`, `npx next start -p 3100`, `node scripts/twin/bench.mjs <label>`. Paste the numbers into the report.
3. **Eyes on:** in the owner's visible Chrome window (the built-in browser pane pauses animation frames, and a minimised Chrome throttles to about 2 fps). Capture the sub-phase's subject at dawn, noon, golden hour, night and in rain.
4. **Type check and lint** pass for the files touched.
5. **Report** with before/after images and the checklist results.

## 7. The scheme, as built on the ground

Read `reference/INDEX.md` for detail and sources. The project is a chain of structures several kilometres long, not one compound. v2 models it as **five locations** linked by the water path and the access roads:

| Location id | What is there | Notes |
| --- | --- | --- |
| `weir` | Overflow weir across the river, sluiceway (4 gates), intake (2 gates, trashracks), fish pass, feeder canal, RCC left abutment, flood wall, desander (9 segments, flushing channel, control room), Tunnel 1 inlet portal and adit portal, river diversion and cofferdam (temporary), satellite camp (barracks 1 and 2, staff house, canteen, clinic, office, warehouse, motor pool, volumetric concrete plant, crusher) | Reached by access road AR02. Not in v1 |
| `tunnel1` | Headrace Tunnel 1, about 2.58 km (Sta. 0+021 to 2+579). Shown as interior sections near each portal, not the full length | Lining stage in 2026 |
| `midway` | Tunnel 1 outlet portal, pipe bridge with catwalk carrying the headrace pipe, Tunnel 2 inlet portal, small temporary facilities | Reached by AR04. Not in v1 |
| `tunnel2` | Headrace Tunnel 2, about 535 m | Drill and blast still active at the outlet in 2026 |
| `powerhouse` | Surge tank (16 lifts), penstock on saddles with anchor blocks, powerhouse (big and small units), tailrace, switchyard, floodwall, control room and guardhouse, main Temfacil camp, magazine area, transmission line take-off | Reached by AR01 and AR03. The only location v1 models |

The interface offers a scheme map and a "follow the water" path through all five (P13). Each location has its own terrain patch and local origin (`CONTRACTS.md` section 3); they are not one continuous world.

## 8. Site facts (do not invent others)

- **Owner-supplied references are in `reference/INDEX.md`. Read it before modelling anything; where it and v1 disagree, the reference wins.**
- Project: 11.3 MW Upper Tumauini Hydroelectric Power Project (run-of-river, upper cascade), Isabela, Sierra Madre foothills. EPC contractor: Sta. Clara International Corporation. Owner: Philnew Hydro Power Corporation. Designer: EDCOP. (From the DED title block, reference R1.)
- Real powerhouse levels: turbine floor EL. 188.24 m, lower pit EL. 183.54 m; ground floor about 4.3 m above the turbine floor; second floor 7.5 m above ground floor. v1's "EL. 0.5m MSL" label is wrong and is not carried over. Brand green `#007B3E`; official wordmark `public/scic-logo-official.png`; component `components/shared/BrandLogo.tsx`.
- Site coordinates used by v1 labels: powerhouse 17.0621 N, 121.8410 E; camp 17.0654 N, 121.8471 E. Time zone Asia/Manila.
- v1 scene frame: metres, Y up, powerhouse at the origin, camp pad centred near (118, 14, -95), scene half-width 180 m. v1's layout of the camp relative to the powerhouse is its author's arrangement, not a survey: P00a re-derives positions from the site development plan and key plans in the reference decks.
- Other real levels seen in the monthly reviews: weir flood wall Elev. 303; small-turbine raft footing Elev. 187.17 to 188.24. Contract start 12 April 2022; revised completion 28 December 2026.
- Site PPE as photographed: green hard hats most common, some red; navy or blue long sleeves with yellow reflective bands; yellow or orange vests; face cloths; rubber boots in wet areas.
- Any capacity, elevation or equipment rating shown in v2 is copied from v1's data or a Nexus record and listed in the P00 inventory with its source. If the source is only v1's code, the label is marked for the owner to confirm.
