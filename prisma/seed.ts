import "dotenv/config";
import { PrismaClient, MilestoneCategory, MilestoneStatus2 } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Organization
  const org = await prisma.organization.upsert({
    where: { id: "scic-org-001" },
    update: {},
    create: {
      id: "scic-org-001",
      name: "Sta. Clara International Corporation",
    },
  });
  console.log(`  ✓ Organization: ${org.name}`);

  // Project
  const targetCodDate = new Date(Date.now() + 8 * 30 * 24 * 3600 * 1000); // 8 months from now
  const project = await prisma.project.upsert({
    where: { slug: "tumauini-hepp" },
    update: {
      targetCodDate,
    },
    create: {
      organizationId: org.id,
      name: "Tumauini Hydroelectric Power Plant",
      slug: "tumauini-hepp",
      location: "Barangay Antagan Uno, Tumauini, Isabela",
      capacityMw: 11.3,
      plantType: "Run-of-river",
      percentComplete: 79,
      status: "ACTIVE",
      targetCodDate,
    },
  });
  console.log(`  ✓ Project: ${project.name} (${project.slug})`);

  // Dev user — replace clerkId with your actual Clerk user ID after first login
  const user = await prisma.user.upsert({
    where: { email: "admin@projectnexus.dev" },
    update: {},
    create: {
      clerkId: "dev_admin_placeholder",
      name: "Site Administrator",
      email: "admin@projectnexus.dev",
    },
  });
  console.log(`  ✓ User: ${user.name} (${user.email})`);

  // Project membership
  await prisma.projectMember.upsert({
    where: {
      userId_projectId: {
        userId: user.id,
        projectId: project.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      projectId: project.id,
      role: "ADMINISTRATOR",
    },
  });
  console.log(`  ✓ Membership: ${user.name} → ${project.name} (ADMINISTRATOR)`);

  // Seed CodMilestones
  await prisma.codMilestone.deleteMany({ where: { projectId: project.id } });
  
  const milestonesData = [
    { title: "Penstock Hydrostatic Test", category: "TESTING", status: "COMPLETED", completedAt: new Date(Date.now() - 20 * 24 * 3600 * 1000), targetDate: new Date(Date.now() - 25 * 24 * 3600 * 1000), order: 1, isCritical: true },
    { title: "Turbine & Generator Installation Complete", category: "MECHANICAL", status: "COMPLETED", completedAt: new Date(Date.now() - 10 * 24 * 3600 * 1000), targetDate: new Date(Date.now() - 12 * 24 * 3600 * 1000), order: 2, isCritical: true },
    { title: "Governor System Commissioning", category: "MECHANICAL", status: "COMPLETED", completedAt: new Date(Date.now() - 3 * 24 * 3600 * 1000), targetDate: new Date(Date.now() - 5 * 24 * 3600 * 1000), order: 3, isCritical: true },
    { title: "Transformer Energization", category: "ELECTRICAL", status: "IN_PROGRESS", completedAt: null, targetDate: new Date(Date.now() + 5 * 24 * 3600 * 1000), order: 4, isCritical: true },
    { title: "Protection Relay Coordination Test", category: "ELECTRICAL", status: "UPCOMING", completedAt: null, targetDate: new Date(Date.now() + 15 * 24 * 3600 * 1000), order: 5, isCritical: true },
    { title: "SCADA Point-by-Point Verification", category: "TESTING", status: "UPCOMING", completedAt: null, targetDate: new Date(Date.now() + 25 * 24 * 3600 * 1000), order: 6, isCritical: false },
    { title: "No-Load Trial Run", category: "TESTING", status: "UPCOMING", completedAt: null, targetDate: new Date(Date.now() + 45 * 24 * 3600 * 1000), order: 7, isCritical: true },
    { title: "Load Rejection Test", category: "TESTING", status: "UPCOMING", completedAt: null, targetDate: new Date(Date.now() + 60 * 24 * 3600 * 1000), order: 8, isCritical: true },
    { title: "72-Hour Performance Test", category: "TESTING", status: "UPCOMING", completedAt: null, targetDate: new Date(Date.now() + 75 * 24 * 3600 * 1000), order: 9, isCritical: true },
    { title: "As-Built Documents Submitted to PHPC", category: "DOCUMENTATION", status: "LOCKED", completedAt: null, targetDate: new Date(Date.now() + 90 * 24 * 3600 * 1000), order: 10, isCritical: false },
    { title: "ERC Compliance Documents Filed", category: "REGULATORY", status: "LOCKED", completedAt: null, targetDate: new Date(Date.now() + 120 * 24 * 3600 * 1000), order: 11, isCritical: true },
    { title: "Commercial Operation Date", category: "TESTING", status: "LOCKED", completedAt: null, targetDate: targetCodDate, order: 12, isCritical: true }
  ];

  for (const m of milestonesData) {
    await prisma.codMilestone.create({
      data: {
        projectId: project.id,
        title: m.title,
        category: m.category as MilestoneCategory,
        status: m.status as MilestoneStatus2,
        completedAt: m.completedAt,
        targetDate: m.targetDate,
        order: m.order,
        isCritical: m.isCritical,
      }
    });
  }
  console.log("  ✓ Seeded COD milestones");

  console.log("\n✅ Seed complete.");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
