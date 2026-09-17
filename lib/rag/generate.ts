import { GoogleGenerativeAI, SchemaType, FunctionDeclaration } from "@google/generative-ai";
import Groq from "groq-sdk";
import { SearchResultChunk } from "./search";
import { prisma } from "../db/prisma";
import { supabaseAdmin } from "../supabase";
import { FILIPINO_PERSONNEL_REGISTRY } from "@/components/digital-twin/personnelData";
import { fetchRiverBasinTelemetry } from "../weather/riverbasin";
import { fetchPagasaSignals } from "../weather/pagasa";
import { getMergedStorms } from "../weather/storms";
import { fetchSiteRainForecast } from "../weather/rainForecast";

export interface Citation {
  sourceId: string;
  sourceName: string;
  sourceType: "DOCUMENT" | "KNOWLEDGE_ARTICLE" | "EQUIPMENT_SPEC" | string;
  excerpt: string;
  slug?: string;
}

export interface ToolStreamEvent {
  type: "step_start" | "step_complete";
  tool: string;
  label: string;
  summary?: string;
  elapsedMs?: number;
}

export interface ClientAction {
  type: "NAVIGATE_3D" | "NAVIGATE_PAGE";
  target: string;
  url: string;
  title: string;
  badgeText?: string;
}

// ============================================================
// Database & Tool Implementation Functions
// ============================================================

async function listDocumentFolders(projectId: string) {
  const folders = await prisma.documentFolder.findMany({
    where: { projectId },
    include: {
      _count: { select: { documents: true } },
      parent: { select: { name: true } }
    },
    orderBy: { name: "asc" }
  });

  const rootDocsCount = await prisma.document.count({
    where: { projectId, folderId: null }
  });

  return {
    rootDocumentsCount: rootDocsCount,
    folders: folders.map((f) => ({
      id: f.id,
      name: f.name,
      parentFolder: f.parent?.name || null,
      documentCount: f._count.documents
    }))
  };
}

async function listDocuments(projectId: string, folderName?: string) {
  const whereClause: Record<string, unknown> = { projectId };
  if (folderName && folderName.trim().toLowerCase() !== "root" && folderName.trim().toLowerCase() !== "all") {
    const folder = await prisma.documentFolder.findFirst({
      where: { projectId, name: { equals: folderName.trim(), mode: "insensitive" } }
    });
    if (folder) {
      whereClause.folderId = folder.id;
    } else {
      const fuzzyFolder = await prisma.documentFolder.findFirst({
        where: { projectId, name: { contains: folderName.trim(), mode: "insensitive" } }
      });
      if (fuzzyFolder) {
        whereClause.folderId = fuzzyFolder.id;
      } else {
        return { documents: [], message: `Folder "${folderName}" not found.` };
      }
    }
  } else if (folderName?.trim().toLowerCase() === "root") {
    whereClause.folderId = null;
  }

  const documents = await prisma.document.findMany({
    where: whereClause,
    include: {
      folder: { select: { name: true } },
      versions: {
        orderBy: { versionNum: "desc" },
        take: 1
      }
    },
    orderBy: { createdAt: "desc" }
  });

  return {
    count: documents.length,
    folder: folderName || "All",
    documents: documents.map((d) => {
      const v = d.versions[0];
      const isImg = v ? (v.mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v.fileName)) : false;
      return {
        id: d.id,
        name: d.name,
        folder: d.folder?.name || "Root",
        fileName: v?.fileName || d.name,
        mimeType: v?.mimeType || "unknown",
        fileSizeKb: v?.fileSizeKb || 0,
        isImage: isImg,
        createdAt: d.createdAt
      };
    })
  };
}

async function searchDocuments(projectId: string, query: string) {
  const documents = await prisma.document.findMany({
    where: {
      projectId,
      name: { contains: query, mode: "insensitive" }
    },
    include: {
      folder: { select: { name: true } },
      versions: { orderBy: { versionNum: "desc" }, take: 1 }
    }
  });

  return {
    query,
    count: documents.length,
    documents: documents.map((d) => {
      const v = d.versions[0];
      const isImg = v ? (v.mimeType.startsWith("image/") || /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(v.fileName)) : false;
      return {
        id: d.id,
        name: d.name,
        folder: d.folder?.name || "Root",
        fileName: v?.fileName || d.name,
        mimeType: v?.mimeType || "unknown",
        isImage: isImg
      };
    })
  };
}

async function getDocumentDetailsAndFile(projectId: string, documentNameOrId: string) {
  const doc = await prisma.document.findFirst({
    where: {
      projectId,
      OR: [
        { id: documentNameOrId },
        { name: { equals: documentNameOrId, mode: "insensitive" } },
        { name: { contains: documentNameOrId, mode: "insensitive" } }
      ]
    },
    include: {
      folder: true,
      versions: { orderBy: { versionNum: "desc" } }
    }
  });

  if (!doc) {
    return { error: `Document "${documentNameOrId}" not found.` };
  }

  const latestVersion = doc.versions[0];
  let signedUrl: string | null = null;
  if (latestVersion?.storagePath) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from("documents")
        .createSignedUrl(latestVersion.storagePath, 3600); // 1 hour validity
      if (!error && data?.signedUrl) {
        signedUrl = data.signedUrl;
      }
    } catch (e) {
      console.error("Error creating signed URL for document:", e);
    }
  }

  const isImage = latestVersion ? (
    latestVersion.mimeType.startsWith("image/") ||
    /\.(jpg|jpeg|png|gif|webp|svg)$/i.test(latestVersion.fileName)
  ) : false;

  // Retrieve text chunks if indexed
  const chunks = await prisma.documentChunk.findMany({
    where: {
      projectId,
      sourceId: doc.id,
      sourceType: "DOCUMENT"
    },
    orderBy: { chunkIndex: "asc" },
    select: { content: true }
  });
  const textContent = chunks.map((c) => c.content).join("\n\n").substring(0, 25000);

  return {
    id: doc.id,
    name: doc.name,
    folder: doc.folder?.name || "Root",
    fileName: latestVersion?.fileName || doc.name,
    mimeType: latestVersion?.mimeType,
    fileSizeKb: latestVersion?.fileSizeKb,
    isImage,
    signedUrl,
    textContent: textContent || "(No extracted text available for this file format)",
    instructionsForAI: isImage && signedUrl
      ? `This document is an image. You MUST embed the image directly into your answer using standard markdown: ![${latestVersion?.fileName || doc.name}](${signedUrl}) and present its file metadata.`
      : signedUrl
      ? `File download URL: [Download ${latestVersion?.fileName || doc.name}](${signedUrl})`
      : undefined
  };
}

async function createTicket(
  projectId: string,
  userId: string | undefined,
  args: {
    title: string;
    description: string;
    priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  }
) {
  let authorId = userId;
  if (!authorId) {
    const member = await prisma.projectMember.findFirst({ where: { projectId } });
    authorId = member?.userId;
  }
  if (!authorId) {
    const user = await prisma.user.findFirst();
    authorId = user?.id;
  }
  if (!authorId) {
    return { error: "Unable to find an authorized user to create this ticket." };
  }

  const priorityVal = (args.priority || "MEDIUM").toUpperCase() as "LOW" | "MEDIUM" | "HIGH" | "URGENT";

  const ticket = await prisma.ticket.create({
    data: {
      projectId,
      title: args.title,
      description: args.description,
      priority: priorityVal,
      status: "OPEN",
      createdById: authorId
    },
    include: {
      createdBy: { select: { name: true, email: true } }
    }
  });

  return {
    success: true,
    message: `Ticket "${ticket.title}" created successfully with ID #${ticket.id.slice(-6)} (${ticket.priority} priority).`,
    ticket: {
      id: ticket.id,
      title: ticket.title,
      priority: ticket.priority,
      status: ticket.status,
      createdByName: ticket.createdBy.name,
      createdAt: ticket.createdAt
    }
  };
}

async function listTickets(projectId: string, status?: string, priority?: string) {
  const whereClause: Record<string, unknown> = { projectId };
  if (status && status.toUpperCase() !== "ALL") {
    whereClause.status = status.toUpperCase();
  }
  if (priority && priority.toUpperCase() !== "ALL") {
    whereClause.priority = priority.toUpperCase();
  }

  const tickets = await prisma.ticket.findMany({
    where: whereClause,
    include: {
      createdBy: { select: { name: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: { createdAt: "desc" },
    take: 20
  });

  return {
    count: tickets.length,
    tickets: tickets.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      createdBy: t.createdBy.name,
      assignedTo: t.assignedTo?.name || "Unassigned",
      createdAt: t.createdAt
    }))
  };
}

async function updateTicketStatus(
  projectId: string,
  ticketIdOrTitle: string,
  newStatus: "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED"
) {
  const ticket = await prisma.ticket.findFirst({
    where: {
      projectId,
      OR: [
        { id: ticketIdOrTitle },
        { title: { contains: ticketIdOrTitle, mode: "insensitive" } }
      ]
    }
  });

  if (!ticket) {
    return { error: `Ticket "${ticketIdOrTitle}" not found.` };
  }

  const updated = await prisma.ticket.update({
    where: { id: ticket.id },
    data: { status: newStatus }
  });

  return {
    success: true,
    message: `Ticket "${updated.title}" status updated to ${updated.status}.`,
    ticket: {
      id: updated.id,
      title: updated.title,
      status: updated.status
    }
  };
}

async function createIncidentReport(
  projectId: string,
  userId: string | undefined,
  args: {
    type: "MEDICAL" | "SECURITY" | "FIRE" | "OTHER";
    severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
    description: string;
    personnelInvolved?: string;
  }
) {
  let authorId = userId;
  if (!authorId) {
    const member = await prisma.projectMember.findFirst({ where: { projectId } });
    authorId = member?.userId;
  }
  if (!authorId) {
    const user = await prisma.user.findFirst();
    authorId = user?.id;
  }
  if (!authorId) {
    return { error: "No authenticated user available to log this incident." };
  }

  const incident = await prisma.siteIncident.create({
    data: {
      projectId,
      type: args.type || "OTHER",
      severity: args.severity || "LOW",
      description: args.description,
      personnelInvolved: args.personnelInvolved,
      status: "ACTIVE",
      loggedById: authorId
    }
  });

  return {
    success: true,
    message: `Incident report logged successfully: [${incident.type}] ${incident.severity} severity.`,
    incidentId: incident.id
  };
}

async function listRecentIncidents(projectId: string) {
  const incidents = await prisma.siteIncident.findMany({
    where: { projectId },
    include: { loggedBy: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
    take: 10
  });

  return {
    count: incidents.length,
    incidents: incidents.map((i) => ({
      id: i.id,
      type: i.type,
      severity: i.severity,
      description: i.description,
      status: i.status,
      loggedBy: i.loggedBy.name,
      createdAt: i.createdAt
    }))
  };
}

async function listEquipment(projectId: string, category?: string, zone?: string) {
  const whereClause: Record<string, unknown> = { projectId };
  if (category) {
    whereClause.category = category.toUpperCase();
  }
  if (zone) {
    whereClause.zone = zone.toUpperCase();
  }
  const equipment = await prisma.plantEquipment.findMany({
    where: whereClause,
    select: {
      id: true,
      equipmentTag: true,
      name: true,
      category: true,
      status: true,
      condition: true,
      location: true,
      zone: true
    },
    orderBy: { equipmentTag: "asc" }
  });
  return { count: equipment.length, equipment };
}

async function getEquipmentDetails(projectId: string, tagOrName: string) {
  const eq = await prisma.plantEquipment.findFirst({
    where: {
      projectId,
      OR: [
        { equipmentTag: { equals: tagOrName, mode: "insensitive" } },
        { name: { equals: tagOrName, mode: "insensitive" } },
        { equipmentTag: { contains: tagOrName, mode: "insensitive" } },
        { name: { contains: tagOrName, mode: "insensitive" } }
      ]
    },
    include: {
      siteLocation: { select: { name: true, slug: true } },
      maintenanceLogs: {
        orderBy: { createdAt: "desc" },
        take: 5
      },
      documents: true
    }
  });

  if (!eq) {
    return { error: `Equipment "${tagOrName}" not found.` };
  }

  return {
    id: eq.id,
    tag: eq.equipmentTag,
    name: eq.name,
    category: eq.category,
    status: eq.status,
    condition: eq.condition,
    location: eq.location,
    zone: eq.zone,
    siteLocation: eq.siteLocation?.name || null,
    specifications: eq.specifications,
    recentMaintenance: eq.maintenanceLogs.map((l) => ({
      type: l.type,
      description: l.description,
      findings: l.findings,
      actionTaken: l.actionTaken,
      date: l.createdAt
    })),
    documents: eq.documents.map((d) => ({
      name: d.name,
      fileType: d.fileType
    }))
  };
}

async function listKnowledgeArticles(projectId: string) {
  const articles = await prisma.knowledgeArticle.findMany({
    where: { projectId, published: true },
    select: { id: true, title: true, category: true, slug: true },
    orderBy: { category: "asc" }
  });
  return { count: articles.length, articles };
}

async function getKnowledgeArticleContent(projectId: string, titleOrSlug: string) {
  const article = await prisma.knowledgeArticle.findFirst({
    where: {
      projectId,
      published: true,
      OR: [
        { slug: { equals: titleOrSlug, mode: "insensitive" } },
        { title: { equals: titleOrSlug, mode: "insensitive" } },
        { title: { contains: titleOrSlug, mode: "insensitive" } },
        { slug: { contains: titleOrSlug, mode: "insensitive" } }
      ]
    },
    include: { author: { select: { name: true } } }
  });

  if (!article) {
    return { error: `Knowledge article "${titleOrSlug}" not found.` };
  }

  return {
    id: article.id,
    title: article.title,
    slug: article.slug,
    category: article.category,
    author: article.author.name,
    body: article.body.substring(0, 25000)
  };
}

async function getPlantStatusSummary(projectId: string) {
  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      codMilestones: { orderBy: { order: "asc" } }
    }
  });

  const [documentCount, equipmentCount, knowledgeArticleCount, ticketCount, openTickets, activeIncidents] = await Promise.all([
    prisma.document.count({ where: { projectId } }),
    prisma.plantEquipment.count({ where: { projectId } }),
    prisma.knowledgeArticle.count({ where: { projectId, published: true } }),
    prisma.ticket.count({ where: { projectId } }),
    prisma.ticket.count({ where: { projectId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.siteIncident.count({ where: { projectId, status: "ACTIVE" } })
  ]);

  const folders = await prisma.documentFolder.findMany({
    where: { projectId },
    select: { name: true }
  });

  return {
    plantName: project?.name || "Tumauini Hydroelectric Power Plant",
    capacity: `${project?.capacityMw || 11.3} MW`,
    location: project?.location || "Barangay Antagan Uno, Tumauini, Isabela",
    client: "PHILNEW HYDRO POWER CORPORATION (PHPC)",
    clientFullName: "Philnew Hydro Power Corporation",
    clientAcronym: "PHPC",
    contractor: "Sta. Clara International Corporation (SCIC)",
    contractType: "Engineering, Procurement, and Construction (EPC) Turnkey Contract",
    overallProgress: `${project?.percentComplete || 79}%`,
    targetCodDate: project?.targetCodDate || "Q4 2026",
    activeIncidents,
    tickets: {
      total: ticketCount,
      openOrInProgress: openTickets
    },
    equipmentCount,
    documentCount,
    folders: folders.map((f) => f.name),
    knowledgeArticleCount,
    milestones: project?.codMilestones.map((m) => ({
      title: m.title,
      category: m.category,
      status: m.status,
      isCritical: m.isCritical
    }))
  };
}

// ─── Digital Twin Personnel Intelligence ───

function searchPersonnel(query: string) {
  const q = query.toLowerCase().trim();
  const all = Object.values(FILIPINO_PERSONNEL_REGISTRY);
  const isHrQuery = q === "hr" || q === "human resources" || q === "hr department" || q === "hr dept";
  const isAdminQuery = q === "admin" || q === "administration" || q === "admin department" || q === "admin dept";

  // Strip polite honorifics ("sir", "ma'am", "maam") so "Sir Randy" or "Ma'am Rovi" searches find the person
  const cleanQ = q.replace(/^(sir|ma'am|maam|engr\.?|foreman)\s+/i, "").trim();
  const isGeomapperQuery = cleanQ.includes("geomap") || cleanQ.includes("geo mapper");
  const isPollutionControlQuery =
    cleanQ.includes("pollution control") ||
    cleanQ.includes("pollution") ||
    cleanQ.includes("pco") ||
    cleanQ.includes("environmental officer");

  const matches = all.filter((p) => {
    if (isHrQuery) {
      return p.department === "HR" || p.role.toLowerCase().includes("hr");
    }
    if (isAdminQuery) {
      return p.department === "ADMINISTRATION" || p.role.toLowerCase().includes("admin");
    }
    if (isGeomapperQuery) {
      return p.id === "GEO_AMOR_FLORESCA" || p.role.toLowerCase().includes("geomapper");
    }
    if (isPollutionControlQuery) {
      return p.id === "PCO_JONJON_BUCSIT" || p.role.toLowerCase().includes("pollution control");
    }

    return (
      p.name.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(cleanQ) ||
      (p.nickname ? p.nickname.toLowerCase().includes(q) : false) ||
      p.role.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(cleanQ) ||
      p.department.toLowerCase() === q ||
      (q.length >= 3 && p.department.toLowerCase().includes(q)) ||
      p.locationName.toLowerCase().includes(q) ||
      p.currentTask.toLowerCase().includes(q) ||
      p.originProvince.toLowerCase().includes(q) ||
      p.roleDescription.toLowerCase().includes(q) ||
      p.licenseNumber.toLowerCase().includes(q)
    );
  });

  return {
    query,
    count: matches.length,
    personnel: matches.map((p) => {
      const item: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        role: p.role,
        department: p.department,
        location: p.locationName,
        shift: p.shift,
        currentTask: p.currentTask,
        yearsOfExperience: p.yearsOfExp,
        originProvince: p.originProvince,
        licenseNumber: p.licenseNumber,
        avatarUrl: p.avatarUrl
      };
      if (p.nickname && p.nickname.trim().length > 0) {
        item.nickname = p.nickname;
      }
      return item;
    })
  };
}

function listPersonnel(department?: string, location?: string) {
  let all = Object.values(FILIPINO_PERSONNEL_REGISTRY);
  if (department && department.toUpperCase() !== "ALL") {
    const rawDept = department.toUpperCase().trim();
    if (rawDept === "HR" || rawDept === "HUMAN_RESOURCES" || rawDept === "HUMAN RESOURCES") {
      all = all.filter((p) => p.department === "HR");
    } else if (rawDept === "ADMIN" || rawDept === "ADMINISTRATION") {
      all = all.filter((p) => p.department === "ADMINISTRATION");
    } else if (rawDept === "ADMIN_HR" || rawDept === "ADMIN/HR") {
      all = all.filter((p) => p.department === "ADMINISTRATION" || p.department === "HR");
    } else {
      const deptNorm = rawDept.replace(/\s+/g, "_");
      all = all.filter((p) => p.department.toUpperCase() === deptNorm || p.department.toUpperCase().includes(deptNorm));
    }
  }
  if (location && location.toUpperCase() !== "ALL") {
    const locNorm = location.toLowerCase();
    all = all.filter((p) => p.locationName.toLowerCase().includes(locNorm));
  }

  return {
    count: all.length,
    department: department || "All",
    location: location || "All",
    personnel: all.map((p) => {
      const item: Record<string, unknown> = {
        id: p.id,
        name: p.name,
        role: p.role,
        department: p.department,
        location: p.locationName,
        shift: p.shift,
        currentTask: p.currentTask
      };
      if (p.nickname && p.nickname.trim().length > 0) {
        item.nickname = p.nickname;
      }
      return item;
    })
  };
}

function getPersonnelDetails(nameOrId: string) {
  const q = nameOrId.toLowerCase().trim();
  const cleanQ = q.replace(/^(sir|ma'am|maam|engr\.?|foreman)\s+/i, "").trim();
  const all = Object.values(FILIPINO_PERSONNEL_REGISTRY);
  const found = all.find(
    (p) =>
      p.id.toLowerCase() === q ||
      p.name.toLowerCase() === q ||
      p.name.toLowerCase().includes(q) ||
      p.name.toLowerCase().includes(cleanQ) ||
      (p.nickname && p.nickname.toLowerCase() === q) ||
      (p.nickname && p.nickname.toLowerCase().includes(q)) ||
      p.role.toLowerCase().includes(q) ||
      p.role.toLowerCase().includes(cleanQ)
  );

  if (!found) {
    return { error: `Personnel "${nameOrId}" not found in project site registry.` };
  }

  const details: Record<string, unknown> = {
    id: found.id,
    name: found.name,
    role: found.role,
    department: found.department,
    location: found.locationName,
    currentTask: found.currentTask,
    shift: found.shift,
    yearsOfExperience: found.yearsOfExp,
    originProvince: found.originProvince,
    licenseNumber: found.licenseNumber,
    roleDescription: found.roleDescription,
    gear: {
      hardhatColor: found.hardhatColor,
      vestColor: found.vestColor,
    },
    avatarUrl: found.avatarUrl
  };
  if (found.nickname && found.nickname.trim().length > 0) {
    details.nickname = found.nickname;
  }
  return details;
}

async function clearChatHistory(conversationId?: string, userId?: string, projectId?: string) {
  try {
    if (conversationId) {
      await prisma.assistantMessage.deleteMany({
        where: { conversationId }
      });
      await prisma.assistantConversation.delete({
        where: { id: conversationId }
      }).catch(() => {});
    } else if (userId && projectId) {
      await prisma.assistantConversation.deleteMany({
        where: { userId, projectId }
      });
    }
    return {
      success: true,
      cleared: true,
      message: "Chat history has been successfully cleared."
    };
  } catch (err) {
    console.error("Error in clearChatHistory:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}

// ─── Weather & Hydrology Intelligence ───

async function getRiverHydrologyStatus() {
  try {
    const telemetry = await fetchRiverBasinTelemetry();
    const stations = telemetry.stations.map((s) => ({
      name: s.site_name,
      waterLevel: s.value,
      status: s.status_label,
      alertLevel: s.alertLevel,
      observedAt: s.observed_at,
    }));
    const dams = (telemetry.allDams || []).map((d) => ({
      name: d.name,
      waterLevel: `${d.rwl}m`,
      outflow: `${d.outflowCms} m³/s`,
      gatesOpen: d.gatesOpen,
    }));

    return {
      success: true,
      basin: "Pinacanauan de Ilagan River / Cagayan River Basin",
      cagayanStatus: telemetry.cagayanStatus,
      magatSubbasinStatus: telemetry.magatSubbasinStatus,
      stations,
      dams,
      updatedAt: telemetry.updatedAt,
    };
  } catch (err: any) {
    return { error: `Failed to fetch live river hydrology: ${err.message}` };
  }
}

async function getWeatherAndTyphoonAdvisory() {
  try {
    const stormsData = await getMergedStorms();
    const pagasaData = await fetchPagasaSignals().catch(() => null);
    const rainData = await fetchSiteRainForecast().catch(() => null);

    const activeParStorms = stormsData.parStorms.map((s) => ({
      name: s.name,
      category: s.category,
      distanceFromSiteKm: s.distanceKm,
      windSpeedKph: s.windSpeedKph,
      movement: `${s.direction} at ${s.speedKph} km/h`,
      closestApproach: s.closestApproach ? `${s.closestApproach.distanceKm} km in ${s.closestApproach.eta}` : undefined,
    }));

    return {
      success: true,
      siteLocation: "Tumauini HEPP (Barangay Antagan Uno, Isabela)",
      currentRainProbability: rainData ? `${rainData.currentRainProbability}% chance of rain` : "N/A",
      currentPrecipitationRate: rainData ? `${rainData.currentRainMm} mm/hr (${rainData.currentWeatherDescription})` : "N/A",
      siteSafetyImpact: rainData?.currentImpact,
      nextRainExpectedIn: rainData?.nextRainInMinutes ? `${rainData.nextRainInMinutes} minutes` : "None in near term",
      parClear: stormsData.parClear,
      activeStormsInPAR: activeParStorms,
      isabelaSignalLevel: pagasaData?.hasActiveBulletin
        ? `TCWS Signal #${pagasaData.siteSignalNumber} (${pagasaData.tcName} - ${pagasaData.tcCategory})`
        : "No Active Tropical Cyclone Wind Signals in Isabela",
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return { error: `Failed to fetch typhoon and weather advisory: ${err.message}` };
  }
}

async function getRainForecastAndPrecipitationProbability(hoursAhead = 24) {
  try {
    const rain = await fetchSiteRainForecast();
    return {
      success: true,
      siteLocation: rain.siteLocation,
      currentCondition: {
        rainRateMmPerHr: rain.currentRainMm,
        rainProbabilityPercent: rain.currentRainProbability,
        description: rain.currentWeatherDescription,
        temperature: `${rain.temperature}°C`,
        relativeHumidity: `${rain.relativeHumidity}%`,
        windSpeed: `${rain.windSpeedKph} km/h`,
        surfacePressureHpa: `${rain.surfacePressureHpa} hPa`,
        cloudCover: `${rain.cloudCoverPercent}%`,
        siteSafetyImpact: rain.currentImpact.level,
        safetyRecommendation: rain.currentImpact.recommendation,
      },
      shortTermPrediction: {
        nextRainInMinutes: rain.nextRainInMinutes,
        peakRainExpected: `${rain.peakRainMm} mm/hr (around ${rain.peakRainTime})`,
        total24hExpectedMm: `${rain.total24hRainMm} mm`,
      },
      hourlyTimeline: rain.hourlyForecast.slice(0, Math.min(hoursAhead, 24)).map((h) => ({
        time: h.hourLabel,
        rainProbability: `${h.probability}%`,
        precipitationRate: `${h.precipitationMm} mm/hr`,
        condition: h.weatherDescription,
        temperature: `${h.temperature}°C`,
      })),
      timestamp: rain.timestamp,
    };
  } catch (err: any) {
    return { error: `Failed to fetch site rain forecast: ${err.message}` };
  }
}

// ─── Warehouse Inventory & Requisitions ───

async function listInventoryItems(projectId: string, category?: string, lowStockOnly?: boolean) {
  const where: Record<string, unknown> = { projectId };
  if (category && category.toUpperCase() !== "ALL") {
    where.category = { contains: category, mode: "insensitive" };
  }
  const items = await prisma.inventoryItem.findMany({
    where,
    orderBy: { name: "asc" },
  });

  const formatted = items.map((i) => {
    const isLow = i.lowStockThreshold > 0 && i.quantityOnHand <= i.lowStockThreshold;
    return {
      id: i.id,
      name: i.name,
      category: i.category,
      quantityOnHand: `${i.quantityOnHand} ${i.unit}`,
      lowStockThreshold: `${i.lowStockThreshold} ${i.unit}`,
      isLowStock: isLow,
      location: i.location || "Main Warehouse",
      vendor: i.vendor || "N/A",
    };
  });

  const result = lowStockOnly ? formatted.filter((i) => i.isLowStock) : formatted;
  return {
    count: result.length,
    lowStockCount: formatted.filter((i) => i.isLowStock).length,
    items: result,
  };
}

async function getInventoryItemDetails(projectId: string, itemNameOrId: string) {
  const item = await prisma.inventoryItem.findFirst({
    where: {
      projectId,
      OR: [
        { id: itemNameOrId },
        { name: { equals: itemNameOrId, mode: "insensitive" } },
        { name: { contains: itemNameOrId, mode: "insensitive" } },
      ],
    },
    include: {
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        include: { requestedBy: { select: { name: true } } },
      },
    },
  });

  if (!item) return { error: `Inventory item "${itemNameOrId}" not found.` };

  return {
    id: item.id,
    name: item.name,
    category: item.category,
    unit: item.unit,
    quantityOnHand: item.quantityOnHand,
    lowStockThreshold: item.lowStockThreshold,
    isLowStock: item.lowStockThreshold > 0 && item.quantityOnHand <= item.lowStockThreshold,
    location: item.location || "Main Warehouse",
    vendor: item.vendor || "N/A",
    recentTransactions: item.transactions.map((t) => ({
      type: t.type,
      quantity: t.quantity,
      status: t.status,
      purpose: t.purpose,
      requestedBy: t.requestedBy.name,
      date: t.createdAt,
    })),
  };
}

async function createMaterialRequisition(
  projectId: string,
  userId: string | undefined,
  args: { itemNameOrId: string; type?: "ISSUE" | "BORROW"; quantity: number; purpose: string }
) {
  let authorId = userId;
  if (!authorId) {
    const member = await prisma.projectMember.findFirst({ where: { projectId } });
    authorId = member?.userId;
  }
  if (!authorId) {
    const user = await prisma.user.findFirst();
    authorId = user?.id;
  }
  if (!authorId) return { error: "No authenticated user available to create requisition." };

  const item = await prisma.inventoryItem.findFirst({
    where: {
      projectId,
      OR: [
        { id: args.itemNameOrId },
        { name: { equals: args.itemNameOrId, mode: "insensitive" } },
        { name: { contains: args.itemNameOrId, mode: "insensitive" } },
      ],
    },
  });

  if (!item) return { error: `Item "${args.itemNameOrId}" not found in inventory.` };

  const tx = await prisma.inventoryTransaction.create({
    data: {
      projectId,
      itemId: item.id,
      type: args.type || "ISSUE",
      quantity: args.quantity,
      requestedById: authorId,
      purpose: args.purpose,
      status: "PENDING",
    },
  });

  return {
    success: true,
    message: `Material requisition created for ${args.quantity} ${item.unit} of "${item.name}". Status: PENDING WAREHOUSE APPROVAL.`,
    requisitionId: tx.id,
    item: item.name,
    quantity: `${args.quantity} ${item.unit}`,
    purpose: args.purpose,
  };
}

async function listInventoryTransactions(projectId: string, status?: string) {
  const where: Record<string, unknown> = { projectId };
  if (status && status.toUpperCase() !== "ALL") {
    where.status = status.toUpperCase();
  }
  const txs = await prisma.inventoryTransaction.findMany({
    where,
    include: {
      item: { select: { name: true, unit: true } },
      requestedBy: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    count: txs.length,
    transactions: txs.map((t) => ({
      id: t.id,
      item: t.item.name,
      type: t.type,
      quantity: `${t.quantity} ${t.item.unit}`,
      purpose: t.purpose,
      status: t.status,
      requestedBy: t.requestedBy.name,
      createdAt: t.createdAt,
    })),
  };
}

// ─── Daily Shift Logs & Manpower Tracking ───

async function createDailyLog(
  projectId: string,
  userId: string | undefined,
  args: {
    totalHeadcount: number;
    zoneBreakdown?: { Tunnels?: number; Weir?: number; Temfacil?: number; Powerhouse?: number; Switchyard?: number };
    ptws?: { type: string; location: string; team: string; expiry: string; status: string }[];
  }
) {
  let authorId = userId;
  if (!authorId) {
    const member = await prisma.projectMember.findFirst({ where: { projectId } });
    authorId = member?.userId;
  }
  if (!authorId) {
    const user = await prisma.user.findFirst();
    authorId = user?.id;
  }
  if (!authorId) return { error: "No authenticated user available to sign off daily log." };

  const zb = args.zoneBreakdown || {};
  const dailyLog = await prisma.dailyLog.create({
    data: {
      projectId,
      loggedById: authorId,
      logDate: new Date(),
      totalHeadcount: args.totalHeadcount,
      zoneTunnels: zb.Tunnels || 0,
      zoneWeir: zb.Weir || 0,
      zoneTemfacil: zb.Temfacil || 0,
      zonePowerhouse: zb.Powerhouse || 0,
      zoneSwitchyard: zb.Switchyard || 0,
      ptws: args.ptws && args.ptws.length > 0 ? {
        create: args.ptws.map((p) => ({
          type: p.type,
          location: p.location,
          team: p.team,
          expiry: p.expiry,
          status: p.status || "Active",
        }))
      } : undefined,
    },
    include: { ptws: true }
  });

  return {
    success: true,
    message: `End-of-day sign-off submitted successfully. Total headcount: ${dailyLog.totalHeadcount} workers across site zones.`,
    dailyLogId: dailyLog.id,
    headcount: {
      total: dailyLog.totalHeadcount,
      tunnels: dailyLog.zoneTunnels,
      weir: dailyLog.zoneWeir,
      powerhouse: dailyLog.zonePowerhouse,
      switchyard: dailyLog.zoneSwitchyard,
      temfacil: dailyLog.zoneTemfacil,
    },
    ptwsLogged: dailyLog.ptws.length,
  };
}

async function listDailyLogs(projectId: string, take = 5) {
  const logs = await prisma.dailyLog.findMany({
    where: { projectId },
    include: {
      loggedBy: { select: { name: true, email: true } },
      ptws: true,
    },
    orderBy: { logDate: "desc" },
    take,
  });

  return {
    count: logs.length,
    logs: logs.map((l) => ({
      id: l.id,
      date: l.logDate,
      totalHeadcount: l.totalHeadcount,
      loggedBy: l.loggedBy.name || l.loggedBy.email,
      zones: {
        tunnels: l.zoneTunnels,
        weir: l.zoneWeir,
        temfacil: l.zoneTemfacil,
        powerhouse: l.zonePowerhouse,
        switchyard: l.zoneSwitchyard,
      },
      ptwsCount: l.ptws.length,
    })),
  };
}

// ─── Visitor Security Gate Management ───

async function registerVisitor(
  projectId: string,
  userId: string | undefined,
  args: { fullName: string; organization?: string; purpose: string; hostNameOrId?: string; vehicle?: string; idType?: string; idNumber?: string }
) {
  let loggerId = userId;
  if (!loggerId) {
    const user = await prisma.user.findFirst();
    loggerId = user?.id;
  }
  if (!loggerId) return { error: "No user found to log visitor." };

  let hostId = loggerId;
  if (args.hostNameOrId) {
    const hostUser = await prisma.user.findFirst({
      where: {
        OR: [
          { id: args.hostNameOrId },
          { name: { contains: args.hostNameOrId, mode: "insensitive" } },
        ],
      },
    });
    if (hostUser) hostId = hostUser.id;
  }

  const visitor = await prisma.visitor.create({
    data: {
      projectId,
      fullName: args.fullName,
      organization: args.organization || "Site Guest / Inspector",
      purpose: args.purpose,
      hostId,
      loggedById: loggerId,
      vehicle: args.vehicle,
      idType: args.idType || "Government ID",
      idNumber: args.idNumber,
      status: "CHECKED_IN",
    },
    include: { host: { select: { name: true } } },
  });

  return {
    success: true,
    message: `Visitor "${visitor.fullName}" registered and checked in for ${visitor.host.name}. Gate pass active.`,
    visitorId: visitor.id,
    fullName: visitor.fullName,
    organization: visitor.organization,
    purpose: visitor.purpose,
    host: visitor.host.name,
    vehicle: visitor.vehicle || "On Foot",
    timeIn: visitor.timeIn,
  };
}

async function listActiveVisitors(projectId: string) {
  const visitors = await prisma.visitor.findMany({
    where: { projectId, status: "CHECKED_IN" },
    include: { host: { select: { name: true } } },
    orderBy: { timeIn: "desc" },
    take: 15,
  });

  return {
    count: visitors.length,
    visitors: visitors.map((v) => ({
      id: v.id,
      fullName: v.fullName,
      organization: v.organization,
      purpose: v.purpose,
      host: v.host.name,
      vehicle: v.vehicle,
      timeIn: v.timeIn,
      status: v.status,
    })),
  };
}

// ─── Safety Toolbox Talks & COD Milestones ───

function generateToolboxTalk(topic: string, workZone?: string) {
  return {
    title: `5-Minute Safety Toolbox Talk: ${topic.toUpperCase()}`,
    workZone: workZone || "General Site Works / Antagan Uno",
    date: new Date().toLocaleDateString("en-PH", { weekday: "long", year: "numeric", month: "long", day: "numeric" }),
    facilitator: "Alfredo T. Ariz (ESH Head)",
    agenda: [
      { step: "1. Hazard Identification", details: `Review common hazards associated with ${topic} (pinch points, overhead loads, elevated platforms, high voltage, wet surfaces).` },
      { step: "2. Hierarchy of Controls", details: "Ensure engineering controls are verified, barricades are posted, and permits-to-work (PTWs) are signed." },
      { step: "3. Mandatory PPE Verification", details: "Hardhat (Type 1 Class E/G), high-vis vest, safety glasses, steel-toe boots, and task-specific gear (fall harness / arc-flash shield / welding apron)." },
      { step: "4. Emergency Response & Clinic", details: "TEMFACIL Clinic contact: Nurse Russelle Alcantara (Ext. 104). Immediate emergency evacuation route to TEMFACIL assembly ground." }
    ],
    safeManHoursPledge: "Maintaining 1,420,580 Safe Man-Hours LTI-Free at Tumauini HEPP!"
  };
}

async function listCodMilestones(projectId: string, category?: string) {
  const where: Record<string, unknown> = { projectId };
  if (category && category.toUpperCase() !== "ALL") {
    where.category = category.toUpperCase();
  }
  const milestones = await prisma.codMilestone.findMany({
    where,
    orderBy: { order: "asc" },
  });

  return {
    count: milestones.length,
    milestones: milestones.map((m) => ({
      id: m.id,
      title: m.title,
      category: m.category,
      status: m.status,
      targetDate: m.targetDate,
      isCritical: m.isCritical,
      completedAt: m.completedAt,
    })),
  };
}

export function getToolHumanLabel(name: string, args: Record<string, unknown>): string {
  switch (name) {
    case "getRainForecastAndPrecipitationProbability":
      return "Fetching real-time rain probability & precipitation forecast from Open-Meteo...";
    case "getRiverHydrologyStatus":
      return "Accessing Pinacanauan River Basin gauges & telemetry...";
    case "getWeatherAndTyphoonAdvisory":
      return "Checking PAGASA tropical cyclone signals & weather...";
    case "listInventoryItems":
      return args.lowStockOnly ? "Auditing low-stock inventory items..." : "Querying Warehouse inventory catalog...";
    case "getInventoryItemDetails":
      return `Checking stock specs & bin for "${args.itemNameOrId || args.itemName}"...`;
    case "createMaterialRequisition":
      return `Drafting material requisition for ${args.quantity} units of "${args.itemNameOrId}"...`;
    case "listInventoryTransactions":
      return "Fetching warehouse requisitions & stock transfers...";
    case "createDailyLog":
      return `Submitting shift daily log (${args.totalHeadcount} workers across zones)...`;
    case "listDailyLogs":
      return "Retrieving recent end-of-shift daily logs...";
    case "registerVisitor":
      return `Registering site visitor "${args.fullName}" at main gate...`;
    case "listActiveVisitors":
      return "Checking currently logged site visitors at main gate...";
    case "generateToolboxTalk":
      return `Formulating 5-min ESH toolbox talk agenda for "${args.topic}"...`;
    case "listCodMilestones":
      return "Auditing COD Milestones & critical path completion...";
    case "listDocumentFolders":
      return "Exploring Document Center folder hierarchy...";
    case "listDocuments":
      return args.folderName ? `Browsing documents in folder "${args.folderName}"...` : "Browsing project documents...";
    case "searchDocuments":
      return `Searching documents for keyword "${args.query}"...`;
    case "getDocumentDetailsAndFile":
      return `Retrieving file metadata & signed URL for "${args.documentNameOrId}"...`;
    case "createTicket":
      return `Creating operational ticket "${args.title}"...`;
    case "listTickets":
      return "Fetching maintenance & operational tickets...";
    case "updateTicketStatus":
      return `Updating ticket status to ${args.newStatus}...`;
    case "createIncidentReport":
      return `Logging site incident report (${args.severity} severity)...`;
    case "listRecentIncidents":
      return "Retrieving recent safety & security incident reports...";
    case "listEquipment":
      return "Scanning Plant Equipment registry...";
    case "getEquipmentDetails":
      return `Loading technical specifications for "${args.tagOrName}"...`;
    case "getPlantStatusSummary":
      return "Generating operational status summary for Tumauini HEPP...";
    case "searchPersonnel":
      return `Searching personnel registry for "${args.query}"...`;
    case "listPersonnel":
      return "Listing site staff and assigned work zones...";
    case "getPersonnelDetails":
      return `Loading profile for staff member "${args.nameOrId}"...`;
    case "clearChatHistory":
      return "Clearing conversation history and session context...";
    default:
      return `Executing ${name}...`;
  }
}

export function getToolSummary(name: string, result: any): string {
  if (!result || result.error) {
    return result?.error || "Completed with warnings";
  }
  switch (name) {
    case "getRainForecastAndPrecipitationProbability": {
      const cond = result.currentCondition;
      return cond
        ? `Rain chance: ${cond.rainProbabilityPercent}%, Precip: ${cond.rainRateMmPerHr} mm/hr (${cond.siteSafetyImpact})`
        : "Retrieved 24h precipitation timeline";
    }
    case "getRiverHydrologyStatus":
      return `Pinacanauan River status: ${result.cagayanStatus || "Normal"}. Stations: ${result.stations?.length || 0} active`;
    case "getWeatherAndTyphoonAdvisory":
      return result.parClear ? "PAR is Clear (No active cyclones affecting site)" : `Active storms in PAR: ${result.activeStormsInPAR?.length || 0}`;
    case "listInventoryItems":
      return `Found ${result.count} inventory items (${result.lowStockCount} low on stock)`;
    case "getInventoryItemDetails":
      return `Stock: ${result.quantityOnHand} ${result.unit} at ${result.location}`;
    case "createMaterialRequisition":
      return result.message || "Material requisition created (Pending Approval)";
    case "listInventoryTransactions":
      return `Retrieved ${result.count} warehouse transactions`;
    case "createDailyLog":
      return `Daily log recorded: ${result.headcount?.total || 0} workers on site`;
    case "listDailyLogs":
      return `Retrieved ${result.count} daily logs`;
    case "registerVisitor":
      return `Visitor registered: ${result.fullName} (Host: ${result.host})`;
    case "listActiveVisitors":
      return `${result.count} visitors currently on site`;
    case "generateToolboxTalk":
      return `Generated safety briefing for "${result.title}"`;
    case "listCodMilestones":
      return `Loaded ${result.count} milestones for Tumauini HEPP COD`;
    case "listDocuments":
      return `Found ${result.count} documents in ${result.folder || "system"}`;
    case "searchDocuments":
      return `Matched ${result.count} documents for "${result.query}"`;
    case "getDocumentDetailsAndFile":
      return `Retrieved ${result.fileName || "file"} (${result.signedUrl ? "Signed URL ready" : "Details loaded"})`;
    case "createTicket":
      return `Ticket created: "${result.ticket?.title}" (ID: ${result.ticket?.id})`;
    case "createIncidentReport":
      return result.message || "Incident report logged";
    case "searchPersonnel":
      return `Found ${result.count} staff members matching query`;
    case "getPersonnelDetails":
      return `Profile: ${result.name} (${result.role} - ${result.department})`;
    default:
      return "Step completed successfully";
  }
}

export function detectClientAction(
  query: string,
  answer: string,
  executedTools: string[]
): ClientAction | null {
  const q = query.toLowerCase();

  // 3D Digital Twin Navigation Targets
  if (q.includes("turbine hall") || q.includes("powerhouse") || q.includes("turbine unit")) {
    return {
      type: "NAVIGATE_3D",
      target: "turbine-hall",
      url: "/digital-twin?preset=turbine-hall",
      title: "Turbine Hall (Powerhouse)",
      badgeText: "3D Digital Twin",
    };
  }
  if (q.includes("switchyard") || q.includes("transformer yard") || q.includes("gantry")) {
    return {
      type: "NAVIGATE_3D",
      target: "switchyard",
      url: "/digital-twin?preset=switchyard",
      title: "Switchyard & 69kV Gantry",
      badgeText: "3D Digital Twin",
    };
  }
  if (q.includes("headrace") || q.includes("tunnel face") || q.includes("tunnel")) {
    return {
      type: "NAVIGATE_3D",
      target: "headrace-tunnel",
      url: "/digital-twin?preset=headrace-tunnel",
      title: "Headrace Tunnel",
      badgeText: "3D Digital Twin",
    };
  }
  if (q.includes("penstock") || q.includes("tailrace") || q.includes("floodgate")) {
    return {
      type: "NAVIGATE_3D",
      target: "tailrace-floodgate",
      url: "/digital-twin?preset=tailrace-floodgate",
      title: "Penstock & Tailrace Gate",
      badgeText: "3D Digital Twin",
    };
  }
  if (q.includes("temfacil") || q.includes("office") || q.includes("canteen") || q.includes("barracks")) {
    return {
      type: "NAVIGATE_3D",
      target: "temfacil-office",
      url: "/digital-twin?preset=temfacil-office",
      title: "TEMFACIL Executive Office",
      badgeText: "3D Digital Twin",
    };
  }

  // Dashboard Page Modules
  if (
    executedTools.includes("listInventoryItems") ||
    executedTools.includes("createMaterialRequisition") ||
    executedTools.includes("getInventoryItemDetails") ||
    q.includes("warehouse") ||
    q.includes("inventory")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "inventory",
      url: "/dashboard/inventory",
      title: "Warehouse Inventory & Requisitions",
      badgeText: "Warehouse Module",
    };
  }

  if (
    executedTools.includes("registerVisitor") ||
    executedTools.includes("listActiveVisitors") ||
    q.includes("visitor") ||
    q.includes("gate pass")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "visitors",
      url: "/dashboard/visitors",
      title: "Visitor Security Gate Log",
      badgeText: "Security Module",
    };
  }

  if (
    executedTools.includes("createDailyLog") ||
    executedTools.includes("listDailyLogs") ||
    q.includes("daily log") ||
    q.includes("shift log") ||
    q.includes("headcount")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "daily-logs",
      url: "/dashboard/daily-logs",
      title: "Daily Shift Sign-Off & Headcounts",
      badgeText: "Operations Module",
    };
  }

  if (
    executedTools.includes("getRainForecastAndPrecipitationProbability") ||
    executedTools.includes("getRiverHydrologyStatus") ||
    executedTools.includes("getWeatherAndTyphoonAdvisory") ||
    q.includes("weather") ||
    q.includes("rain") ||
    q.includes("forecast") ||
    q.includes("precipitation") ||
    q.includes("typhoon") ||
    q.includes("river")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "weather",
      url: "/dashboard/weather",
      title: "Live Hydrology & Weather Station",
      badgeText: "Weather Module",
    };
  }

  if (
    executedTools.includes("createTicket") ||
    executedTools.includes("listTickets") ||
    q.includes("ticket")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "tickets",
      url: "/dashboard/tickets",
      title: "Operational Tickets",
      badgeText: "Ticket Center",
    };
  }

  if (
    executedTools.includes("createIncidentReport") ||
    executedTools.includes("listRecentIncidents") ||
    q.includes("incident")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "incidents",
      url: "/dashboard/incidents",
      title: "Site Incidents & ESH Log",
      badgeText: "Safety Module",
    };
  }

  if (
    executedTools.includes("listEquipment") ||
    executedTools.includes("getEquipmentDetails") ||
    q.includes("equipment")
  ) {
    return {
      type: "NAVIGATE_PAGE",
      target: "equipment",
      url: "/dashboard/equipment",
      title: "Plant Equipment Registry",
      badgeText: "Asset Management",
    };
  }

  return null;
}

// Master execution router
async function resolveProjectId(projectId?: string): Promise<string> {
  if (projectId) {
    const p = await prisma.project.findUnique({ where: { id: projectId }, select: { id: true } }).catch(() => null);
    if (p) return p.id;
  }
  const first = await prisma.project.findFirst({ select: { id: true } }).catch(() => null);
  return first?.id || projectId || "";
}

async function executeFunction(
  name: string,
  args: Record<string, unknown>,
  projectId: string,
  userId?: string,
  conversationId?: string
): Promise<unknown> {
  console.log(`[AI Assistant Tool] Executing: ${name} with args:`, JSON.stringify(args));
  const pId = await resolveProjectId((args.projectId as string) || projectId);

  switch (name) {
    case "listDocumentFolders":
      return await listDocumentFolders(pId);
    case "listDocuments":
      return await listDocuments(pId, args.folderName as string | undefined);
    case "searchDocuments":
      return await searchDocuments(pId, args.query as string);
    case "getDocumentDetailsAndFile":
      return await getDocumentDetailsAndFile(pId, (args.documentNameOrId || args.documentName) as string);
    case "createTicket":
      return await createTicket(pId, userId, args as { title: string; description: string; priority?: "LOW" | "MEDIUM" | "HIGH" | "URGENT" });
    case "listTickets":
      return await listTickets(pId, args.status as string | undefined, args.priority as string | undefined);
    case "updateTicketStatus":
      return await updateTicketStatus(pId, args.ticketIdOrTitle as string, args.newStatus as "OPEN" | "IN_PROGRESS" | "RESOLVED" | "CLOSED");
    case "createIncidentReport":
      return await createIncidentReport(pId, userId, args as { type: "MEDICAL" | "SECURITY" | "FIRE" | "OTHER"; severity: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"; description: string; personnelInvolved?: string });
    case "listRecentIncidents":
      return await listRecentIncidents(pId);
    case "listEquipment":
      return await listEquipment(pId, args.category as string | undefined, args.zone as string | undefined);
    case "getEquipmentDetails":
      return await getEquipmentDetails(pId, (args.tagOrName || args.equipmentTag) as string);
    case "listKnowledgeArticles":
      return await listKnowledgeArticles(pId);
    case "getKnowledgeArticleContent":
      return await getKnowledgeArticleContent(pId, (args.titleOrSlug || args.slug) as string);
    case "getPlantStatusSummary":
      return await getPlantStatusSummary(pId);
    case "searchPersonnel":
      return searchPersonnel((args.query || args.name || args.role || "") as string);
    case "listPersonnel":
      return listPersonnel(args.department as string | undefined, args.location as string | undefined);
    case "getPersonnelDetails":
      return getPersonnelDetails((args.nameOrId || args.name || args.id || "") as string);
    case "clearChatHistory":
      return await clearChatHistory(conversationId, userId, pId);
    case "getRiverHydrologyStatus":
      return await getRiverHydrologyStatus();
    case "getWeatherAndTyphoonAdvisory":
      return await getWeatherAndTyphoonAdvisory();
    case "getRainForecastAndPrecipitationProbability":
      return await getRainForecastAndPrecipitationProbability((args.hoursAhead as number) || 24);
    case "listInventoryItems":
      return await listInventoryItems(pId, args.category as string | undefined, args.lowStockOnly as boolean | undefined);
    case "getInventoryItemDetails":
      return await getInventoryItemDetails(pId, (args.itemNameOrId || args.itemName) as string);
    case "createMaterialRequisition":
      return await createMaterialRequisition(pId, userId, args as { itemNameOrId: string; type?: "ISSUE" | "BORROW"; quantity: number; purpose: string });
    case "listInventoryTransactions":
      return await listInventoryTransactions(pId, args.status as string | undefined);
    case "createDailyLog":
      return await createDailyLog(pId, userId, args as { totalHeadcount: number; zoneBreakdown?: any; ptws?: any[] });
    case "listDailyLogs":
      return await listDailyLogs(pId, args.take as number | undefined);
    case "registerVisitor":
      return await registerVisitor(pId, userId, args as { fullName: string; organization?: string; purpose: string; hostNameOrId?: string; vehicle?: string; idType?: string; idNumber?: string });
    case "listActiveVisitors":
      return await listActiveVisitors(pId);
    case "generateToolboxTalk":
      return generateToolboxTalk(args.topic as string, args.workZone as string | undefined);
    case "listCodMilestones":
      return await listCodMilestones(pId, args.category as string | undefined);
    default:
      throw new Error(`Function "${name}" is not implemented.`);
  }
}

// ============================================================
// Tool Declarations for Gemini & Groq
// ============================================================

const geminiFunctionDeclarations: FunctionDeclaration[] = [
  {
    name: "listDocumentFolders",
    description: "List all document folders in the Document Center with document counts and parent-child hierarchy.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "listDocuments",
    description: "List documents in the project or inside a specific folder. Returns file names, MIME types, file sizes, and whether they are images. Use this before fetching files.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        folderName: { type: SchemaType.STRING, description: "Folder name to list documents from (e.g. 'Harrold', 'Test', 'Engineering Plans'). Leave empty or 'All' for all documents." }
      },
      required: ["projectId"]
    }
  },
  {
    name: "searchDocuments",
    description: "Search for documents in the project by filename or keyword.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        query: { type: SchemaType.STRING, description: "Search query string" }
      },
      required: ["projectId", "query"]
    }
  },
  {
    name: "getDocumentDetailsAndFile",
    description: "Retrieve document metadata, text content, and a temporary signed URL for viewing, downloading, or embedding images/blueprints. When an image is returned, embed it in your markdown response.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        documentNameOrId: { type: SchemaType.STRING, description: "Name or ID of the document" }
      },
      required: ["projectId", "documentNameOrId"]
    }
  },
  {
    name: "createTicket",
    description: "DO A TASK: Create a maintenance, operational, or safety ticket in Project Nexus.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        title: { type: SchemaType.STRING, description: "Short descriptive title of the ticket issue" },
        description: { type: SchemaType.STRING, description: "Detailed description of the issue or maintenance need" },
        priority: { type: SchemaType.STRING, description: "Priority level: LOW, MEDIUM, HIGH, or URGENT" }
      },
      required: ["projectId", "title", "description"]
    }
  },
  {
    name: "listTickets",
    description: "List project operational/maintenance tickets, optionally filtered by status or priority.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        status: { type: SchemaType.STRING, description: "Optional status filter: OPEN, IN_PROGRESS, RESOLVED, CLOSED, or ALL" },
        priority: { type: SchemaType.STRING, description: "Optional priority filter: LOW, MEDIUM, HIGH, URGENT" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "updateTicketStatus",
    description: "DO A TASK: Update the status of a project ticket (e.g. resolve or close a ticket).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        ticketIdOrTitle: { type: SchemaType.STRING, description: "ID or title of the ticket" },
        newStatus: { type: SchemaType.STRING, description: "New status: OPEN, IN_PROGRESS, RESOLVED, or CLOSED" }
      },
      required: ["projectId", "ticketIdOrTitle", "newStatus"]
    }
  },
  {
    name: "createIncidentReport",
    description: "DO A TASK: Log a new safety, environmental, medical, or security incident report.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        type: { type: SchemaType.STRING, description: "Type: MEDICAL, SECURITY, FIRE, or OTHER" },
        severity: { type: SchemaType.STRING, description: "Severity: LOW, MEDIUM, HIGH, or CRITICAL" },
        description: { type: SchemaType.STRING, description: "Detailed description of what happened" },
        personnelInvolved: { type: SchemaType.STRING, description: "Optional names of personnel involved" }
      },
      required: ["projectId", "type", "severity", "description"]
    }
  },
  {
    name: "listRecentIncidents",
    description: "List recent active or resolved site safety and security incidents.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "listEquipment",
    description: "List plant equipment/assets, optionally filtered by category or plant zone (INTAKE, PENSTOCK, TURBINE_HALL, SWITCHYARD, etc.).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        category: { type: SchemaType.STRING, description: "Optional category: TURBINE, GENERATOR, TRANSFORMER, GATE_VALVE, etc." },
        zone: { type: SchemaType.STRING, description: "Optional zone: INTAKE, PENSTOCK, TURBINE_HALL, SWITCHYARD, TAILRACE, ACCESS_ROAD" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "getEquipmentDetails",
    description: "Retrieve comprehensive technical specifications, condition, maintenance history, and linked documents for specific plant equipment.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        tagOrName: { type: SchemaType.STRING, description: "Equipment tag (e.g. TU-01, GEN-01) or name (e.g. Turbine Unit A)" }
      },
      required: ["projectId", "tagOrName"]
    }
  },
  {
    name: "listKnowledgeArticles",
    description: "List published SOPs, operation manuals, troubleshooting guides, and FAQs in the Knowledge Base.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "getKnowledgeArticleContent",
    description: "Retrieve the full text content of a knowledge article by slug or title.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        titleOrSlug: { type: SchemaType.STRING, description: "Slug or title of the knowledge article" }
      },
      required: ["projectId", "titleOrSlug"]
    }
  },
  {
    name: "getPlantStatusSummary",
    description: "Get a comprehensive operational summary of the Tumauini HEPP project (progress %, capacity, safe man-hours, active tickets, milestones).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "searchPersonnel",
    description: "Search for project site personnel across all departments (Management, Engineering, Civil, Electrical, Safety, Medical, Logistics, QA/QC, IT). Use when asked who holds a role (e.g. Project Manager, Lead Engineer, Nurse) or to find a specific staff member.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        query: { type: SchemaType.STRING, description: "Role, title, name, nickname, or department to search (e.g. 'project manager', 'Romeo Sese', 'nurse', 'Harrold', 'civil foreman')" }
      },
      required: ["query"]
    }
  },
  {
    name: "listPersonnel",
    description: "List project site personnel, optionally filtered by department (MANAGEMENT, CIVIL, ELECTRICAL, SAFETY, LOGISTICS, QA_QC, ENGINEERING, ADMINISTRATION, HR, MEDICAL, IT_SYSTEMS) or work location.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        department: { type: SchemaType.STRING, description: "Optional department filter: MANAGEMENT, CIVIL, ELECTRICAL, SAFETY, LOGISTICS, QA_QC, ENGINEERING, ADMINISTRATION, HR, MEDICAL, IT_SYSTEMS, or ALL" },
        location: { type: SchemaType.STRING, description: "Optional location filter (e.g. 'Project Manager\\'s Office', 'Headrace Tunnel', 'TEMFACIL')" }
      }
    }
  },
  {
    name: "getPersonnelDetails",
    description: "Get full profile details for a specific site personnel including full name, role, license, shift, current task, years of experience, origin province, and location.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        nameOrId: { type: SchemaType.STRING, description: "Personnel name, nickname, or ID (e.g. 'Romeo Sese', 'PM Romy', 'Harrold Salva')" }
      },
      required: ["nameOrId"]
    }
  },
  {
    name: "clearChatHistory",
    description: "DO A TASK: Clear and reset the current chat conversation history when instructed by the user (e.g. 'clear chat', 'clear our chat history', 'reset conversation').",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        confirm: { type: SchemaType.BOOLEAN, description: "Set to true to confirm wiping the chat history" }
      }
    }
  },
  {
    name: "getRiverHydrologyStatus",
    description: "Get real-time Pinacanauan de Ilagan River hydrology telemetry, water levels at upstream/downstream gauging stations, Magat Dam outflow, and Cagayan basin flood warnings.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getWeatherAndTyphoonAdvisory",
    description: "Get current site weather, active PAGASA Tropical Cyclone Wind Signals (TCWS) for Isabela, and tracking for storms inside the Philippine Area of Responsibility (PAR).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {}
    }
  },
  {
    name: "getRainForecastAndPrecipitationProbability",
    description: "Get real-time precipitation rates, quantitative rain probability percentage (0-100%), 24-hour hourly rain timeline, next expected rain window, and site safety impact for Tumauini HEPP. ALWAYS use this when asked about rain chance, precipitation probability, or weather forecast.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        hoursAhead: { type: SchemaType.NUMBER, description: "Number of hours ahead to forecast (default 24)" }
      }
    }
  },
  {
    name: "listInventoryItems",
    description: "List warehouse materials and spare parts in stock, with quantities on hand, bin locations, and low-stock indicators.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        category: { type: SchemaType.STRING, description: "Optional category filter (e.g. ELECTRICAL, MECHANICAL, CONSUMABLES, SAFETY, CIVIL)" },
        lowStockOnly: { type: SchemaType.BOOLEAN, description: "Set to true to only view items below their minimum reorder threshold" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "getInventoryItemDetails",
    description: "Get full item specification, bin location, vendor, threshold, and recent issue/borrow transactions for a warehouse inventory item.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        itemNameOrId: { type: SchemaType.STRING, description: "Name or ID of the inventory item (e.g. 'Turbine Lube Oil ISO VG 46', 'Welding Electrodes')" }
      },
      required: ["projectId", "itemNameOrId"]
    }
  },
  {
    name: "createMaterialRequisition",
    description: "DO A TASK: Submit a material or tool requisition to the warehouse for issuance or borrowing.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        itemNameOrId: { type: SchemaType.STRING, description: "Item name or ID" },
        type: { type: SchemaType.STRING, description: "Transaction type: 'ISSUE' (consumables) or 'BORROW' (tools/equipment)" },
        quantity: { type: SchemaType.NUMBER, description: "Quantity requested" },
        purpose: { type: SchemaType.STRING, description: "Work purpose or target location (e.g. 'Turbine bearing maintenance in Powerhouse')" }
      },
      required: ["projectId", "itemNameOrId", "quantity", "purpose"]
    }
  },
  {
    name: "listInventoryTransactions",
    description: "List recent warehouse material issuance, borrow, and return transactions, optionally filtered by status (PENDING, APPROVED, ISSUED, RETURNED).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        status: { type: SchemaType.STRING, description: "Optional status: PENDING, APPROVED, ISSUED, RETURNED, or ALL" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "createDailyLog",
    description: "DO A TASK: Submit an end-of-shift daily log recording total site manpower headcount, zone breakdown (Powerhouse, Tunnel, Switchyard, Weir, TEMFACIL), and permits to work (PTW).",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        totalHeadcount: { type: SchemaType.NUMBER, description: "Total manpower headcount on site today" },
        zoneBreakdown: { type: SchemaType.OBJECT, description: "Optional breakdown of manpower per zone", properties: {} }
      },
      required: ["projectId", "totalHeadcount"]
    }
  },
  {
    name: "listDailyLogs",
    description: "List recent shift daily logs, headcounts, weather notes, and signed-off work activities.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        take: { type: SchemaType.NUMBER, description: "Number of logs to retrieve (default 5)" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "registerVisitor",
    description: "DO A TASK: Pre-register or log a visitor arriving at the main security gate.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        fullName: { type: SchemaType.STRING, description: "Full name of the visitor" },
        organization: { type: SchemaType.STRING, description: "Organization, company, or government agency (e.g. 'NIA Isabela', 'DOE', 'Siemens')" },
        purpose: { type: SchemaType.STRING, description: "Purpose of site visit" },
        hostNameOrId: { type: SchemaType.STRING, description: "Name of the host personnel (e.g. 'Engr. Romeo Sese')" },
        vehicle: { type: SchemaType.STRING, description: "Vehicle model & plate number if applicable" },
        idType: { type: SchemaType.STRING, description: "ID presented (e.g. Driver's License, PRC, Passport)" },
        idNumber: { type: SchemaType.STRING, description: "ID Number" }
      },
      required: ["projectId", "fullName", "purpose"]
    }
  },
  {
    name: "listActiveVisitors",
    description: "List all visitors currently checked in on the project site.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" }
      },
      required: ["projectId"]
    }
  },
  {
    name: "generateToolboxTalk",
    description: "Generate an OSHA/DOLE-compliant 5-minute pre-work Safety Toolbox Talk for morning briefings.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        topic: { type: SchemaType.STRING, description: "Safety topic (e.g. 'Working at Heights in Surge Shaft', 'Penstock Confined Space Entry', 'Excavation & Shoring', 'Electrical Lockout Tagout')" },
        workZone: { type: SchemaType.STRING, description: "Optional work zone (e.g. 'Powerhouse', 'Headrace Tunnel', 'Switchyard')" }
      },
      required: ["topic"]
    }
  },
  {
    name: "listCodMilestones",
    description: "List critical path Commercial Operation Date (COD Q4 2026) milestones, grid compliance, wet commissioning, and civil completions.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        projectId: { type: SchemaType.STRING, description: "The project ID" },
        category: { type: SchemaType.STRING, description: "Optional category filter: CIVIL, ELECTRO_MECHANICAL, GRID, COMMISSIONING, or REGULATORY" }
      },
      required: ["projectId"]
    }
  }
];

const groqTools: Groq.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "listDocumentFolders",
      description: "List all document folders in the Document Center with document counts and parent-child hierarchy.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listDocuments",
      description: "List documents in the project or inside a specific folder. Returns file names, MIME types, file sizes, and whether they are images.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          folderName: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchDocuments",
      description: "Search for documents in the project by filename or keyword.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          query: { type: "string" }
        },
        required: ["projectId", "query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getDocumentDetailsAndFile",
      description: "Retrieve document metadata, text content, and a temporary signed URL for viewing, downloading, or embedding images.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          documentNameOrId: { type: "string" }
        },
        required: ["projectId", "documentNameOrId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createTicket",
      description: "DO A TASK: Create a maintenance, operational, or safety ticket.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          title: { type: "string" },
          description: { type: "string" },
          priority: { type: "string" }
        },
        required: ["projectId", "title", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listTickets",
      description: "List project operational/maintenance tickets.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          status: { type: "string" },
          priority: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "updateTicketStatus",
      description: "Update the status of a project ticket.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          ticketIdOrTitle: { type: "string" },
          newStatus: { type: "string" }
        },
        required: ["projectId", "ticketIdOrTitle", "newStatus"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createIncidentReport",
      description: "DO A TASK: Log a new safety or security incident report.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          type: { type: "string" },
          severity: { type: "string" },
          description: { type: "string" },
          personnelInvolved: { type: "string" }
        },
        required: ["projectId", "type", "severity", "description"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listRecentIncidents",
      description: "List recent site incidents.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listEquipment",
      description: "List plant equipment/assets.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          category: { type: "string" },
          zone: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getEquipmentDetails",
      description: "Retrieve comprehensive specifications and maintenance history for plant equipment.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          tagOrName: { type: "string" }
        },
        required: ["projectId", "tagOrName"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listKnowledgeArticles",
      description: "List published SOPs and knowledge base articles.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getKnowledgeArticleContent",
      description: "Retrieve the full text content of a knowledge article by slug or title.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          titleOrSlug: { type: "string" }
        },
        required: ["projectId", "titleOrSlug"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getPlantStatusSummary",
      description: "Get a comprehensive operational summary of the Tumauini HEPP project.",
      parameters: {
        type: "object",
        properties: { projectId: { type: "string" } },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "searchPersonnel",
      description: "Search for project site personnel across all departments (Management, Engineering, Civil, Electrical, Safety, Medical, Logistics, QA/QC, IT). Use when asked who holds a role or to find staff.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Role, title, name, nickname, or department to search" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listPersonnel",
      description: "List project site personnel, optionally filtered by department (MANAGEMENT, CIVIL, ELECTRICAL, SAFETY, LOGISTICS, QA_QC, ENGINEERING, ADMINISTRATION, HR, MEDICAL, IT_SYSTEMS) or work location.",
      parameters: {
        type: "object",
        properties: {
          department: { type: "string", description: "Department filter: MANAGEMENT, CIVIL, ELECTRICAL, SAFETY, LOGISTICS, QA_QC, ENGINEERING, ADMINISTRATION, HR, MEDICAL, IT_SYSTEMS, or ALL" },
          location: { type: "string" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getPersonnelDetails",
      description: "Get full profile details for a specific site personnel including full name, role, license, shift, current task, years of experience, and location.",
      parameters: {
        type: "object",
        properties: {
          nameOrId: { type: "string" }
        },
        required: ["nameOrId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "clearChatHistory",
      description: "DO A TASK: Clear and reset the current chat conversation history when instructed by the user.",
      parameters: {
        type: "object",
        properties: {
          confirm: { type: "boolean", description: "Set to true to confirm wiping the chat history" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRiverHydrologyStatus",
      description: "Get real-time Pinacanauan de Ilagan River hydrology telemetry, water levels at upstream/downstream gauging stations, Magat Dam outflow, and Cagayan basin flood warnings.",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getWeatherAndTyphoonAdvisory",
      description: "Get current site weather, active PAGASA Tropical Cyclone Wind Signals (TCWS) for Isabela, and tracking for storms inside the Philippine Area of Responsibility (PAR).",
      parameters: {
        type: "object",
        properties: {}
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getRainForecastAndPrecipitationProbability",
      description: "Get real-time precipitation rates, quantitative rain probability percentage (0-100%), 24-hour hourly rain timeline, next expected rain window, and site safety impact for Tumauini HEPP. ALWAYS use this when asked about rain chance, precipitation probability, or weather forecast.",
      parameters: {
        type: "object",
        properties: {
          hoursAhead: { type: "number", description: "Number of hours ahead to forecast (default 24)" }
        }
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listInventoryItems",
      description: "List warehouse materials and spare parts in stock, with quantities on hand, bin locations, and low-stock indicators.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          category: { type: "string" },
          lowStockOnly: { type: "boolean" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "getInventoryItemDetails",
      description: "Get full item specification, bin location, vendor, threshold, and recent issue/borrow transactions for a warehouse inventory item.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          itemNameOrId: { type: "string" }
        },
        required: ["projectId", "itemNameOrId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createMaterialRequisition",
      description: "DO A TASK: Submit a material or tool requisition to the warehouse for issuance or borrowing.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          itemNameOrId: { type: "string" },
          type: { type: "string" },
          quantity: { type: "number" },
          purpose: { type: "string" }
        },
        required: ["projectId", "itemNameOrId", "quantity", "purpose"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listInventoryTransactions",
      description: "List recent warehouse material issuance, borrow, and return transactions, optionally filtered by status (PENDING, APPROVED, ISSUED, RETURNED).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          status: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "createDailyLog",
      description: "DO A TASK: Submit an end-of-shift daily log recording total site manpower headcount, zone breakdown (Powerhouse, Tunnel, Switchyard, Weir, TEMFACIL), and permits to work (PTW).",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          totalHeadcount: { type: "number" },
          zoneBreakdown: { type: "object" }
        },
        required: ["projectId", "totalHeadcount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listDailyLogs",
      description: "List recent shift daily logs, headcounts, weather notes, and signed-off work activities.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          take: { type: "number" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "registerVisitor",
      description: "DO A TASK: Pre-register or log a visitor arriving at the main security gate.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          fullName: { type: "string" },
          organization: { type: "string" },
          purpose: { type: "string" },
          hostNameOrId: { type: "string" },
          vehicle: { type: "string" },
          idType: { type: "string" },
          idNumber: { type: "string" }
        },
        required: ["projectId", "fullName", "purpose"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listActiveVisitors",
      description: "List all visitors currently checked in on the project site.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "generateToolboxTalk",
      description: "Generate an OSHA/DOLE-compliant 5-minute pre-work Safety Toolbox Talk for morning briefings.",
      parameters: {
        type: "object",
        properties: {
          topic: { type: "string" },
          workZone: { type: "string" }
        },
        required: ["topic"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "listCodMilestones",
      description: "List critical path Commercial Operation Date (COD Q4 2026) milestones, grid compliance, wet commissioning, and civil completions.",
      parameters: {
        type: "object",
        properties: {
          projectId: { type: "string" },
          category: { type: "string" }
        },
        required: ["projectId"]
      }
    }
  }
];

function buildSystemInstruction(projectId: string): string {
  return `You are the SCIC Nexus Intelligent Grounded AI Assistant for the Tumauini Hydroelectric Power Plant project (11.3 MW Run-of-River HEPP in Barangay Antagan Uno, Tumauini, Isabela).
The active projectId is "${projectId}".

Project Identity, Client & EPC Structure:
- PROJECT NAME: Tumauini Hydroelectric Power Plant (THEPP) — 11.3 MW Clean Run-of-River Hydroelectric Project
- LOCATION: Barangay Antagan Uno, Tumauini, Isabela, Philippines
- CLIENT / PROJECT OWNER / DEVELOPER: PHILNEW HYDRO POWER CORPORATION (PHPC)
  * CRITICAL: When the user asks "who is our client", "who is the project owner", "who is the employer", "who owns the plant", "who is the developer", or "who is PHPC", ALWAYS state clearly and authoritatively that PHILNEW HYDRO POWER CORPORATION (PHPC) is our client and the project owner.
- EPC CONTRACTOR: Sta. Clara International Corporation (SCIC)
  * Sta. Clara International Corporation (SCIC) is the primary turnkey Engineering, Procurement, and Construction (EPC) contractor executing civil works, hydraulic tunnel excavation, powerhouse construction, electro-mechanical installations, and commissioning for the client, Philnew Hydro Power Corporation (PHPC).
- CONTRACT STRUCTURE: SCIC executes the project under an EPC Turnkey Contract with Philnew Hydro Power Corporation (PHPC). Progress billings, milestone sign-offs, accomplishment reports, quality assurance, and Commercial Operation Date (COD) targets (Q4 2026) are directly coordinated with and submitted to PHPC.

Project Site Organization & Leadership:
- Resident Project Manager (In-Charge of Whole Tumauini HEPP): Engr. Romeo Sese ("PM Romy") • Office: Project Manager's Office (26 yrs exp, PRC Civil Eng. #0048291, APEC Engineer)
- Deputy Project Manager: Nathaniel P. Principe ("Deputy Nath") • Office: Deputy PM Office, Main TEMFACIL Executive Wing (22 yrs exp, PRC Civil Eng. #0051280, PMP)
- Lead Technical & Project Engineering Head: Engr. Noel G. Lavapie ("Engr. Noel") • Office: Main Technical & Project Engineering Office
- QA/QC Engineering Head: Engr. Elgine Mangcupang ("Engr. Elgine") • Lab: Site QA/QC Materials Testing Lab & Technical Office
- Environmental, Safety & Health (ESH) Head: Alfredo T. Ariz ("Sir Ariz") • ESH Command & Safety Operations Center
- Administration Department (Separate Department from HR):
  * Admin Officer: Joshua • Office: Main TEMFACIL Administration Office. Leads general site administration, office management, gate pass authorizations, and administrative logistics. (Note: He has no nickname; "Sir Joshua" is a professional honorific).
  * Admin Assistant: Randy Gamboa • Office: Main TEMFACIL Administration Office. Serves as the Admin Assistant supporting Admin Officer Joshua with site administration, office records, supplies, and documentation. (Note: He has no nickname; "Sir Randy" is a professional workplace honorific, NOT a nickname).
- Human Resources (HR) Department (Separate Department from Administration):
  * HR Officer (Head/Lead of HR Department): Rovigail Joy G. Abellar • Office: Main TEMFACIL Human Resources Office. Leads the HR department, managing site timekeeping, payroll administration, employee relations, recruitment, onboarding, and DOLE labor standards compliance. (Note: She has no nickname; "Ma'am Rovi" is a professional workplace honorific, NOT a nickname).
- Project Nurse & Medical Clinic: Russelle P. Alcantara, RN ("Nurse Russelle") • TEMFACIL Site Medical Clinic & Emergency First Aid Station
- IT Systems & Telemetry Support: Harrold Salva ("Harrold") • IT Operations & Telemetry Server Room
- Pollution Control Officer (PCO): Jon-Jon Bucsit • Office: TEMFACIL ESH Command & Environmental Operations Center. Serves as our DENR-EMB accredited Pollution Control Officer under the ESH Department. Leads site environmental compliance, Pinacanauan river water quality and turbidity testing, sedimentation basin controls, hazardous waste management, and statutory SMR/CMR reporting. (Note: He has no nickname; "Sir Jon-Jon" is a professional workplace honorific).
- Geomapper: Amor Floresca • Station: Mountain Slope Rock Cut (Geotechnical & Geomapper Station) / Technical Office. Serves as our designated Geomapper and Engineering Geologist, performing geological mapping, rock mass rating (RMR), tunnel face geological logging, discontinuity surveys, and terrain mapping. (Note: He has no nickname; "Sir Amor" is a professional workplace honorific).
- Document Controller: Jayson Z. Aggabao ("Sir Jayson") • Main Technical Office (Document Control)
- Total Project Personnel: 36 active site personnel across Management, Engineering, QA/QC, Civil Works, Electrical, Safety, Logistics, Medical, Administration, and HR.
- For finding any specific staff, checking shifts, licenses, contact details, or assigned locations, use the 'searchPersonnel', 'listPersonnel', or 'getPersonnelDetails' tools!

Capabilities & Guidelines:
1. Critical Anti-Hallucination & Context Relevance:
   - You must ONLY reference or cite a retrieved document chunk if it is DIRECTLY RELEVANT to the user's explicit question.
   - If a retrieved document chunk discusses an unrelated subject (for example, if the retrieved document is about "Emergency Stop Procedures for Turbine Unit A" or "Intake Control", but the user asked about weather, rain, inventory, visitors, or headcount), you must DISREGARD that chunk completely.
   - NEVER invent, inject, or display emergency shutdown steps when the user is discussing weather, rain, inventory, visitors, or general site topics!
2. Conversational Continuity & Short Follow-ups:
   - When the user gives short follow-up affirmations (e.g. "do it", "yes", "proceed", "pull it", "show me", "check that"), ALWAYS examine the immediately preceding assistant message to understand what action or data was promised or offered.
   - For example, if you previously offered to pull a detailed 24-hour meteorological rain probability forecast and the user replies "do it", call 'getRainForecastAndPrecipitationProbability' and deliver the 24-hour forecast immediately. Never switch to an unrelated emergency procedure!
3. Quantitative Weather & Rain Forecast Handling:
   - When asked about rain chance, precipitation probability, or weather at the project site, ALWAYS call 'getRainForecastAndPrecipitationProbability' or 'getWeatherAndTyphoonAdvisory'.
   - Report the exact quantitative probability (e.g. "27% chance of rain right now"), the current rain rate (mm/hr), current condition (e.g. "Light drizzle", "Clear sky"), and the site safety classification (CLEAR, LIGHT, MODERATE, HEAVY).
4. Grounded Citations: Cite sources in brackets like [Source 1], [Source 2] only when referencing facts directly from relevant documents or knowledge base articles.
5. Proactive Tool Usage & Tasks:
   - When asked about personnel, site leadership, engineers, or foremen (e.g. "who is currently our project manager", "who is the nurse", "who is our admin assistant", "who leads HR"), answer accurately using your site knowledge or by calling 'searchPersonnel' / 'getPersonnelDetails'. Provide their full name, official title, PRC license (if applicable), assigned site location, and current responsibilities.
   - When the user asks to view, fetch, or find files, photos, or images in a folder or system (e.g. "fetch me the image inside the folder 'Harrold'"), DO NOT hesitate or ask permission. Call 'listDocuments' with the folder name, find the file, and call 'getDocumentDetailsAndFile' to retrieve the signed URL and file details.
   - When an image is returned, ALWAYS embed it directly using standard Markdown syntax: ![fileName](signedUrl) so that the user sees the preview immediately in chat, along with file metadata and download link.
   - You can execute cross-system tasks directly across all Project Nexus modules:
     * Hydrology & Weather: Call 'getRainForecastAndPrecipitationProbability' for rain chance & 24h timeline, 'getRiverHydrologyStatus' for river discharge and water levels, or 'getWeatherAndTyphoonAdvisory' for PAGASA storm tracks.
     * Warehouse Inventory: Call 'listInventoryItems' to check spare parts and oil, 'getInventoryItemDetails' for bin specs, or 'createMaterialRequisition' to submit a requisition.
     * Daily Shift Logs: Call 'createDailyLog' to record headcount and PTWs or 'listDailyLogs' to review past shifts.
     * Visitor Gate Security: Call 'registerVisitor' to log incoming guests, NIA/DOE officials, and vehicles, or 'listActiveVisitors' for currently on-site guests.
     * Safety & ESH: Call 'generateToolboxTalk' for DOLE/OSHA compliant 5-minute pre-work hazard briefings, or 'createIncidentReport' / 'listRecentIncidents'.
     * Project COD Milestones: Call 'listCodMilestones' to track progress towards Q4 2026 COD targets.
     * Plant Maintenance: Call 'createTicket', 'listTickets', 'updateTicketStatus', 'listEquipment', and 'getEquipmentDetails'.
     * 3D Digital Twin: When the user asks to see or fly to a location (Turbine Hall, Switchyard, Headrace Tunnel, Tailrace, TEMFACIL), provide clear guidance on the zone.
   - You can clear chat history when requested by calling 'clearChatHistory'.
6. Strict Department Segregation & Professional Workplace Addressing:
   - CRITICAL: Administration and Human Resources (HR) are TWO SEPARATE DEPARTMENTS. NEVER combine them into "ADMIN/HR".
   - Administration Department: Joshua is the Admin Officer (department head), and Randy Gamboa is the Admin Assistant. When the user asks "who is our admin assistant", the answer is Randy Gamboa. When asked "who is the admin officer", the answer is Joshua.
   - Human Resources (HR) Department: Rovigail Joy G. Abellar is the HR Officer who leads the HR department.
   - NO NICKNAMES FOR ADMIN/HR STAFF: Randy Gamboa, Joshua, and Rovigail Joy G. Abellar DO NOT have nicknames. Never include a "Nickname" row in tables or claim their nickname is "Sir Randy", "Sir Josh", or "Ma'am Rovi". "Sir" and "Ma'am" are professional workplace honorifics used to respectfully address colleagues in a professional setting, NOT nicknames.
   - When asked about administrative personnel or admin support, reference ONLY the Administration Department. When asked about HR personnel, reference ONLY the Human Resources Department.
7. Specific Technical Personnel Roles:
   - Geomapper: Amor Floresca is our designated Geomapper (Geological Mapper & Engineering Geologist). When asked "who is our geomapper", "what role does Amor Floresca have", or "who is the geomapper", ALWAYS identify Amor Floresca as our Geomapper. Never say there is no geomapper.
   - Pollution Control Officer: Jon-Jon Bucsit is our designated Pollution Control Officer (PCO under ESH/Environmental). When asked "who is our pollution control officer", "who is the pollution control officer", "who is the PCO", or "what role does Jon-Jon Bucsit have", ALWAYS identify Jon-Jon Bucsit as our Pollution Control Officer. Note: His official role is Pollution Control Officer (environmental/DENR compliance), NOT project control officer.
8. Formatting: Format your answers in structured, clean Markdown with bullet points, bold headers, and tables where applicable.
9. General Knowledge: Answer engineering, mathematical, electrical, hydrological, and general knowledge questions intelligently and thoroughly.`;
}

/**
 * Contextualizes follow-up or ambiguous queries against conversation history
 * so that vector search and tool calling receive complete, standalone intents.
 */
export async function contextualizeQuery(
  query: string,
  history: Array<{ role: string; content: string }>
): Promise<string> {
  if (!history || history.length === 0) return query;

  const trimmed = query.trim();
  const isShortFollowUp =
    trimmed.length < 40 ||
    /^(do it|yes|proceed|sure|go ahead|okay|ok|yep|yup|why|how|when|where|who|tell me more|show me|show it|pull it|check that|check it|what about|how about|is it|can you|more details|execute)/i.test(trimmed);

  if (!isShortFollowUp) {
    return query;
  }

  const apiKey = process.env.CEREBRAS_API_KEY || process.env.GROQ_API_KEY;
  if (!apiKey) return query;

  try {
    const isCerebras = !!process.env.CEREBRAS_API_KEY;
    const url = isCerebras
      ? "https://api.cerebras.ai/v1/chat/completions"
      : "https://api.groq.com/openai/v1/chat/completions";
    const model = isCerebras ? "gpt-oss-120b" : "openai/gpt-oss-120b";

    const prompt = `You are an expert query contextualizer for a construction and hydroelectric plant AI assistant.
Given the previous chat conversation and the user's latest follow-up input, rewrite the user's follow-up input into a complete, standalone question or task request that resolves all pronouns (it, that, them) and implied actions.
Rules:
1. Do NOT answer the question.
2. Do NOT add conversational fluff.
3. Output ONLY the rewritten standalone query.
4. If the query is already self-contained, output it unchanged.`;

    const recentHistory = history.slice(-4).map((m) => ({
      role: m.role.toLowerCase() === "assistant" ? "assistant" : "user",
      content: m.content.slice(0, 400),
    }));

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: "system", content: prompt },
          ...recentHistory,
          { role: "user", content: `Follow-up query: "${query}"\nRewritten standalone query:` }
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
    });

    if (!res.ok) return query;
    const data = await res.json();
    const rewritten = data.choices?.[0]?.message?.content?.trim();
    if (rewritten && rewritten.length > 3) {
      console.log(`[Query Contextualizer] "${query}" -> "${rewritten}"`);
      return rewritten;
    }
  } catch (err) {
    console.warn("[Query Contextualizer Warning]:", err);
  }

  return query;
}

// Helper to extract citation references from answer text
function extractCitations(answerText: string, chunks: SearchResultChunk[]): Citation[] {
  const citationIndices = new Set<number>();
  const citationRegex = /\[Source\s+(\d+)\]/gi;
  let match;
  while ((match = citationRegex.exec(answerText)) !== null) {
    const indexVal = parseInt(match[1], 10) - 1;
    if (indexVal >= 0 && indexVal < chunks.length) {
      citationIndices.add(indexVal);
    }
  }

  return Array.from(citationIndices).map((indexVal) => {
    const chunk = chunks[indexVal];
    return {
      sourceId: chunk.sourceId,
      sourceName: chunk.sourceName,
      sourceType: chunk.sourceType,
      excerpt: chunk.content.length > 200 ? `${chunk.content.substring(0, 197)}...` : chunk.content,
    };
  });
}

// ============================================================
// ENGINE 1: Cerebras Wafer-Scale Engine (Lightning Fast 104ms)
// ============================================================

async function generateWithCerebras(
  query: string,
  chunks: SearchResultChunk[],
  conversationHistory: { role: string; content: string }[],
  projectId: string,
  userId?: string,
  conversationId?: string,
  onToolEvent?: (event: ToolStreamEvent) => void
): Promise<{ answer: string; citations: Citation[]; clearChat?: boolean; executedTools: string[] }> {
  const apiKey = process.env.CEREBRAS_API_KEY;
  if (!apiKey) {
    throw new Error("CEREBRAS_API_KEY not configured.");
  }

  const messages: any[] = [
    { role: "system", content: buildSystemInstruction(projectId) }
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.role.toLowerCase() === "user" ? "user" : "assistant",
        content: msg.content
      });
    });
  }

  let contextText = "Provided Project Grounding Sources:\n\n";
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      contextText += `[Source ${index + 1}]: Name: "${chunk.sourceName}" (Type: ${chunk.sourceType})\n`;
      contextText += `Content:\n${chunk.content}\n\n`;
    });
  } else {
    contextText += "(No semantic document chunks initially retrieved. Use agentic tools if needed to explore files, tickets, equipment, or telemetry.)\n\n";
  }

  messages.push({
    role: "user",
    content: `${contextText}User Question: ${query}\n\nAnswer:`
  });

  const modelToUse = "gpt-oss-120b";
  const executedTools: string[] = [];
  let clearChatTriggered = false;
  let loopCount = 0;

  let res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: modelToUse,
      messages,
      tools: groqTools,
      tool_choice: "auto",
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Cerebras API error ${res.status}: ${errText}`);
  }

  let data = await res.json();
  let message = data.choices[0]?.message;
  let toolCalls = message?.tool_calls;

  while (toolCalls && toolCalls.length > 0 && loopCount < 5) {
    loopCount++;
    messages.push(message);

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;
      let args: Record<string, unknown> = {};
      try {
        args = typeof argsString === "string" ? JSON.parse(argsString) : argsString;
      } catch (parseError) {
        console.error(`Error parsing JSON args for Cerebras tool ${name}:`, parseError);
      }

      executedTools.push(name);
      const startMs = Date.now();
      const humanLabel = getToolHumanLabel(name, args);

      onToolEvent?.({
        type: "step_start",
        tool: name,
        label: humanLabel,
      });

      let fnResult: any;
      try {
        fnResult = await executeFunction(name, args, projectId, userId, conversationId);
        if (name === "clearChatHistory") {
          clearChatTriggered = true;
        }
      } catch (e) {
        console.error(`Error executing tool function ${name}:`, e);
        fnResult = { error: e instanceof Error ? e.message : String(e) };
      }

      const elapsedMs = Date.now() - startMs;
      const summary = getToolSummary(name, fnResult);

      onToolEvent?.({
        type: "step_complete",
        tool: name,
        label: humanLabel,
        summary,
        elapsedMs,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(fnResult),
      });
    }

    res = await fetch("https://api.cerebras.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: modelToUse,
        messages,
        tools: groqTools,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Cerebras API loop error ${res.status}: ${errText}`);
    }

    data = await res.json();
    message = data.choices[0]?.message;
    toolCalls = message?.tool_calls;
  }

  const answerText = message?.content || "I apologize, I could not formulate an answer.";
  const citations = extractCitations(answerText, chunks);

  return {
    answer: answerText,
    citations,
    clearChat: clearChatTriggered,
    executedTools,
  };
}

// ============================================================
// ENGINE 2: Google Gemini (Deep Grounding & Vision Cascade)
// ============================================================

async function generateWithGemini(
  query: string,
  chunks: SearchResultChunk[],
  conversationHistory: { role: string; content: string }[],
  projectId: string,
  userId?: string,
  conversationId?: string,
  onToolEvent?: (event: ToolStreamEvent) => void
): Promise<{ answer: string; citations: Citation[]; clearChat?: boolean; executedTools: string[] }> {
  const apiKey = process.env.GOOGLE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("GOOGLE_AI_API_KEY not configured.");
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  // Multi-tier model cascade for highest availability
  const geminiModels = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-1.5-flash"];
  let lastError: any = null;

  // Build grounding context
  let contextText = "Provided Project Grounding Sources:\n\n";
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      contextText += `[Source ${index + 1}]: Name: "${chunk.sourceName}" (Type: ${chunk.sourceType})\n`;
      contextText += `Content:\n${chunk.content}\n\n`;
    });
  } else {
    contextText += "(No semantic document chunks initially retrieved. Use agentic tools if needed to explore files, tickets, equipment, or telemetry.)\n\n";
  }

  const historyForGemini = conversationHistory.slice(-10).map((msg) => ({
    role: msg.role.toLowerCase() === "user" ? "user" : "model",
    parts: [{ text: msg.content }]
  }));

  for (const modelName of geminiModels) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelName,
        systemInstruction: buildSystemInstruction(projectId),
        tools: [{ functionDeclarations: geminiFunctionDeclarations }]
      });

      const chat = model.startChat({
        history: historyForGemini
      });

      const promptContent = `${contextText}User Question: ${query}`;
      let response = await chat.sendMessage(promptContent);

      let loopCount = 0;
      let clearChatTriggered = false;
      const executedTools: string[] = [];
      let functionCalls = response.response.functionCalls();

      while (functionCalls && functionCalls.length > 0 && loopCount < 6) {
        loopCount++;
        const functionResponses = [];

        for (const toolCall of functionCalls) {
          const toolArgs = (toolCall.args as Record<string, unknown>) || {};
          executedTools.push(toolCall.name);
          const startMs = Date.now();
          const humanLabel = getToolHumanLabel(toolCall.name, toolArgs);

          onToolEvent?.({
            type: "step_start",
            tool: toolCall.name,
            label: humanLabel,
          });

          let fnResult: unknown;
          try {
            fnResult = await executeFunction(toolCall.name, toolArgs, projectId, userId, conversationId);
            if (toolCall.name === "clearChatHistory") {
              clearChatTriggered = true;
            }
          } catch (fnErr) {
            console.error(`[Gemini Tool Error] ${toolCall.name}:`, fnErr);
            fnResult = { error: fnErr instanceof Error ? fnErr.message : String(fnErr) };
          }

          const elapsedMs = Date.now() - startMs;
          const summary = getToolSummary(toolCall.name, fnResult);

          onToolEvent?.({
            type: "step_complete",
            tool: toolCall.name,
            label: humanLabel,
            summary,
            elapsedMs,
          });

          functionResponses.push({
            functionResponse: {
              name: toolCall.name,
              response: fnResult as Record<string, unknown>
            }
          });
        }

        response = await chat.sendMessage(functionResponses);
        functionCalls = response.response.functionCalls();
      }

      const answerText = response.response.text() || "I apologize, I could not formulate an answer.";
      const citations = extractCitations(answerText, chunks);

      return {
        answer: answerText,
        citations,
        clearChat: clearChatTriggered,
        executedTools,
      };
    } catch (err: any) {
      console.warn(`[Gemini Cascade] Model ${modelName} failed, trying next:`, err.message);
      lastError = err;
    }
  }

  throw lastError || new Error("All Gemini models in cascade failed.");
}

// ============================================================
// ENGINE 3: Groq LPU (Ultra-Fast 300+ tok/s Resilient Failover)
// ============================================================

async function generateWithGroq(
  query: string,
  chunks: SearchResultChunk[],
  conversationHistory: { role: string; content: string }[],
  projectId: string,
  userId?: string,
  conversationId?: string,
  onToolEvent?: (event: ToolStreamEvent) => void
): Promise<{ answer: string; citations: Citation[]; clearChat?: boolean; executedTools: string[] }> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY not configured.");
  }

  const groq = new Groq({ apiKey });

  const messages: Groq.Chat.ChatCompletionMessageParam[] = [
    { role: "system", content: buildSystemInstruction(projectId) }
  ];

  if (conversationHistory && conversationHistory.length > 0) {
    conversationHistory.slice(-10).forEach((msg) => {
      messages.push({
        role: msg.role.toLowerCase() === "user" ? "user" : "assistant",
        content: msg.content
      });
    });
  }

  let contextText = "Provided Project Grounding Sources:\n\n";
  if (chunks.length > 0) {
    chunks.forEach((chunk, index) => {
      contextText += `[Source ${index + 1}]: Name: "${chunk.sourceName}" (Type: ${chunk.sourceType})\n`;
      contextText += `Content:\n${chunk.content}\n\n`;
    });
  } else {
    contextText += "(No semantic document chunks initially retrieved. Use agentic tools if needed to explore files, tickets, equipment, or telemetry.)\n\n";
  }

  messages.push({
    role: "user",
    content: `${contextText}User Question: ${query}\n\nAnswer:`
  });

  const modelToUse = "openai/gpt-oss-120b";
  const executedTools: string[] = [];
  let clearChatTriggered = false;
  let loopCount = 0;

  let response = await groq.chat.completions.create({
    model: modelToUse,
    messages,
    tools: groqTools,
    tool_choice: "auto",
  });

  let message = response.choices[0].message;
  let toolCalls = message.tool_calls;

  while (toolCalls && toolCalls.length > 0 && loopCount < 5) {
    loopCount++;
    messages.push(message);

    for (const toolCall of toolCalls) {
      const { name, arguments: argsString } = toolCall.function;
      let args = {};
      try {
        args = JSON.parse(argsString);
      } catch (parseError) {
        console.error(`Error parsing JSON args for Groq tool ${name}:`, parseError);
      }

      executedTools.push(name);
      const startMs = Date.now();
      const humanLabel = getToolHumanLabel(name, args as Record<string, unknown>);

      onToolEvent?.({
        type: "step_start",
        tool: name,
        label: humanLabel,
      });

      let fnResult;
      try {
        fnResult = await executeFunction(name, args as Record<string, unknown>, projectId, userId, conversationId);
        if (name === "clearChatHistory") {
          clearChatTriggered = true;
        }
      } catch (e) {
        console.error(`Error executing tool function ${name}:`, e);
        fnResult = { error: e instanceof Error ? e.message : String(e) };
      }

      const elapsedMs = Date.now() - startMs;
      const summary = getToolSummary(name, fnResult);

      onToolEvent?.({
        type: "step_complete",
        tool: name,
        label: humanLabel,
        summary,
        elapsedMs,
      });

      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: JSON.stringify(fnResult)
      });
    }

    response = await groq.chat.completions.create({
      model: modelToUse,
      messages,
      tools: groqTools,
    });

    message = response.choices[0].message;
    toolCalls = message.tool_calls;
  }

  const answerText = message.content || "I apologize, I could not formulate an answer.";
  const citations = extractCitations(answerText, chunks);

  return {
    answer: answerText,
    citations,
    clearChat: clearChatTriggered,
    executedTools,
  };
}

// ============================================================
// Public Entry Point with Tri-Engine High-Speed Cascade
// ============================================================

export async function generateAnswer(
  query: string,
  chunks: SearchResultChunk[],
  conversationHistory: { role: string; content: string }[],
  projectId: string,
  userId?: string,
  conversationId?: string,
  onToolEvent?: (event: ToolStreamEvent) => void
): Promise<{
  answer: string;
  citations: Citation[];
  clearChat?: boolean;
  clientAction?: ClientAction | null;
  executedTools?: string[];
}> {
  // Direct clear chat intent short-circuit (e.g. "clear chat", "clear our chat history", "reset conversation", etc.)
  const isClearChatIntent =
    /^\s*(clear|reset|delete|wipe)\s+(our\s+|the\s+|all\s+|my\s+)?(chat\s+history|chat|history|conversation|messages|session)\s*[.!?]?\s*$/i.test(
      query.trim()
    );

  if (isClearChatIntent) {
    onToolEvent?.({
      type: "step_start",
      tool: "clearChatHistory",
      label: "Clearing conversation history and session context...",
    });
    await clearChatHistory(conversationId, userId, projectId);
    onToolEvent?.({
      type: "step_complete",
      tool: "clearChatHistory",
      label: "Clearing conversation history and session context...",
      summary: "Chat history cleared successfully",
      elapsedMs: 25,
    });
    return {
      answer: "Your chat history has been cleared.",
      citations: [],
      clearChat: true,
      clientAction: null,
      executedTools: ["clearChatHistory"],
    };
  }

  let executedTools: string[] = [];

  // ============================================================
  // TRI-ENGINE CASCADE ROUTER
  // ============================================================

  // ENGINE 1: Cerebras Wafer-Scale Engine (Lightning Fast 104ms, 120B parameter model)
  if (process.env.CEREBRAS_API_KEY) {
    try {
      console.log("[Tri-Engine Router] Routing to Engine 1: Cerebras WSE (gpt-oss-120b)...");
      const result = await generateWithCerebras(query, chunks, conversationHistory, projectId, userId, conversationId, onToolEvent);
      executedTools = result.executedTools;
      const clientAction = detectClientAction(query, result.answer, executedTools);
      return {
        answer: result.answer,
        citations: result.citations,
        clearChat: result.clearChat,
        clientAction,
        executedTools,
      };
    } catch (cerebrasError: unknown) {
      console.warn("[Tri-Engine Router] Cerebras Engine 1 failed or throttled, cascading to Engine 2 (Gemini):", cerebrasError);
    }
  }

  // ENGINE 2: Google Gemini (Deep Grounding & Multimodal Blueprint Reasoning)
  if (process.env.GOOGLE_AI_API_KEY) {
    try {
      console.log("[Tri-Engine Router] Routing to Engine 2: Google Gemini Flash Cascade...");
      const result = await generateWithGemini(query, chunks, conversationHistory, projectId, userId, conversationId, onToolEvent);
      executedTools = result.executedTools;
      const clientAction = detectClientAction(query, result.answer, executedTools);
      return {
        answer: result.answer,
        citations: result.citations,
        clearChat: result.clearChat,
        clientAction,
        executedTools,
      };
    } catch (geminiError: unknown) {
      console.warn("[Tri-Engine Router] Gemini Engine 2 failed, cascading to Engine 3 (Groq):", geminiError);
    }
  }

  // ENGINE 3: Groq LPU (Ultra-Fast 300+ tok/sec Resilient Failover)
  if (process.env.GROQ_API_KEY) {
    try {
      console.log("[Tri-Engine Router] Routing to Engine 3: Groq LPU (openai/gpt-oss-120b)...");
      const result = await generateWithGroq(query, chunks, conversationHistory, projectId, userId, conversationId, onToolEvent);
      executedTools = result.executedTools;
      const clientAction = detectClientAction(query, result.answer, executedTools);
      return {
        answer: result.answer,
        citations: result.citations,
        clearChat: result.clearChat,
        clientAction,
        executedTools,
      };
    } catch (groqError: unknown) {
      console.error("[Tri-Engine Router] Groq Engine 3 failed:", groqError);
    }
  }

  // Graceful fallback if all 3 inference providers fail
  return {
    answer: "I am temporarily experiencing connectivity issues reaching the AI inference services. Please verify your network connection and API configuration.",
    citations: [],
    clientAction: null,
  };
}
// Turbopack reload trigger: 1789624450

