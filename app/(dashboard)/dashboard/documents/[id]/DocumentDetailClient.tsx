/* eslint-disable @next/next/no-img-element */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
 FileText,
 Calendar,
 User as UserIcon,
 Download,
 UploadCloud,
 Loader2,
 ChevronRight,
 ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSignedDownloadUrl } from "../actions";

interface VersionType {
 id: string;
 versionNum: number;
 fileName: string;
 fileSizeKb: number;
 mimeType: string;
 createdAt: Date;
 uploadedBy: {
 name: string;
 };
}

interface DocumentDetailClientProps {
 projectId: string;
 document: {
 id: string;
 name: string;
 folderId: string | null;
 };
 breadcrumbs: { id: string; name: string }[];
 versions: VersionType[];
 initialPreviewUrl: string | null;
 canManage: boolean;
}

export function DocumentDetailClient({
 projectId,
 document,
 breadcrumbs,
 versions,
 initialPreviewUrl,
 canManage,
}: DocumentDetailClientProps) {
 const router = useRouter();
 const [activeVersion, setActiveVersion] = useState<VersionType>(versions[0]);
 const [previewUrl, setPreviewUrl] = useState<string | null>(initialPreviewUrl);
 const [loadingPreview, setLoadingPreview] = useState(false);

 // New Version Upload State
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);
 const [uploadError, setUploadError] = useState("");

 const currentVersionNum = versions[0]?.versionNum || 1;

 // Handle switching preview version
 const handleSelectVersion = async (version: VersionType) => {
 setActiveVersion(version);
 setLoadingPreview(true);
 try {
 const url = await getSignedDownloadUrl(projectId, version.id);
 setPreviewUrl(url);
 } catch (err) {
 console.error(err);
 setPreviewUrl(null);
 } finally {
 setLoadingPreview(false);
 }
 };

 // Handle download
 const handleDownload = async (version: VersionType) => {
 try {
 const url = await getSignedDownloadUrl(projectId, version.id);
 window.open(url, "_blank");
 } catch {
 alert("Failed to download file");
 }
 };

 // Handle Uploading a New Version
 const handleUploadNewVersion = (file: File) => {
 if (file.size > 25 * 1024 * 1024) {
 setUploadError("File size exceeds the 25MB limit.");
 return;
 }

 setUploadError("");
 setUploadProgress(0);

 const formData = new FormData();
 formData.append("projectId", projectId);
 formData.append("documentId", document.id);
 formData.append("file", file);

 const xhr = new XMLHttpRequest();
 xhr.open("POST", "/api/documents/upload");

 xhr.upload.addEventListener("progress", (event) => {
 if (event.lengthComputable) {
 const percent = Math.round((event.loaded / event.total) * 100);
 setUploadProgress(percent);
 }
 });

 xhr.addEventListener("load", () => {
 if (xhr.status >= 200 && xhr.status < 300) {
 setUploadProgress(null);
 router.refresh();
 // Automatically switch to the new version after refresh
 setTimeout(() => {
 window.location.reload();
 }, 500);
 } else {
 const response = JSON.parse(xhr.responseText || "{}");
 setUploadError(response.error || "Upload failed");
 setUploadProgress(null);
 }
 });

 xhr.addEventListener("error", () => {
 setUploadError("Network error occurred during upload.");
 setUploadProgress(null);
 });

 xhr.send(formData);
 };

 const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
 const file = e.target.files?.[0];
 if (file) {
 handleUploadNewVersion(file);
 }
 };

 const isPdf = activeVersion.mimeType === "application/pdf";
 const isImage = activeVersion.mimeType.startsWith("image/");

 return (
 <div className="space-y-6">
 {/* Back and Breadcrumbs */}
 <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
 <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-muted">
 <Link
 href="/dashboard/documents"
 className="flex items-center gap-1 hover:text-flow-teal transition-colors mr-2"
 >
 <ArrowLeft className="h-3.5 w-3.5" />
 Back to Browser
 </Link>
 {breadcrumbs.map((crumb) => (
 <span key={crumb.id} className="flex items-center gap-1.5">
 <ChevronRight className="h-3 w-3 text-white/25" />
 <Link
 href={`/dashboard/documents?folderId=${crumb.id}`}
 className="hover:text-flow-teal transition-colors"
 >
 {crumb.name}
 </Link>
 </span>
 ))}
 <span className="flex items-center gap-1.5">
 <ChevronRight className="h-3 w-3 text-white/25" />
 <span className="text-text-primary truncate max-w-[200px]">{document.name}</span>
 </span>
 </div>
 </div>

 {/* Main Content Layout */}
 <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
 {/* Left Column: Preview */}
 <div className="lg:col-span-7 flex flex-col rounded-2xl border border-white/[0.08] bg-white/[0.01] overflow-hidden min-h-[500px]">
 <div className="border-b border-white/[0.05] bg-white/[0.02] px-4 py-3 flex items-center justify-between">
 <div className="flex items-center gap-2">
 <FileText className="h-4 w-4 text-flow-teal" />
 <span className="text-xs font-semibold text-text-primary truncate max-w-[250px]">
 {activeVersion.fileName}
 </span>
 <span className="text-[10px] font-mono bg-white/5 px-1.5 py-0.5 rounded text-text-muted border border-white/5">
 v{activeVersion.versionNum}
 </span>
 </div>
 <Button
 variant="ghost"
 size="sm"
 onClick={() => handleDownload(activeVersion)}
 className="h-7 px-2.5 text-[10px] border border-white/5 hover:bg-white/5"
 >
 <Download className="mr-1 h-3 w-3" />
 Download
 </Button>
 </div>

 <div className="flex-1 flex items-center justify-center p-4 bg-black/20 relative">
 {loadingPreview ? (
 <Loader2 className="h-8 w-8 animate-spin text-flow-teal" />
 ) : previewUrl ? (
 isPdf ? (
 <iframe
 src={`${previewUrl}#toolbar=0`}
 className="w-full h-full min-h-[450px] rounded-xl border border-white/5 bg-white"
 />
 ) : isImage ? (
 <img
 src={previewUrl}
 alt={activeVersion.fileName}
 className="max-w-full max-h-[500px] object-contain rounded-xl shadow-lg"
 />
 ) : (
 <div className="text-center p-6 max-w-sm">
 <FileText className="mx-auto h-12 w-12 text-text-muted/40 mb-3" />
 <h4 className="text-xs font-semibold text-text-primary">Preview not available</h4>
 <p className="text-[10px] text-text-muted mt-1 leading-relaxed">
 This file type ({activeVersion.mimeType}) cannot be previewed inline. Please download the file to view its contents.
 </p>
 </div>
 )
 ) : (
 <div className="text-center p-6 max-w-sm">
 <FileText className="mx-auto h-12 w-12 text-text-muted/40 mb-3" />
 <h4 className="text-xs font-semibold text-text-primary">Failed to load preview</h4>
 <p className="text-[10px] text-text-muted mt-1">
 Could not retrieve a secure preview URL.
 </p>
 </div>
 )}
 </div>
 </div>

 {/* Right Column: Metadata, Version Upload, and Version History */}
 <div className="lg:col-span-5 space-y-6">
 {/* Metadata & Actions */}
 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-lg space-y-4">
 <div>
 <h3 className="text-sm font-bold text-text-primary truncate">{document.name}</h3>
 <p className="text-[10px] text-text-muted mt-1 font-mono">
 Document ID: {document.id}
 </p>
 </div>

 {/* Upload New Version */}
 {canManage && (
 <div className="pt-4 border-t border-white/[0.05]">
 <input
 type="file"
 id="new-version-upload"
 onChange={onFileChange}
 className="hidden"
 disabled={uploadProgress !== null}
 />
 <label
 htmlFor="new-version-upload"
 className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/10 bg-white/[0.01] hover:bg-white/[0.03] p-4 text-center transition-all"
 >
 {uploadProgress !== null ? (
 <div className="flex items-center gap-2">
 <Loader2 className="h-4 w-4 animate-spin text-flow-teal" />
 <span className="text-xs text-text-primary">Uploading v{currentVersionNum + 1}... ({uploadProgress}%)</span>
 </div>
 ) : (
 <>
 <UploadCloud className="h-4 w-4 text-flow-teal" />
 <span className="text-xs font-semibold text-text-primary">Upload New Version</span>
 </>
 )}
 </label>
 {uploadError && (
 <p className="mt-2 text-xs text-signal-amber text-center font-medium">{uploadError}</p>
 )}
 </div>
 )}
 </div>

 {/* Version History */}
 <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-5 shadow-lg space-y-4">
 <h4 className="text-xs font-bold uppercase tracking-wider text-text-muted">
 Version History
 </h4>

 <div className="space-y-4">
 {versions.map((version) => {
 const isActive = activeVersion.id === version.id;
 return (
 <div
 key={version.id}
 onClick={() => handleSelectVersion(version)}
 className={cn(
 "flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all duration-300",
 isActive
 ? "border-flow-teal/30 bg-flow-teal/5 shadow-sm"
 : "border-white/[0.04] bg-white/[0.01] hover:bg-white/[0.03] hover:border-white/[0.08]"
 )}
 >
 <div className="rounded-lg bg-white/[0.03] p-2 border border-white/5 text-text-muted">
 <FileText className="h-4 w-4" />
 </div>
 <div className="flex-1 min-w-0">
 <div className="flex items-center justify-between gap-2">
 <span className="text-xs font-semibold text-text-primary">
 Version {version.versionNum}
 </span>
 <span className="text-[9px] text-text-muted font-mono">
 {(version.fileSizeKb / 1024).toFixed(2)} MB
 </span>
 </div>
 <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5 text-[10px] text-text-muted">
 <span className="flex items-center gap-1">
 <UserIcon className="h-3 w-3" />
 {version.uploadedBy.name}
 </span>
 <span className="flex items-center gap-1">
 <Calendar className="h-3 w-3" />
 {new Date(version.createdAt).toLocaleDateString()}
 </span>
 </div>
 </div>
 </div>
 );
 })}
 </div>
 </div>
 </div>
 </div>
 </div>
 );
}
export default DocumentDetailClient;
