# Risks

Appended when a risk appears; a row is marked retired, not deleted.

| Risk | Early test | Fallback | Status |
| --- | --- | --- | --- |
| WebGPU slower or unstable on Iris Xe | P01a spike | WebGL2 path | open |
| Free human bases do not beat the navigator | P02b: one finished person side by side | Derive bodies from the navigator's Sketchfab base; fewer body shapes, more variation by texture and outfit | open |
| 80 skinned people too slow | P02c measurement | Lower crew count in view; vertex-animated far crowd; throttle animation by distance | open |
| No good free model for a species or machine | Search in the phase before modelling | Model it in Blender from references; drop the species rather than ship a poor one | open |
| Mixamo lacks a trade-specific motion | P08a list review | Author the clip in Blender with IK | open |
| Download too large | P01c pipeline numbers | Stream by zone, lower texture sizes on Low and Medium | open |
| MPFB2 not compatible with Blender 5.2 | P02b first step | Install a supported Blender alongside, or use the navigator base | open |
| Session context runs out mid sub-phase | Any | Commit partial work, record exact stopping point in `STATE.md` | open |
| **Tunnel 1 length is in doubt** (P00a): the printed portal coordinates are 3,008.95 m apart; the latest decks' chainages stop at 2+579 and the owner chose 2.58 km | Ask the owner for the current Tunnel 1 plan or the as-built chainage of the outlet portal | Show the tunnel only as interior sections near each portal with chainage labels taken from photographed stencils; state no total length | open, needs the owner before P05e |
| **Printed coordinates are marked "to be verified" on the drawings** (P00a) for the Tunnel 1 start, both Tunnel 2 portals and the desander | P03a: lay the points over the fetched terrain and satellite imagery; portals must sit on slopes facing the right way and the weir on the river | Shift a location origin by hand to fit the imagery and record the shift in `locations.json` | open |
| **The datum step is a national average** (P00a): grid to latitude and longitude is good to about 10 m | P03a, same overlay | A single measured offset for the whole scheme | open |
| **Open elevation data is too coarse for close views** (P00a): 30 m spacing, a forest-canopy surface, reading 10 to 40 m high at the river | P03a: compare fetched terrain with the contours printed on the key plans (2 m contours around the tunnels and penstock) | Rebuild the terrain near structures from the drawings' contours and blend into the open data further out | open |
| **No layout drawing for either camp** (P00a): the main camp is known from one drone photograph and floor plans of three buildings; the satellite camp from ground photographs | P06a first step: ask the owner for a camp layout or a fresh drone photograph | Lay the main camp out from the Oct 2024 drone photograph and v1's building list on the real bench | open |
| **The desander's size and bearing are not established** (P00a): the key plan draws about 46 m, the photographs suggest more | Ask the owner for the desander general arrangement | Scale it from the aerial photographs using a truck for size | open, needs the owner before P05g |
| **The public equipment action returns more than the page shows** (P00a): serial numbers, internal user ids and free-text maintenance findings reach signed-out visitors (`INVENTORY.md` section 11) | P14a | A v2-only action that selects the shown fields | open; v1 is not changed by this plan, so the owner may want it fixed sooner |
| **Most v1 assets have no recorded licence** (P00a) | Licence table in `INVENTORY.md` section 12 | None is reused in v2; all are replaced | retired for v2 (nothing is carried over) |
| **Working `.blend` files are served from `public/models/characters/`** (P00a): about 9 MB that anyone can download | Listed in the P00a report | Move them to `scripts/blender/source/` (outside this plan's scope) | open, owner to decide |
