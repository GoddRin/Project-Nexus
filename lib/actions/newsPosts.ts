"use server";

import { revalidatePath, revalidateTag, updateTag } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/db/prisma";
import { HOME_HREF, newsHref } from "@/lib/home/links";
import { NEWS_CATEGORIES, uniqueSlug } from "@/lib/home/newsPosts";
import { getNewsViewer } from "@/lib/home/permissions";
import { CACHE_TAGS } from "@/lib/home/refreshPolicy";

/**
 * Newsroom writes: create, update, pin and remove a post. Every action re-checks on the server
 * that the caller may publish (canPublishNews, through getNewsViewer); the composer button being
 * hidden for other roles is a convenience, not the control.
 */

export type NewsActionResult = { ok: true; slug: string; href: string } | { ok: false; error: string; fieldErrors?: Record<string, string> };

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((v) => (v === "" ? null : v)).nullable().optional();

/** A cover is one of our own photographs or an https image address */
const cover = z
  .string()
  .trim()
  .max(500)
  .refine((v) => v === "" || v.startsWith("/project-images/") || v.startsWith("/images/") || /^https:\/\/[^\s]+$/i.test(v), "Use a photograph from the list or an https:// address")
  .transform((v) => (v === "" ? null : v))
  .nullable()
  .optional();

const optionalDate = z
  .string()
  .trim()
  .transform((v, ctx) => {
    if (v === "") return null;
    const d = new Date(v);
    if (Number.isNaN(d.getTime())) {
      ctx.addIssue({ code: "custom", message: "Not a valid date" });
      return z.NEVER;
    }
    return d;
  })
  .nullable()
  .optional();

const postSchema = z.object({
  title: z.string().trim().min(4, "At least 4 characters").max(140, "At most 140 characters"),
  category: z.enum(NEWS_CATEGORIES as [string, ...string[]]),
  excerpt: optionalText(280),
  body: z.string().trim().min(10, "Write at least a sentence").max(20_000, "At most 20,000 characters"),
  coverImage: cover,
  projectId: optionalText(40),
  pinned: z.boolean().default(false),
  expiresAt: optionalDate,
});
export type NewsPostInput = z.input<typeof postSchema>;

function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

async function requirePublisher(): Promise<{ id: string } | null> {
  const viewer = await getNewsViewer();
  return viewer.user && viewer.canPublish ? viewer.user : null;
}

/** The front page shows the change at once for its author, and within the cache window for others */
function refresh(slug?: string) {
  updateTag(CACHE_TAGS.news);
  revalidateTag(CACHE_TAGS.news, "max");
  revalidatePath(HOME_HREF);
  if (slug) revalidatePath(newsHref(slug));
}

const FORBIDDEN: NewsActionResult = { ok: false, error: "You do not have permission to publish to the Newsroom." };

async function checkedProjectId(projectId: string | null | undefined): Promise<string | null> {
  if (!projectId) return null;
  const project = await prisma.project.findFirst({ where: { id: projectId, deletedAt: null }, select: { id: true } });
  return project?.id ?? null;
}

export async function createNewsPost(input: NewsPostInput): Promise<NewsActionResult> {
  const author = await requirePublisher();
  if (!author) return FORBIDDEN;
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const d = parsed.data;
  if (d.expiresAt && d.expiresAt.getTime() <= Date.now()) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: { expiresAt: "The expiry must be in the future" } };
  try {
    const post = await prisma.newsPost.create({
      data: {
        title: d.title,
        slug: await uniqueSlug(d.title),
        excerpt: d.excerpt ?? null,
        body: d.body,
        coverImage: d.coverImage ?? null,
        category: d.category as (typeof NEWS_CATEGORIES)[number],
        pinned: d.pinned,
        expiresAt: d.expiresAt ?? null,
        projectId: await checkedProjectId(d.projectId),
        authorId: author.id,
      },
      select: { slug: true },
    });
    refresh(post.slug);
    return { ok: true, slug: post.slug, href: newsHref(post.slug) };
  } catch (err) {
    console.error("[newsroom] create failed:", err);
    return { ok: false, error: "The post could not be saved. Please try again." };
  }
}

export async function updateNewsPost(id: string, input: NewsPostInput): Promise<NewsActionResult> {
  const author = await requirePublisher();
  if (!author) return FORBIDDEN;
  if (!z.string().min(1).max(40).safeParse(id).success) return { ok: false, error: "Unknown post." };
  const parsed = postSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const existing = await prisma.newsPost.findFirst({ where: { id, deletedAt: null }, select: { id: true, slug: true } });
  if (!existing) return { ok: false, error: "This post no longer exists." };
  const d = parsed.data;
  try {
    // (the address of a published post stays the same when its title is edited: links keep working)
    await prisma.newsPost.update({
      where: { id },
      data: {
        title: d.title,
        excerpt: d.excerpt ?? null,
        body: d.body,
        coverImage: d.coverImage ?? null,
        category: d.category as (typeof NEWS_CATEGORIES)[number],
        pinned: d.pinned,
        expiresAt: d.expiresAt ?? null,
        projectId: await checkedProjectId(d.projectId),
      },
    });
    refresh(existing.slug);
    return { ok: true, slug: existing.slug, href: newsHref(existing.slug) };
  } catch (err) {
    console.error("[newsroom] update failed:", err);
    return { ok: false, error: "The post could not be saved. Please try again." };
  }
}

export async function setNewsPostPinned(id: string, pinned: boolean): Promise<NewsActionResult> {
  const author = await requirePublisher();
  if (!author) return FORBIDDEN;
  const input = z.object({ id: z.string().min(1).max(40), pinned: z.boolean() }).safeParse({ id, pinned });
  if (!input.success) return { ok: false, error: "Unknown post." };
  const existing = await prisma.newsPost.findFirst({ where: { id, deletedAt: null }, select: { slug: true } });
  if (!existing) return { ok: false, error: "This post no longer exists." };
  await prisma.newsPost.update({ where: { id }, data: { pinned } });
  refresh(existing.slug);
  return { ok: true, slug: existing.slug, href: newsHref(existing.slug) };
}

/** Removes a post from the Newsroom. The row is kept (deletedAt), so nothing is lost for good. */
export async function deleteNewsPost(id: string): Promise<NewsActionResult> {
  const author = await requirePublisher();
  if (!author) return FORBIDDEN;
  if (!z.string().min(1).max(40).safeParse(id).success) return { ok: false, error: "Unknown post." };
  const existing = await prisma.newsPost.findFirst({ where: { id, deletedAt: null }, select: { slug: true } });
  if (!existing) return { ok: false, error: "This post no longer exists." };
  await prisma.newsPost.update({ where: { id }, data: { deletedAt: new Date(), pinned: false } });
  refresh(existing.slug);
  return { ok: true, slug: existing.slug, href: HOME_HREF };
}
