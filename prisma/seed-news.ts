/**
 * Three starter posts for the Nexus Home Newsroom. Run by hand, once:
 *
 *   npx.cmd tsx --env-file=.env prisma/seed-news.ts            # dry run: prints what would be written
 *   npx.cmd tsx --env-file=.env prisma/seed-news.ts --apply
 *
 * Every statement comes from lib/home/companyFacts.ts or from the database (the Tumauini figure
 * is the latest logged progress reading at the moment the script runs). A post whose slug
 * already exists is left alone. The author is the first user who holds a publisher role.
 */
import { prisma } from "../lib/db/prisma";
import {
  ANNIVERSARY_YEAR, BRAND_LINE, COMPANY_NAME, EPC_SCOPE, FLAGSHIP, FOUNDED_YEAR, HYDRO_HIGHLIGHTS, PCAB_RATING, TIMELINE,
} from "../lib/home/companyFacts";
import { slugify } from "../lib/home/newsPosts";
import { NEWS_PUBLISHER_ROLES } from "../lib/home/newsRoles";

const APPLY = process.argv.includes("--apply");
const date = (d: Date) => new Intl.DateTimeFormat("en-PH", { timeZone: "Asia/Manila", day: "numeric", month: "long", year: "numeric" }).format(d);

async function main() {
  const author = await prisma.projectMember.findFirst({ where: { role: { in: NEWS_PUBLISHER_ROLES } }, select: { user: { select: { id: true, name: true } } }, orderBy: { id: "asc" } });
  if (!author) throw new Error("No user holds a publisher role (ADMINISTRATOR, PROJECT_MANAGER, HR, SAFETY): nobody to sign the posts.");

  const project = await prisma.project.findUnique({ where: { slug: FLAGSHIP.slug }, select: { id: true, featuredImage: true, targetCodDate: true, percentComplete: true } });
  if (!project) throw new Error(`Project ${FLAGSHIP.slug} not found`);
  const reading = await prisma.progressSnapshot.findFirst({ where: { projectId: project.id }, orderBy: { snapshotDate: "desc" }, select: { percentComplete: true, snapshotDate: true } });
  const percent = reading?.percentComplete ?? project.percentComplete;
  const cover = project.featuredImage && project.featuredImage.startsWith("/project-images/") && !/placeholder/.test(project.featuredImage) ? project.featuredImage : null;

  const posts = [
    {
      title: `SCIC Celebrates 50 Years of Building the Nation (${FOUNDED_YEAR}–${ANNIVERSARY_YEAR})`,
      category: "ANNOUNCEMENT" as const,
      pinned: true,
      projectId: null,
      coverImage: null,
      excerpt: `From a trading and construction firm founded in ${FOUNDED_YEAR} to a PCAB "${PCAB_RATING}" contractor: ${ANNIVERSARY_YEAR} is our fiftieth year.`,
      body: [
        `${ANNIVERSARY_YEAR} marks fifty years of ${COMPANY_NAME}.`,
        `## The road so far`,
        ...TIMELINE.filter((t) => t.year !== null && t.year < ANNIVERSARY_YEAR).map((t) => `- **${t.marker}** — ${t.title}. ${t.caption}`),
        `## What we build`,
        `Our engineering, procurement and construction work covers ${EPC_SCOPE.slice(0, -1).join(", ").toLowerCase()} and ${EPC_SCOPE[EPC_SCOPE.length - 1].toLowerCase()}.`,
        `Among the hydroelectric plants the company has delivered are ${HYDRO_HIGHLIGHTS.map((h) => `${h.name} (${h.capacity})`).join(", ")}.`,
        `Thank you to everyone, on every site and in every office, who built these fifty years.`,
        `*${BRAND_LINE}*`,
      ].join("\n\n").replace(/\n\n- /g, "\n- "),
    },
    {
      title: "Welcome to Nexus Home",
      category: "ANNOUNCEMENT" as const,
      pinned: false,
      projectId: null,
      coverImage: null,
      excerpt: "Project Nexus has a new front page: site weather, company news, the project portfolio and the flagship site in one place.",
      body: [
        "Nexus Home is the new first page of Project Nexus.",
        "## What is on it",
        "- **Weather at a glance** for the Tumauini site and Manila HQ, with the day's work verdict for the site.",
        "- **The Newsroom**: posts like this one, events from the project records, and press mentions of the company.",
        "- **Trending headlines** from the Philippines, energy and infrastructure, business and the world.",
        "- **The portfolio**: every project on a map of the country, linked to the National Project Atlas.",
        "- **The flagship site**, with its progress and the countdown to its target commercial operation date.",
        "## Where the Command Center went",
        "The Command & Operations Center is unchanged. It is the second item in the menu, now named **Command Center**.",
        "Administrators, project managers, HR and safety officers can publish to the Newsroom with the **New Post** button.",
      ].join("\n\n").replace(/\n\n- /g, "\n- "),
    },
    ...(typeof percent === "number"
      ? [
          {
            title: `${FLAGSHIP.shortName} at ${percent}% overall progress`,
            category: "PROJECT_UPDATE" as const,
            pinned: false,
            projectId: project.id,
            coverImage: cover,
            excerpt: `The ${FLAGSHIP.capacity} ${FLAGSHIP.type.toLowerCase()} plant on the ${FLAGSHIP.river} stands at ${percent}% overall progress${reading ? ` as of ${date(reading.snapshotDate)}` : ""}.`,
            body: [
              `The ${FLAGSHIP.name} in ${FLAGSHIP.location} stands at **${percent}% overall progress**${reading ? `, as logged on ${date(reading.snapshotDate)}` : ""}.`,
              `The plant is an ${FLAGSHIP.capacity} ${FLAGSHIP.type.toLowerCase()} development on the ${FLAGSHIP.river}, built for ${FLAGSHIP.client}.`,
              project.targetCodDate ? `Its target commercial operation date is **${date(project.targetCodDate)}**.` : null,
              "Progress readings, milestones and daily reports are on the Progress page of Project Nexus.",
            ].filter(Boolean).join("\n\n"),
          },
        ]
      : []),
  ];

  for (const p of posts) {
    const slug = slugify(p.title);
    const exists = await prisma.newsPost.findUnique({ where: { slug }, select: { id: true } }).catch(() => null);
    console.log(`${exists ? "exists " : APPLY ? "create " : "would  "} ${slug}  [${p.category}${p.pinned ? ", pinned" : ""}]  by ${author.user.name}`);
    if (!APPLY) console.log(`        ${p.excerpt}`);
    if (exists || !APPLY) continue;
    await prisma.newsPost.create({ data: { ...p, slug, authorId: author.user.id } });
  }
  if (!APPLY) console.log("dry run: nothing written. Re-run with --apply.");
}
main().catch((e) => { console.error(e); process.exitCode = 1; }).finally(() => prisma.$disconnect());
