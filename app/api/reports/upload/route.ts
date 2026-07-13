import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export async function POST(request: NextRequest) {
 try {
 const formData = await request.formData();
 const projectId = formData.get("projectId") as string;
 const file = formData.get("file") as File;

 if (!projectId || !file) {
 return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
 }

 // Enforce 10MB limit for photos
 if (file.size > 10 * 1024 * 1024) {
 return NextResponse.json({ error: "File exceeds 10MB limit" }, { status: 400 });
 }

 // Resolve user and check/create membership via JIT provisioning helper
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) {
 return NextResponse.json({ error: "Unauthorized: No active session" }, { status: 401 });
 }

 // Check permissions: ENGINEER, SUPERVISOR, PROJECT_MANAGER, ADMINISTRATOR can upload photos
 const allowedRoles = ["ENGINEER", "SUPERVISOR", "PROJECT_MANAGER", "ADMINISTRATOR"];
 if (!allowedRoles.includes(member.role)) {
 return NextResponse.json({ error: "Forbidden: Unauthorized to submit reports" }, { status: 403 });
 }

 const fileName = file.name;
 const mimeType = file.type || "application/octet-stream";
 const photoId = crypto.randomUUID();
 const storagePath = `${projectId}/${photoId}-${fileName}`;

 const arrayBuffer = await file.arrayBuffer();
 const buffer = Buffer.from(arrayBuffer);

 // Upload to Supabase report-photos bucket
 const { error: storageError } = await supabaseAdmin.storage
 .from("report-photos")
 .upload(storagePath, buffer, {
 contentType: mimeType,
 duplex: "half",
 });

 if (storageError) {
 return NextResponse.json({ error: storageError.message }, { status: 500 });
 }

 return NextResponse.json({ success: true, storagePath, fileName });
 } catch (error) {
 console.error("Photo upload error:", error);
 const message = error instanceof Error ? error.message : "Internal server error";
 return NextResponse.json({ error: message }, { status: 500 });
 }
}
