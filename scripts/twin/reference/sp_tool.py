"""SharePoint share-link helper for the Tumauini monthly review folder.

  python -I sp_tool.py list <out.json>                     list every file under the shared folder
  python -I sp_tool.py index <list.json> <outDir>          text-index every .pptx by HTTP range reads (no media downloaded)
  python -I sp_tool.py get <list.json> <outDir> <name>...  download whole files whose name contains one of the given strings
"""
import http.cookiejar, io, json, os, re, sys, urllib.parse, urllib.request, zipfile

# The share link grants access to company files, so it is never committed: it lives in a git-ignored file.
SHARE = open(os.environ.get("TWIN_SHARE_LINK_FILE", "assets-src/twin/reference/share-link.txt")).read().strip()
HOST = "https://staclaracomph-my.sharepoint.com"
SITE = "/personal/tumauini_project_staclara_com_ph"
ROOT = SITE + "/Documents/LUZ-21-009/03 Project Planning & Cost Control/04 Monthly Project Review Presentation"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [("User-Agent", "Mozilla/5.0")]


def login():
    opener.open(SHARE, timeout=60).read(100)


def api(path):
    req = urllib.request.Request(HOST + SITE + "/_api/web/" + path, headers={"Accept": "application/json;odata=nometadata"})
    return json.loads(opener.open(req, timeout=60).read())


def folder(rel):
    q = urllib.parse.quote(rel.replace("'", "''"), safe="/")
    return "GetFolderByServerRelativePath(decodedurl='" + q + "')"


def walk(rel, out):
    for f in api(folder(rel) + "/Files?$select=Name,Length,UniqueId,TimeLastModified,ServerRelativeUrl")["value"]:
        out.append(f)
    for d in api(folder(rel) + "/Folders?$select=Name,ServerRelativeUrl")["value"]:
        if d["Name"] != "Forms":
            walk(d["ServerRelativeUrl"], out)


class RangeFile(io.RawIOBase):
    """Seekable read-only file over HTTP range requests, with a small block cache."""

    def __init__(self, url, size, block=1 << 18):
        self.url, self.size, self.pos, self.block, self.cache, self.fetched = url, size, 0, block, {}, 0

    def seekable(self): return True
    def readable(self): return True
    def tell(self): return self.pos

    def seek(self, off, whence=0):
        self.pos = off if whence == 0 else self.pos + off if whence == 1 else self.size + off
        return self.pos

    def _blk(self, i):
        if i not in self.cache:
            a = i * self.block
            b = min(self.size, a + self.block) - 1
            req = urllib.request.Request(self.url, headers={"Range": "bytes=%d-%d" % (a, b)})
            data = opener.open(req, timeout=120).read()
            if len(data) != b - a + 1:
                raise IOError("range not honoured: got %d bytes" % len(data))
            self.cache[i] = data
            self.fetched += len(data)
        return self.cache[i]

    def readinto(self, b):
        data = self.read(len(b))
        b[:len(data)] = data
        return len(data)

    def read(self, n=-1):
        if n < 0:
            n = self.size - self.pos
        n = max(0, min(n, self.size - self.pos))
        out = bytearray()
        while n > 0:
            i, o = divmod(self.pos, self.block)
            chunk = self._blk(i)[o:o + n]
            out += chunk
            self.pos += len(chunk)
            n -= len(chunk)
        return bytes(out)


def dl_url(uid):
    return HOST + SITE + "/_layouts/15/download.aspx?UniqueId=" + uid


def unesc(s):
    return s.replace("&amp;", "&").replace("&lt;", "<").replace("&gt;", ">").replace("&quot;", '"').replace("&apos;", "'")


def index_pptx(f, outdir):
    rf = RangeFile(dl_url(f["UniqueId"]), int(f["Length"]))
    z = zipfile.ZipFile(io.BufferedReader(rf, 1 << 16))
    names = set(z.namelist())
    pres = z.read("ppt/presentation.xml").decode("utf8", "replace")
    rels = z.read("ppt/_rels/presentation.xml.rels").decode("utf8", "replace")
    rmap = {}
    for m in re.finditer(r"<Relationship [^>]*?>", rels):
        i = re.search(r'Id="([^"]+)"', m.group(0)); t = re.search(r'Target="([^"]+)"', m.group(0))
        if i and t: rmap[i.group(1)] = t.group(1)
    order = [rmap[m] for m in re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', pres) if m in rmap]
    sizes = {i.filename: i.file_size for i in z.infolist()}
    md = ["# %s\n%s  |  %d slides  |  %.1f MB  |  modified %s\n" % (f["Name"], f["ServerRelativeUrl"].replace(ROOT, ""), len(order), int(f["Length"]) / 1e6, f["TimeLastModified"][:10])]
    for n, target in enumerate(order, 1):
        p = "ppt/" + target
        if p not in names: continue
        xml = z.read(p).decode("utf8", "replace")
        paras = []
        for para in re.findall(r"<a:p[ >].*?</a:p>", xml, flags=re.S):
            t = unesc("".join(re.findall(r"<a:t>(.*?)</a:t>", para, flags=re.S))).strip()
            if t and t != "RENEW YOUR ENERGY": paras.append(t)
        rp = "ppt/slides/_rels/" + os.path.basename(target) + ".rels"
        media = []
        if rp in names:
            for m in re.findall(r'Target="\.\./media/([^"]+)"', z.read(rp).decode("utf8", "replace")):
                kb = sizes.get("ppt/media/" + m, 0) // 1024
                if kb >= 40: media.append("%s(%dk)" % (m, kb))
        md.append("\n## %d\n" % n + ("img: " + " ".join(media) + "\n" if media else "") + "\n".join("- " + t[:300] for t in paras[:60]))
    os.makedirs(outdir, exist_ok=True)
    name = re.sub(r"[^A-Za-z0-9_.-]+", "_", f["ServerRelativeUrl"].replace(ROOT + "/", ""))[:-5] + ".md"
    open(os.path.join(outdir, name), "w", encoding="utf8").write("\n".join(md) + "\n")
    return len(order), rf.fetched


def main():
    cmd = sys.argv[1]
    login()
    if cmd == "list":
        out = []
        walk(ROOT, out)
        out.sort(key=lambda f: f["ServerRelativeUrl"])
        json.dump(out, open(sys.argv[2], "w"), indent=1)
        for f in out:
            print("%8.1f MB  %s  %s" % (int(f["Length"]) / 1e6, f["TimeLastModified"][:10], f["ServerRelativeUrl"].replace(ROOT, "")))
        print("files:", len(out), "total MB: %.0f" % (sum(int(f["Length"]) for f in out) / 1e6))
    elif cmd == "index":
        files = json.load(open(sys.argv[2]))
        for f in files:
            if not f["Name"].lower().endswith(".pptx"):
                print("skip (not pptx):", f["Name"]); continue
            try:
                n, got = index_pptx(f, sys.argv[3])
                print("ok  %3d slides  fetched %5.1f MB of %5.1f  %s" % (n, got / 1e6, int(f["Length"]) / 1e6, f["Name"]), flush=True)
            except Exception as e:
                print("FAIL", f["Name"], repr(e)[:200], flush=True)
    elif cmd == "pick":
        # pick <list.json> <outDir> <deckSubstring> <captionRegex> [maxImages]
        files = json.load(open(sys.argv[2]))
        f = next(x for x in files if sys.argv[4] in x["ServerRelativeUrl"] and x["Name"].lower().endswith(".pptx"))
        rx = re.compile(sys.argv[5], re.I)
        cap = int(sys.argv[6]) if len(sys.argv) > 6 else 40
        rf = RangeFile(dl_url(f["UniqueId"]), int(f["Length"]), block=1 << 20)
        z = zipfile.ZipFile(io.BufferedReader(rf, 1 << 16))
        names = set(z.namelist())
        pres = z.read("ppt/presentation.xml").decode("utf8", "replace")
        rels = z.read("ppt/_rels/presentation.xml.rels").decode("utf8", "replace")
        rmap = {}
        for m in re.finditer(r"<Relationship [^>]*?>", rels):
            i = re.search(r'Id="([^"]+)"', m.group(0)); t = re.search(r'Target="([^"]+)"', m.group(0))
            if i and t: rmap[i.group(1)] = t.group(1)
        order = [rmap[m] for m in re.findall(r'<p:sldId [^>]*r:id="([^"]+)"', pres) if m in rmap]
        sizes = {i.filename: i.file_size for i in z.infolist()}
        tag = re.sub(r"[^A-Za-z0-9]+", "_", f["ServerRelativeUrl"].replace(ROOT + "/", ""))[:16].strip("_")
        out = os.path.join(sys.argv[3], tag)
        os.makedirs(out, exist_ok=True)
        notes, got, seen = [], 0, set()
        for n, target in enumerate(order, 1):
            if got >= cap: break
            p = "ppt/" + target
            if p not in names: continue
            xml = z.read(p).decode("utf8", "replace")
            text = " | ".join(t for t in (unesc("".join(re.findall(r"<a:t>(.*?)</a:t>", para, flags=re.S))).strip() for para in re.findall(r"<a:p[ >].*?</a:p>", xml, flags=re.S)) if t and t != "RENEW YOUR ENERGY")
            if not rx.search(text): continue
            rp = "ppt/slides/_rels/" + os.path.basename(target) + ".rels"
            if rp not in names: continue
            for m in re.findall(r'Target="\.\./media/([^"]+)"', z.read(rp).decode("utf8", "replace")):
                mp = "ppt/media/" + m
                if m in seen or sizes.get(mp, 0) < 60000 or m.lower().endswith((".emf", ".wmf")): continue
                seen.add(m)
                open(os.path.join(out, "s%03d_%s" % (n, m)), "wb").write(z.read(mp))
                got += 1
                if got >= cap: break
            notes.append("s%03d: %s" % (n, text[:260]))
        open(os.path.join(out, "CAPTIONS.txt"), "w", encoding="utf8").write(f["ServerRelativeUrl"].replace(ROOT, "") + "\n" + "\n".join(notes) + "\n")
        print("picked %d images from %d slides, fetched %.1f MB  %s -> %s" % (got, len(notes), rf.fetched / 1e6, f["Name"], out), flush=True)
    elif cmd == "get":
        files = json.load(open(sys.argv[2]))
        os.makedirs(sys.argv[3], exist_ok=True)
        for f in files:
            if any(k in f["ServerRelativeUrl"] for k in sys.argv[4:]):
                dest = os.path.join(sys.argv[3], f["Name"])
                if os.path.exists(dest) and os.path.getsize(dest) == int(f["Length"]):
                    print("have", f["Name"]); continue
                with opener.open(dl_url(f["UniqueId"]), timeout=600) as r, open(dest, "wb") as o:
                    while True:
                        b = r.read(1 << 20)
                        if not b: break
                        o.write(b)
                print("got %6.1f MB %s" % (os.path.getsize(dest) / 1e6, f["Name"]), flush=True)


main()
