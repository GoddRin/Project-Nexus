"use client";

import React, { useState, useRef } from "react";
import Image from "next/image";
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Star,
  Link as LinkIcon,
  AlertCircle,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProjectImageManagerProps {
  projectId?: string;
  featuredImage: string | null | undefined;
  gallery: string[];
  onFeaturedImageChange: (url: string | null) => void;
  onGalleryChange: (gallery: string[]) => void;
  className?: string;
}

export function ProjectImageManager({
  projectId,
  featuredImage,
  gallery,
  onFeaturedImageChange,
  onGalleryChange,
  className,
}: ProjectImageManagerProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [directUrlInput, setDirectUrlInput] = useState("");
  const [showUrlField, setShowUrlField] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadTarget, setUploadTarget] = useState<"featured" | "gallery">("featured");

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!projectId) {
      toast.error(
        "Please create/save the project first before uploading media to durable Supabase Storage.",
        { duration: 5000 }
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("File size exceeds 5MB limit. Please choose an optimized image.");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      setIsUploading(true);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("projectId", projectId);

      const res = await fetch("/api/admin/projects/upload-image", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to upload image");
      }

      toast.success("Image uploaded successfully to Supabase Storage");

      if (uploadTarget === "featured") {
        onFeaturedImageChange(data.url);
      } else {
        onGalleryChange([...gallery, data.url]);
      }
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleAddDirectUrl = () => {
    const trimmed = directUrlInput.trim();
    if (!trimmed) return;

    if (
      !trimmed.startsWith("https://") &&
      !trimmed.startsWith("http://") &&
      !trimmed.startsWith("/")
    ) {
      toast.error("Please enter a valid HTTPS URL or internal path (/project-images/...)");
      return;
    }

    if (uploadTarget === "featured") {
      onFeaturedImageChange(trimmed);
      toast.success("Featured image URL updated");
    } else {
      if (!gallery.includes(trimmed)) {
        onGalleryChange([...gallery, trimmed]);
        toast.success("Image added to gallery");
      }
    }

    setDirectUrlInput("");
    setShowUrlField(false);
  };

  const handleRemoveGalleryImage = (indexToRemove: number) => {
    const updated = gallery.filter((_, idx) => idx !== indexToRemove);
    onGalleryChange(updated);
  };

  const handleSetFeaturedFromGallery = (url: string) => {
    onFeaturedImageChange(url);
    toast.success("Selected image set as Featured");
  };

  return (
    <div className={cn("space-y-6", className)}>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
      />

      {/* Featured Image Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
              Featured Cover Image
            </h4>
            <p className="text-xs text-slate-500">
              Primary project banner displayed on cards, map popups, and the intelligence drawer.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={isUploading}
              onClick={() => {
                setUploadTarget("featured");
                if (fileInputRef.current) fileInputRef.current.click();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50"
            >
              {isUploading && uploadTarget === "featured" ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Upload className="w-3.5 h-3.5" />
              )}
              Upload Cover
            </button>

            <button
              type="button"
              onClick={() => {
                setUploadTarget("featured");
                setShowUrlField(!showUrlField);
              }}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5" /> Direct URL
            </button>
          </div>
        </div>

        {/* Direct URL input field */}
        {showUrlField && (
          <div className="flex items-center gap-2 p-2.5 mb-3 rounded-lg bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <input
              type="text"
              placeholder="https://example.com/photo.jpg or /project-images/..."
              value={directUrlInput}
              onChange={(e) => setDirectUrlInput(e.target.value)}
              className="flex-1 px-3 py-1.5 text-xs rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
            <button
              type="button"
              onClick={handleAddDirectUrl}
              className="px-3 py-1.5 text-xs font-semibold rounded bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
            >
              Apply URL
            </button>
          </div>
        )}

        {/* Featured Image Preview Card */}
        {featuredImage ? (
          <div className="relative group w-full h-52 sm:h-64 rounded-xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950">
            <img
              src={featuredImage}
              alt="Project featured cover"
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/logo.png";
              }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-between p-3">
              <span className="text-xs text-white truncate max-w-xs font-mono">
                {featuredImage}
              </span>
              <button
                type="button"
                onClick={() => onFeaturedImageChange(null)}
                className="px-2.5 py-1 text-xs font-semibold rounded bg-rose-600 hover:bg-rose-700 text-white flex items-center gap-1 shadow"
              >
                <Trash2 className="w-3.5 h-3.5" /> Remove Cover
              </button>
            </div>
          </div>
        ) : (
          <div className="w-full h-36 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-400 gap-2 bg-slate-50/50 dark:bg-slate-900/30">
            <ImageIcon className="w-8 h-8 stroke-1" />
            <span className="text-xs">No cover image attached</span>
          </div>
        )}
      </div>

      {/* Gallery Images Section */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <div>
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Project Photo Gallery ({gallery.length})
            </h4>
            <p className="text-xs text-slate-500">
              Supporting engineering documentation, progress photos, and site inspections.
            </p>
          </div>

          <button
            type="button"
            disabled={isUploading}
            onClick={() => {
              setUploadTarget("gallery");
              if (fileInputRef.current) fileInputRef.current.click();
            }}
            className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
          >
            {isUploading && uploadTarget === "gallery" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Plus className="w-3.5 h-3.5" />
            )}
            Add to Gallery
          </button>
        </div>

        {gallery.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {gallery.map((imgUrl, index) => (
              <div
                key={index}
                className="relative group rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-950 aspect-video"
              >
                <img
                  src={imgUrl}
                  alt={`Gallery ${index + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/logo.png";
                  }}
                />
                <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5 p-2">
                  <button
                    type="button"
                    title="Set as Featured"
                    onClick={() => handleSetFeaturedFromGallery(imgUrl)}
                    className="p-1.5 rounded-full bg-slate-800 text-amber-400 hover:bg-slate-700"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    title="Remove Image"
                    onClick={() => handleRemoveGalleryImage(index)}
                    className="p-1.5 rounded-full bg-slate-800 text-rose-400 hover:bg-rose-900"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-6 border border-dashed border-slate-300 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
            No gallery photos added yet. Upload real construction progress photos above.
          </div>
        )}
      </div>

      {!projectId && (
        <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400 text-xs">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>
            <strong>New Project Notice:</strong> To ensure durable, project-isolated storage paths in
            Supabase, save this project record first. You can then immediately upload photos directly
            into this project's dedicated folder.
          </span>
        </div>
      )}
    </div>
  );
}
