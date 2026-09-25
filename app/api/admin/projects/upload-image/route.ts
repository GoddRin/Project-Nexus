import { NextRequest, NextResponse } from "next/server";
import { getAtlasAuth } from "@/lib/auth/atlasAuth";
import { supabaseAdmin } from "@/lib/supabase";
import { prisma } from "@/lib/db/prisma";
import crypto from "crypto";

export const dynamic = "force-dynamic";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB strictly enforced

/**
 * Validate image binary magic numbers to prevent fake MIME extensions
 */
function validateImageMagicBytes(buffer: Buffer): { valid: boolean; ext: string; mime: string } {
  if (buffer.length < 12) {
    return { valid: false, ext: "", mime: "" };
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return { valid: true, ext: "jpg", mime: "image/jpeg" };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return { valid: true, ext: "png", mime: "image/png" };
  }

  // WebP: RIFF .... WEBP
  const isRiff =
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46;
  const isWebp =
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50;
  if (isRiff && isWebp) {
    return { valid: true, ext: "webp", mime: "image/webp" };
  }

  return { valid: false, ext: "", mime: "" };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAtlasAuth();
    if (!auth.isAuthenticated || !auth.user) {
      return NextResponse.json({ error: "Unauthorized. Please sign in." }, { status: 401 });
    }

    if (!auth.canEdit) {
      return NextResponse.json(
        { error: "Forbidden. You do not have permission to upload project media." },
        { status: 403 }
      );
    }

    const formData = await request.formData().catch(() => null);
    if (!formData) {
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const file = formData.get("file") as File | null;
    const projectId = formData.get("projectId") as string | null;

    if (!file) {
      return NextResponse.json({ error: "No image file provided" }, { status: 400 });
    }

    if (!projectId) {
      return NextResponse.json(
        { error: "projectId is required. Please save the project first before uploading media." },
        { status: 400 }
      );
    }

    // Verify project exists and is not deleted
    const project = await prisma.project.findFirst({
      where: { id: projectId, deletedAt: null },
    });
    if (!project) {
      return NextResponse.json(
        { error: `Active project with ID "${projectId}" not found.` },
        { status: 404 }
      );
    }

    // Enforce 5MB limit
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File size exceeds maximum 5 MB limit (${(file.size / 1024 / 1024).toFixed(2)} MB)` },
        { status: 400 }
      );
    }

    // Read bytes & validate actual content
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const magicCheck = validateImageMagicBytes(buffer);

    if (!magicCheck.valid) {
      return NextResponse.json(
        { error: "Invalid image format. Only authentic JPEG, PNG, and WebP images are permitted." },
        { status: 400 }
      );
    }

    // Server-controlled UUID filename
    const uuid = crypto.randomUUID();
    const filename = `${uuid}.${magicCheck.ext}`;
    const storagePath = `${projectId}/${filename}`;

    // Upload to Supabase Storage project-images bucket
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from("project-images")
      .upload(storagePath, buffer, {
        contentType: magicCheck.mime,
        cacheControl: "31536000",
        upsert: false,
      });

    if (uploadError) {
      console.error("Supabase Storage upload error:", uploadError);
      return NextResponse.json(
        { error: "Failed to upload image to storage", details: uploadError.message },
        { status: 500 }
      );
    }

    // Generate public CDN URL
    const { data: publicUrlData } = supabaseAdmin.storage
      .from("project-images")
      .getPublicUrl(storagePath);

    return NextResponse.json({
      success: true,
      url: publicUrlData.publicUrl,
      path: storagePath,
      fileName: filename,
      fileSize: file.size,
      mimeType: magicCheck.mime,
    });
  } catch (error: any) {
    console.error("POST /api/admin/projects/upload-image error:", error);
    return NextResponse.json(
      { error: "Image upload failed", message: error.message },
      { status: 500 }
    );
  }
}
