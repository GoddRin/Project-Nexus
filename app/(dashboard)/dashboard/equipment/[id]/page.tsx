import { prisma } from "@/lib/db/prisma";
import { getOrCreateUser } from "@/lib/auth/getOrCreateUser";
import { supabaseAdmin } from "@/lib/supabase";
import { notFound } from "next/navigation";
import { EquipmentDetailClient } from "./EquipmentDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EquipmentDetailPage({ params }: PageProps) {
  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { slug: "tumauini-hepp" } });
  if (!project) throw new Error("Project not found");

  const { member } = await getOrCreateUser(project.id);
  if (!member) throw new Error("Unauthorized: You must be a project member to view equipment.");

  const equipment = await prisma.plantEquipment.findUnique({
    where: { id },
    include: {
      createdBy: { select: { name: true } },
      siteLocation: { select: { name: true, slug: true } },
      documents: {
        include: {
          uploadedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
      maintenanceLogs: {
        include: {
          loggedBy: { select: { name: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!equipment) notFound();

  // Pre-generate short-lived signed URLs for all documents inside the server component
  const documentsWithSignedUrls = await Promise.all(
    equipment.documents.map(async (doc) => {
      let downloadUrl = "#";
      try {
        const { data, error } = await supabaseAdmin.storage
          .from("equipment-docs")
          .createSignedUrl(doc.storagePath, 3600); // 1 hour expiry
        
        if (!error && data) {
          downloadUrl = data.signedUrl;
        }
      } catch (err) {
        console.error("Failed to generate signed url for document:", doc.id, err);
      }

      return {
        ...doc,
        downloadUrl,
      };
    })
  );

  // Cast JSON specifications into Record<string, string>
  const specs = (equipment.specifications as Record<string, string>) || {};

  return (
    <div className="max-w-6xl mx-auto">
      <EquipmentDetailClient
        equipment={{
          ...equipment,
          specifications: specs,
        }}
        documents={documentsWithSignedUrls}
        maintenanceLogs={equipment.maintenanceLogs}
        role={member.role}
        projectId={project.id}
      />
    </div>
  );
}
