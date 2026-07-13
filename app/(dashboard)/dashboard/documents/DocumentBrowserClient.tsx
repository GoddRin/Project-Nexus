"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
 Folder,
 FileText,
 Plus,
 ChevronRight,
 UploadCloud,
 Loader2,
 File as FileIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { SearchInput } from "@/components/shared/SearchInput";
import { createFolder } from "./actions";
import { cn } from "@/lib/utils";

interface FolderType {
 id: string;
 name: string;
 parentId: string | null;
 createdAt: Date;
}

interface DocumentType {
 id: string;
 name: string;
 folderId: string | null;
 createdAt: Date;
 versions: {
 id: string;
 versionNum: number;
 fileName: string;
 fileSizeKb: number;
 mimeType: string;
 }[];
}

interface DocumentBrowserClientProps {
 projectId: string;
 currentFolderId: string | null;
 breadcrumbs: FolderType[];
 folders: FolderType[];
 documents: DocumentType[];
 canManage: boolean;
}

export function DocumentBrowserClient({
 projectId,
 currentFolderId,
 breadcrumbs,
 folders,
 documents,
 canManage,
}: DocumentBrowserClientProps) {
 const router = useRouter();
 const [isPending, startTransition] = useTransition();

 // Folder Creation State
 const [isCreatingFolder, setIsCreatingFolder] = useState(false);
 const [newFolderName, setNewFolderName] = useState("");
 const [folderError, setFolderError] = useState("");

 // Upload State
 const [uploadProgress, setUploadProgress] = useState<number | null>(null);
 const [uploadError, setUploadError] = useState("");
 const [isDragging, setIsDragging] = useState(false);

 // Handle Folder Creation
 const handleCreateFolder = async (e: React.FormEvent) => {
 e.preventDefault();
 if (!newFolderName.trim()) return;

 setFolderError("");
 startTransition(async () => {
 try {
 await createFolder(projectId, newFolderName, currentFolderId);
 setNewFolderName("");
 setIsCreatingFolder(false);
 router.refresh();
 } catch (err) {
 const errMsg = err instanceof Error ? err.message : "Failed to create folder";
 setFolderError(errMsg);
 }
 });
 };

 // Handle File Upload via XHR for progress tracking
 const handleUpload = (file: File) => {
 if (file.size > 25 * 1024 * 1024) {
 setUploadError("File size exceeds the 25MB limit.");
 return;
 }

 setUploadError("");
 setUploadProgress(0);

 const formData = new FormData();
 formData.append("projectId", projectId);
 formData.append("file", file);
 if (currentFolderId) {
 formData.append("folderId", currentFolderId);
 }

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
 handleUpload(file);
 }
 };

 const onDragOver = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(true);
 };

 const onDragLeave = () => {
 setIsDragging(false);
 };

 const onDrop = (e: React.DragEvent) => {
 e.preventDefault();
 setIsDragging(false);
 const file = e.dataTransfer.files?.[0];
 if (file) {
 handleUpload(file);
 }
 };

 return (
 <div className="space-y-6">
 {/* Breadcrumbs and Actions */}
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 {/* Breadcrumbs */}
 <div className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-text-muted">
 <Link
 href="/dashboard/documents"
 className="hover:text-flow-teal transition-colors"
 >
 Documents
 </Link>
 {breadcrumbs.map((crumb) => (
 <span key={crumb.id} className="flex items-center gap-1.5">
 <ChevronRight className="h-3 w-3 text-black/25 dark:text-white/25" />
 <Link
 href={`?folderId=${crumb.id}`}
 className="hover:text-flow-teal transition-colors"
 >
 {crumb.name}
 </Link>
 </span>
 ))}
 </div>

 {/* Action Buttons */}
 {canManage && (
 <div className="flex items-center gap-2">
 <Button
 variant="outline"
 size="sm"
 onClick={() => setIsCreatingFolder(true)}
 className="border-black/10 hover:bg-black/5 dark:border-white/10 dark:hover:bg-white/5"
 >
 <Plus className="mr-1.5 h-3.5 w-3.5" />
 New Folder
 </Button>
 </div>
 )}
 </div>

 {/* Folder Creation Modal / Form */}
 {isCreatingFolder && (
 <div className="rounded-2xl border border-border-hairline dark:border-white/[0.08] bg-white shadow-sm dark:bg-white/[0.02] p-4 ">
 <form onSubmit={handleCreateFolder} className="flex flex-col gap-3 sm:flex-row sm:items-center">
 <input
 type="text"
 value={newFolderName}
 onChange={(e) => setNewFolderName(e.target.value)}
 placeholder="Folder name"
 className="flex-1 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-border-hairline dark:border-white/[0.08] px-4 py-2 text-xs text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors"
 autoFocus
 />
 <div className="flex gap-2 justify-end">
 <Button
 type="button"
 variant="ghost"
 size="sm"
 onClick={() => {
 setIsCreatingFolder(false);
 setNewFolderName("");
 setFolderError("");
 }}
 >
 Cancel
 </Button>
 <Button type="submit" size="sm" disabled={isPending}>
 {isPending && <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />}
 Create
 </Button>
 </div>
 </form>
 {folderError && <p className="mt-2 text-xs text-signal-amber">{folderError}</p>}
 </div>
 )}

 {/* Upload and Filter Panel */}
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <SearchInput placeholder="Search documents in this folder..." />
 </div>

 {/* Drag & Drop Upload Zone */}
 {canManage && (
 <div
 onDragOver={onDragOver}
 onDragLeave={onDragLeave}
 onDrop={onDrop}
 className={cn(
 "relative flex flex-col items-center justify-center rounded-2xl border border-dashed p-8 text-center transition-all duration-300",
 isDragging
  ? "border-flow-teal bg-flow-teal/5 scale-[1.01]"
  : "border-black/10 dark:border-white/10 bg-black/[0.01] dark:bg-white/[0.01] hover:bg-black/[0.02] dark:hover:bg-white/[0.02]"
 )}
 >
 <input
 type="file"
 id="file-upload"
 onChange={onFileChange}
 className="hidden"
 disabled={uploadProgress !== null}
 />
 <label
 htmlFor="file-upload"
 className="flex cursor-pointer flex-col items-center justify-center gap-2.5"
 >
 <div className="rounded-full bg-black/[0.03] dark:bg-white/[0.03] p-3 border border-black/5 dark:border-white/5 text-text-muted group-hover:text-flow-teal transition-colors">
 <UploadCloud className="h-6 w-6" />
 </div>
 <div>
 <p className="text-xs font-semibold text-text-primary">
 Drag & drop files here, or <span className="text-flow-teal hover:underline">browse</span>
 </p>
 <p className="mt-1 text-[10px] text-text-muted">
 PDF, PNG, JPG, GIF up to 25MB
 </p>
 </div>
 </label>

 {/* Upload Progress Bar */}
 {uploadProgress !== null && (
 <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 rounded-2xl px-6">
 <Loader2 className="h-6 w-6 animate-spin text-flow-teal mb-2" />
 <p className="text-xs text-text-primary mb-1 font-medium">Uploading file...</p>
 <div className="w-48 h-1.5 bg-white/10 rounded-full overflow-hidden">
 <div
 className="h-full bg-flow-teal transition-all duration-150"
 style={{ width: `${uploadProgress}%` }}
 />
 </div>
 <span className="mt-1 text-[10px] font-mono text-text-muted">{uploadProgress}%</span>
 </div>
 )}

 {uploadError && (
 <p className="mt-3 text-xs text-signal-amber font-medium">{uploadError}</p>
 )}
 </div>
 )}

 {/* Browser View */}
 {folders.length === 0 && documents.length === 0 ? (
 <div className="rounded-2xl bg-white dark:bg-white/[0.02] p-12 ring-1 ring-black/5 dark:ring-white/5 text-center shadow-sm">
 <FileIcon className="mx-auto h-8 w-8 text-text-muted/40 mb-3" />
 <h3 className="text-sm font-semibold text-text-primary">Folder is empty</h3>
 <p className="mt-1 text-xs text-text-muted">
 Upload a document or create a subfolder to get started.
 </p>
 </div>
 ) : (
 <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
 {/* Folders */}
 {folders.map((folder) => (
 <Link
 key={folder.id}
 href={`?folderId=${folder.id}`}
 className="group flex items-center gap-3.5 rounded-2xl bg-white dark:bg-white/[0.04] p-4 border border-border-hairline dark:border-white/[0.08] shadow-sm dark:shadow-md hover:bg-black/[0.02] dark:hover:bg-white/[0.07] hover:border-flow-teal/20 transition-all duration-300"
 >
 <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] p-2.5 border border-black/5 dark:border-white/5 text-flow-teal">
 <Folder className="h-5 w-5 fill-flow-teal/10" />
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-xs font-semibold text-text-primary truncate group-hover:text-flow-teal transition-colors">
 {folder.name}
 </h4>
 <p className="text-[10px] text-text-muted font-mono mt-0.5">
 Folder
 </p>
 </div>
 </Link>
 ))}

 {/* Documents */}
 {documents.map((doc) => {
 const latestVersion = doc.versions[0];
 const sizeString = latestVersion
 ? `${(latestVersion.fileSizeKb / 1024).toFixed(1)} MB`
 : "0 KB";
 return (
 <Link
 key={doc.id}
 href={`/dashboard/documents/${doc.id}`}
 className="group flex items-center gap-3.5 rounded-2xl bg-white dark:bg-white/[0.02] p-4 border border-border-hairline dark:border-white/[0.06] shadow-sm dark:shadow-md hover:bg-black/[0.02] dark:hover:bg-white/[0.05] hover:border-flow-teal/20 transition-all duration-300"
 >
 <div className="rounded-xl bg-black/[0.03] dark:bg-white/[0.03] p-2.5 border border-black/5 dark:border-white/5 text-text-muted group-hover:text-flow-teal transition-colors">
 <FileText className="h-5 w-5" />
 </div>
 <div className="flex-1 min-w-0">
 <h4 className="text-xs font-semibold text-text-primary truncate group-hover:text-flow-teal transition-colors">
 {doc.name}
 </h4>
 <div className="flex items-center gap-2 mt-1">
 <span className="text-[9px] font-mono bg-black/5 dark:bg-white/5 px-1.5 py-0.5 rounded text-text-muted border border-black/5 dark:border-white/5">
 v{latestVersion?.versionNum || 1}
 </span>
 <span className="text-[10px] text-text-muted font-mono">
 {sizeString}
 </span>
 </div>
 </div>
 </Link>
 );
 })}
 </div>
 )}
 </div>
 );
}
export default DocumentBrowserClient;
