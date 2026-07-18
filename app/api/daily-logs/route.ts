import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { projectId, loggedById, date, totalHeadcount, zoneBreakdown, ptws } = body;

    let actualProjectId = projectId;
    let actualLoggedById = loggedById;

    // Resolve dummy IDs to actual DB IDs for prototyping
    if (actualProjectId === 'dummy-project-123' || !actualProjectId) {
      const firstProject = await prisma.project.findFirst();
      if (!firstProject) {
        return NextResponse.json({ error: 'No projects found in database to fallback on' }, { status: 400 });
      }
      actualProjectId = firstProject.id;
    }

    if (actualLoggedById === 'dummy-user-123' || !actualLoggedById) {
      const firstUser = await prisma.user.findFirst();
      if (!firstUser) {
        return NextResponse.json({ error: 'No users found in database to fallback on' }, { status: 400 });
      }
      actualLoggedById = firstUser.id;
    }

    // Wrap the creation of DailyLog and DailyLogPtws in a single transaction
    const dailyLog = await prisma.$transaction(async (tx) => {
      const log = await tx.dailyLog.create({
        data: {
          projectId: actualProjectId,
          loggedById: actualLoggedById,
          logDate: date ? new Date(date) : new Date(),
          totalHeadcount: totalHeadcount || 0,
          zoneTunnels: zoneBreakdown?.Tunnels || 0,
          zoneWeir: zoneBreakdown?.Weir || 0,
          zoneTemfacil: zoneBreakdown?.Temfacil || 0,
          zonePowerhouse: zoneBreakdown?.Powerhouse || 0,
          zoneSwitchyard: zoneBreakdown?.Switchyard || 0,
        },
      });

      if (ptws && Array.isArray(ptws) && ptws.length > 0) {
        await tx.dailyLogPtw.createMany({
          data: ptws.map((ptw: any) => ({
            dailyLogId: log.id,
            type: ptw.type,
            location: ptw.location,
            team: ptw.team,
            expiry: ptw.expiry,
            status: ptw.status,
          })),
        });
      }

      return log;
    });

    return NextResponse.json({ success: true, dailyLog }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating daily log:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get('page') ?? '1');
    const limit = parseInt(searchParams.get('limit') ?? '30');
    const skip = (page - 1) * limit;

    const project = await prisma.project.findFirst();
    if (!project) {
      return NextResponse.json({ logs: [], total: 0 });
    }

    const [logs, total] = await Promise.all([
      prisma.dailyLog.findMany({
        where: { projectId: project.id },
        orderBy: { logDate: 'desc' },
        skip,
        take: limit,
        include: {
          ptws: true,
          loggedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      }),
      prisma.dailyLog.count({ where: { projectId: project.id } }),
    ]);

    return NextResponse.json({ logs, total, page, limit });
  } catch (error: any) {
    console.error('Error fetching daily logs:', error);
    return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
  }
}
