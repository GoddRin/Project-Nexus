import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';
import { getOrCreateUser } from '@/lib/auth/getOrCreateUser';
import { currentUser } from '@clerk/nextjs/server';

export async function GET(req: Request) {
  try {
    // 1. Verify Authentication & Role
    const clerkUser = await currentUser();
    if (!clerkUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const project = await prisma.project.findUnique({
      where: { slug: 'tumauini-hepp' },
      select: { id: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { member } = await getOrCreateUser(project.id);
    
    if (!member || (member.role !== 'PROJECT_MANAGER' && member.role !== 'ADMINISTRATOR' && member.role !== 'ENGINEER' && member.role !== 'SUPERVISOR' && clerkUser.emailAddresses[0]?.emailAddress !== 'romeo@projectnexus.dev')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 });
    }

    // 2. Fetch Aggregated Data
    // Fetch all site locations with their equipment count
    const locations = await prisma.siteLocation.findMany({
      where: { projectId: project.id },
      include: {
        _count: {
          select: { equipments: true }
        }
      }
    });

    // Format the response
    const equipmentCounts: Record<string, number> = {};
    locations.forEach(loc => {
      equipmentCounts[loc.slug] = loc._count.equipments;
    });

    // We can also check if it's currently working hours (e.g., 8 AM - 5 PM Manila time)
    const currentHour = new Date().getUTCHours() + 8; // Manila is UTC+8
    const isWorkingHours = currentHour >= 8 && currentHour < 17;

    // Return the aggregated payload
    return NextResponse.json({
      success: true,
      data: {
        locations: locations.map(l => ({
          id: l.id,
          slug: l.slug,
          name: l.name,
          description: l.description,
          percentComplete: l.percentComplete ?? 0,
          status: l.status,
        })),
        equipmentCounts,
        isWorkingHours
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching mobile site-map data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
