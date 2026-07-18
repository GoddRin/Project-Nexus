import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "power_lines.json");
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading static power lines:", error);
    return NextResponse.json({ elements: [], error: "Power lines unavailable" });
  }
}
