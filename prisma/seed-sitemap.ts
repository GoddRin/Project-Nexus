import "dotenv/config";
import { prisma } from "../lib/db/prisma";
import { LocationStatus } from "@prisma/client";

async function main() {
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  // Delete the legacy headrace-tunnel to prevent it from cluttering the dashboard
  await prisma.siteLocation.deleteMany({
    where: {
      projectId: project.id,
      slug: "headrace-tunnel",
    },
  });

  const locations = [
    {
      slug: "dam-intake",
      name: "Weir / Intake Structure",
      description: "Concrete weir and intake portal diverting river water into the feeder canal.",
      percentComplete: 95.5,
      status: "ACTIVE",
    },
    {
      slug: "feeder-canal",
      name: "Feeder Canal",
      description: "Open concrete-lined channel conveying water from the weir intake to the desander basin.",
      percentComplete: 85.0,
      status: "ACTIVE",
    },
    {
      slug: "desander",
      name: "Desander Basin",
      description: "Concrete sedimentation basin with settling lanes designed to trap and flush out sand and silt from water.",
      percentComplete: 70.0,
      status: "ACTIVE",
    },
    {
      slug: "tunnel-transition",
      name: "Tunnel Transition",
      description: "Concrete transition portal structure narrowing the flow from the desander basin and directing it into Tunnel 1.",
      percentComplete: 60.0,
      status: "ACTIVE",
    },
    {
      slug: "tunnel-1",
      name: "Tunnel 1 (3km)",
      description: "Main underground low-pressure headrace tunnel section conveying water through the mountain range.",
      percentComplete: 45.0,
      status: "ACTIVE",
    },
    {
      slug: "pipe-crossing",
      name: "Pipe Crossing",
      description: "Elevated steel conduit (aqueduct) crossing a deep ravine valley to connect Tunnel 1 and Tunnel 2.",
      percentComplete: 55.0,
      status: "ACTIVE",
    },
    {
      slug: "tunnel-2",
      name: "Tunnel 2 (535m)",
      description: "Second underground headrace tunnel section leading directly into the surge tank.",
      percentComplete: 30.0,
      status: "ACTIVE",
    },
    {
      slug: "surge-tank",
      name: "Surge Tank",
      description: "Vertical shaft to absorb water hammer pressures from the penstock.",
      percentComplete: 60.0,
      status: "ACTIVE",
    },
    {
      slug: "penstock",
      name: "Penstock",
      description: "High-pressure steel pipe delivering water down to the powerhouse turbines.",
      percentComplete: 45.0,
      status: "ACTIVE",
    },
    {
      slug: "powerhouse",
      name: "Powerhouse",
      description: "Main generating station housing turbines, generators, and control systems.",
      percentComplete: 75.0,
      status: "ACTIVE",
    },
    {
      slug: "tailrace",
      name: "Tailrace / Outfall",
      description: "Channel discharging water from the powerhouse back into the river.",
      percentComplete: 90.0,
      status: "ACTIVE",
    },
    {
      slug: "switchyard",
      name: "Switchyard / Substation",
      description: "Outdoor step-up transformers and transmission line interconnection.",
      percentComplete: 30.0,
      status: "SUSPENDED",
    },
    {
      slug: "access-road",
      name: "Access Roads & Infrastructure",
      description: "Site roads connecting the powerhouse to the dam and main highway.",
      percentComplete: 100.0,
      status: "COMPLETED",
    },
    {
      slug: "pipe-bridge",
      name: "Penstock Pipe Bridge",
      description: "Structural steel truss bridge supporting the penstock pipeline across the valley terrain between the surge tank and powerhouse.",
      percentComplete: 50.0,
      status: "ACTIVE",
    },
  ];

  for (const loc of locations) {
    await prisma.siteLocation.upsert({
      where: {
        projectId_slug: {
          projectId: project.id,
          slug: loc.slug,
        }
      },
      update: {
        name: loc.name,
        description: loc.description,
        percentComplete: loc.percentComplete,
        status: loc.status as LocationStatus,
      },
      create: {
        projectId: project.id,
        slug: loc.slug,
        name: loc.name,
        description: loc.description,
        percentComplete: loc.percentComplete,
        status: loc.status as LocationStatus,
      }
    });
    console.log(`Upserted SiteLocation: ${loc.slug}`);
  }

  // Seed site photos for Desander Basin
  const adminUser = await prisma.user.findFirst();
  if (!adminUser) {
    throw new Error("No user found in database to associate with site photos seeding.");
  }

  const desander = await prisma.siteLocation.findFirst({
    where: { slug: "desander", projectId: project.id }
  });

  if (desander) {
    // Clean up existing photos to avoid duplicate entries
    await prisma.siteLocationPhoto.deleteMany({
      where: { locationId: desander.id }
    });

    const desanderPhotos = [
      {
        storagePath: "/sitemap-photos/desander-1.jpg",
        caption: "Desander basin main structure reinforcement and formwork details.",
      },
      {
        storagePath: "/sitemap-photos/desander-2.jpg",
        caption: "Aerial layout view of the desander basin adjacent to the intake dam area.",
      },
      {
        storagePath: "/sitemap-photos/desander-3.jpg",
        caption: "Intake portal structure and desander inlet gate construction.",
      },
      {
        storagePath: "/sitemap-photos/desander-4.jpg",
        caption: "Desander settling lane walls and intake transitions.",
      },
    ];

    for (const photo of desanderPhotos) {
      await prisma.siteLocationPhoto.create({
        data: {
          locationId: desander.id,
          storagePath: photo.storagePath,
          caption: photo.caption,
          uploadedById: adminUser.id,
        }
      });
    }
    console.log("Seeded desander basin site photos.");
  }

  console.log("Sitemap locations seeded successfully.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
