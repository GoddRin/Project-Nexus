# Map data credits

| File | Source | Licence |
| --- | --- | --- |
| `atlas-flowlines.geojson` (river centre lines, 20 major Philippine rivers) | © OpenStreetMap contributors, fetched through the Overpass API on 2026-10-01 | Open Database License (ODbL) 1.0, https://www.openstreetmap.org/copyright |

Changes made: ways filtered by river name, geometry simplified (Douglas–Peucker, ~150 m) and
coordinates rounded to 4 decimals. Attribution is shown in the map's GIS legend and must stay
visible wherever the rivers are displayed.

## Project routes on the Atlas map (atlas-flowlines.geojson, features with a "project" property)

Subic-Tipo (Subic Freeport) Expressway, the Mariveles-Balsik 500 kV transmission line, the North-South Commuter Railway between Bocaue and Malolos, and the part of the South Luzon Expressway mapped as under construction between San Pablo and Lucena.
Source: OpenStreetMap contributors, through the Overpass API (scripts/fetch-line-project-geometry.mjs, 5 October 2026). Licence: ODbL 1.0. Each is the project corridor as mapped, not a survey of the works.
