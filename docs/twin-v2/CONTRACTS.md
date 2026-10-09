# Contracts

Shared structure and data formats. A session may add optional fields and must log that in `DECISIONS.md`; it may not rename or remove fields without updating this file and every consumer in the same commit.

## 1. Folders

```
app/(dashboard)/digital-twin/page.tsx     route; picks v1 or v2 from ?v=
components/twin/
  TwinApp.tsx                             top-level client component
  engine/                                 renderer set-up, loop, tiers, loaders, LOD, streaming
  world/                                  terrain, sky, lighting, water, weather
  flora/                                  plant library, scatter, wind
  structures/                             zone components (thin: load GLB, wire picks)
  characters/                             character runtime, variation, animation controller
  sim/                                    clock, stations, schedules, agents, navmesh (no React)
  vehicles/  fauna/  fx/  audio/
  ui/                                     dock, inspector, search, labels, loading
  state/                                  zustand stores
  data/                                   typed site data (JSON + TS types)
lib/twin/                                 pure helpers shared with server code
scripts/twin/                             Node build and bench scripts
scripts/blender/twin/                     Blender Python (export, checks, review renders)
assets-src/twin/                          .blend sources, raw downloads (large files git-ignored)
public/models/twin/                       shipped GLBs, by category
public/textures/twin/                     shipped KTX2 textures not embedded in GLBs
public/vendor/twin/                       Basis and Meshopt decoders
docs/twin-v2/                             these prompts, state, reviews
```

## 2. Naming

- Files: `kebab-case`. Asset ids: `category.name.variant`, for example `flora.narra.a`, `prop.hardhat-rack`, `veh.dump-truck`, `char.body.m03`.
- GLB path: `public/models/twin/<category>/<name>.glb`. LODs are meshes inside one GLB named `<name>_LOD0`, `_LOD1`, `_LOD2`.
- Blender collections: `ZONE_<zone-id>`, `LIB_<category>`. Placement empties: `PLACE_<asset-id>_<n>`. Station empties: `STN_<station-id>`.
- Location ids: `weir`, `tunnel1`, `midway`, `tunnel2`, `powerhouse` (see `MASTER-BRIEF.md` section 7). Every zone id is prefixed by its location: `<location>.<zone>`.
- Zone ids:
  - `powerhouse.`: `powerhouse`, `turbine-hall`, `control-room`, `switchyard`, `penstock`, `surge-tank`, `tailrace`, `floodwall`, `guardhouse`, `access-road`, `magazine`, `camp-office`, `camp-office-interior`, `camp-qaqc`, `camp-staffhouse`, `camp-canteen`, `camp-barracks`, `camp-warehouse`, `camp-motorpool`, `camp-clinic`, `camp-court`, `camp-gate`, `forest`, `river`.
  - `weir.`: `weir`, `sluiceway`, `intake`, `fish-pass`, `feeder-canal`, `abutment`, `desander`, `tunnel1-inlet`, `adit`, `cofferdam`, `sat-barracks`, `sat-staffhouse`, `sat-canteen`, `sat-office`, `sat-motorpool`, `concrete-plant`, `access-road`, `forest`, `river`.
  - `midway.`: `tunnel1-outlet`, `pipe-bridge`, `tunnel2-inlet`, `temfacil`, `access-road`, `forest`.
  - `tunnel1.`: `inlet-drive`, `outlet-drive`. `tunnel2.`: `drive`.

## 3. Coordinates and units

Metres, Y up, right-handed. **Each location has its own local frame** so numbers stay small and precise: `data/locations.json` records, per location, the real-world position of its origin (easting, northing, elevation in the project grid shown on the drawings, plus latitude and longitude), its terrain extent, and its yaw relative to grid north. Local Y = 0 is a stated real elevation, so any displayed elevation is `origin.elevation + y`. The `powerhouse` location keeps v1's origin (the powerhouse) for continuity. Blender is Z up: the export script converts. Angles in data files are radians, yaw about Y. Times are minutes after midnight, Asia/Manila.

```ts
type Location = {
  id: "weir" | "tunnel1" | "midway" | "tunnel2" | "powerhouse";
  title: string;
  origin: { easting: number; northing: number; elevation: number; lat: number; lon: number; source: string };
  yawToGridNorth: number;
  halfExtent: number;             // metres of terrain each side of the origin
  underground: boolean;           // tunnels: no sky, own lighting
  overview: { pos: [number,number,number]; target: [number,number,number] };
  waterOrder: number;             // position along the water path, upstream first
};
```

Only one location is loaded at a time (plus its neighbours' far stand-ins where they are in sight). Moving between locations is a fade through the scheme map, never a multi-kilometre flight.

## 4. Data formats (`components/twin/data/`)

### 4.1 `assets.json` (written by the asset build, never by hand)

```ts
type AssetEntry = {
  id: string;                    // "prop.hardhat-rack"
  url: string;                   // "/models/twin/props/hardhat-rack.glb?v=<hash>"
  bytes: number;
  tris: [number, number, number];   // per LOD
  lodDistances: [number, number];   // metres where LOD1 and LOD2 begin
  bounds: { min: [number,number,number]; max: [number,number,number] };
  materials: number;
  credits: string[];             // ids into CREDITS.md
};
```

### 4.2 `zones/<zone-id>.json` (exported from the Blender master scene)

```ts
type Zone = {
  id: string;
  title: string;
  bounds: { min: [number,number,number]; max: [number,number,number] };
  streamIn: number;              // camera distance in metres at which the zone loads
  streamOut: number;             // distance at which it unloads (larger than streamIn)
  shell: string | null;          // asset id of the low-detail stand-in shown before load
  placements: { asset: string; p: [number,number,number]; r: [number,number,number]; s: number; stage?: StageId[]; pick?: string }[];
  lights: { kind: "lamp" | "window" | "flood"; p: [number,number,number]; colorK: number; lumens: number; hours: [number, number] }[];
  cameras: { id: string; title: string; pos: [number,number,number]; target: [number,number,number] }[];
};
type StageId = "cleared" | "excavation" | "rebar" | "formwork" | "poured" | "finished" | "commissioned";
```

### 4.3 `people.json` (the public registry; migrated from v1 `personnelData.ts` in P00)

```ts
type Person = {
  id: string;                    // keep v1 ids, e.g. "PM_ROMEO_SESE"
  name: string;
  nickname?: string;
  role: string;                  // job title as shown
  roleGroup: RoleGroup;          // drives outfit and behaviour
  department: string;
  photo?: string;
  shift: "day" | "night" | "office";
  look: LookSpec;                // 4.4
  home: string;                  // station id of bunk or desk
  verified: { licence?: string; yearsOfExp?: number; province?: string }; // shown only when present
};
type RoleGroup =
  | "management" | "engineer" | "surveyor" | "geologist" | "qaqc" | "supervisor" | "foreman"
  | "tunnel-crew" | "welder" | "carpenter" | "mason" | "steelman" | "labourer" | "electrician"
  | "rigger" | "operator" | "driver" | "safety" | "nurse" | "security" | "office" | "kitchen" | "warehouse";
```

Unnamed crew are generated at build time from `crew.json` (`{ roleGroup, count, shift }[]`) with a fixed seed, and are labelled by role only.

### 4.4 `LookSpec`

```ts
type LookSpec = {
  body: string;                  // "char.body.m03"
  skin: number;                  // 0..1 along the skin-tone ramp
  face: Record<string, number>;  // blendshape weights
  hair: string; hairColor: string; facialHair?: string; glasses?: boolean;
  height: number;                // metres
  outfit: string;                // "outfit.engineer.a"
  hardhat?: string; vest?: string;   // colour ids from data/ppe-colours.json
  wear: { dust: number; sweat: number; mud: number };  // 0..1 baselines
  props: string[];               // sockets filled by default, e.g. ["radio@belt"]
};
```

### 4.5 `clips.json`

```ts
type Clip = {
  id: string;                    // "work.rebar-tie"
  file: string;                  // animation GLB containing it
  loop: boolean;
  seconds: number;
  rootSpeed?: number;            // m/s for locomotion clips
  layer: "base" | "upper" | "additive";
  needsProps?: string[];         // "hammer@handR"
  tags: string[];
  source: "mixamo" | "mesh2motion" | "authored";
};
```

### 4.6 `stations.json` (exported from `STN_` empties)

```ts
type Station = {
  id: string;                    // "powerhouse.rebar-mat.3"
  zone: string;
  p: [number,number,number]; yaw: number;
  roles: RoleGroup[];            // who may use it
  activity: string;              // id into activities.json
  capacity: number;
  hours: [number, number][];     // valid windows, minutes after midnight
  weather: { rain: boolean; typhoon: boolean };   // usable in these conditions
  stage?: StageId[];             // only exists at these construction stages
  props?: { asset: string; p: [number,number,number]; r: [number,number,number] }[];
};
```

### 4.7 `activities.json`

```ts
type Activity = {
  id: string;                    // "rebar-tying"
  enter?: string; loop: string[]; exit?: string;   // clip ids; loop entries are picked at random with no immediate repeat
  minSeconds: number; maxSeconds: number;
  handProps?: string[];
  fx?: string[];                 // "sparks.weld"
  sound?: string;
};
```

### 4.8 `programme.json` (the daily programme)

```ts
type ProgrammeBlock = {
  roles: RoleGroup[]; shift: "day" | "night" | "office";
  from: number; to: number;      // minutes after midnight
  activityPool: string[];        // activity ids, or special goals: "toolbox-meeting", "meal", "rest", "travel"
  weather?: "any" | "dry" | "rain" | "typhoon";
};
```

### 4.9 `vehicles.json`, `routes.json`, `species.json`

```ts
type Vehicle = { id: string; asset: string; kind: string; route: string; operator?: string; cycle: string };
type Route = { id: string; points: [number,number,number][]; closed: boolean; stops: { at: number; seconds: number; reason: string }[] };
type Species = { id: string; asset: string; count: number; range: { centre: [number,number,number]; radius: number };
                 active: [number, number][]; flee: number; shelterInRain: boolean; behaviours: string[] };
```

### 4.10 `progress.json` and `history.json` (public; built in P00a, used in P14)

```ts
// Physical progress only. Never cost, billing, ratings or incident figures.
type ProgressPoint = { month: string; workFront: WorkFront; actualPct: number; plannedPct?: number; source: string };
type WorkFront = "overall" | "weir-intake" | "desander" | "tunnel1" | "headrace-pipe-tunnel2" | "surge-tank" | "penstock" | "powerhouse-switchyard" | "transmission-line";

// Dated events that drive construction stages and the timeline.
type HistoryEvent = {
  date: string;                   // YYYY-MM (or YYYY-MM-DD when the photo caption gives it)
  location: string; zone: string; // ids from section 2
  structure: string;              // id into structures.json
  stage?: StageId;                // stage reached, if the event marks one
  title: string;                  // e.g. "Concrete pouring of Lift 15"
  source: string;                 // deck and slide, e.g. "MPR-53 slide 62"
};
```

## 5. Store (`components/twin/state/`)

```ts
type TwinStore = {
  clock: { minutes: number; mode: "live" | "manual"; speed: number };
  weather: { state: "clear" | "overcast" | "rain" | "typhoon"; source: "pagasa" | "simulated" };
  quality: { tier: "low" | "medium" | "high" | "ultra"; auto: boolean };
  location: "weir" | "tunnel1" | "midway" | "tunnel2" | "powerhouse";
  projectDate: string | "today";  // the construction-progress timeline position (YYYY-MM)
  camera: { place: string | null; following: string | null };
  selection: { kind: "person" | "equipment" | "vehicle" | "facility" | "animal" | null; id: string | null };
  layers: Record<"labels" | "people" | "vehicles" | "animals" | "flora" | "energy" | "section", boolean>;
  stage: Record<string, StageId>;     // per structure id
  ui: { dock: string | null; searchOpen: boolean; reducedMotion: boolean; muted: boolean };
};
```

Per-frame values (agent positions, animation times) never go in the store; they live in typed arrays owned by `sim/` and are read by renderers through refs.

## 6. URL state

`?v=1|2`, `?loc=<location id>`, `?date=<YYYY-MM>|today`, `?place=<camera id>`, `?t=<HHMM>|live`, `?wx=<state>`, `?sel=<kind>:<id>`, `?layers=<comma list>`, `?q=<tier>`, `?debug=1`, `?project=<id>`. The existing `?preset=<v1 key>` is mapped to `?place=`.

## 7. Debug hooks

`window.__TWIN__ = { renderer, scene, camera, store, sim, stats() }` exists only when `?debug=1` or in the bench. `stats()` returns `{ fps, ms, p95, calls, tris, programs, textures, geometries, heapMB, zonesLoaded, agents }`.
