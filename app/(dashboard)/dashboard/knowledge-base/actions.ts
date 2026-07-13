"use server";

import { prisma } from "@/lib/db/prisma";
import { revalidatePath } from "next/cache";
import { KbCategory } from "@prisma/client";
import { redirect } from "next/navigation";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { indexKnowledgeArticle } from "@/lib/rag/index";

/**
 * Helper to authenticate and get the caller's ProjectMember record.
 * Throws if unauthenticated or not a member of the project.
 */
async function requireProjectMember(projectId: string) {
 const { dbUser, member } = await getOrCreateUser(projectId);
 if (!dbUser || !member) throw new Error("Unauthorized: No active session");
 return { dbUser, member };
}

/**
 * Helper to ensure the user has elevated roles for KB operations (IT_SUPPORT or ADMINISTRATOR)
 */
function requireElevatedRole(role: string) {
 if (role !== "IT_SUPPORT" && role !== "ADMINISTRATOR") {
 throw new Error("Forbidden: Requires IT_SUPPORT or ADMINISTRATOR role");
 }
}

/**
 * Helper to generate a clean URL-friendly slug from title
 */
function generateSlug(title: string) {
 return title
 .toLowerCase()
 .trim()
 .replace(/[^\w\s-]/g, "") // remove non-word chars except spaces/dashes
 .replace(/[\s_]+/g, "-") // replace spaces/underscores with dashes
 .replace(/-+/g, "-") // resolve duplicate dashes
 .replace(/^-+|-+$/g, ""); // trim leading/trailing dashes
}

/**
 * Create a new KB Article
 */
export async function createArticle(formData: FormData) {
 const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
 if (!project) throw new Error("Project not found");
 const projectId = project.id;

 const { dbUser, member } = await requireProjectMember(projectId);
 requireElevatedRole(member.role);

 const title = formData.get("title") as string;
 const category = formData.get("category") as KbCategory;
 const body = formData.get("body") as string;

 if (!title || !category || !body) {
 throw new Error("Title, Category, and Body are required");
 }

 // Generate unique slug in project scope
 const baseSlug = generateSlug(title);
 let slug = baseSlug;
 let counter = 1;
 while (true) {
 const existing = await prisma.knowledgeArticle.findFirst({
 where: { projectId, slug },
 });
 if (!existing) break;
 slug = `${baseSlug}-${counter}`;
 counter++;
 }

  const article = await prisma.knowledgeArticle.create({
    data: {
      projectId,
      title,
      slug,
      category,
      body,
      authorId: dbUser.id,
      published: true,
    },
  });

  // Background RAG Indexing
  indexKnowledgeArticle(article.id, projectId).catch((err: unknown) =>
    console.error(`[RAG Auto-Index] Failed to index KB Article ${article.id}:`, err)
  );

  revalidatePath("/dashboard/knowledge-base");
  redirect("/dashboard/knowledge-base");
}

/**
 * Update an existing KB Article
 */
export async function updateArticle(id: string, formData: FormData) {
 const article = await prisma.knowledgeArticle.findUnique({
 where: { id },
 include: { project: true },
 });
 if (!article) throw new Error("Article not found");

 const { member } = await requireProjectMember(article.projectId);
 requireElevatedRole(member.role);

 const title = formData.get("title") as string;
 const category = formData.get("category") as KbCategory;
 const body = formData.get("body") as string;

 if (!title || !category || !body) {
 throw new Error("Title, Category, and Body are required");
 }

 // Update article. Generate a new slug only if title changes.
 let slug = article.slug;
 if (title !== article.title) {
 const baseSlug = generateSlug(title);
 slug = baseSlug;
 let counter = 1;
 while (true) {
 const existing = await prisma.knowledgeArticle.findFirst({
 where: {
 projectId: article.projectId,
 slug,
 id: { not: id },
 },
 });
 if (!existing) break;
 slug = `${baseSlug}-${counter}`;
 counter++;
 }
 }

  const updated = await prisma.knowledgeArticle.update({
    where: { id },
    data: {
      title,
      slug,
      category,
      body,
    },
  });

  // Background RAG Indexing
  indexKnowledgeArticle(id, updated.projectId).catch((err: unknown) =>
    console.error(`[RAG Auto-Index] Failed to index KB Article ${id}:`, err)
  );

  revalidatePath("/dashboard/knowledge-base");
  revalidatePath(`/dashboard/knowledge-base/${slug}`);
  redirect(`/dashboard/knowledge-base/${slug}`);
}

/**
 * Unpublish/Archive a KB Article
 */
export async function unpublishArticle(id: string) {
 const article = await prisma.knowledgeArticle.findUnique({
 where: { id },
 });
 if (!article) throw new Error("Article not found");

 const { member } = await requireProjectMember(article.projectId);
 requireElevatedRole(member.role);

 await prisma.knowledgeArticle.update({
 where: { id },
 data: { published: false },
 });

 revalidatePath("/dashboard/knowledge-base");
 revalidatePath(`/dashboard/knowledge-base/${article.slug}`);
 redirect("/dashboard/knowledge-base");
}
