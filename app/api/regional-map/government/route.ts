import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "government.json");
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading static government features:", error);
    return NextResponse.json({ elements: [], error: "Government features unavailable" });
  }
}
