import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";

export async function GET() {
  try {
    const filePath = path.join(process.cwd(), "public", "data", "boundary.json");
    const content = await fs.readFile(filePath, "utf-8");
    const data = JSON.parse(content);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error reading static boundary:", error);
    return NextResponse.json({ type: "FeatureCollection", features: [], error: "Boundary unavailable" });
  }
}
