import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
 params: Promise<{ qrCodeToken: string }>;
}

export default async function AssetLookupPage({ params }: PageProps) {
 const { qrCodeToken } = await params;

 if (!qrCodeToken) {
 notFound();
 }

 const asset = await prisma.asset.findUnique({
 where: { qrCodeToken },
 select: { id: true },
 });

 if (!asset) {
 notFound();
 }

 redirect(`/dashboard/assets/${asset.id}`);
}
