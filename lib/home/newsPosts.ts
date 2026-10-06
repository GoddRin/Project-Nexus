import type { NewsCategory } from "@prisma/client";
import { prisma } from "@/lib/db/prisma";
import { newsHref } from "./links";
import type { CompanyFeedItem } from "./types";

/** Newsroom posts: the reads. (The writes are the server actions in lib/actions/newsPosts.ts.) */

export const NEWS_CATEGORIES: NewsCategory[] = ["ANNOUNCEMENT", "PROJECT_UPDATE", "MILESTONE", "SAFETY", "CSR", "PEOPLE", "PRESS"];
export const NEWS_CATEGORY_LABEL: Record<NewsCategory, string> = {
  ANNOUNCEMENT: "Announcement",
  PROJECT_UPDATE: "Project update",
  MILESTONE: "Milestone",
  SAFETY: "Safety",
  CSR: "Community",
  PEOPLE: "People",
  PRESS: "Press",
};

/** Published, not removed, not expired */
const liveWhere = (now: Date) => ({
  deletedAt: null,
  publishedAt: { lte: now },
  OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
});

/** "SCIC Celebrates 50 Years!" -> "scic-celebrates-50-years" */
export function slugify(title: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return base || "post";
}

/** A slug nobody else has: the plain one, else with -2, -3, ... */
export async function uniqueSlug(title: string, exceptId?: string): Promise<string> {
  const base = slugify(title);
  for (let n = 1; n < 200; n++) {
    const slug = n === 1 ? base : `${base}-${n}`;
    const taken = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } });
    if (!taken || taken.id === exceptId) return slug;
  }
  return `${base}-${Date.now().toString(36)}`;
}

/** About 200 words a minute, at least one */
export function readingMinutes(markdown: string): number {
  const words = markdown.replace(/[#>*_`~\-[\]()!|]/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

/** Posts for the Newsroom feed (pinned first is decided by the feed's own sort) */
export async function listNewsFeedItems(limit = 30): Promise<CompanyFeedItem[]> {
  const posts = await prisma.newsPost.findMany({
    where: liveWhere(new Date()),
    orderBy: [{ pinned: "desc" }, { publishedAt: "desc" }],
    take: limit,
    select: {
      id: true, slug: true, title: true, excerpt: true, coverImage: true, category: true, pinned: true, publishedAt: true,
      project: { select: { name: true } },
    },
  });
  return posts.map((p) => ({
    id: `post-${p.id}`,
    kind: "POST" as const,
    category: p.category,
    title: p.title,
    excerpt: p.excerpt || undefined,
    href: newsHref(p.slug),
    external: false,
    coverImage: p.coverImage || undefined,
    projectName: p.project?.name,
    publishedAt: p.publishedAt.toISOString(),
    pinned: p.pinned,
  }));
}

/** One post for its page; null when it does not exist, was removed, or has expired */
export async function getNewsPostBySlug(slug: string) {
  return prisma.newsPost.findFirst({
    where: { slug, ...liveWhere(new Date()) },
    include: { author: { select: { name: true } }, project: { select: { id: true, name: true, slug: true } } },
  });
}

/** One post for editing (its author or any publisher); expired posts included */
export async function getNewsPostForEdit(id: string) {
  return prisma.newsPost.findFirst({ where: { id, deletedAt: null } });
}

/** Photographs the composer offers as covers: each project's own featured photograph */
export async function listCoverChoices(): Promise<{ src: string; label: string }[]> {
  const rows = await prisma.project.findMany({
    where: { deletedAt: null, featuredImage: { not: null } },
    select: { name: true, featuredImage: true },
    orderBy: { name: "asc" },
  });
  const seen = new Set<string>();
  const out: { src: string; label: string }[] = [];
  for (const r of rows) {
    const src = r.featuredImage as string;
    if (!src.startsWith("/project-images/") || /placeholder|logo/i.test(src) || seen.has(src)) continue;
    seen.add(src);
    out.push({ src, label: r.name });
  }
  return out;
}

/** Projects the composer can link a post to */
export async function listProjectChoices(): Promise<{ id: string; name: string }[]> {
  return prisma.project.findMany({ where: { deletedAt: null }, select: { id: true, name: true }, orderBy: { name: "asc" } });
}
