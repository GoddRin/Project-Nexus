import "dotenv/config";
import { PrismaClient, KbCategory } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

function generateSlug(title: string) {
  return title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function main() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const author = await prisma.user.findFirst();
  if (!author) throw new Error("User not found");

  const title1 = "Emergency Stop Procedures for Turbine Unit A";
  const slug1 = generateSlug(title1);
  const article1 = await prisma.knowledgeArticle.create({
    data: {
      projectId: project.id,
      title: title1,
      slug: slug1,
      category: KbCategory.PROCEDURE,
      body: `# Emergency Turbine Shutdown\n\nFollow these steps during high vibration states:\n1. Trigger E-Stop button on console TX-1.\n2. Confirm fuel valve shutoff within 5 seconds.`,
      authorId: author.id,
      published: true,
    }
  });

  const title2 = "Standard Operating FAQs for Plant Intake Control";
  const slug2 = generateSlug(title2);
  const article2 = await prisma.knowledgeArticle.create({
    data: {
      projectId: project.id,
      title: title2,
      slug: slug2,
      category: KbCategory.FAQ,
      body: `# Intake Control FAQs\n\n**Q: What is the normal intake water level?**\n\nA: The optimal operational level is 4.2 meters.`,
      authorId: author.id,
      published: true,
    }
  });

  console.log("Seeded KB Articles:");
  console.log("Article 1:", article1.slug);
  console.log("Article 2:", article2.slug);
}

main().finally(() => prisma.$disconnect());
