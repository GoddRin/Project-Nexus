# Nexus showcase video: plan

For: the Chairman, directors and top heads. Length: 44 seconds. Language: English.
Built with: HyperFrames (HTML compositions rendered to MP4), the ElevenLabs voice (the only paid item), free licensed music, sound effects and footage, and real recordings of the system.

---

## 1. What the video has to say

Nexus is Sta. Clara International Corporation's own operating system for its projects. It is built in-house and runs in a browser.

- **SCIC National Map (Project Atlas).** Every SCIC project on a live map of the Philippines. You can search and filter it, fly to any project, and turn back at any time. It has regional terrain, a time-travel timeline, presentation mode and the Atlas Navigator, a 3D guide who answers questions out loud.
- **Weather and hydrology.** The PH Storm Monitor uses live PAGASA signals and typhoon tracks. Site Weather and river-basin telemetry cover the hydro sites.
- **Command Center.** Construction progress, S-curve analytics and Project Intelligence.
- **Site operations.** Tickets, maintenance, daily reports, safety logs and incidents.
- **Plant resources.** Equipment, fixed assets with QR lookup, inventory and the site network.
- **Knowledge.** The AI Assistant, the Knowledge Base and controlled documents.
- **Home.** The executive front page, newsroom, live ticker and the 50-year seal (1976 to 2026).
- **In development: Digital Twin v2.** A photoreal 3D model of the Tumauini HEPP, with real terrain, real people (staff consented) and a sun, weather and night cycle. The first finished slice is the camp gate.

The one sentence the audience should leave with: **"Fifty years of SCIC projects, run from one live system, and next, a living twin of Tumauini."**

## 2. Creative direction: "Signal"

The visual idea is that one green signal line runs through the whole film. It draws the archipelago, links the projects, becomes the S-curve, traces the storm track, and in the trailer it becomes the river and the headrace leading to Tumauini. One unbroken line ties the system together, which is the point of the film.

- **Palette:** brand green `#007B3E` (with a lighter `#19A35B` for glow), one water blue for live data, and amber only for storm warnings. Near-black blue-green background `#05110C`. No purple or neon gradients.
- **Type:** the app's own display face for titles and its sans for labels, so the film and the product look like one thing. Titles are set big, tight and sentence-case, no more than five words on screen at once.
- **Screens:** the real UI, never mock-ups. Recordings sit on floating glass panels in 3D space, using CSS 3D transforms and perspective with a soft green rim light and a slow drift. Camera moves are pushes and parallax, never spins.
- **Motion grammar:** ease-out-expo for arrivals and ease-in for exits, with cuts on the music's beats. Every number counts up and every line draws on, so no element just appears.
- **Finish:** a light film grain, a soft vignette and a 2.39:1 letterbox for the trailer section only, so it reads as a "film within the film."
- **Two kinds of picture, one look:** the system itself is always the real UI, and real-world footage supplies the cinematic world around it (NASA night lights, a Sierra Madre aerial, the twin's own recordings). Both are graded the same way (lifted blacks, green-teal shadows, warm highlights, the same grain), so the cut from footage to a real screen feels like one camera.
- **Numbers:** every number on screen comes from the live database at capture time. The twin is labelled "In development".

## 3. Script (about 70 words, roughly 30 seconds of speech, leaving room to breathe)

Voice: calm, warm and assured, in the low-to-mid register, like a documentary rather than a movie trailer.

| # | Time | Voiceover | On screen |
|---|---|---|---|
| 1 | 0:00 | "For fifty years, SCIC has built across the Philippines." | A green line draws the archipelago and the project dots ignite. |
| 2 | 0:05 | "Today, every project lives in one place." | The SCIC wordmark and NEXUS resolve, with "1976 to 2026" and "87 projects · 41 provinces · one system". |
| 3 | 0:08 | "One national map. Search it. Fly to it. Ask it." | A real Atlas capture: search, fly-in on satellite, a question typed to Atlas AI, the Navigator thinking (the answer is not shown). |
| 4 | 0:16 | "Weather, storm signals and river data, around the clock." | The PH Typhoon Monitor, the site forecast chart drawing in, the river basin telemetry. |
| 5 | 0:21 | "Progress, milestones and equipment, down to the last valve." | A wall of live screens assembles (Command Center 83%, S-curve, COD countdown, site map), then lands on the Penstock Butterfly Valve card on "valve". |
| 6 | 0:29 | (silence) | Cut to black. One heartbeat. |
| 7 | 0:31 | "And next, Tumauini, rebuilt as a living digital twin." | Letterboxed: the gate slice from dawn to dusk to rain, then wireframe to render. |
| 8 | 0:39 | "Nexus. Renew your energy." | End card: SCIC logo, "Digital Twin v2, in development". |

Checked in phase 2 (Groq gpt-oss-120b second opinion, `showcase/audio/script-review.json`). Line 1 was softened from "built the Philippines". The AI Assistant answer is left out because its progress figure (79%, a hard-coded fallback) disagrees with the real 83%. Only the 83% from the latest Progress Snapshot appears on screen. The sidebar showing the signed-in email is cropped out of every shot.

## 4. Shot list (1920 x 1080, 60 fps, 44 s)

| Shot | Time | Content | Source | Motion graphics |
|---|---|---|---|---|
| S1 Cold open | 0:00 to 0:05 | Orbit-to-earth push over the Philippines at night, city lights below; the green line then draws the archipelago over it and the project points ignite | **F1** (NASA night lights on a 3D globe zoom built in HyperFrames) plus the real coastline and real project coordinates from `/api/projects` | Match-move the SVG line onto the clip, staggered dot pulses, sub-boom on the first light |
| S2 Title | 0:05 to 0:08 | SCIC wordmark, "NEXUS", "1976 to 2026" | `public/scic-logo-official.png` | Mask reveal, letter-spacing tightening, a light sweep |
| S3 National Map | 0:08 to 0:16 | National view, search for a project, fly-in, project card, breadcrumb back, Navigator speaking | Recording of `/dashboard/projects-map` (public) | Glass panel tilting from 12 degrees to flat, a callout chip with the real project count, a cursor-glow trail |
| S4 Weather | 0:16 to 0:21 | Storm track, PAGASA signal, then site weather and basin telemetry | `/dashboard/weather/philippines`, `/dashboard/weather` | Split wipe along the storm path (amber), a live-data pulse in blue |
| S5 Operations wall | 0:21 to 0:29 | Command Center, Progress, S-curve, Tickets, Daily Reports, Safety, Equipment, QR lookup, AI Assistant | Nine short recordings (sign-in needed) | 3 x 3 wall flies together on beats, then the camera pushes into the AI answer |
| S6 Breath | 0:29 to 0:31 | Black, one green pixel line | None | Music cuts out, a heartbeat thump |
| S7 Twin trailer | 0:31 to 0:39 | Misty mountain valley at dawn (F2); the real twin running live at the gate, dawn to dusk to rain, ending on the night lamps; the guard working the barrier | **F2** plus `record-gate.mjs` and `capture-gate.mjs` (`?t=`, `?wx=rain`) | 2.39 letterbox, slow push, time-of-day crossfades, a wireframe-to-render wipe, "IN DEVELOPMENT" stamp |
| S8 End card | 0:39 to 0:44 | Logo, "Renew your energy", "Project Nexus, built in-house by SCIC" | None | The signal line closes into a ring, then fades out |

## 4b. Free footage (no AI video)

| ID | Length | Source | Licence |
|---|---|---|---|
| F1 | 5 s | NASA Black Marble night-lights imagery of the Philippines, mapped onto a sphere and pushed in from orbit with CSS 3D and canvas in HyperFrames, with a thin atmosphere glow | NASA imagery, public domain |
| F2 | 4 s | Drone footage of misty forest mountains at dawn from Pexels or Pixabay (search "Sierra Madre", "Philippines mountains mist", "rainforest drone fog") | Pexels or Pixabay free licence, company use allowed, no credit needed |

Higgsfield is not used for this film (owner's decision, 2026-10-16). Every downloaded file is saved under `showcase/footage/` with its source URL and licence in `sources.json`.

## 5. Sound

- **Music (free licensed track, Pixabay Music or the YouTube Audio Library).** Look for a modern cinematic hybrid: felt piano, pulsing synth bass and low percussion at about 90 to 110 BPM, with a clear build and a big hit. Shortlist three, pick one, and cut it with ffmpeg: the intro and build up to 29 s, a hard stop at 29 s (the track is silenced, not faded), then a later, slower section of the same track (or a second track in the same key) for the trailer from 31 to 39 s, and the final chord for 39 to 44 s. The picture is cut to the track's beats, measured with an onset detector.
- **Sound effects (Pixabay and Freesound, CC0 or free licence only).** A sub-boom, a riser into the title, soft UI ticks on clicks, whooshes on panel moves, a heartbeat at 29 s, and a distant rain bed under the rain shot.
- **Mix (ffmpeg).** Voiceover at -16 LUFS, music ducked 8 dB under speech (sidechain), master at -14 LUFS with a -1 dBTP limit. Also export a version with no voiceover, so it can play under a live talk.

## 6. Tools and what you need to pay for

| Tool | Use | Cost | Verdict |
|---|---|---|---|
| HyperFrames | Composition, motion graphics, render to MP4 | Free, open source (Apache-2.0) | Use. It replaces CapCut and After Effects for this film. |
| ffmpeg (already installed) | Screen recording of the scripted browser, audio mix, encodes | Free | Use |
| Playwright (already used in the repo) | Drives the app on a fixed path so every take matches | Free | Use |
| ElevenLabs | **Voice only** | **Starter, about US$5 to 6 for one month.** It has a commercial licence and about 30,000 credits; the 70-word voiceover uses well under 1,000, so there is plenty of room for retakes. Cancel after the month. | Pay: one month of Starter |
| Pixabay Music, YouTube Audio Library | Music | Free, company use allowed | Use |
| Pixabay, Freesound | Sound effects | Free (CC0 or Pixabay licence) | Use |
| NASA, Pexels, Pixabay | Footage F1 and F2 | Free | Use |
| Script review | Checks each line for the audience | Free: reviewed in the session, with a second opinion from the Groq key already in `.env` | Use (replaces Jev) |
| CapCut | Editing | Free version is enough; Pro is not needed | Optional, only if you want to hand-tweak afterwards |

**Total outlay: about US$5 to 6** (one ElevenLabs Starter month). Everything else is free. If the voice is ever dropped, Kokoro TTS (already installed in the app) is the free fallback. Check the live ElevenLabs pricing page before buying.

## 7. Phases (one session each; about 7.5 hours of work overnight)

Each phase below is a ready-to-paste prompt. Work goes in `showcase/` at the repo root (git-ignored media), with the plan here.

### Phase 1: Captures (about 1.5 hours)
> Read `docs/showcase/PLAN.md`. Build `showcase/capture/` with a Playwright script that opens a headed Chrome at 1920 x 1080 (the owner's signed-in profile from `showcase/.auth/`) against the production build (`npm run build && npm start` on port 3100). For each shot S3, S4, S5 and S7, script the exact path (clicks, search text, waits for map idle), and record the window with ffmpeg `gdigrab` at 60 fps, CRF 12. Capture each shot three times and keep the cleanest. Hide the cursor, dev overlays and any toasts. Save `showcase/capture/numbers.json` with every number the film will show, read from the live API at capture time. For S7, use `scripts/twin/record-gate.mjs` and `capture-gate.mjs` (`?t=0600,1200,1800,2000`, `?wx=rain`). Report every clip with its duration, and any that failed.

### Phase 2: Script check and audio (about 1.5 hours)
> Check each line of the script in PLAN section 3 against three questions: "Clear to a non-technical company chairman?", "Any claim the visuals cannot back?", "Does it make the viewer want the next line?" Get a second opinion from Groq (`GROQ_API_KEY`), then report every rewrite with its before and after. With ElevenLabs (`ELEVENLABS_API_KEY`), audition three narrator voices on line 1, pick one, and generate the voiceover line by line (eleven_v3 or multilingual_v2, stability about 0.5). Find and download the music track and the sound effects from section 5, with each source and licence in `showcase/audio/sources.json`, then cut the music and mix with ffmpeg to the levels in section 5. Download footage F1 and F2 (section 4b) to `showcase/footage/`. Output `showcase/audio/mix.wav`, `stems/`, `beats.json` and `vo-timings.json` with the start and end of each line.

### Phase 3: Composition (about 3 hours)
> Install HyperFrames (`npx hyperframes init showcase/film`, `npx skills add heygen-com/hyperframes`). Build one composition per shot (S1 to S8) to the creative direction in PLAN section 2, timed to `vo-timings.json` and the music sections. Use the real brand tokens from `app/globals.css`, the real logo, the coastline from the app's data, and the numbers from `numbers.json` only. Recordings go on 3D glass panels. Preview each shot, take a still at its midpoint, and check them against the shot list before moving on.

### Phase 4: Polish, render, deliver (about 1.5 hours)
> Watch the full film at 1x in visible Chrome. Fix any jank, any text on screen for less than 1.2 s, and any cut that misses a beat. Add the grain, the vignette and the trailer letterbox. Render to MP4 (H.264 high, 1080p60, 20 Mbps), plus a no-voiceover version and a 4K version if the render time allows. Play-test on the presentation laptop. Deliver to `showcase/out/` with a one-page shot report.

## 8. What the owner does

1. Before phase 2: buy one month of ElevenLabs Starter at https://elevenlabs.io/pricing, create an API key at https://elevenlabs.io/app/settings/api-keys, and add `ELEVENLABS_API_KEY=` to `.env`.
2. When phase 1 opens the capture browser, sign in to Nexus once (I will not type your password). The session is saved for the rest of the captures.
3. Choose which project the National Map flies to in S3. The default is Tumauini HEPP.

## 9. As built (2026-10-17)

- **Spend:** ElevenLabs Starter (voice only, about 820 of 40,000 characters used) and Higgsfield Basic (US$5 a month, 10 of 80 credits used for two 5-second Seedance 2.0 Mini image-to-video takes). Both plans renew monthly unless cancelled. Music and sound effects are from Mixkit (free licence); footage from NASA Black Marble (public domain) and Mixkit. All sources are listed in `showcase/audio/sources.json` and `showcase/higgsfield/takes.json`.
- **Voice:** George (ElevenLabs, eleven_multilingual_v2), line by line, mixed to -14 LUFS with music ducked under speech. A version with no voice is at `showcase/audio/mix-novo.wav`.
- **Higgsfield:** H1 orbit opener (from the NASA night image, so the islands are the real shape) and H2 Tumauini site at dawn (from the real drone photo; the AI changed the structures, so it carries a small "AI visualisation" tag). The plan's Kling was not available on Basic.
- **Film:** HyperFrames 0.8.164 project in `showcase/film/` (built by `prep.mjs` then `build.mjs`). Output in `showcase/out/`.
- **Left out on purpose:** the AI Assistant answer (79% hard-coded fallback), the Tickets page (test tickets), and the Site Map's 73% header. The sidebar showing the signed-in email is cropped from every map shot.

## 10. The 102 s cut: "Follow the water" (2026-10-17)

- **Voice:** Michael C. Vincent (ElevenLabs voice library) for every line, made by `showcase/audio/tts-michael.mjs` into `audio/vo-michael/`; the Atlas Navigator keeps the app's own voice. ElevenLabs use so far: 2,285 of 40,000 characters this cycle (resets 2026-11-16).
- **Follow the water (65.7 to 90.7 s):** the title over the app's Site Map river, then ten stages in water order (weir, intake, desander, headrace tunnels, pipe bridge, surge tank, penstock, powerhouse, tailrace, switchyard), one Michael line each, with a glowing route rail along the bottom. The plant then "comes alive" on the Site Map: power-up hit, 11.3 MW counter, OPERATIONAL stamp, labelled "Site Map · the plant, simulated".
- **Footage:** six new Higgsfield takes from MPR-53 site photos (intake, desander, pipe bridge, penstock, tailrace, switchyard), which used the plan's last 30 credits (80 of 80 used). Weir, tunnels, surge tank and powerhouse reuse earlier takes. The Site Map was recorded with its per-zone completion percentages hidden in the capture only.
- **Facts on screen** are limited to what the project references confirm: two headrace tunnels, a 16-lift surge shaft, an 83 m drop from the surge tank to the powerhouse yard, a run-of-river powerhouse, a 69 kV outdoor switchyard. The turbine type (Francis) and the exact Tunnel 1 length are still unconfirmed, so they are not shown.
- **Build:** `audio/mix100.mjs`, `film/prep100.mjs`, `film/build100.mjs` into `showcase/film100/`; output `showcase/out/Nexus-Showcase-102s-1080p.mp4`.
- **Voice changed to Don (later on 2026-10-17):** the owner did not like Michael. Eight trailer and suspense voices were auditioned (`audio/voices2.mjs`, scored by `audio/score-voices.mjs`); Don – Movie Trailer Narrator on eleven_v3 had the deepest voice and the widest whisper-to-boom range with every word heard. Lines are made by `audio/tts-don.mjs` with delivery tags (whispered at the river, building through the tunnels, full power on the megawatts), two takes each, best take kept. `mix100.mjs` gives Don a trailer treatment (low-end weight, presence, compression, a short room). "Since nineteen seventy-six" was dropped from the opening line to fit Don's slower pace before the title; the year counter on screen still shows 1976. The Michael version is kept in `showcase/backup/v8-102s-follow-the-water/` (rebuild with `VO=vo-michael`).
- **106 s cut (2026-10-17, later):** back to George for every line (journey lines by `audio/tts-george-water.mjs`; `mix100.mjs` default `VO=vo`). "Into the turbines" now pushes through the powerhouse wall into an animated turbine cutaway (scroll case, spinning runner, tilt up the shaft to the generator), drawn in the composition as an illustration. The Site Map reveal was replaced by grid to homes: current running along the pole wires, a house lighting up on "homes", the valley at night with the 11.3 MW counter and OPERATIONAL ("when complete"). The owner declined a Higgsfield top-up (US$6 for 100 credits), so these use free Pexels stock, labelled "Stock footage · illustrative". New sounds: `el-j-lines`, `el-j-lightson`, `el-j-night`.
