// Renders each page of a PDF to PNG and prints its text. Usage: node render-pdf.mjs <pdf> <outDir> [width]
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

// run from the project root so pdf-parse resolves from the project's node_modules
const require = createRequire(path.join(process.cwd(), "package.json"));
const { PDFParse } = require("pdf-parse");

const [pdfPath, outDir, widthArg] = process.argv.slice(2);
const width = Number(widthArg || 2200);
fs.mkdirSync(outDir, { recursive: true });
const data = fs.readFileSync(pdfPath);

const parser = new PDFParse({ data });
const info = await parser.getInfo();
console.log("pages:", info.total, JSON.stringify(info.info || {}).slice(0, 300));
const text = await parser.getText();
for (const p of text.pages) {
  console.log(`--- page ${p.num} text (${p.text.length} chars)`);
  console.log(p.text.slice(0, 3000));
}
const shots = await parser.getScreenshot({ desiredWidth: width, imageBuffer: true, imageDataUrl: false });
for (const p of shots.pages) {
  const f = path.join(outDir, `page-${String(p.pageNumber).padStart(2, "0")}.png`);
  fs.writeFileSync(f, p.data);
  console.log("wrote", f, p.width, "x", p.height);
}
await parser.destroy();
