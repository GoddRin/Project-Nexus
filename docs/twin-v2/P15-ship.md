# P15. Optimise, verify, cut over

Two sessions. Nothing new is built; everything is measured, fixed and released.

## P15a. Optimisation and full QA

**Needs.** Every earlier sub-phase done in `STATE.md`.

**Read first.** `MASTER-BRIEF.md` section 5 (the measured budget), all `review/*/REPORT.md` known-gaps sections, `RISKS.md`.

**Steps.**
1. **Bench matrix:** every tier, on the overview, each zone, the scripted fly-through, a 24-hour time-lapse, and rain. Record pass/fail per budget line. Fix failures in this order: draw calls, shader or pipeline count, overdraw from vegetation and particles, shadow cost, animation cost, texture memory.
2. **Load:** measure cold and warm first-view time and bytes; verify compressed textures are used on every asset; check cache headers; lazy-load everything not needed for the overview; confirm no asset is fetched twice.
3. **Memory:** 20-minute session visiting every zone twice; heap and GPU memory must return to baseline after leaving each zone. Fix leaks (undisposed geometries, textures, render targets, audio buffers, event listeners).
4. **Stability:** force a context loss and confirm recovery; throttle the network and confirm streaming degrades gracefully; hide and show the tab; resize continuously; rotate a phone-size viewport.
5. **Device and browser matrix:** the Iris Xe laptop, a discrete-GPU desktop if available, a mid-range Android phone and an iPhone if the owner can provide them; Chrome, Edge, Firefox, Safari. Record tier chosen, frame rate and any visual fault. No-GPU fallback: a gallery of pre-rendered stills from each place with hotspots.
6. **Visual QA sweep**, zone by zone at the seven moments and in rain, against `QUALITY-BAR.md`: floating or sunken objects, z-fighting, texture seams, LOD pops, light leaks, missing shadows, clipping garments, sliding feet, hands off tools, vehicles off roads, animals in wrong places, labels overlapping, unlabelled invented numbers. Log each fault in `review/P15a/FAULTS.md` and close them.
7. **Simulation QA:** run the unit tests; a 72-hour fast simulation with assertions (no agent off-mesh, no station over capacity, no agent stuck more than 2 sim-minutes).
8. **Accessibility:** keyboard-only pass, screen-reader pass over the interface (not the canvas), contrast in both themes, reduced motion honoured everywhere.
9. **Content and licences:** every shipped asset has a credits row; a Credits panel in More lists them (CC BY requires visible attribution); grep for brand names and logos on vehicles and props; confirm no raw Mixamo files or large sources are tracked by git.
10. **Privacy check against rule 6:** list every field the public page can show about a person and confirm each is allowed.
11. **Code health:** type check, lint, remove dead code and debug flags that should not ship, confirm `window.__TWIN__` is gated.

**Pass when.** Bench matrix all green on Medium and Low; fault log empty or each remaining item accepted by the owner in writing; credits complete.

## P15b. Cut-over and documentation

**Needs.** P15a, and the owner's explicit go-ahead to make v2 the default.

**Steps.**
1. Make v2 the default at `/digital-twin`; v1 remains at `?v=1` for one release. Map old `?preset=` links to `?place=`.
2. Update links into the twin (`lib/services/projectProfileService.ts`, `components/atlas/profile/ProjectProfileView.tsx`, sidebar, search modal, home launchpad and flagship spotlight) only as far as their targets change; their behaviour otherwise stays as is.
3. Update the assistant's knowledge of the page if it describes v1 (`lib/rag/generate.ts` mentions the digital twin): make the description match v2.
4. Write `docs/twin-v2/HANDBOOK.md`: architecture map; how to add an asset, a zone, a person, an outfit, a clip, a station, an activity, a vehicle, a species, a tour; how to run the pipeline and the bench; tier and budget tables; known limits.
5. Final report `review/P15b/REPORT.md`: before and after (v1 baseline against v2 numbers and images), what was dropped and why, open items.
6. **Only if the owner asks in a later session:** remove `components/digital-twin/`, v1-only assets in `public/models/` and `public/textures/`, and the `?v=1` switch. List exactly what will be deleted and get a yes before deleting anything.

**Pass when.** `/digital-twin` opens v2 for signed-out and signed-in visitors; every inbound link works; the handbook lets a new session add a prop and a person without reading engine code.
