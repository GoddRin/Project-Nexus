import Link from "next/link";
import { currentUser } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { PageHeader } from "@/components/shared/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import QRCode from "qrcode";
import { UserCombobox } from "@/components/shared/UserCombobox";
import {
 Package,
 QrCode,
 Calendar,
 Building,
 Tag,
 MapPin,
 Barcode,
 User,
 ShieldCheck,
 Wrench,
} from "lucide-react";
import { AssetStatus } from "@prisma/client";
import { assignAsset, retireAsset } from "../actions";

function StatusBadge({ status }: { status: AssetStatus }) {
 const styles: Record<AssetStatus, string> = {
 ACTIVE: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30 shadow-[inset_0_1px_0_0_rgba(31,182,166,0.2)]",
 IN_MAINTENANCE: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30 shadow-[inset_0_1px_0_0_rgba(232,163,61,0.2)]",
 RETIRED: "bg-white/5 text-text-muted ring-1 ring-white/10 ",
 };
 return (
 <Badge variant="outline" className={styles[status]}>
 {status.replace("_", " ")}
 </Badge>
 );
}

interface PageProps {
 params: Promise<{ id: string }>;
}

export default async function AssetDetailPage({ params }: PageProps) {
 const { id } = await params;
 const asset = await prisma.asset.findUnique({
 where: { id },
 include: {
 assignedTo: true,
 project: true,
 maintenanceSchedules: {
 where: { status: { in: ["UPCOMING", "IN_PROGRESS", "OVERDUE"] } },
 orderBy: { nextDueDate: "asc" }
 }
 },
 });

 if (!asset) {
 notFound();
 }

 // Get current host for QR lookup URL
 const host = (await headers()).get("host") || "localhost:3000";
 const protocol = host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https";
 const lookupUrl = `${protocol}://${host}/dashboard/assets/lookup/${asset.qrCodeToken}`;

 // Generate QR Code server-side
 let qrCodeDataUrl = "";
 try {
 qrCodeDataUrl = await QRCode.toDataURL(lookupUrl, {
 width: 200,
 margin: 1.5,
 color: {
 dark: "#0B1418", // Deep dark primary color
 light: "#FFFFFF", // High contrast background for reliable scanning
 },
 });
 } catch (err) {
 console.error("Failed to generate QR code", err);
 }

 // Get user permissions
 const clerkUser = await currentUser();
 let role = "GUEST";
 let isEditor = false;
 if (clerkUser) {
 const dbUser = await prisma.user.findUnique({ where: { clerkId: clerkUser.id } });
 if (dbUser) {
 const member = await prisma.projectMember.findUnique({
 where: {
 userId_projectId: { userId: dbUser.id, projectId: asset.projectId },
 },
 });
 if (member) {
 role = member.role;
 isEditor = role === "WAREHOUSE" || role === "IT_SUPPORT" || role === "ADMINISTRATOR";
 }
 }
 }

 // Fetch all potential assignees in the project
 const projectMembers = await prisma.projectMember.findMany({
 where: { projectId: asset.projectId },
 include: { user: true },
 orderBy: { user: { name: "asc" } },
 });

 // Action wrappers for forms
 const handleAssign = async (formData: FormData) => {
 "use server";
 const userId = formData.get("userId") as string || null;
 const assignedToName = formData.get("assignedToName") as string || null;
 await assignAsset(id, userId, assignedToName);
 };

 const handleRetire = async () => {
 "use server";
 await retireAsset(id);
 };

 return (
 <div className="space-y-6">
 <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
 <PageHeader
 title={asset.name}
 subtitle={`Registered in ${asset.project.name}`}
 className="mb-0!"
 />
 <div className="flex items-center gap-3">
 {isEditor && (
  <Link href={`/dashboard/assets/${asset.id}/edit`}>
  <Button variant="outline">Edit Details</Button>
  </Link>
  )}
 <Link href="/dashboard/assets">
 <Button variant="outline">Back to List</Button>
 </Link>
 </div>
 </div>

 <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
 {/* Detail Panel */}
 <div className="lg:col-span-2 space-y-6">
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary mb-6 flex items-center gap-2">
 <Package className="h-4 w-4 text-flow-teal" /> Asset Identification
 </h3>

 <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
 {/* Category */}
 <div className="flex items-start gap-3">
 <Tag className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Category</span>
 <span className="text-sm font-medium text-text-primary">{asset.category}</span>
 </div>
 </div>

 {/* Asset Tag Number */}
 <div className="flex items-start gap-3">
 <Tag className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Asset Tag Number</span>
 <span className="text-sm font-medium text-text-primary">{asset.assetTag || "N/A"}</span>
 </div>
 </div>

 {/* Status */}
 <div className="flex items-start gap-3">
 <ShieldCheck className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Registry Status</span>
 <div className="mt-0.5">
 <StatusBadge status={asset.status} />
 </div>
 </div>
 </div>

 {/* Serial Number */}
 <div className="flex items-start gap-3">
 <Barcode className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Serial Number</span>
 <span className="text-sm font-mono text-text-primary font-medium bg-white/5 px-2 py-0.5 rounded border border-white/[0.03]">
 {asset.serialNumber || "None"}
 </span>
 </div>
 </div>

 {/* Location */}
 <div className="flex items-start gap-3">
 <MapPin className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Current Location</span>
 <span className="text-sm font-medium text-text-primary">{asset.location || "Unspecified"}</span>
 </div>
 </div>

 {/* Department */}
 <div className="flex items-start gap-3">
 <Building className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Department</span>
 <span className="text-sm font-medium text-text-primary">{asset.department || "Unspecified"}</span>
 </div>
 </div>

 {/* Vendor */}
 <div className="flex items-start gap-3">
 <Building className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Supplier / Vendor</span>
 <span className="text-sm font-medium text-text-primary">{asset.vendor || "Unknown"}</span>
 </div>
 </div>

 {/* Purchase Date */}
 <div className="flex items-start gap-3">
 <Calendar className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Purchase Date</span>
 <span className="text-sm font-medium text-text-primary">
 {asset.purchaseDate ? asset.purchaseDate.toLocaleDateString() : "Unrecorded"}
 </span>
 </div>
 </div>

 {/* With Warranty? */}
 <div className="flex items-start gap-3">
 <ShieldCheck className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">With Warranty?</span>
 <span className="text-sm font-medium text-text-primary">
 {asset.hasWarranty ? "YES" : "NO"}
 </span>
 </div>
 </div>

 {/* Unique QR Token (non-ID key) */}
 <div className="flex items-start gap-3">
 <QrCode className="h-4 w-4 text-text-muted mt-0.5" />
 <div>
 <span className="block text-xs uppercase tracking-wider text-text-muted mb-0.5">Secure QR Token</span>
 <span className="text-xs font-mono text-text-primary/70">{asset.qrCodeToken}</span>
 </div>
 </div>
 </div>
 </div>
 </div>

 {/* Maintenance Schedules Panel */}
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <div className="flex items-center justify-between mb-6">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary flex items-center gap-2">
 <Wrench className="h-4 w-4 text-flow-teal" /> Active Maintenance
 </h3>
 {isEditor && asset.status !== "RETIRED" && (
  <div className="flex items-center gap-2">
  <Link href={`/dashboard/maintenance/new?assetId=${asset.id}`}>
  <Button size="sm">Add Schedule</Button>
  </Link>
  <Link href="/dashboard/maintenance">
  <Button variant="outline" size="sm">View All</Button>
  </Link>
  </div>
 )}
 </div>
 
 {asset.maintenanceSchedules.length === 0 ? (
 <div className="rounded-xl bg-white/[0.02] border border-white/[0.05] p-6 text-center">
 <span className="text-sm text-text-muted">No active maintenance schedules for this asset.</span>
 </div>
 ) : (
 <div className="space-y-3">
 {asset.maintenanceSchedules.map((schedule) => {
 const isOverdue = schedule.status === "UPCOMING" && new Date(schedule.nextDueDate) < new Date();
 
 return (
 <Link key={schedule.id} href={`/dashboard/maintenance/${schedule.id}`} className="block group/item">
 <div className="flex items-center justify-between rounded-xl bg-white/[0.02] border border-white/[0.05] p-4 transition-all hover:bg-white/[0.04] hover:border-white/10">
 <div>
 <h4 className="text-sm font-medium text-text-primary group-hover/item:text-flow-teal transition-colors mb-1">
 {schedule.title}
 </h4>
 <div className="flex items-center gap-4 text-[11px] font-mono text-text-muted uppercase tracking-wider">
 <span className="flex items-center gap-1.5">
 <Calendar className="h-3 w-3" />
 Due: {new Date(schedule.nextDueDate).toLocaleDateString()}
 </span>
 <span>Freq: {schedule.frequencyDays}d</span>
 </div>
 </div>
 <div className="flex items-center gap-3">
 {isOverdue ? (
 <Badge variant="outline" className="bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30">OVERDUE</Badge>
 ) : schedule.status === "IN_PROGRESS" ? (
 <Badge variant="outline" className="bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30">IN PROGRESS</Badge>
 ) : (
 <Badge variant="outline" className="bg-white/5 text-text-muted ring-1 ring-white/10">UPCOMING</Badge>
 )}
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>

 {/* Side Panel: QR & Actions */}
 <div className="space-y-6">
 {/* QR Code Card */}
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl flex flex-col items-center">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary mb-4 self-start flex items-center gap-2">
 <QrCode className="h-4 w-4 text-flow-teal" /> Asset QR Registry
 </h3>

 {qrCodeDataUrl ? (
 <div className="rounded-2xl bg-white p-4 shadow-[0_4px_24px_rgba(0,0,0,0.25)] ring-1 ring-black/10">
 {/* eslint-disable-next-line @next/next/no-img-element */}
 <img
 src={qrCodeDataUrl}
 alt={`QR Code for ${asset.name}`}
 className="h-40 w-40 select-none object-contain"
 draggable={false}
 />
 </div>
 ) : (
 <div className="flex h-40 w-40 items-center justify-center rounded-2xl bg-white/5 border border-dashed border-white/10">
 <span className="text-xs text-text-muted">QR Generation Error</span>
 </div>
 )}

 <p className="mt-4 text-center text-[10px] text-text-muted font-mono max-w-xs break-all leading-normal bg-black/20 p-2.5 rounded-lg border border-white/5">
 {lookupUrl}
 </p>
 </div>

 {/* Action / Assignment Panel */}
 <div className="rounded-2xl bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 border border-white/[0.08] shadow-xl">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary mb-4 flex items-center gap-2">
 <User className="h-4 w-4 text-flow-teal" /> Assignment & Maintenance
 </h3>

 {isEditor && asset.status !== "RETIRED" ? (
 <div className="space-y-4">
   {/* Reassignment Form */}
   <form action={handleAssign} className="space-y-2">
   <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">
   Assignee
   </label>
   <div className="flex gap-2">
   <div className="flex-1">
   <UserCombobox
   inputName="userId"
   fallbackName="assignedToName"
   users={projectMembers.map((m) => ({
   id: m.userId,
   name: m.user.name,
   role: m.role,
   }))}
   defaultValue={asset.assignedToId || ""}
   defaultQuery={asset.assignedToName || ""}
   />
   </div>
   <Button type="submit" size="sm">
   Assign
   </Button>
   </div>
   </form>

 {/* Status Retire Trigger */}
 <div className="pt-4 border-t border-white/[0.05] flex justify-between items-center">
 <span className="text-xs text-text-muted">Retire Asset</span>
 <form action={handleRetire}>
 <Button type="submit" size="xs" variant="destructive">
 Retire Asset
 </Button>
 </form>
 </div>
 </div>
 ) : (
 <div className="space-y-4">
 <div className="flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
 <User className="h-4 w-4 text-text-muted" />
 </div>
 <div>
 <span className="block text-[10px] uppercase tracking-wider text-text-muted">Currently Assigned To</span>
 <span className="text-sm font-medium text-text-primary">
 {asset.assignedTo ? asset.assignedTo.name : (asset.assignedToName || "Unassigned")}
 </span>
 </div>
 </div>

 {asset.status === "RETIRED" && (
 <div className="rounded-xl bg-signal-red/10 border border-signal-red/20 p-3.5 text-xs text-signal-red">
 This asset is retired and cannot be reassigned or modified.
 </div>
 )}
 </div>
 )}
 </div>
 </div>
 </div>
 </div>
 );
}
