# P01b report: scene shell, store, camera, clock

2026-10-10, branch `twin-v2`. `/digital-twin?v=2` now opens a working 3D view: v1's terrain in plain grey under a sun that follows the clock, with a camera you can fly, drag, zoom and walk. v1 is untouched and is still what `/digital-twin` shows.

## Result

All five "Pass when" checks pass. One real fault was found and fixed on the way (below): about 1 load in 13 showed sky and no ground.

| Pass when | Result | Evidence |
| --- | --- | --- |
| Fly-to is cancelled by each of drag, wheel, key, touch | **Pass** in all 7 runs | The fly-to flag is false straight after the input, before another frame; over the next 0.6 s the camera moves only by what the input itself asked for (drag 3.8 m, key 1.9 m, touch 0.00 m, one wheel notch 34 m of zoom) and stays more than 180 m short of the place |
| Escape returns to overview from any state | **Pass** in all 7 runs | Tried from: at a place, mid-flight, with a selection and a follow target set, after free movement, with keyboard focus in the places list. Selection, follow and place are cleared each time |
| Reloading a URL with `?place=` and `?t=` restores that view and time | **Pass** in all 7 runs | `?place=switchyard&t=1830`: camera at the switchyard view, clock manual at 18:30, same after a reload, URL unchanged. v1's `?preset=temfacil` is rewritten to `?place=temfacil` |
| No React re-render per frame (5 seconds of orbiting) | **Pass** | 0 React commits over 303 frames, counted by a React `Profiler` on the dev server. A production build does not report commits, so the six production runs show this line as "not measured" |
| Type check and lint clean | **Pass** | `npx tsc --noEmit`: no errors in `components/twin`, `lib/twin`, `scripts/twin` or the route. `npx eslint components/twin lib/twin scripts/twin/check-shell.mjs`: clean. `npx next build`: compiled |

The checks are a script, `scripts/twin/check-shell.mjs`, so they can be run again after any change. Raw results: `check-*.json` in this folder.

## What was run

Iris Xe laptop, 1440 x 900 window (the twin's canvas is 1184 x 844 beside the sidebar), signed out.

| Run | Browser | Backend | Checks | Loads, none black or empty | Ready, median |
| --- | --- | --- | --- | --- | --- |
| dev server | Chrome 154, headless | WebGPU | 23 of 23 | 40 of 40 | 1.3 s |
| production | Chrome 154, headless | WebGPU | 22 of 22 | 40 of 40 | 1.0 s |
| production | Chrome 154, `?force=webgl` | WebGL2 fallback | 22 of 22 | 40 of 40 | 0.9 s |
| production | Edge 155, headless | WebGPU | 22 of 22 | 40 of 40 | 1.1 s |
| production | Firefox 153 (Playwright build), headless | WebGL2 fallback | 22 of 22 | 20 of 20 | 2.5 s |
| production | WebKit 26.5 (Playwright build), headless | WebGL2 fallback | 22 of 22 | 20 of 20 | 3.6 s |
| production | Chrome 154, visible window | WebGPU | 21 of 21 (reload loop not run) | | |

"Ready" is from opening the page to ten frames drawn with the terrain present, on a warm server. The first page of each run took 2.4 to 9.5 s because the server was compiling or the browser was cold.

Cost of the empty shell, visible Chrome, production build, 6 seconds of orbiting: **60.0 fps, p95 17.2 ms on WebGPU; 59.8 fps, p95 18.0 ms on the WebGL2 fallback**; 2 draw calls, 8,193 triangles, 2 pipelines, 3 textures, 27 MB of JS heap. That is the display's 60 Hz cap, so it says only that the shell itself costs nothing worth measuring. P01c's bench gives the first meaningful numbers.

## What was built

| File | What it does |
| --- | --- |
| `components/twin/TwinApp.tsx` | The app: canvas, loading screen, no-graphics message, error boundary, rebuild after a lost device |
| `engine/renderer.ts` | `WebGPURenderer` with WebGL2 fallback, sRGB output, AgX tone mapping, pixel ratio from the tier, sized before its first frame, lost-device and GPU-error callbacks |
| `engine/loop.ts` | The one frame loop: stages sim, animation, camera, render; frame pacing figures |
| `engine/Engine.tsx` | The only `useFrame` in v2 (it runs the loop), the render stage, `window.__TWIN__` |
| `engine/camera.tsx` | The camera rig on drei's `CameraControls` class: fly-to, wheel zoom to the cursor point, double-click focus, WASD/arrows, Q/E, Shift, Escape, ground clamp, reduced motion |
| `engine/picking.ts` | What is under a screen point (`three-mesh-bvh`), and the ground-height function |
| `state/store.ts` | The store from `CONTRACTS.md` section 5, exactly, plus its write functions |
| `state/url.ts` | URL state both ways for the keys in section 6 |
| `sim/clock.ts` | Site clock: live Manila time or manual; exact value for the loop, the store told at most 4 times a second |
| `world/TempWorld.tsx` | Temporary: v1's terrain in grey with 5 m height lines, one sun placed by `suncalc` for the clock time, flat sky |
| `ui/ShellHud.tsx`, `ui/TwinMessage.tsx` | Stand-in controls (Overview, places, time, Live) and the messages. P13a replaces them |
| `data/types.ts`, `data/site.ts` | Types and typed access for `locations.json` and `cameras.json` |
| `scripts/twin/check-shell.mjs` | The checks above |

Installed: `zustand` 5.0.15, `three-mesh-bvh` 0.9.16, `suncalc` 2.1.1 (it ships its own types, so `@types/suncalc` is not kept).

## The fault that was found: sky and no ground

In the first production run 3 loads of 40 drew the sky and nothing else. No error was logged.

Cause: React Three Fiber configures its canvas again each time the canvas component re-renders, and it re-renders while it measures itself. With an async renderer factory (which WebGPU needs) a second configure can start while the first is still waiting for the GPU. The second works from a snapshot taken before the first finished, so it builds its own renderer, camera and scene and swaps them in. The swapped-in camera never gets its aspect ratio set (it stays 0), so nothing is drawn. This is very likely the "one black first frame" P01a saw.

Fix: the renderer is made once per canvas and every later request gets the same one; the camera and the scene are objects the twin makes itself and hands to React Three Fiber, so both passes use the same ones; the canvas component is memoised with stable props; the render stage also corrects a wrong aspect ratio. After the fix: 0 faults in 200 loads across the runs above, plus 100 more in Chrome and Edge. The check now fails a load if the terrain is not drawn, if nothing is under the cursor, or if a second renderer or camera rig was started.

## Other checks made

- **Wheel zooms to the cursor point:** after three notches the camera is 45% closer to the point that was under the cursor, and that point has moved 0.00 m on screen.
- **Double-click:** the orbit centre lands on the clicked point (0.00 m off).
- **Keys:** W moves 28 m level in half a second at overview height, D the same sideways, E up 21 m, Q down 21 m, Shift 2.2 times faster.
- **Ground:** asked to fly to 53 m under the camp pad, the camera stops 1.2 m above it; holding Q does not push it through.
- **Store to URL:** fly-to adds `?place=`; moving the camera removes it; Live removes `?t=`; a selection adds `?sel=`; `v`, `debug` and unknown keys are left alone.
- **Lost device:** a simulated loss mounts a new canvas and renderer; the camera comes back where it was. Tried on WebGPU and on the WebGL2 fallback.
- **Reduced motion:** fly-to and Escape arrive in one frame.
- **Upright phone-sized screen:** the overview stands 55% further back, as v1 did.
- **Time of day:** mean picture brightness 118 at 12:00, 46 at 18:30, 59 at 02:00 (moonlight; the night floor is deliberately high because the shell has no lamps).

## Known gaps and things not checked

- **Not a real Safari and not a real phone.** WebKit here is Playwright's Windows build; Firefox is Playwright's build. Both took the WebGL2 fallback and passed. Their frame rates in these runs (10 to 13 fps) are headless software rendering and say nothing about real devices. Touch was tested as an emulated tap, not a finger; pinch zoom was not exercised.
- **Real WebGPU device loss was simulated**, by calling the renderer's own lost-device callback. A real GPU reset was not provoked.
- **The fallback's slow start is covered only by a message.** The loading screen says the first start takes longer on a browser without WebGPU. With nothing to compile the fallback starts in under a second today; the 17 to 22 s from P01a will come back with real content, and P01c is where it is measured.
- **The loading screen shows the slow-start note only when the browser has no WebGPU at all.** A browser that has WebGPU but is refused an adapter falls back silently.
- **Places exist only at the powerhouse.** `cameras.json` holds v1's 31 views, all in the powerhouse frame. `?loc=weir` and the other locations show a flat grey disc and their overview from `locations.json`.
- **The terrain is v1's 360 m square**, which is smaller than the powerhouse location's 900 m. P03a replaces it.
- **Follow** is a store field that Escape clears; nothing can be followed until P09d.
- **No tier probe, no dynamic resolution, no post effects**: P01c and P12a. Edge smoothing is the renderer's own multisampling for now.
- **`window.__TWIN__` carries extra fields** beyond the contract (`backend`, `rig`, `loop`, `reactCommits`, `pick`) for the checks.
- **Two dev-server warnings about the wordmark image** (`scic-wordmark-white.png`: one dimension set by CSS, and "largest contentful paint") come from the shared `BrandLogo` component on the loading screen. Not changed: it is outside this plan's scope.

## For the owner

1. **Look at it:** open `http://localhost:3000/digital-twin?v=2` in Chrome. Drag, scroll at a spot, double-click a spot, hold W, press Escape. Pick a place from the list and interrupt it. Change the time. Nothing is textured yet: that is P02 onward.
2. **`docs/twin-v2/reference/INDEX.md` changed during this session and not by it** (a new section R3, the powerhouse storm drain plan). It is left out of this commit, uncommitted, as found.
3. **Playwright's Firefox and WebKit test browsers were installed on this machine** (into Playwright's own cache, not the project) to run the checks.
4. The dashboard still writes speech clips into `public/voice/` and `voice-bank/` when its pages load; those files are left out of this commit as before.
5. Nothing else is needed from you for P01c.

## Files in this folder

- `check-<run>.json`: every check with its measured detail.
- `shell-<run>-noon-overview.jpg`, `-noon-orbited.jpg`, `-1830-switchyard.jpg`, `-0200-camp.jpg`, `-phone.jpg`: captures per run.
