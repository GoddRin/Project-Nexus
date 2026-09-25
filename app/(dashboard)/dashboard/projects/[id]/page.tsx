import React from "react";
import { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProjectProfileService } from "@/lib/services/projectProfileService";
import { ProjectProfileView } from "@/components/atlas/profile/ProjectProfileView";

export const dynamic = "force-dynamic";

interface ProjectProfilePageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({
  params,
}: ProjectProfilePageProps): Promise<Metadata> {
  const { id } = await params;
  const profile = await ProjectProfileService.getProjectProfile(id);

  if (!profile) {
    return {
      title: "Project Not Found | SCIC Project Atlas",
      description: "The requested project could not be located in the database.",
    };
  }

  return {
    title: `${profile.project.name} | SCIC Project Profile`,
    description:
      profile.project.description ||
      `Official project profile and operational context for ${profile.project.name} (Sta. Clara International Corporation).`,
  };
}

export default async function ProjectProfilePage({
  params,
}: ProjectProfilePageProps) {
  const { id } = await params;
  const profile = await ProjectProfileService.getProjectProfile(id);

  if (!profile) {
    notFound();
  }

  return <ProjectProfileView profile={profile} />;
}
