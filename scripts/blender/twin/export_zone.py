"""
Exports a ZONE_ collection of the master scene to components/twin/data/zones/<zone id>.json
(docs/twin-v2/CONTRACTS.md section 4.2) and its stations to components/twin/data/stations.json (4.6).

  blender -b assets-src/twin/site_master.blend --python scripts/blender/twin/export_zone.py -- --zone=powerhouse.guardhouse
  blender -b <file> --python scripts/blender/twin/export_zone.py -- --all

What it reads inside ZONE_<zone id> (child collections included):
  PLACE_<asset id>_<n>   an empty. Its position, rotation and uniform scale become a placement. The
                         asset is the collection the empty instances, else the id in its name.
                         Optional custom properties: stage ("rebar,formwork"), pick ("facility:guardhouse").
  STN_<station id>       an empty. Custom properties: roles, activity, capacity, hours ("360-720,780-1020"),
                         rain, typhoon, stage.
  LIGHT_<kind>_<n>       an empty or a light; kind is lamp, window or flood. Custom properties:
                         colorK, lumens, hours ("1080-360").
  CAM_<camera id>        a camera. Custom properties: title, distance (metres to the point it looks at).
Custom properties on the zone collection: title, streamIn, streamOut, shell (an asset id), test (1 for a
zone that loads only when asked for by ?testzone=).

Positions are written in the twin frame (Y up, metres, millimetre precision), rotations as XYZ Euler
angles in radians.
"""
import os
import re
import sys

import bpy
from mathutils import Vector

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import twin_lib  # noqa: E402

PLACE_RE = re.compile(r"^PLACE_(.+?)_(\d+)(?:\.\d+)?$")
STAGES = {"cleared", "excavation", "rebar", "formwork", "poured", "finished", "commissioned"}


def twin_transform(obj):
    """(position, XYZ Euler rotation, uniform scale) of an object in the twin frame."""
    m = twin_lib.TO_Y_UP @ obj.matrix_world @ twin_lib.TO_Y_UP.inverted()
    loc, rot, scale = m.decompose()
    e = rot.to_euler("XYZ")
    if max(scale) - min(scale) > 1e-3 * max(scale):
        print(f"    warn  {obj.name}: scale {tuple(round(s, 3) for s in scale)} is not uniform; the largest is used")
    return [round(v, 3) for v in loc], [round(v, 4) + 0.0 for v in e], round(max(scale), 4)


def hours(value, default):
    """'360-720,780-1020' -> [[360, 720], [780, 1020]]."""
    if not value:
        return default
    return [[int(a), int(b)] for a, b in (part.split("-") for part in str(value).split(","))]


def stage_list(value, where):
    stages = [s.strip() for s in str(value).split(",") if s.strip()]
    for s in stages:
        if s not in STAGES:
            raise ValueError(f"{where}: unknown stage '{s}'")
    return stages


def asset_box(asset_id, cache):
    """Corners of an asset's LOD0 bounding box in Blender space, in the asset's own frame."""
    if asset_id not in cache:
        lod0 = twin_lib.lod_objects(twin_lib.asset_collection(asset_id)).get(0)
        cache[asset_id] = [lod0.matrix_world @ Vector(c) for c in lod0.bound_box] if lod0 else [Vector((0, 0, 0))]
    return cache[asset_id]


def export_zone(zone_id):
    coll = bpy.data.collections.get(f"ZONE_{zone_id}")
    if coll is None:
        raise ValueError(f"no collection named 'ZONE_{zone_id}'")

    placements, lights, cameras, stations = [], [], [], []
    lo = Vector((float("inf"),) * 3)
    hi = Vector((float("-inf"),) * 3)
    boxes = {}

    def grow(point):
        for i in range(3):
            lo[i] = min(lo[i], point[i])
            hi[i] = max(hi[i], point[i])

    for obj in sorted(coll.all_objects, key=lambda o: o.name):
        name = obj.name
        if name.startswith("PLACE_"):
            match = PLACE_RE.match(name)
            asset_id = obj.instance_collection.name if obj.instance_collection else match.group(1) if match else None
            if not asset_id or asset_id not in bpy.data.collections:
                raise ValueError(f"{name}: cannot tell which asset this places")
            p, r, s = twin_transform(obj)
            entry = {"asset": asset_id, "p": p, "r": r, "s": s}
            if obj.get("stage"):
                entry["stage"] = stage_list(obj["stage"], name)
            if obj.get("pick"):
                entry["pick"] = str(obj["pick"])
            placements.append(entry)
            for corner in asset_box(asset_id, boxes):
                grow(obj.matrix_world @ corner)
        elif name.startswith("STN_"):
            p, r, _ = twin_transform(obj)
            station = {
                "id": name[4:],
                "zone": zone_id,
                "p": p,
                "yaw": r[1],
                "roles": [s.strip() for s in str(obj.get("roles", "")).split(",") if s.strip()],
                "activity": str(obj.get("activity", "")),
                "capacity": int(obj.get("capacity", 1)),
                "hours": hours(obj.get("hours"), [[0, 1440]]),
                "weather": {"rain": bool(obj.get("rain", 0)), "typhoon": bool(obj.get("typhoon", 0))},
            }
            if obj.get("stage"):
                station["stage"] = stage_list(obj["stage"], name)
            stations.append(station)
            grow(obj.matrix_world.translation)
        elif name.startswith("LIGHT_"):
            kind = name.split("_")[1]
            if kind not in ("lamp", "window", "flood"):
                raise ValueError(f"{name}: light kind must be lamp, window or flood")
            span = hours(obj.get("hours"), [[1080, 360]])[0]
            lights.append({"kind": kind, "p": twin_lib.y_up(obj.matrix_world.translation), "colorK": int(obj.get("colorK", 4000)), "lumens": float(obj.get("lumens", 8000)), "hours": span})
            grow(obj.matrix_world.translation)
        elif name.startswith("CAM_") and obj.type == "CAMERA":
            eye = obj.matrix_world.translation
            ahead = obj.matrix_world.to_quaternion() @ Vector((0, 0, -1))
            reach = float(obj.get("distance", 0)) or (obj.data.dof.focus_distance if obj.data.dof.use_dof else 20.0)
            cameras.append({"id": name[4:], "title": str(obj.get("title", name[4:])), "pos": twin_lib.y_up(eye), "target": twin_lib.y_up(eye + ahead * reach)})

    if lo.x == float("inf"):
        lo = hi = Vector((0, 0, 0))
    zone = {
        "id": zone_id,
        "title": str(coll.get("title", zone_id)),
        "bounds": twin_lib.bounds_y_up(lo, hi),
        "streamIn": float(coll.get("streamIn", 250)),
        "streamOut": float(coll.get("streamOut", 320)),
        "shell": str(coll["shell"]) if coll.get("shell") else None,
    }
    if coll.get("test"):
        zone["test"] = True
    if zone["streamOut"] <= zone["streamIn"]:
        raise ValueError(f"ZONE_{zone_id}: streamOut must be larger than streamIn")

    # one placement per line: the file stays small and a moved prop is a one-line change in git
    import json

    def rows(items):
        return "[\n" + ",\n".join("  " + json.dumps(i, separators=(",", ":")) for i in items) + "\n ]" if items else "[]"

    head = json.dumps(zone, indent=1)[:-2]
    text = f"{head},\n \"placements\": {rows(placements)},\n \"lights\": {rows(lights)},\n \"cameras\": {rows(cameras)}\n}}\n"
    path = os.path.join(twin_lib.DATA_DIR, "zones", f"{zone_id}.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

    # stations of every zone share one file: replace this zone's rows, keep the others
    stations_path = os.path.join(twin_lib.DATA_DIR, "stations.json")
    existing = []
    if os.path.exists(stations_path):
        with open(stations_path, encoding="utf-8") as f:
            existing = json.load(f)
    if stations or any(s["zone"] == zone_id for s in existing):
        merged = sorted([s for s in existing if s["zone"] != zone_id] + stations, key=lambda s: s["id"])
        twin_lib.write_json(stations_path, merged, indent=1)

    print(f"[export_zone] {zone_id}: {len(placements)} placements, {len(lights)} lights, {len(cameras)} cameras, {len(stations)} stations -> {path}")
    return zone


if __name__ == "__main__":
    args = twin_lib.script_args()
    if args.get("all"):
        ids = sorted(c.name[5:] for c in bpy.data.collections if c.name.startswith("ZONE_"))
    else:
        ids = [args["zone"]] if args.get("zone") else []
    if not ids:
        print("usage: -- --zone=<zone id> | --all")
        sys.exit(2)
    for zone_id in ids:
        export_zone(zone_id)
