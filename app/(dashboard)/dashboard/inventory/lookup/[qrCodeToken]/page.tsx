import { prisma } from "@/lib/db/prisma";
import { redirect, notFound } from "next/navigation";

export const dynamic = "force-dynamic";

interface PageProps {
 params: Promise<{ qrCodeToken: string }>;
}

export default async function InventoryLookupPage({ params }: PageProps) {
 const { qrCodeToken } = await params;

 if (!qrCodeToken) {
 notFound();
 }

 const item = await prisma.inventoryItem.findUnique({
 where: { qrCodeToken },
 select: { id: true },
 });

 if (!item) {
 notFound();
 }

 redirect(`/dashboard/inventory/${item.id}`);
}
