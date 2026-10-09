"""
Georeference the site development plan (MPR-18, September 2023) and read positions off it.

  python -I scripts/twin/reference/georef_site_plan.py

Reads   assets-src/twin/reference/mpr-decks/unz-0018/ppt/media/image15.png  (git-ignored, north up)
Writes  components/twin/data/sources/site-plan-georef.json

The plan carries no grid, so it is tied to the project grid (PRS92 Philippines Zone III, the grid
printed on the DED key plans) with four points whose coordinates are printed on other drawings:
the Tunnel 1 inlet and outlet, the Tunnel 2 outlet, and the powerhouse (from the penstock plan).
A least-squares similarity fit (scale, rotation, shift) gives the pixel-to-grid transform; the
residuals at the control points are the error estimate. Roads are traced along the coloured lines.

Pixel positions below were read by eye from 6x enlargements; they are good to about 1 pixel
(about 5 m on the ground).
"""
import heapq
import json
import math
import os

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
SRC = os.path.join(ROOT, "assets-src", "twin", "reference", "mpr-decks", "unz-0018", "ppt", "media", "image15.png")
OUT = os.path.join(ROOT, "components", "twin", "data", "sources", "site-plan-georef.json")

# pixel (x, y) -> grid (easting, northing); grid values are printed on the key plans named
CONTROL = [
    ("tunnel1-inlet", (954.2, 37.5), (605981.401, 1917792.154), "MPR-53 slide 36, Tunnel 1 key plan: START OF TUNNEL 1 STA 0+000"),
    ("tunnel1-outlet", (412.5, 376.3), (603430.822, 1916195.809), "MPR-53 slide 36, Tunnel 1 key plan: END OF TUNNEL 1 STA 3+008.95"),
    ("tunnel2-outlet", (350.0, 481.7), (603146.606, 1915714.938), "MPR-53 slide 48, Tunnel 2 key plan: OUTLET PORTAL STA 0+535.00"),
    ("powerhouse", (360.0, 514.2), (603188.4, 1915549.3), "MPR-53 slide 65, penstock plan: machine hall centre, 12.8 m past TB-04"),
]

# features read off the plan (pixel positions)
FEATURES = {
    "weir": (945.0, 11.7),
    "desander-upstream-end": (944.2, 27.5),
    "weir-mixing-facility": (970.0, 51.7),
    "satellite-temfacil": (994.2, 66.7),
    "main-temfacil": (426.7, 460.0),
    "main-temfacil-west-end": (411.0, 450.0),
    "main-temfacil-east-end": (440.0, 468.0),
    "powerhouse-mixing-facility": (405.0, 487.5),
    "road-junction-main-temfacil": (445.0, 463.3),
    "tunnel2-pi": (355.8, 449.2),
}


def fit_similarity(pairs):
    """Least-squares x' = a*x - b*y + tx, y' = b*x + a*y + ty with image y flipped to north."""
    n = len(pairs)
    px = [(p[0], -p[1]) for p, _ in pairs]
    gr = [g for _, g in pairs]
    mx = sum(p[0] for p in px) / n
    my = sum(p[1] for p in px) / n
    gx = sum(g[0] for g in gr) / n
    gy = sum(g[1] for g in gr) / n
    sxx = sum((p[0] - mx) ** 2 + (p[1] - my) ** 2 for p in px)
    a = sum((p[0] - mx) * (g[0] - gx) + (p[1] - my) * (g[1] - gy) for p, g in zip(px, gr)) / sxx
    b = sum((p[0] - mx) * (g[1] - gy) - (p[1] - my) * (g[0] - gx) for p, g in zip(px, gr)) / sxx

    def to_grid(x, y):
        dx, dy = x - mx, -y - my
        return (gx + a * dx - b * dy, gy + b * dx + a * dy)

    return to_grid, math.hypot(a, b), math.degrees(math.atan2(b, a))


def trace(mask, w, h, start, end):
    """Shortest path through the mask (8-connected, gaps of 2 px bridged) from start to end."""

    def nearest(pt):
        best, bd = None, 1e9
        for (x, y) in mask:
            d = (x - pt[0]) ** 2 + (y - pt[1]) ** 2
            if d < bd:
                best, bd = (x, y), d
        return best

    s, e = nearest(start), nearest(end)
    dist = {s: 0.0}
    prev = {}
    heap = [(0.0, s)]
    steps = [(dx, dy) for dx in range(-3, 4) for dy in range(-3, 4) if (dx, dy) != (0, 0)]
    while heap:
        d, u = heapq.heappop(heap)
        if u == e:
            break
        if d > dist.get(u, 1e18):
            continue
        for dx, dy in steps:
            v = (u[0] + dx, u[1] + dy)
            if v not in mask:
                continue
            step = math.hypot(dx, dy)
            nd = d + step * (1.0 if step < 1.5 else 3.0)  # prefer staying on the line over jumping gaps
            if nd < dist.get(v, 1e18):
                dist[v] = nd
                prev[v] = u
                heapq.heappush(heap, (nd, v))
    if e not in prev and e != s:
        return []
    path = [e]
    while path[-1] != s:
        path.append(prev[path[-1]])
    path.reverse()
    # thin: a point every 5 px, smoothed over its neighbours
    out = []
    for i in range(0, len(path), 5):
        seg = path[max(0, i - 3): i + 4]
        out.append((sum(p[0] for p in seg) / len(seg), sum(p[1] for p in seg) / len(seg)))
    if out[-1] != path[-1]:
        out.append(path[-1])
    return out


def main():
    im = Image.open(SRC).convert("RGB")
    w, h = im.size
    px = im.load()
    to_grid, scale, rot = fit_similarity([(p, g) for _, p, g, _ in CONTROL])

    residuals = {}
    for name, p, g, _ in CONTROL:
        e, n = to_grid(*p)
        residuals[name] = round(math.hypot(e - g[0], n - g[1]), 1)

    yellow, blue = set(), set()
    for y in range(h):
        for x in range(w):
            r, g, b = px[x, y]
            if r > 190 and g > 190 and b < 110 and not (x < 135 and y < 75):  # (the north arrow is yellow too)
                yellow.add((x, y))
            elif b > 170 and r < 90 and g < 90:
                blue.add((x, y))

    roads_px = {
        # yellow: "ACCESS ROAD TO WEIR AREA APPROX. = 7.1KM", drawn from the powerhouse past the main Temfacil to the weir
        "powerhouse-to-main-temfacil": trace(yellow, w, h, (362, 512), FEATURES["road-junction-main-temfacil"]),
        "main-temfacil-to-weir": trace(yellow, w, h, FEATURES["road-junction-main-temfacil"], (962, 40)),
        # (the track from the junction to the Tunnel 1 outlet is drawn dark, not yellow, and is not traced)
        # blue: "ACCESS ROAD TO POWERHOUSE APPROX. = 3.5KM", arriving from the south-west
        "public-road-to-powerhouse": trace(blue, w, h, (20, 600), (362, 520)),
    }

    def length(pts):
        return sum(math.hypot(pts[i + 1][0] - pts[i][0], pts[i + 1][1] - pts[i][1]) for i in range(len(pts) - 1))

    roads = {}
    for name, pts in roads_px.items():
        grid = [to_grid(*p) for p in pts]
        roads[name] = {"lengthM": round(length(grid)), "points": [[round(e, 1), round(n, 1)] for e, n in grid]}

    out = {
        "source": "Site development plan, MPR-18 (September 2023), image15.png; north up, satellite base",
        "grid": "PRS92 / Philippines Zone III (EPSG:3123), as printed on the DED key plans",
        "fit": {"metresPerPixel": round(scale, 3), "rotationDeg": round(rot, 2), "residualsM": residuals},
        "control": [{"id": n, "pixel": list(p), "grid": list(g), "source": s} for n, p, g, s in CONTROL],
        "features": {k: [round(v, 1) for v in to_grid(*p)] for k, p in FEATURES.items()},
        "roads": roads,
    }
    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(out, f, indent=1)
    print(json.dumps({k: out[k] for k in ("fit", "features")}, indent=1))
    print({k: (v["lengthM"], len(v["points"])) for k, v in roads.items()})


if __name__ == "__main__":
    main()
