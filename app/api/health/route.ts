import { NextResponse } from "next/server";

// Simple health check endpoint for mobile app server discovery
export async function GET() {
  return NextResponse.json(
    { status: "ok", service: "project-nexus", version: "1.0" },
    { status: 200 }
  );
}
