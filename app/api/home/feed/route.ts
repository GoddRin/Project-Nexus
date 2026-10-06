import type { NextRequest } from "next/server";
import { z } from "zod";
import { badRequest, homeJson } from "@/lib/home/apiResponse";
import { getCompanyFeed } from "@/lib/home/companyFeed";

const query = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(12),
  category: z.string().trim().max(32).regex(/^[A-Za-z_]+$/).optional(),
});

/** GET /api/home/feed[?limit=12&category=PRESS] -> { data: CompanyFeedResult } */
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const parsed = query.safeParse({ limit: sp.get("limit") ?? undefined, category: sp.get("category") ?? undefined });
  if (!parsed.success) return badRequest("limit must be 1 to 50; category must be letters only");
  return homeJson({ data: await getCompanyFeed({ limit: parsed.data.limit, category: parsed.data.category?.toUpperCase() }) });
}
