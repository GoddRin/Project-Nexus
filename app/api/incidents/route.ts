import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const projectId = searchParams.get("projectId");

    if (!projectId) {
      return NextResponse.json({ error: "Missing projectId" }, { status: 400 });
    }

    const { dbUser, member } = await getOrCreateUser(projectId);
    if (!dbUser || !member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incidents = await prisma.siteIncident.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      include: {
        loggedBy: {
          select: { name: true, email: true }
        }
      }
    });

    return NextResponse.json(incidents);
  } catch (error) {
    console.error("GET /api/incidents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      projectId,
      type,
      severity,
      description,
      personnelInvolved,
      timeOfDeparture,
      dispatchFacilityName,
      dispatchFacilityLat,
      dispatchFacilityLng,
      dispatchFacilityOsmId,
    } = body;

    if (!projectId || !type || !severity || !description) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    const { dbUser, member } = await getOrCreateUser(projectId);
    if (!dbUser || !member) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const incident = await prisma.siteIncident.create({
      data: {
        projectId,
        type,
        severity,
        description,
        personnelInvolved,
        timeOfDeparture: timeOfDeparture ? new Date(timeOfDeparture) : null,
        dispatchFacilityName,
        dispatchFacilityLat,
        dispatchFacilityLng,
        dispatchFacilityOsmId,
        loggedById: dbUser.id,
      },
    });

    return NextResponse.json(incident);
  } catch (error) {
    console.error("POST /api/incidents error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
