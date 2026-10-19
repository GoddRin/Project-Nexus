import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { indexSiteReport } from "@/lib/rag/index";
import { digestToText, safetyDigestToText } from "@/lib/viber/structure";
import type { DailyDigest } from "@/lib/viber/types";
import type { Prisma } from "@prisma/client";

function tokenMatches(header: string | null): boolean {
  const secret = process.env.VIBER_INGEST_TOKEN;
  if (!secret || !header?.startsWith("Bearer ")) return false;
  const a = Buffer.from(header.slice(7));
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}

/**
 * Receives the redacted daily digests produced by scripts/viber/ingest.ts and stores + indexes them.
 * Raw chat never reaches this endpoint. Allowed: the VIBER_INGEST_TOKEN bearer, or a signed-in
 * ADMINISTRATOR / PROJECT_MANAGER.
 */
export async function POST(request: NextRequest) {
  try {
    const { projectId, digests } = (await request.json()) as { projectId?: string; digests?: DailyDigest[] };
    if (!projectId || !Array.isArray(digests) || digests.length === 0) {
      return NextResponse.json({ error: "Missing projectId or digests" }, { status: 400 });
    }

    if (!tokenMatches(request.headers.get("authorization"))) {
      const { dbUser, member } = await getOrCreateUser(projectId);
      if (!dbUser || !member || (member.role !== "ADMINISTRATOR" && member.role !== "PROJECT_MANAGER")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    let stored = 0;
    for (const d of digests.slice(0, 120)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d.date) || !Array.isArray(d.items)) continue;
      const text = digestToText(d);
      const safetyText = safetyDigestToText(d);
      const reportDate = new Date(`${d.date}T00:00:00.000Z`);
      const row = await prisma.siteReport.upsert({
        where: { projectId_reportDate: { projectId, reportDate } },
        create: { projectId, reportDate, hasSafety: !!safetyText, items: d.items as unknown as Prisma.InputJsonValue, text, safetyText },
        update: { hasSafety: !!safetyText, items: d.items as unknown as Prisma.InputJsonValue, text, safetyText },
      });
      await indexSiteReport(row.id, projectId, d.date, text, false);
      await indexSiteReport(`${row.id}:safety`, projectId, d.date, safetyText ?? "", true);
      stored++;
    }
    return NextResponse.json({ stored });
  } catch (error) {
    console.error("[site-reports/ingest] failed:", error);
    return NextResponse.json({ error: "Ingest failed" }, { status: 500 });
  }
}
