import { NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";

// This route handles keeping the Supabase connection alive to prevent it from suspending on the free tier.
// A simple query is executed against the database.
export async function GET(request: Request) {
 const authHeader = request.headers.get("authorization");
 if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
 return new Response("Unauthorized", { status: 401 });
 }

 try {
 // A simple lightweight query to wake/keep-alive the DB
 await prisma.$queryRaw`SELECT 1`;
 return NextResponse.json({ status: "success", message: "Database keep-alive ping successful" }, { status: 200 });
 } catch (error) {
 console.error("Keep-alive ping failed:", error);
 return NextResponse.json({ status: "error", message: "Keep-alive ping failed" }, { status: 500 });
 }
}
