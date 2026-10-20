# P13. Interface

Three sessions. A minimal interface a first-time visitor can use without instructions, on desktop and phone, in light and dark.

v1 for comparison: a header bar with three badges, two rows of status chips, a navigation card holding 10 place buttons, 4 time buttons, zoom, X-ray, labels and 3 feature buttons, an alerts panel, an FPS chip and several modals (`PlantScene.tsx` 2858 to 3456).

## Layout (wireframes)

Desktop, nothing selected:

```
+----------------------------------------------------------------------------+
| [SCIC] Tumauini HEPP  ·  Digital Twin        [ Search  Ctrl K ]   [Live] ? |
|                                                                            |
|                                                                            |
|                              3D view                                       |
|                                                                            |
|                                                                            |
|                                                            06:42  Clear    |
|              [ Places ] [ Time ] [ Layers ] [ People ] [ More ]            |
+----------------------------------------------------------------------------+
```

Desktop, something selected (inspector slides in; the dock stays):

```
+-------------------------------------------------------+--------------------+
| top bar                                               | Inspector          |
|                                                       | Title, kind        |
|                     3D view                           | Key facts          |
|                                                       | Status / activity  |
|                                                       | [Locate] [Follow]  |
|                                                       | [Open in Nexus]    |
|      [ Places ] [ Time ] [ Layers ] [ People ] [ More ]|              [x]  |
+-------------------------------------------------------+--------------------+
```

Dock panel open (one at a time, above the dock, closes on Escape or outside click):

```
              +--------------------------------------------+
              | Time                                       |
              | 00 ----------o------------------------ 24  |
              | [Live] [Dawn][Morning][Noon][Golden][Night]|
              | Speed  1x 60x 600x     Weather: Clear v    |
              +--------------------------------------------+
              [ Places ] [*Time*] [ Layers ] [ People ] [ More ]
```

Phone: top bar shrinks to title and search icon; the dock is a bottom bar of five icons; panels and the inspector are bottom sheets with a drag handle (peek, half, full).

## P13a. Shell, dock, inspector, loading

**Needs.** P09d.

**Read first.** `app/globals.css` (brand tokens, motion utilities, reduced-motion gating), `components/shared/BrandLogo.tsx`, `components/shared/motion.ts`, `components/ui/` (existing primitives), `state/store.ts`, `data/cameras.json`.

**Steps.**
1. Remove from the v2 page: the header badges, the orbit hint, the FPS chip (kept under `?debug=1`), the centre "architectural model" badge.
2. Top bar: logo, project title, search field, a single status pill ("Live" when clock and weather are real, "Simulated" when either is overridden, with a popover that says which), help button.
3. Dock with five panels:
   - **Places:** opens on the **scheme map**: a clean schematic of the whole project along the water path (weir and intake, desander, Tunnel 1, pipe bridge, Tunnel 2, surge tank, penstock, powerhouse, tailrace, switchyard, transmission line) with each work front's real progress percentage beside it. Choosing a location fades to it; inside a location, places are grouped (Works, Camp, Nature) as thumbnail cards with an Overview card first. A "Follow the water" button plays the path upstream to downstream, one stop per structure, cancellable by any input.
   - **Time:** two scrubbers. **Time of day:** 24 hours with sunrise and sunset ticks, Live button, moment bookmarks, play speed, weather selector (marked "Simulation" when not from PAGASA). **Project date:** April 2022 to today, with a marker for each month that has recorded progress; dragging it rebuilds every structure to its stage on that date (P14b).
   - **Layers:** toggles from the store with a one-line description each; construction-stage selector appears here when P14 enables it.
   - **People:** searchable, filterable roster (department, shift) showing photo, name, role and current activity; row actions Locate and Follow.
   - **More:** quality tier (Auto plus four), sound and volume, reduced motion, photo mode, measure, section view, guided tour, keyboard shortcuts, credits and licences.
4. Inspector: one component with variants per selection kind (person, equipment, vehicle, facility, animal). Shows only real or clearly labelled data; empty fields are omitted, never filled with placeholders.
5. A compact clock and weather read-out above the dock.
6. Loading: full-screen brand screen with a real progress figure and the current step, switching to the scene as soon as the overview's first-view set is ready; later streaming shows a thin, quiet progress line.
7. Styling from the global tokens: brand green for action and selection, the single water blue for live data, amber for caution; display face for titles, sans for body, monospace only for tags and codes. Panels use the app's existing surface tokens in both themes. Motion uses the shared spring and respects reduced motion.
8. Keyboard: Tab order through bar, dock, panel, inspector; Escape closes the top-most layer, then clears selection, then returns to overview; number keys 1 to 5 open dock panels; `/` or Ctrl+K opens search; `L` live; `[` and `]` step time.
9. Accessibility: roles and labels on every control, visible focus, contrast AA in both themes, live region announcing selection and place changes.

**Pass when.** Default screen shows only top bar, dock and clock; every v1 function marked keep in the inventory is reachable; keyboard-only use completes: go to turbine hall, set night, find a named engineer, return to overview.

## P13b. Search, in-scene labels, phone

**Steps.**
1. Search (command palette): people by name, nickname or role; equipment by tag or name; places; animals; actions ("night", "rain", "follow <name>"). Fuzzy match, keyboard navigation, recent items. Choosing a result selects and flies.
2. In-scene labels rendered in one HTML overlay layer positioned from projected points (not one drei `Html` per label): small pins by default that expand to a name on hover or when near screen centre; collision avoidance so labels do not overlap; fade with distance and when occluded; a hard cap on visible labels per tier. Kinds: facilities, equipment tags, named people (when the People layer is on), vehicles in use.
3. Replace v1's holographic beacons with these pins plus a short facility summary in the inspector.
4. Hover feedback on pickable things: outline and cursor change; on touch, first tap selects.
5. Phone layout: bottom sheets; one-finger orbit, two-finger pan and pinch zoom, double-tap to focus; 44 px minimum targets; the dock clears the app's existing mobile bottom bar (`components/shared/MobileBottomBar.tsx`); landscape supported.
6. Context-loss and no-GPU states have a clear message and a retry.
7. First-visit hint: three dismissible tips (drag to look, scroll to zoom, tap anything), shown once, stored locally.

**Pass when.** Search finds every named person, every equipment tag and every place; labels never overlap or cover the dock; on a phone-size viewport every panel is usable with one thumb; a first-time user test script (find the canteen, make it night, find the project manager, go back) completes in under a minute.

## P13c. Tools: photo, measure, section, tour

**Steps.**
1. **Photo mode:** hides the interface, adds field-of-view, depth-of-field and exposure controls, a rule-of-thirds overlay, and exports a PNG at up to 4K with an optional SCIC footer (project name, date and time shown, "Simulated" if applicable).
2. **Measure:** click two points for distance and height difference, three or more for a polyline or area; snaps to surfaces; units in metres; cleared with Escape.
3. **Section view:** a movable cut plane with hatched cut faces for the powerhouse and tunnel (uses P05b's cutaway sets), with a small gizmo and presets (long section, cross section).
4. **Guided tour:** a data-defined path (`data/tours/overview.json`) of stops with a caption each; plays with gentle camera moves; any input pauses it and shows Resume and Exit; captions state only facts from the inventory. No voice in this phase.
5. **Share:** copy a link that restores place, time, weather, layers and selection.
6. **Compare:** a split slider between two clock times or two construction stages from the same camera (renders the second view at reduced rate; High and Ultra only).

**Pass when.** Each tool works on desktop and phone layouts, exits cleanly with Escape, and leaves the camera free; exported images carry the simulated tag when it applies; the tour is interrupted by drag, wheel, key and touch.
