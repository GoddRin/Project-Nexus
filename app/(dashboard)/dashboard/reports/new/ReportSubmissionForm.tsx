/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createReport } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
 Select,
 SelectContent,
 SelectItem,
 SelectTrigger,
 SelectValue,
} from "@/components/ui/select";
import type { WeatherCondition } from "@prisma/client";
import {
 Upload,
 X,
 Loader2,
 Calendar,
 MapPin,
 CloudSun,
 Hammer,
 AlertTriangle,
 CheckCircle2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface UploadedPhoto {
 storagePath: string;
 fileName: string;
 caption: string;
 progress: number;
 status: "uploading" | "success" | "error";
 errorMsg?: string;
 localPreviewUrl: string;
}

interface ReportSubmissionFormProps {
 projectId: string;
}

export function ReportSubmissionForm({ projectId }: ReportSubmissionFormProps) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 // Form Fields
 const [reportDate, setReportDate] = useState(new Date().toISOString().split("T")[0]);
 const [workArea, setWorkArea] = useState("");
 const [weatherCondition, setWeatherCondition] = useState<WeatherCondition>("SUNNY");
 const [accomplishments, setAccomplishments] = useState("");
 const [equipmentUsed, setEquipmentUsed] = useState("");
 const [materialsUsed, setMaterialsUsed] = useState("");
 const [delays, setDelays] = useState("");
 const [remarks, setRemarks] = useState("");

 // Photos state
 const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
 const [formError, setFormError] = useState("");
 const [isDragging, setIsDragging] = useState(false);

 // File Select / Upload handler
 const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 if (e.target.files) {
 uploadFiles(Array.from(e.target.files));
 }
 };

 const uploadFiles = (files: File[]) => {
 files.forEach((file) => {
 // 1. Initial photo object
 const localPreviewUrl = URL.createObjectURL(file);
 
 const newPhoto: UploadedPhoto = {
 storagePath: "",
 fileName: file.name,
 caption: "",
 progress: 0,
 status: "uploading",
 localPreviewUrl,
 };

 setPhotos((prev) => [...prev, newPhoto]);

 // 2. Perform upload via XHR (to track progress)
 const xhr = new XMLHttpRequest();
 const formData = new FormData();
 formData.append("projectId", projectId);
 formData.append("file", file);

 xhr.upload.addEventListener("progress", (e) => {
 if (e.lengthComputable) {
 const percentage = Math.round((e.loaded * 100) / e.total);
 updatePhotoState(file.name, localPreviewUrl, { progress: percentage });
 }
 });

 xhr.addEventListener("load", () => {
 if (xhr.status >= 200 && xhr.status < 300) {
 const response = JSON.parse(xhr.responseText || "{}");
 updatePhotoState(file.name, localPreviewUrl, {
 status: "success",
 storagePath: response.storagePath,
 progress: 100,
 });
 } else {
 const response = JSON.parse(xhr.responseText || "{}");
 updatePhotoState(file.name, localPreviewUrl, {
 status: "error",
 errorMsg: response.error || "Upload failed",
 });
 }
 });

 xhr.addEventListener("error", () => {
 updatePhotoState(file.name, localPreviewUrl, {
 status: "error",
 errorMsg: "Network connection lost",
 });
 });

 xhr.open("POST", "/api/reports/upload");
 xhr.send(formData);
 });
 };

 const updatePhotoState = (
 fileName: string,
 localUrl: string,
 updates: Partial<UploadedPhoto>
 ) => {
 setPhotos((prev) =>
 prev.map((photo) =>
 photo.fileName === fileName && photo.localPreviewUrl === localUrl
 ? { ...photo, ...updates }
 : photo
 )
 );
 };

 const removePhoto = (index: number) => {
 setPhotos((prev) => {
 const target = prev[index];
 if (target) {
 URL.revokeObjectURL(target.localPreviewUrl);
 }
 return prev.filter((_, i) => i !== index);
 });
 };

 const updateCaption = (index: number, caption: string) => {
 setPhotos((prev) =>
 prev.map((p, i) => (i === index ? { ...p, caption } : p))
 );
 };

 // Submit Handler
 const handleSubmit = (e: React.FormEvent) => {
 e.preventDefault();
 setFormError("");

 if (!workArea.trim()) {
 setFormError("Work Area is required.");
 return;
 }
 if (!accomplishments.trim()) {
 setFormError("Accomplishments description is required.");
 return;
 }

 // Check if any uploads are still in progress
 const isUploading = photos.some((p) => p.status === "uploading");
 if (isUploading) {
 setFormError("Please wait for all photo uploads to complete before submitting.");
 return;
 }

 // Filter out failed uploads, keep only successful ones
 const successfulPhotos = photos
 .filter((p) => p.status === "success")
 .map((p) => ({
 storagePath: p.storagePath,
 caption: p.caption,
 }));

 startTransition(async () => {
 try {
 await createReport(projectId, {
 reportDate: new Date(reportDate),
 workArea,
 weatherCondition,
 accomplishments,
 equipmentUsed: equipmentUsed.trim() || undefined,
 materialsUsed: materialsUsed.trim() || undefined,
 delays: delays.trim() || undefined,
 remarks: remarks.trim() || undefined,
 photos: successfulPhotos,
 });

 router.push("/dashboard/reports");
 router.refresh();
 } catch (err) {
 const msg = err instanceof Error ? err.message : "Failed to submit daily report.";
 setFormError(msg);
 }
 });
 };

 // Drag-and-drop handlers
 const handleDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(true);
 };

 const handleDragLeave = () => {
 setIsDragging(false);
 };

 const handleDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 if (e.dataTransfer.files) {
 uploadFiles(Array.from(e.dataTransfer.files));
 }
 };

 const anyUploading = photos.some((p) => p.status === "uploading");

 return (
 <form onSubmit={handleSubmit} className="space-y-6">
 {/* Error banner */}
 {formError && (
 <div className="flex items-center gap-3 rounded-xl border border-signal-red/20 bg-signal-red/10 p-4 text-sm text-signal-red ">
 <AlertTriangle className="h-5 w-5 flex-shrink-0" />
 <p>{formError}</p>
 </div>
 )}

 {/* Main Grid: Form Left, Photos Right */}
 <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
 {/* Form Body Column */}
 <div className="lg:col-span-2 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-lg space-y-6">
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 {/* Report Date */}
 <div className="space-y-2">
 <Label htmlFor="reportDate" className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
 <Calendar className="h-3.5 w-3.5 text-text-muted" />
 Report Date
 </Label>
 <Input
 id="reportDate"
 type="date"
 value={reportDate}
 onChange={(e) => setReportDate(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm"
 required
 />
 </div>

 {/* Work Area */}
 <div className="space-y-2 sm:col-span-2">
 <Label htmlFor="workArea" className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
 <MapPin className="h-3.5 w-3.5 text-text-muted" />
 Work Area
 </Label>
 <Input
 id="workArea"
 placeholder="e.g. Powerhouse, Tunnel, Spillway"
 value={workArea}
 onChange={(e) => setWorkArea(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm"
 required
 />
 </div>
 </div>

 <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
 {/* Weather Condition */}
 <div className="space-y-2">
 <Label htmlFor="weather" className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
 <CloudSun className="h-3.5 w-3.5 text-text-muted" />
 Weather Condition
 </Label>
 <Select
 value={weatherCondition}
 onValueChange={(val) => setWeatherCondition(val as WeatherCondition)}
 >
 <SelectTrigger id="weather" className="bg-white/[0.03] border-white/[0.08] text-sm text-text-primary">
 <SelectValue placeholder="Select condition" />
 </SelectTrigger>
 <SelectContent className="bg-bg-panel/95 border-white/[0.08] text-text-primary">
 <SelectItem value="SUNNY">Sunny</SelectItem>
 <SelectItem value="CLOUDY">Cloudy</SelectItem>
 <SelectItem value="RAINY">Rainy</SelectItem>
 <SelectItem value="STORM">Stormy</SelectItem>
 </SelectContent>
 </Select>
 </div>

 {/* Delays Encountered */}
 <div className="space-y-2 sm:col-span-2">
 <Label htmlFor="delays" className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
 <AlertTriangle className="h-3.5 w-3.5 text-text-muted" />
 Delays / Obstructions (Optional)
 </Label>
 <Input
 id="delays"
 placeholder="Describe any delay factor, or leave empty"
 value={delays}
 onChange={(e) => setDelays(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm"
 />
 </div>
 </div>

 {/* Accomplishments */}
 <div className="space-y-2">
 <Label htmlFor="accomplishments" className="text-xs font-semibold text-text-primary tracking-wide flex items-center gap-1.5">
 <Hammer className="h-3.5 w-3.5 text-text-muted" />
 Accomplishments Description
 </Label>
 <Textarea
 id="accomplishments"
 placeholder="Describe work completed today, crew shifts, progress percentages..."
 value={accomplishments}
 onChange={(e) => setAccomplishments(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm min-h-32"
 required
 />
 </div>

 {/* Equipment and Materials Grid */}
 <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
 {/* Equipment Used */}
 <div className="space-y-2">
 <Label htmlFor="equipment" className="text-xs font-semibold text-text-primary tracking-wide">
 Equipment Deployed (Optional)
 </Label>
 <Textarea
 id="equipment"
 placeholder="e.g. 2x Excavator, 1x Tower Crane"
 value={equipmentUsed}
 onChange={(e) => setEquipmentUsed(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm min-h-24"
 />
 </div>

 {/* Materials Used */}
 <div className="space-y-2">
 <Label htmlFor="materials" className="text-xs font-semibold text-text-primary tracking-wide">
 Materials Utilized (Optional)
 </Label>
 <Textarea
 id="materials"
 placeholder="e.g. 50 cubic meters Concrete, 2 tons Rebar"
 value={materialsUsed}
 onChange={(e) => setMaterialsUsed(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm min-h-24"
 />
 </div>
 </div>

 {/* Remarks */}
 <div className="space-y-2">
 <Label htmlFor="remarks" className="text-xs font-semibold text-text-primary tracking-wide">
 Additional Remarks (Optional)
 </Label>
 <Textarea
 id="remarks"
 placeholder="Safety incidents, upcoming scheduled site activities, visitor logs..."
 value={remarks}
 onChange={(e) => setRemarks(e.target.value)}
 className="bg-white/[0.03] border-white/[0.08] text-sm min-h-20"
 />
 </div>
 </div>

 {/* Multi-Photo Upload Column */}
 <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 shadow-lg space-y-4">
 <div className="border-b border-white/5 pb-2">
 <h3 className="font-display text-sm font-semibold tracking-wide text-text-primary">
 Attach Photos (Max 10MB/photo)
 </h3>
 </div>

 {/* Dropzone */}
 <div
 onDragOver={handleDragOver}
 onDragLeave={handleDragLeave}
 onDrop={handleDrop}
 className={cn(
 "flex flex-col items-center justify-center rounded-xl border border-dashed p-6 text-center transition-all duration-300 bg-white/[0.01]",
 isDragging
 ? "border-flow-teal bg-flow-teal/[0.03] shadow-[0_0_15px_rgba(31,182,166,0.1)]"
 : "border-white/10 hover:border-white/20 hover:bg-white/[0.02]"
 )}
 >
 <input
 type="file"
 id="photo-file"
 multiple
 accept="image/*"
 className="hidden"
 onChange={handleFileChange}
 />
 <label
 htmlFor="photo-file"
 className="cursor-pointer flex flex-col items-center gap-2 group/upload"
 >
 <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/[0.04] ring-1 ring-white/[0.08] group-hover/upload:bg-flow-teal/15 group-hover/upload:ring-flow-teal/30">
 <Upload className="h-5 w-5 text-text-muted group-hover/upload:text-flow-teal" />
 </div>
 <span className="text-xs font-medium text-text-primary group-hover/upload:text-flow-teal">
 Drag & drop photos or browse
 </span>
 <span className="text-[10px] text-text-muted/60">
 Supports JPG, PNG, WEBP up to 10MB
 </span>
 </label>
 </div>

 {/* Photo List */}
 <div className="space-y-3 overflow-y-auto max-h-96 pr-1">
 {photos.map((photo, index) => (
 <div
 key={index}
 className="flex flex-col gap-2 rounded-xl border border-white/10 bg-black/25 p-3 relative"
 >
 <button
 type="button"
 onClick={() => removePhoto(index)}
 className="absolute right-2 top-2 rounded-lg bg-black/50 p-1 text-text-muted hover:text-white"
 >
 <X className="h-3.5 w-3.5" />
 </button>

 <div className="flex items-center gap-3">
 {/* Preview Image */}
 <div className="h-12 w-16 flex-shrink-0 overflow-hidden rounded-lg border border-white/10 bg-white/[0.02]">
 <img
 src={photo.localPreviewUrl}
 alt="Thumbnail preview"
 className="h-full w-full object-cover"
 />
 </div>

 <div className="min-w-0 flex-1 space-y-1">
 <p className="truncate text-xs font-medium text-text-primary">
 {photo.fileName}
 </p>

 {/* Upload progress & statuses */}
 {photo.status === "uploading" && (
 <div className="space-y-1">
 <div className="h-1 w-full overflow-hidden rounded-full bg-white/10">
 <div
 className="h-full bg-flow-teal transition-all duration-300"
 style={{ width: `${photo.progress}%` }}
 />
 </div>
 <p className="text-[10px] text-flow-teal flex items-center gap-1 font-mono">
 <Loader2 className="h-2.5 w-2.5 animate-spin" />
 Uploading {photo.progress}%
 </p>
 </div>
 )}

 {photo.status === "success" && (
 <p className="text-[10px] text-flow-teal flex items-center gap-1">
 <CheckCircle2 className="h-3 w-3" />
 Uploaded successfully
 </p>
 )}

 {photo.status === "error" && (
 <p className="text-[10px] text-signal-red font-mono">
 ❌ {photo.errorMsg || "Upload failed"}
 </p>
 )}
 </div>
 </div>

 {/* Caption input (only when successfully uploaded) */}
 {photo.status === "success" && (
 <Input
 placeholder="Enter photo caption..."
 value={photo.caption}
 onChange={(e) => updateCaption(index, e.target.value)}
 className="h-7 text-xs bg-white/[0.02] border-white/5 placeholder:text-text-muted/40 focus:ring-flow-teal"
 />
 )}
 </div>
 ))}
 </div>
 </div>
 </div>

 {/* Buttons bar */}
 <div className="flex items-center justify-end gap-4 border-t border-white/5 pt-5">
 <Link href="/dashboard/reports">
 <Button
 type="button"
 variant="outline"
 className="border-white/10 bg-white/[0.04] text-text-primary hover:bg-white/[0.08]"
 >
 Cancel
 </Button>
 </Link>
 <Button
 type="submit"
 disabled={isPending || anyUploading}
 className="bg-flow-teal hover:bg-flow-teal/90 text-black font-semibold shadow-lg min-w-32"
 >
 {isPending ? (
 <div className="flex items-center gap-2">
 <Loader2 className="h-4 w-4 animate-spin" />
 Submitting...
 </div>
 ) : (
 "Submit Report"
 )}
 </Button>
 </div>
 </form>
 );
}
