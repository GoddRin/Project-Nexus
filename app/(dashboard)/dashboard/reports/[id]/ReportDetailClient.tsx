/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { approveReport, rejectReport } from "../actions";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
 Sun,
 Cloud,
 CloudRain,
 CloudLightning,
 Calendar,
 MapPin,
 User,
 FileCheck,
 XCircle,
 Clock,
 AlertTriangle,
 FileDown,
 ZoomIn,
 ZoomOut,
 Maximize,
} from "lucide-react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";
import {
 Dialog,
 DialogContent,
 DialogTrigger,
 DialogTitle,
 DialogDescription,
} from "@/components/ui/dialog";
import type {  ReportStatus, WeatherCondition  } from "@prisma/client";
import { cn } from "@/lib/utils";

interface Photo {
 id: string;
 storagePath: string;
 caption: string | null;
 signedUrl: string;
}

interface ReportData {
 id: string;
 projectId: string;
 reportDate: string;
 workArea: string;
 weatherCondition: WeatherCondition;
 accomplishments: string;
 equipmentUsed: string | null;
 materialsUsed: string | null;
 delays: string | null;
 remarks: string | null;
 status: ReportStatus;
 reviewedById: string | null;
 reviewedAt: string | null;
 rejectionReason: string | null;
 createdAt: string;
 submittedBy: {
 id: string;
 name: string;
 email: string;
 };
 reviewedBy?: {
 id: string;
 name: string;
 } | null;
 photos: Photo[];
}

interface ReportDetailClientProps {
 report: ReportData;
 userRole: string;
}

export function ReportDetailClient({ report, userRole }: ReportDetailClientProps) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 // Dialog / action states
 const [isRejecting, setIsRejecting] = useState(false);
 const [rejectionReason, setRejectionReason] = useState("");
 const [error, setError] = useState("");

 const isElevated = userRole === "ADMINISTRATOR" || userRole === "PROJECT_MANAGER";
 const isSubmitted = report.status === "SUBMITTED";

 const handleApprove = async () => {
 setError("");
 startTransition(async () => {
 try {
 await approveReport(report.id);
 router.refresh();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to approve report");
 }
 });
 };

 const handleReject = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!rejectionReason.trim()) {
 setError("Rejection reason is required");
 return;
 }
 setError("");
 startTransition(async () => {
 try {
 await rejectReport(report.id, rejectionReason);
 setIsRejecting(false);
 setRejectionReason("");
 router.refresh();
 } catch (err) {
 setError(err instanceof Error ? err.message : "Failed to reject report");
 }
 });
 };

 // Weather icons
 const weatherIcons = {
 SUNNY: Sun,
 CLOUDY: Cloud,
 RAINY: CloudRain,
 STORM: CloudLightning,
 };
 const WeatherIcon = weatherIcons[report.weatherCondition] || Cloud;
 const weatherLabels = {
 SUNNY: "Sunny",
 CLOUDY: "Cloudy",
 RAINY: "Rainy",
 STORM: "Stormy",
 };

 const statusStyles: Record<
 ReportStatus,
 {
 badge: string;
 border: string;
 bg: string;
 icon: React.ComponentType<{ className?: string }>;
 title: string;
 }
 > = {
 SUBMITTED: {
 badge: "bg-signal-amber/10 text-signal-amber ring-1 ring-signal-amber/30",
 border: "border-signal-amber/20",
 bg: "bg-signal-amber/[0.02]",
 icon: Clock,
 title: "Pending Review",
 },
 APPROVED: {
 badge: "bg-flow-teal/10 text-flow-teal ring-1 ring-flow-teal/30",
 border: "border-flow-teal/20",
 bg: "bg-flow-teal/[0.02]",
 icon: FileCheck,
 title: "Approved Report",
 },
 REJECTED: {
 badge: "bg-signal-red/10 text-signal-red ring-1 ring-signal-red/30",
 border: "border-signal-red/20",
 bg: "bg-signal-red/[0.02]",
 icon: XCircle,
 title: "Rejected Report",
 },
 };

 const statusInfo = statusStyles[report.status];
 const StatusIcon = statusInfo.icon;

 return (
 <div className="space-y-6">
 {/* Rejection/Error banner */}
 {error && (
 <div className="flex items-center gap-3 rounded-xl border border-signal-red/20 bg-signal-red/10 p-4 text-sm text-signal-red ">
 <AlertTriangle className="h-5 w-5 flex-shrink-0" />
 <p>{error}</p>
 </div>
 )}

 {/* Report Status Header Banner */}
 <div className={cn(
 "flex flex-col gap-4 rounded-2xl border p-6 md:flex-row md:items-center md:justify-between shadow-lg",
 statusInfo.border,
 statusInfo.bg
 )}>
 <div className="flex items-start gap-4">
 <div className={cn(
 "flex h-11 w-11 items-center justify-center rounded-xl bg-white/[0.03] ring-1 ring-white/[0.08]"
 )}>
 <StatusIcon className="h-6 w-6 text-text-primary" />
 </div>
 <div>
 <h2 className="font-display text-lg font-bold tracking-wide text-text-primary">
 {statusInfo.title}
 </h2>
 <p className="mt-0.5 text-xs text-text-muted">
 {report.status === "SUBMITTED" && "Submitted for review to administrators."}
 {report.status === "APPROVED" && `Approved by ${report.reviewedBy?.name || "Reviewer"} on ${new Date(report.reviewedAt!).toLocaleDateString()}.`}
 {report.status === "REJECTED" && `Rejected by ${report.reviewedBy?.name || "Reviewer"} on ${new Date(report.reviewedAt!).toLocaleDateString()}.`}
 </p>
 </div>
 </div>

 {/* Action and Download Panel */}
 <div className="flex flex-wrap items-center gap-3 self-end md:self-center">
 {/* Always show Download PDF button */}
 <a
 href={`/api/reports/pdf/${report.id}`}
 download
 className={cn(
 buttonVariants({ variant: "outline" }),
 "border-white/10 bg-white/[0.04] text-text-primary hover:bg-white/10 flex items-center gap-1.5 font-semibold"
 )}
 >
 <FileDown className="h-4 w-4" />
 Download PDF
 </a>

 {/* Approve/Reject Actions for PM / Admin */}
 {isElevated && isSubmitted && !isRejecting && (
 <>
 <Button
 onClick={() => setIsRejecting(true)}
 variant="outline"
 className="border-white/10 bg-white/[0.04] text-text-primary hover:bg-signal-red/10 hover:border-signal-red/20 hover:text-signal-red"
 >
 Reject
 </Button>
 <Button
 onClick={handleApprove}
 disabled={isPending}
 className="bg-flow-teal hover:bg-flow-teal/90 text-black font-semibold shadow-lg"
 >
 Approve Report
 </Button>
 </>
 )}
 </div>
 </div>

 {/* Reject Modal / Text Area Box */}
 {isRejecting && (
 <form onSubmit={handleReject} className="rounded-2xl border border-signal-red/20 bg-signal-red/[0.02] p-6 shadow-lg space-y-4">
 <h3 className="font-display text-sm font-semibold tracking-wide text-signal-red flex items-center gap-2">
 <AlertTriangle className="h-4 w-4" />
 Provide Rejection Reason
 </h3>
 <Textarea
 value={rejectionReason}
 onChange={(e) => setRejectionReason(e.target.value)}
 placeholder="Specify why this report is rejected..."
 className="w-full text-sm bg-white/[0.03] border-white/[0.08] focus:border-signal-red focus:ring-signal-red"
 rows={3}
 required
 />
 <div className="flex justify-end gap-3">
 <Button
 type="button"
 onClick={() => {
 setIsRejecting(false);
 setRejectionReason("");
 setError("");
 }}
 variant="ghost"
 className="text-text-muted hover:bg-white/[0.04] hover:text-text-primary"
 >
 Cancel
 </Button>
 <Button
 type="submit"
 disabled={isPending}
 className="bg-signal-red text-white hover:bg-signal-red/90"
 >
 Reject Report
 </Button>
 </div>
 </form>
 )}

 {/* Rejection Reason display */}
 {report.status === "REJECTED" && report.rejectionReason && (
 <div className="rounded-2xl border border-signal-red/20 bg-signal-red/5 p-6 shadow-md space-y-2">
 <h3 className="text-sm font-semibold text-signal-red">Reason for Rejection:</h3>
 <p className="text-sm text-text-primary leading-relaxed font-light font-mono bg-white/[0.02] border border-white/5 rounded-xl p-4">
 {report.rejectionReason}
 </p>
 </div>
 )}

 {/* Core Report Content Card */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Left Column: Report Details */}
 <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-lg space-y-6">
 <div className="flex flex-wrap items-center justify-between border-b border-white/5 pb-5">
 <div className="space-y-1">
 <h2 className="font-display text-2xl font-bold tracking-wide text-text-primary">
 {report.workArea}
 </h2>
 <div className="flex items-center gap-2 text-xs text-text-muted">
 <MapPin className="h-3.5 w-3.5" />
 <span>Operational Site Work Area</span>
 </div>
 </div>
 <div className="flex flex-col items-end gap-1.5 mt-2 sm:mt-0">
 <div className="flex items-center gap-1.5 rounded-full bg-white/[0.03] px-3 py-1.5 text-xs text-text-primary ring-1 ring-white/[0.08]">
 <WeatherIcon className="h-4 w-4 text-flow-teal" />
 <span className="font-medium">{weatherLabels[report.weatherCondition]}</span>
 </div>
 </div>
 </div>

 {/* Metadata Grid */}
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 bg-white/[0.01] border border-white/5 rounded-xl p-4">
 <div className="flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
 <Calendar className="h-4 w-4 text-text-muted" />
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono">Report Date</p>
 <p className="text-sm font-medium text-text-primary">
 {new Date(report.reportDate).toLocaleDateString("en-US", {
 weekday: "long",
 year: "numeric",
 month: "long",
 day: "numeric",
 })}
 </p>
 </div>
 </div>

 <div className="flex items-center gap-3">
 <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/[0.04]">
 <User className="h-4 w-4 text-text-muted" />
 </div>
 <div>
 <p className="text-[10px] uppercase tracking-wider text-text-muted font-mono">Submitted By</p>
 <p className="text-sm font-medium text-text-primary">
 {report.submittedBy.name}
 </p>
 </div>
 </div>
 </div>

 {/* Section: Accomplishments */}
 <div className="space-y-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Accomplishments</h3>
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap">
 {report.accomplishments}
 </div>
 </div>

 {/* Details Lists */}
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
 {/* Equipment Used */}
 <div className="space-y-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Equipment Used</h3>
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap min-h-24">
 {report.equipmentUsed || <span className="text-text-muted/40 italic">None specified</span>}
 </div>
 </div>

 {/* Materials Used */}
 <div className="space-y-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Materials Used</h3>
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap min-h-24">
 {report.materialsUsed || <span className="text-text-muted/40 italic">None specified</span>}
 </div>
 </div>
 </div>

 {/* Delays and Remarks */}
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
 {/* Delays */}
 <div className="space-y-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono flex items-center gap-1.5">
 Delays
 {report.delays && <span className="h-1.5 w-1.5 rounded-full bg-signal-amber animate-pulse" />}
 </h3>
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap min-h-24">
 {report.delays || <span className="text-text-muted/40 italic">No delays encountered</span>}
 </div>
 </div>

 {/* Remarks */}
 <div className="space-y-2">
 <h3 className="text-xs font-semibold uppercase tracking-wider text-text-muted font-mono">Remarks</h3>
 <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-4 text-sm text-text-primary font-light leading-relaxed whitespace-pre-wrap min-h-24">
 {report.remarks || <span className="text-text-muted/40 italic">None specified</span>}
 </div>
 </div>
 </div>
 </div>

 {/* Right Column: Photo Gallery */}
 <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-lg space-y-4">
 <div className="border-b border-white/5 pb-3">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
 Attached Photos ({report.photos.length})
 </h3>
 </div>

 {report.photos.length === 0 ? (
 <div className="flex flex-col items-center justify-center py-12 text-center border border-dashed border-white/10 rounded-xl bg-white/[0.01]">
 <AlertTriangle className="h-8 w-8 text-text-muted/40 mb-2" />
 <p className="text-xs text-text-muted/80">No photos attached to this report.</p>
 </div>
 ) : (
 <div className="space-y-4">
 {report.photos.map((photo) => (
 <div key={photo.id} className="group/photo overflow-hidden rounded-xl border border-white/10 bg-black/25 relative flex flex-col shadow-sm">
 <Dialog>
 <DialogTrigger className="relative aspect-video overflow-hidden cursor-zoom-in border-none p-0 outline-none w-full flex text-left bg-transparent">
 <img
 src={photo.signedUrl}
 alt={photo.caption || "Accomplishment photo"}
 className="h-full w-full object-cover transition-transform duration-500 group-hover/photo:scale-105"
 />
 </DialogTrigger>
 <DialogContent className="max-w-4xl p-1 bg-black/90 border-white/10 [&>button]:text-white">
 <DialogTitle className="sr-only">
 {photo.caption || "Accomplishment photo"}
 </DialogTitle>
 <DialogDescription className="sr-only">
 Zoomed view of the attached photo.
 </DialogDescription>
 
 <TransformWrapper>
 {({ zoomIn, zoomOut, resetTransform }) => (
 <div className="relative flex flex-col h-full w-full justify-center items-center">
 {/* Controls Overlay */}
 <div className="absolute top-2 left-2 z-50 flex gap-2 bg-black/50 p-1.5 rounded-lg ">
 <button type="button" onClick={() => zoomIn()} className="p-1.5 hover:bg-white/10 rounded-md text-white transition" aria-label="Zoom In">
 <ZoomIn className="h-4 w-4" />
 </button>
 <button type="button" onClick={() => zoomOut()} className="p-1.5 hover:bg-white/10 rounded-md text-white transition" aria-label="Zoom Out">
 <ZoomOut className="h-4 w-4" />
 </button>
 <button type="button" onClick={() => resetTransform()} className="p-1.5 hover:bg-white/10 rounded-md text-white transition" aria-label="Reset Zoom">
 <Maximize className="h-4 w-4" />
 </button>
 </div>
 
 {/* Zoomable Image */}
 <TransformComponent 
 wrapperClass="!w-full !h-full !max-h-[85vh] flex items-center justify-center" 
 contentClass="!w-full !h-full flex items-center justify-center"
 >
 <img
 src={photo.signedUrl}
 alt={photo.caption || "Accomplishment photo"}
 className="w-full max-h-[85vh] object-contain rounded-md"
 />
 </TransformComponent>
 </div>
 )}
 </TransformWrapper>
 </DialogContent>
 </Dialog>
 
 {/* Caption */}
 {photo.caption && (
 <div className="bg-white/[0.02] border-t border-white/5 p-3 text-xs text-text-muted leading-relaxed font-light">
 {photo.caption}
 </div>
 )}
 </div>
 ))}
 </div>
 )}
 </div>
 </div>
 </div>
 );
}
