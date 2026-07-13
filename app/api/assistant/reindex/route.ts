import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { indexDocument, indexKnowledgeArticle, indexEquipmentSpec } from "@/lib/rag/index";

export async function POST(request: NextRequest) {
  try {
    // 1. Resolve projectId (default to Tumauini HEPP)
    const project = await prisma.project.findUnique({
      where: { slug: "tumauini-hepp" },
    });
    if (!project) {
      return NextResponse.json({ error: "Project tumauini-hepp not found" }, { status: 404 });
    }
    const projectId = project.id;

    // 2. Auth checks
    // Allow either Bearer Cron Secret OR logged-in project Administrator
    const authHeader = request.headers.get("authorization");
    let isAuthorized = false;

    if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
      isAuthorized = true;
    } else {
      const { dbUser, member } = await getOrCreateUser(projectId);
      if (dbUser && member && member.role === "ADMINISTRATOR") {
        isAuthorized = true;
      }
    }

    if (!isAuthorized) {
      return NextResponse.json({ error: "Unauthorized: Administrator access required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const wait = searchParams.get("wait") === "true";

    // 3. Setup reindex execution helper
    const runReindexing = async () => {
      console.log(`[RAG Reindex] Manual reindexing started for project: ${projectId}`);

      // Fetch all docs
      const docs = await prisma.document.findMany({
        where: { projectId },
        select: { id: true },
      });
      for (const doc of docs) {
        await indexDocument(doc.id, projectId);
      }

      // Fetch all KB articles
      const articles = await prisma.knowledgeArticle.findMany({
        where: { projectId, published: true },
        select: { id: true },
      });
      for (const article of articles) {
        await indexKnowledgeArticle(article.id, projectId);
      }

      // Fetch all Equipment specs
      const equipmentRecords = await prisma.plantEquipment.findMany({
        where: { projectId },
        select: { id: true },
      });
      for (const eq of equipmentRecords) {
        await indexEquipmentSpec(eq.id, projectId);
      }

      console.log(`[RAG Reindex] Manual reindexing completed successfully.`);
    };

    if (wait) {
      // Synchronous execution for testing/verification
      await runReindexing();
      return NextResponse.json({ success: true, message: "Reindexing completed synchronously." });
    } else {
      // Asynchronous fire-and-forget
      runReindexing().catch((err) => console.error("[RAG Reindex Background Error]:", err));
      return NextResponse.json({ success: true, message: "Reindexing initiated in background." });
    }
  } catch (error) {
    console.error("[Reindex Route Error]:", error);
    const message = error instanceof Error ? error.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
