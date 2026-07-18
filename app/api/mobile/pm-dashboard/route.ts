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
      select: { id: true, targetCodDate: true, percentComplete: true },
    });

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }

    const { member } = await getOrCreateUser(project.id);
    
    if (!member || (member.role !== 'PROJECT_MANAGER' && member.role !== 'ADMINISTRATOR' && clerkUser.emailAddresses[0]?.emailAddress !== 'romeo@projectnexus.dev')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions (PM/Admin only)' }, { status: 403 });
    }

    // 2. Fetch Aggregated Data
    // Completion Percentage
    let percentComplete = project.percentComplete ?? 0;
    const latestSnapshot = await prisma.progressSnapshot.findFirst({
      where: { projectId: project.id },
      orderBy: { snapshotDate: 'desc' },
    });
    if (latestSnapshot) {
      percentComplete = latestSnapshot.percentComplete;
    }

    // Status Strip (CodMilestones)
    // Map categories to green/amber/red (COMPLETED -> green, IN_PROGRESS -> amber, UPCOMING/BLOCKED/LOCKED -> red/gray based on your logic)
    const milestones = await prisma.codMilestone.findMany({
      where: { projectId: project.id },
    });
    
    // Group milestones by category to determine a high-level status per discipline
    const resolveStatus = (category: string) => {
      const catMilestones = milestones.filter(m => m.category === category);
      if (catMilestones.length === 0) return 'UNKNOWN'; // or placeholder
      
      const allCompleted = catMilestones.every(m => m.status === 'COMPLETED');
      if (allCompleted) return 'GREEN';
      
      const anyBlocked = catMilestones.some(m => m.status === 'BLOCKED');
      if (anyBlocked) return 'RED';

      const anyInProgress = catMilestones.some(m => m.status === 'IN_PROGRESS');
      if (anyInProgress) return 'AMBER';
      
      return 'GRAY'; // UPCOMING / LOCKED
    };

    const disciplines = {
      civil: resolveStatus('CIVIL'),
      mechanical: resolveStatus('MECHANICAL'),
      electrical: resolveStatus('ELECTRICAL'),
      testing: resolveStatus('TESTING'),
    };

    // Open Tickets Count
    const openTicketsCount = await prisma.ticket.count({
      where: { 
        projectId: project.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      },
    });

    // Visitors On-Site Count
    const visitorsOnSiteCount = await prisma.visitor.count({
      where: {
        projectId: project.id,
        status: 'CHECKED_IN',
      },
    });

    // Return the aggregated payload
    return NextResponse.json({
      success: true,
      data: {
        user: {
          firstName: clerkUser.firstName,
          role: member.role,
        },
        targetCodDate: project.targetCodDate,
        percentComplete,
        disciplines,
        openTicketsCount,
        visitorsOnSiteCount,
        // Weather alerts will be fetched directly from Open-Meteo or existing weather API
      }
    }, { status: 200 });

  } catch (error: any) {
    console.error('Error fetching mobile PM dashboard data:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
