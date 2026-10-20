"""
Collect reference photographs per structure from the unpacked monthly decks.

  python -I scripts/twin/reference/collect_photos.py

Reads   assets-src/twin/reference/mpr-53/ (slides.md and unzipped media) and the area-photo sets
Writes  assets-src/twin/reference/photos/<location>/<structure>/  with an INDEX.md in each

Everything stays inside the git-ignored reference folder. Photographs are chosen by the slide they
sit on (the slide title names the structure), largest first, at most 15 per structure. They are not
reviewed one by one here: the session that models a structure looks through its folder first.
Slides from the internal sections of the deck (KPI, cost, billing, survey, incidents) are never read.
"""
import os
import re
import shutil

from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
REF = os.path.join(ROOT, "assets-src", "twin", "reference")
OUT = os.path.join(REF, "photos")
DECK = os.path.join(REF, "mpr-53")
MEDIA = os.path.join(DECK, "unzipped", "ppt", "media")

# structure -> (location, slides of MPR-53 section B that show it)
SLIDES = {
    "weir": ("weir", [9, 11]),
    "intake": ("weir", [12, 13, 14, 15, 16]),
    "abutment": ("weir", [17, 18, 19, 20, 21]),
    "desander": ("weir", [22, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34]),
    "tunnel1-inlet-drive": ("tunnel1", [35, 37, 38, 39, 40, 41, 42]),
    "tunnel1-outlet-drive": ("tunnel1", [43, 44, 45, 46]),
    "tunnel2-drive": ("tunnel2", [47, 49, 50, 51, 52]),
    "pipe-bridge": ("midway", [54, 55, 56]),
    "surge-tank": ("powerhouse", [57, 59, 60, 61, 62, 63]),
    "penstock": ("powerhouse", [64, 66, 67, 68]),
    "powerhouse": ("powerhouse", [69, 71, 73, 74]),
    "tailrace": ("powerhouse", [72, 75, 76, 77, 78]),
    "switchyard": ("powerhouse", [79, 80, 81, 82, 83, 84]),
    "transmission-line": ("powerhouse", [93, 94]),
}
# drawings and 3D massing models in the same deck: (image, location, structure, what it is, slide)
DRAWINGS = [
    ("image93.jpeg", "tunnel1", "drawings", "Tunnel 1 key plan with printed portal coordinates", 36),
    ("image94.png", "weir", "drawings", "Tunnel 1 inlet and adit plan with printed coordinates and levels", 36),
    ("image125.jpeg", "tunnel2", "drawings", "Tunnel 2 key plan with printed portal coordinates", 48),
    ("image166.png", "powerhouse", "drawings", "Penstock plan: surge tank, saddles, bifurcation, powerhouse outline, printed coordinates", 65),
    ("image25.png", "weir", "drawings", "3D model of the weir, sluiceway and abutment", 10),
    ("image59.png", "weir", "drawings", "3D model of the desander and tunnel transition", 23),
    ("image138.png", "midway", "drawings", "3D model of the pipe bridge", 53),
    ("image150.png", "powerhouse", "drawings", "3D model of the surge tank by lift", 58),
    ("image176.png", "powerhouse", "drawings", "3D model of the powerhouse substructure", 70),
    ("image177.png", "powerhouse", "drawings", "3D model of the powerhouse", 70),
]
# photo sets pulled earlier from other decks: (folder under the reference folder, location, structure, deck)
SETS = [
    ("area-photos-camp/2024_10_October", "powerhouse", "main-camp", "MPR-31, October 2024"),
    ("area-photos/2023_12_December", "powerhouse", "magazine", "MPR-21, December 2023"),
    ("area-photos/2025_06_June_UTU", "weir", "satellite-camp", "MPR-39, June 2025"),
    ("area-photos/2025_01_January", "weir", "cofferdam-and-adit", "MPR-34, January 2025"),
    ("area-photos/2025_11_November", "powerhouse", "powerhouse-2025-11", "MPR-44, November 2025"),
    ("area-photos/2025_09_Septembe", "powerhouse", "powerhouse-2025-09", "MPR-42, September 2025"),
]
SKIP = {"image21.png", "image9.png", "image20.png", "image22.png"}  # logos and slide furniture


def read_slides():
    slides, cur = {}, None
    with open(os.path.join(DECK, "slides.md"), encoding="utf-8", errors="replace") as f:
        for line in f:
            m = re.match(r"## Slide (\d+)", line)
            if m:
                cur = int(m.group(1))
                slides[cur] = {"images": [], "text": []}
            elif cur and line.startswith("Images:"):
                slides[cur]["images"] = [s.strip() for s in line[7:].split(",")]
            elif cur and line.startswith("- "):
                slides[cur]["text"].append(line[2:].strip())
    return slides


def main():
    slides = read_slides()
    total = 0
    for structure, (location, nums) in SLIDES.items():
        picks = []
        for n in nums:
            s = slides.get(n)
            if not s:
                continue
            dates = [t.replace("Date Taken:", "").strip() for t in s["text"] if t.startswith("Date Taken")]
            caption = "; ".join(t for t in s["text"] if not t.startswith("Date Taken") and t not in ("RENEW YOUR ENERGY", "Work Balances, Photos and Target Completion Dates", "BEFORE", "TO DATE", "AFTER") and not re.fullmatch(r"[\d.,% ()A-Za-z-]{0,14}", t))[:160]
            if caption.startswith("Schedule Performance"):
                caption = caption.split(";")[0] + " (aerial view)"
            for img in s["images"]:
                p = os.path.join(MEDIA, img)
                if img in SKIP or not img.lower().endswith((".jpeg", ".jpg")) or not os.path.exists(p):
                    continue
                w, h = Image.open(p).size
                picks.append((w * h, img, n, ", ".join(dict.fromkeys(dates)) or "August to September 2026", caption))
        seen, rows = set(), []
        for area, img, n, date, caption in sorted(picks, reverse=True):
            if img in seen or len(rows) >= 15:
                continue
            seen.add(img)
            rows.append((img, n, date, caption))
        dest = os.path.join(OUT, location, structure)
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, "INDEX.md"), "w", encoding="utf-8") as f:
            f.write(f"# {structure} ({location})\n\nSource: MPR-53 (August 2026 deck). Company photographs: reference only, never shipped.\n\n| File | Slide | Date taken (as captioned on the slide) | Slide caption |\n| --- | --- | --- | --- |\n")
            for img, n, date, caption in sorted(rows, key=lambda r: r[1]):
                shutil.copy2(os.path.join(MEDIA, img), os.path.join(dest, img))
                f.write(f"| {img} | {n} | {date} | {caption} |\n")
        print(f"{location}/{structure}: {len(rows)}")
        total += len(rows)

    by_folder = {}
    for img, location, structure, what, n in DRAWINGS:
        by_folder.setdefault((location, structure), []).append((img, what, n))
    for (location, structure), items in by_folder.items():
        dest = os.path.join(OUT, location, structure)
        os.makedirs(dest, exist_ok=True)
        with open(os.path.join(dest, "INDEX.md"), "w", encoding="utf-8") as f:
            f.write(f"# Drawings and models ({location})\n\nSource: MPR-53 (August 2026 deck).\n\n| File | Slide | What it is |\n| --- | --- | --- |\n")
            for img, what, n in items:
                shutil.copy2(os.path.join(MEDIA, img), os.path.join(dest, img))
                f.write(f"| {img} | {n} | {what} |\n")
        print(f"{location}/{structure}: {len(items)}")
        total += len(items)

    for folder, location, structure, deck in SETS:
        src = os.path.join(REF, *folder.split("/"))
        if not os.path.isdir(src):
            print("missing", folder)
            continue
        dest = os.path.join(OUT, location, structure)
        os.makedirs(dest, exist_ok=True)
        files = [x for x in sorted(os.listdir(src)) if x.lower().endswith((".jpg", ".jpeg", ".png"))]
        files = sorted(files, key=lambda x: -os.path.getsize(os.path.join(src, x)))[:15]
        for x in files:
            shutil.copy2(os.path.join(src, x), os.path.join(dest, x))
        captions = ""
        cap = os.path.join(src, "CAPTIONS.txt")
        if os.path.exists(cap):
            captions = open(cap, encoding="utf-8", errors="replace").read()
        with open(os.path.join(dest, "INDEX.md"), "w", encoding="utf-8") as f:
            f.write(f"# {structure} ({location})\n\nSource: {deck}. Company photographs: reference only, never shipped.\n\nFiles: {', '.join(files)}\n\n## Captions (slide numbers and text from the deck)\n\n```\n{captions}\n```\n")
        print(f"{location}/{structure}: {len(files)}")
        total += len(files)

    # the site development plan and early camp photographs (MPR-18)
    dest = os.path.join(OUT, "powerhouse", "site-development-plan")
    os.makedirs(dest, exist_ok=True)
    plan = os.path.join(REF, "mpr-decks", "unz-0018", "ppt", "media", "image15.png")
    if os.path.exists(plan):
        shutil.copy2(plan, os.path.join(dest, "site-development-plan.png"))
        with open(os.path.join(dest, "INDEX.md"), "w", encoding="utf-8") as f:
            f.write("# Site development plan\n\nSource: MPR-18 (September 2023), image15.png. North up. Georeferenced by scripts/twin/reference/georef_site_plan.py.\n")
        total += 1
    print("total files:", total)


if __name__ == "__main__":
    main()
