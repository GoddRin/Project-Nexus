// Builds slides.md (text + image list per slide) from an unzipped .pptx. Usage: node pptx-index.mjs <unzippedDir> <out.md>
import fs from "node:fs";
import path from "node:path";

const [dir, out] = process.argv.slice(2);
const slidesDir = path.join(dir, "ppt", "slides");
const nums = fs.readdirSync(slidesDir).filter((f) => /^slide\d+\.xml$/.test(f)).map((f) => Number(f.match(/\d+/)[0])).sort((a, b) => a - b);

// presentation order: ppt/presentation.xml lists r:ids, ppt/_rels/presentation.xml.rels maps them to slide files
const pres = fs.readFileSync(path.join(dir, "ppt", "presentation.xml"), "utf8");
const presRels = fs.readFileSync(path.join(dir, "ppt", "_rels", "presentation.xml.rels"), "utf8");
const relMap = Object.fromEntries([...presRels.matchAll(/<Relationship [^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/g)].map((m) => [m[1], m[2]]));
const relMap2 = Object.fromEntries([...presRels.matchAll(/<Relationship [^>]*Target="([^"]+)"[^>]*Id="([^"]+)"/g)].map((m) => [m[2], m[1]]));
const order = [...pres.matchAll(/<p:sldId [^>]*r:id="([^"]+)"/g)].map((m) => relMap[m[1]] || relMap2[m[1]]).filter(Boolean).map((t) => Number(t.match(/slide(\d+)\.xml/)[1]));

const decode = (s) => s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'");
let md = `# Slide index (${order.length} slides in order; ${nums.length} slide files)\n`;
order.forEach((n, i) => {
  const xml = fs.readFileSync(path.join(slidesDir, `slide${n}.xml`), "utf8");
  const paras = [...xml.matchAll(/<a:p>(.*?)<\/a:p>|<a:p [^>]*>(.*?)<\/a:p>/gs)].map((m) => [...(m[1] || m[2] || "").matchAll(/<a:t>(.*?)<\/a:t>/gs)].map((t) => decode(t[1])).join("")).filter((t) => t.trim());
  const relsPath = path.join(slidesDir, "_rels", `slide${n}.xml.rels`);
  const rels = fs.existsSync(relsPath) ? fs.readFileSync(relsPath, "utf8") : "";
  const media = [...rels.matchAll(/Target="\.\.\/media\/([^"]+)"/g)].map((m) => m[1]);
  md += `\n## Slide ${i + 1} (slide${n}.xml)\n`;
  if (media.length) md += `Images: ${media.join(", ")}\n`;
  md += paras.map((p) => `- ${p}`).join("\n") + "\n";
});
fs.writeFileSync(out, md);
console.log("slides", order.length, "chars", md.length);
