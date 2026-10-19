/**
 * Builds the Twin v2 progress page from docs/twin-v2/STATE.md.
 *
 *   node scripts/twin/build-progress-page.mjs
 *
 * Writes .cache/twin-progress/twin-v2-progress.html (git-ignored). The page is published as a
 * private Artifact so the owner can keep it pinned; each session re-runs this and republishes
 * to the same link when it closes (see docs/twin-v2/README.md, "Closing a session").
 */
import fs from "node:fs";
import path from "node:path";

const src = fs.readFileSync("docs/twin-v2/STATE.md", "utf8");
const esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
// keep bold and code from the markdown cells, drop link syntax
const cell = (s) => esc(s.trim()).replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
const split = (line) => line.replace(/^\|/, "").replace(/\|\s*$/, "").split(/(?<!\\)\|/).map((c) => c.trim());

const jobs = [];
const owner = [];
let mode = "";
for (const line of src.split(/\r?\n/)) {
  if (/^\| Sub-phase \|/.test(line)) { mode = "jobs"; continue; }
  if (/^\| Item \|/.test(line)) { mode = "owner"; continue; }
  if (!line.startsWith("|")) { if (line.trim() && !line.startsWith("|")) mode = line.startsWith("## Owner") ? "" : mode === "jobs" && line.startsWith("#") ? "" : mode; continue; }
  if (/^\|\s*-+/.test(line)) continue;
  const c = split(line);
  if (mode === "jobs" && /^P\d/.test(c[0])) jobs.push({ code: c[0], title: c[1] || "", status: (c[2] || "todo").toLowerCase(), date: c[3] || "", notes: c[4] || "", left: c[5] || "" });
  else if (mode === "owner" && c.length >= 3) owner.push({ item: c[0], by: c[1], status: c[2] });
}

const PHASES = {
  P00: "Baseline", P01: "Foundation", P02: "Vertical slice: the gate", P03: "World", P04: "Vegetation", P05: "Hydro works",
  P06: "Camps", P07: "Characters", P08: "Motion", P09: "Simulation and routines", P10: "Vehicles", P11: "Animals",
  P12: "Effects, sound and living environment", P13: "Interface and walk mode", P14: "Data", P15: "Ship", P16: "Story mode",
};
const norm = (s) => (s.startsWith("done") ? "done" : s.startsWith("doing") ? "doing" : s.startsWith("blocked") ? "blocked" : s.startsWith("owner") ? "owner" : "todo");
jobs.forEach((j) => (j.state = norm(j.status)));
const total = jobs.length;
const done = jobs.filter((j) => j.state === "done").length;
const next = jobs.find((j) => j.state !== "done");
const groups = [];
for (const j of jobs) {
  const key = j.code.slice(0, 3);
  let g = groups.find((x) => x.key === key);
  if (!g) groups.push((g = { key, name: PHASES[key] || key, jobs: [] }));
  g.jobs.push(j);
}
const waiting = owner.filter((o) => /pending|asked|not supplied|optional/i.test(o.status) && !/\*\*(yes|answered|approved|both exist)/i.test(o.status));
const LABEL = { done: "Done", doing: "In progress", blocked: "Blocked", owner: "Waiting on you", todo: "To do" };
const pct = total ? Math.round((done / total) * 100) : 0;
const stamp = new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", dateStyle: "medium", timeStyle: "short" }).format(new Date());

const html = `<title>Twin v2 Progress</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Archivo:wght@500;600;700&family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
/* Layout: a site progress board. Summary strip on top, then one ruled ledger per phase, job code in a fixed mono column. */
:root{
  --bg:#f5f7f4; --surface:#ffffff; --ink:#17201b; --muted:#5d6a62; --rule:#dbe2dc;
  --brand:#007b3e; --brand-soft:#e2f1e8; --doing:#0b6fa4; --doing-soft:#e1eff7; --warn:#9a6200; --warn-soft:#fbefd6; --bad:#b3261e; --bad-soft:#fbe4e2;
  --display:"Archivo","Segoe UI",system-ui,sans-serif; --body:"IBM Plex Sans","Segoe UI",system-ui,sans-serif; --mono:"IBM Plex Mono",ui-monospace,Consolas,monospace;
}
@media (prefers-color-scheme: dark){ :root:not([data-theme="light"]){
  --bg:#0f1512; --surface:#161e1a; --ink:#e7eee9; --muted:#9aa89f; --rule:#27332c;
  --brand:#3fbf7c; --brand-soft:#143424; --doing:#62b6e6; --doing-soft:#12303f; --warn:#e3b04b; --warn-soft:#3a2d10; --bad:#f08a82; --bad-soft:#3d1a17; color-scheme:dark } }
:root[data-theme="dark"]{
  --bg:#0f1512; --surface:#161e1a; --ink:#e7eee9; --muted:#9aa89f; --rule:#27332c;
  --brand:#3fbf7c; --brand-soft:#143424; --doing:#62b6e6; --doing-soft:#12303f; --warn:#e3b04b; --warn-soft:#3a2d10; --bad:#f08a82; --bad-soft:#3d1a17; color-scheme:dark }
body{background:var(--bg);color:var(--ink);font-family:var(--body);font-size:15px;line-height:1.5}
.wrap{max-width:980px;margin-inline:auto;padding-inline:16px;padding-block:28px 56px;display:flex;flex-direction:column;gap:28px}
h1{font-family:var(--display);font-weight:700;font-size:clamp(26px,4vw,34px);line-height:1.1;margin:0;text-wrap:balance}
.sub{color:var(--muted);margin:6px 0 0}
.summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px;align-items:stretch}
.tile{background:var(--surface);border:1px solid var(--rule);border-radius:10px;padding:16px 18px;min-width:0}
.tile .k{font-size:12px;letter-spacing:.06em;text-transform:uppercase;color:var(--muted)}
.tile .v{font-family:var(--display);font-weight:700;font-size:30px;line-height:1.15;font-variant-numeric:tabular-nums}
.tile .n{color:var(--muted);font-size:13px}
.next .v{font-size:19px;font-weight:600}
.cmd{font-family:var(--mono);font-size:12.5px;background:var(--bg);border:1px solid var(--rule);border-radius:6px;padding:8px 10px;margin-top:10px;overflow-wrap:anywhere;user-select:all}
.bar{height:10px;border-radius:99px;background:var(--rule);overflow:hidden;margin-top:10px}
.bar i{display:block;height:100%;width:${pct}%;background:var(--brand)}
h2{font-family:var(--display);font-weight:600;font-size:18px;margin:0;display:flex;gap:10px;align-items:baseline;flex-wrap:wrap}
h2 .count{font-family:var(--mono);font-weight:400;font-size:12.5px;color:var(--muted)}
.phase{display:flex;flex-direction:column;gap:8px}
.ledger{background:var(--surface);border:1px solid var(--rule);border-radius:10px;overflow:hidden}
.row{display:grid;grid-template-columns:104px minmax(0,1fr) auto;gap:12px;align-items:baseline;padding:10px 14px;border-top:1px solid var(--rule)}
.row:first-child{border-top:0}
.code{font-family:var(--mono);font-size:13px;color:var(--muted);overflow-wrap:anywhere}
.title{min-width:0}
.pill{font-size:12px;font-weight:600;border-radius:99px;padding:2px 10px;white-space:nowrap}
.pill.done{background:var(--brand-soft);color:var(--brand)} .pill.doing{background:var(--doing-soft);color:var(--doing)}
.pill.owner{background:var(--warn-soft);color:var(--warn)} .pill.blocked{background:var(--bad-soft);color:var(--bad)}
.pill.todo{background:transparent;color:var(--muted);border:1px solid var(--rule)}
.row.is-next{background:var(--brand-soft)}
details{margin-top:4px;color:var(--muted);font-size:13px}
summary{cursor:pointer;width:fit-content}
summary:focus-visible{outline:2px solid var(--brand);outline-offset:2px}
details p{margin:6px 0 0;overflow-wrap:anywhere}
code{font-family:var(--mono);font-size:.92em}
.date{font-family:var(--mono);font-size:12px;color:var(--muted)}
.owner-list{list-style:none;margin:0;padding:0;background:var(--surface);border:1px solid var(--rule);border-radius:10px;overflow:hidden}
.owner-list li{padding:10px 14px;border-top:1px solid var(--rule);display:grid;grid-template-columns:minmax(0,1fr);gap:2px}
.owner-list li:first-child{border-top:0}
.owner-list .by{font-family:var(--mono);font-size:12px;color:var(--muted)}
.foot{color:var(--muted);font-size:12.5px}
@media (max-width:520px){ .row{grid-template-columns:minmax(0,1fr) auto} .code{grid-column:1 / -1} }
</style>
<div class="wrap">
  <header>
    <h1>Twin v2 Progress</h1>
    <p class="sub">Tumauini HEPP digital twin rebuild. Built from <code>docs/twin-v2/STATE.md</code> on ${esc(stamp)} (Manila).</p>
  </header>
  <section class="summary" aria-label="Summary">
    <div class="tile"><div class="k">Jobs done</div><div class="v">${done} of ${total}</div><div class="bar" role="img" aria-label="${pct} percent of jobs done"><i></i></div><div class="n">${pct}% of jobs, not of effort: later jobs are larger</div></div>
    <div class="tile next"><div class="k">Next job</div><div class="v">${next ? esc(next.code) + " · " + cell(next.title) : "All jobs done"}</div>${next && next.state === "owner" ? `<div class="n">Waiting on your reply: read <code>docs/twin-v2/review/${esc(next.code)}/REPORT.md</code> and answer its questions in a chat.</div>` : next ? `<div class="n">Open a new chat and send:</div><div class="cmd">Read docs/twin-v2/README.md and follow it for sub-phase ${esc(next.code.replace(/-pack-1 to 28/, "-pack-1"))}.</div>` : ""}</div>
    <div class="tile"><div class="k">Waiting on you</div><div class="v">${waiting.length}</div><div class="n">${waiting.length ? "Listed at the bottom; most are optional" : "Nothing right now"}</div></div>
  </section>
  ${groups.map((g) => {
    const d = g.jobs.filter((j) => j.state === "done").length;
    return `<section class="phase"><h2>${esc(g.key)} · ${esc(g.name)} <span class="count">${d}/${g.jobs.length}</span></h2><div class="ledger">${g.jobs.map((j) => `
      <div class="row${next && j.code === next.code ? " is-next" : ""}">
        <div class="code">${esc(j.code)}</div>
        <div class="title">${cell(j.title)}${j.date ? ` <span class="date">${esc(j.date)}</span>` : ""}${j.notes || j.left ? `<details><summary>Notes</summary>${j.notes ? `<p>${cell(j.notes)}</p>` : ""}${j.left ? `<p><strong>Left to do:</strong> ${cell(j.left)}</p>` : ""}</details>` : ""}</div>
        <div><span class="pill ${j.state}">${LABEL[j.state]}</span></div>
      </div>`).join("")}</div></section>`;
  }).join("\n")}
  <section class="phase"><h2>Waiting on you <span class="count">${waiting.length}</span></h2>
    ${waiting.length ? `<ul class="owner-list">${waiting.map((o) => `<li><div>${cell(o.item)}</div><div class="by">Needed by ${cell(o.by)} · ${cell(o.status)}</div></li>`).join("")}</ul>` : `<p class="foot">Nothing is waiting on you.</p>`}
  </section>
  <p class="foot">This page is a snapshot. Each session rebuilds and republishes it when it finishes a job; the file in the project is always the latest.</p>
</div>
`;
const out = path.join(".cache", "twin-progress");
fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(path.join(out, "twin-v2-progress.html"), html);
console.log(`jobs ${done}/${total}, next ${next ? next.code : "-"}, waiting ${waiting.length}`);
