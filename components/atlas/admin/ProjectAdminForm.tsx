"use client";

import React, { useState, useEffect } from "react";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategoryId,
  ProjectStatusId,
  IslandGroupId,
  ProjectCategoryEnum,
  ProjectStatusEnum,
  IslandGroupEnum,
  generateSlug,
  AdminProjectDTO,
  ProjectAuditSummaryDTO,
} from "@/lib/validations/projectAtlasSchema";
import { ProjectLocationPicker } from "./ProjectLocationPicker";
import { ProjectImageManager } from "./ProjectImageManager";
import {
  Building2,
  MapPin,
  Users,
  Image as ImageIcon,
  History,
  Save,
  RotateCcw,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Clock,
  User as UserIcon,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface ProjectAdminFormProps {
  initialData?: AdminProjectDTO | null;
  onSuccess?: (savedProject: AdminProjectDTO) => void;
  onCancel?: () => void;
  className?: string;
}

type TabKey = "overview" | "location" | "technical" | "media" | "audit";

export function ProjectAdminForm({
  initialData,
  onSuccess,
  onCancel,
  className,
}: ProjectAdminFormProps) {
  const isEditing = Boolean(initialData?.id);
  const [activeTab, setActiveTab] = useState<TabKey>("overview");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastKnownUpdatedAt, setLastKnownUpdatedAt] = useState<string | undefined>(
    initialData?.updatedAt
  );

  // Form Field States
  const [name, setName] = useState(initialData?.name || "");
  const [slug, setSlug] = useState(initialData?.slug || "");
  const [projectCode, setProjectCode] = useState(initialData?.projectCode || "");
  const [category, setCategory] = useState<ProjectCategoryId>(
    initialData?.category || "HYDROPOWER"
  );
  const [status, setStatus] = useState<ProjectStatusId>(initialData?.status || "ONGOING");
  const [description, setDescription] = useState(initialData?.description || "");
  const [client, setClient] = useState(initialData?.client || "");
  const [projectValue, setProjectValue] = useState(initialData?.projectValue || "");
  const [featured, setFeatured] = useState<boolean>(initialData?.featured || false);

  // Location States
  const [latitude, setLatitude] = useState<number>(initialData?.latitude ?? 12.8797);
  const [longitude, setLongitude] = useState<number>(initialData?.longitude ?? 121.774);
  const [islandGroup, setIslandGroup] = useState<IslandGroupId>(
    (initialData?.islandGroup as IslandGroupId) || "LUZON"
  );
  const [region, setRegion] = useState(initialData?.region || "");
  const [province, setProvince] = useState(initialData?.province || "");
  const [municipality, setMunicipality] = useState(initialData?.municipality || "");
  const [barangay, setBarangay] = useState(initialData?.barangay || "");
  const [locationDescription, setLocationDescription] = useState(
    initialData?.locationDescription || ""
  );

  // Technical & Team States
  const [capacity, setCapacity] = useState(initialData?.capacity || "");
  const [targetCodDate, setTargetCodDate] = useState(
    initialData?.targetCodDate ? initialData.targetCodDate.slice(0, 10) : ""
  );
  const [leadPMName, setLeadPMName] = useState(initialData?.leadPMName || "");
  const [leadPMRole, setLeadPMRole] = useState(initialData?.leadPMRole || "");
  const [leadPMDivision, setLeadPMDivision] = useState(initialData?.leadPMDivision || "");
  const [leadPMLicense, setLeadPMLicense] = useState(initialData?.leadPMLicense || "");
  const [leadPMContact, setLeadPMContact] = useState(initialData?.leadPMContact || "");
  const [scopeInput, setScopeInput] = useState(
    initialData?.engineeringScope ? initialData.engineeringScope.join(", ") : ""
  );

  // Media States
  const [featuredImage, setFeaturedImage] = useState<string | null>(
    initialData?.featuredImage || null
  );
  const [gallery, setGallery] = useState<string[]>(initialData?.gallery || []);

  // Audit Logs State
  const [auditLogs, setAuditLogs] = useState<ProjectAuditSummaryDTO[]>(
    initialData?.recentAuditLogs || []
  );

  // Auto-generate slug on name change if not editing
  const handleAutoSlug = () => {
    if (name.trim()) {
      setSlug(generateSlug(name));
      toast.info("Slug generated from project name");
    }
  };

  const handleCoordinatesChange = (lat: number, lng: number) => {
    setLatitude(lat);
    setLongitude(lng);
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!name.trim()) {
      toast.error("Project name is required.");
      setActiveTab("overview");
      return;
    }

    if (!slug.trim()) {
      toast.error("Project slug is required.");
      setActiveTab("overview");
      return;
    }

    if (!region.trim() || !province.trim() || !municipality.trim()) {
      toast.error("Region, Province, and Municipality are required.");
      setActiveTab("location");
      return;
    }

    const scopeArray = scopeInput
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      name: name.trim(),
      slug: slug.trim(),
      projectCode: projectCode.trim() || null,
      category,
      status,
      description: description.trim() || null,
      latitude,
      longitude,
      islandGroup,
      region: region.trim(),
      province: province.trim(),
      municipality: municipality.trim(),
      barangay: barangay.trim() || null,
      locationDescription: locationDescription.trim() || null,
      capacity: capacity.trim() || null,
      client: client.trim() || null,
      projectValue: projectValue.trim() || null,
      featured,
      targetCodDate: targetCodDate ? new Date(targetCodDate).toISOString() : null,
      leadPMName: leadPMName.trim() || null,
      leadPMRole: leadPMRole.trim() || null,
      leadPMDivision: leadPMDivision.trim() || null,
      leadPMLicense: leadPMLicense.trim() || null,
      leadPMContact: leadPMContact.trim() || null,
      engineeringScope: scopeArray,
      featuredImage: featuredImage || null,
      gallery,
      lastKnownUpdatedAt,
    };

    try {
      setIsSubmitting(true);

      const url = isEditing
        ? `/api/admin/projects/${initialData!.id}`
        : "/api/admin/projects";
      const method = isEditing ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409 && data.code === "STALE_RECORD") {
          toast.error(
            "Conflict: This project was modified by another administrator. Please reload to see the latest version before saving.",
            { duration: 8000 }
          );
          return;
        }
        throw new Error(data.error || data.message || "Failed to save project");
      }

      toast.success(
        isEditing
          ? `Project "${data.name}" updated successfully`
          : `Project "${data.name}" created successfully`
      );

      if (data.updatedAt) {
        setLastKnownUpdatedAt(data.updatedAt);
      }

      if (onSuccess) {
        onSuccess(data);
      }
    } catch (err: any) {
      toast.error(err.message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={cn("bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-800 overflow-hidden", className)}>
      {/* Header Bar */}
      <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <div>
          <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
            {isEditing ? `Edit Project: ${initialData?.name}` : "Create New SCIC Project"}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {isEditing
              ? `Internal ID: ${initialData?.id} • Last Updated: ${initialData?.updatedAt ? new Date(initialData.updatedAt).toLocaleString() : "Unknown"}`
              : "PostgreSQL will assign an immutable ID and record a CREATE audit log on submission."}
          </p>
        </div>

        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Close Form"
            aria-label="Close Form"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 px-6 gap-2 bg-white dark:bg-slate-900 text-xs font-medium overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("overview")}
          className={cn(
            "py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap",
            activeTab === "overview"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Building2 className="w-4 h-4" /> 1. Overview & Identity
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("location")}
          className={cn(
            "py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap",
            activeTab === "location"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <MapPin className="w-4 h-4" /> 2. Geospatial & Location
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("technical")}
          className={cn(
            "py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap",
            activeTab === "technical"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <Users className="w-4 h-4" /> 3. Technical & Team
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("media")}
          className={cn(
            "py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap",
            activeTab === "media"
              ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
              : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
          )}
        >
          <ImageIcon className="w-4 h-4" /> 4. Media & Gallery
        </button>

        {isEditing && (
          <button
            type="button"
            onClick={() => setActiveTab("audit")}
            className={cn(
              "py-3 px-3 border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap",
              activeTab === "audit"
                ? "border-emerald-500 text-emerald-600 dark:text-emerald-400 font-bold"
                : "border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-slate-200"
            )}
          >
            <History className="w-4 h-4" /> 5. Audit & History ({auditLogs.length})
          </button>
        )}
      </div>

      {/* Tab Panels */}
      <div className="p-6">
        {/* TAB 1: OVERVIEW & IDENTITY */}
        {activeTab === "overview" && (
          <div className="space-y-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Tumauini Hydroelectric Power Plant"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center justify-between">
                  <span>URL Slug <span className="text-rose-500">*</span></span>
                  {!isEditing && (
                    <button
                      type="button"
                      onClick={handleAutoSlug}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1 hover:underline"
                    >
                      <Sparkles className="w-3 h-3" /> Auto-Suggest
                    </button>
                  )}
                </label>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="e.g. tumauini-hepp"
                  className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <span className="text-[10px] text-slate-400">
                  Unique public URL identifier (e.g. /projects-map?select={slug || "slug"})
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Code (Business Identifier)
                </label>
                <input
                  type="text"
                  value={projectCode}
                  onChange={(e) => setProjectCode(e.target.value)}
                  placeholder="e.g. SCIC-HEPP-01"
                  className="mt-1 w-full px-3 py-2 text-sm font-mono rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProjectCategoryId)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.values(PROJECT_CATEGORIES).map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.label} ({cat.shortLabel})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Status <span className="text-rose-500">*</span>
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as ProjectStatusId)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  {Object.values(PROJECT_STATUSES).map((st) => (
                    <option key={st.id} value={st.id}>
                      {st.badgeLabel}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Client / Owner Agency
                </label>
                <input
                  type="text"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  placeholder="e.g. National Irrigation Administration (NIA)"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Project Contract Value
                </label>
                <input
                  type="text"
                  value={projectValue}
                  onChange={(e) => setProjectValue(e.target.value)}
                  placeholder="e.g. ₱2,850,000,000"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Project Narrative & Scope Description
              </label>
              <textarea
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Comprehensive technical summary of the engineering scope, major hydraulic structures, powerhouse, and civil works..."
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            <div className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                id="featuredCheck"
                checked={featured}
                onChange={(e) => setFeatured(e.target.checked)}
                className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 border-slate-300 dark:border-slate-700"
              />
              <label htmlFor="featuredCheck" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Mark as Featured Flagship Project (prioritized in directory and national map cards)
              </label>
            </div>
          </div>
        )}

        {/* TAB 2: GEOSPATIAL & LOCATION */}
        {activeTab === "location" && (
          <div className="space-y-6 max-w-4xl">
            {/* Interactive Location Picker */}
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-emerald-500" />
                Geographic Coordinates
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                Specify precise coordinates via manual numerical entry or by dragging the marker pin on the interactive MapLibre map.
              </p>
              <ProjectLocationPicker
                latitude={latitude}
                longitude={longitude}
                onChange={handleCoordinatesChange}
              />
            </div>

            {/* Administrative Hierarchy Fields */}
            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3">
                Administrative Hierarchy Data
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Island Group <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={islandGroup}
                    onChange={(e) => setIslandGroup(e.target.value as IslandGroupId)}
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="LUZON">Luzon</option>
                    <option value="VISAYAS">Visayas</option>
                    <option value="MINDANAO">Mindanao</option>
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Region <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={region}
                    onChange={(e) => setRegion(e.target.value)}
                    placeholder="e.g. Region II (Cagayan Valley)"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Province <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={province}
                    onChange={(e) => setProvince(e.target.value)}
                    placeholder="e.g. Isabela"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Municipality <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={municipality}
                    onChange={(e) => setMunicipality(e.target.value)}
                    placeholder="e.g. Tumauini"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Barangay / Site Location
                  </label>
                  <input
                    type="text"
                    value={barangay}
                    onChange={(e) => setBarangay(e.target.value)}
                    placeholder="e.g. Barangay Antagan Uno"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Location Description
                  </label>
                  <input
                    type="text"
                    value={locationDescription}
                    onChange={(e) => setLocationDescription(e.target.value)}
                    placeholder="e.g. Along Tumauini River, Eastern Cagayan Basin"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TECHNICAL & TEAM */}
        {activeTab === "technical" && (
          <div className="space-y-4 max-w-4xl">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Engineering Capacity / Metric
                </label>
                <input
                  type="text"
                  value={capacity}
                  onChange={(e) => setCapacity(e.target.value)}
                  placeholder="e.g. 11.3 MW, 320 MLD, 15.6 km"
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  Target COD / Delivery Date
                </label>
                <input
                  type="date"
                  value={targetCodDate}
                  onChange={(e) => setTargetCodDate(e.target.value)}
                  className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-500" />
                Lead Project Manager & Technical Leadership
              </h4>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Lead PM Name
                  </label>
                  <input
                    type="text"
                    value={leadPMName}
                    onChange={(e) => setLeadPMName(e.target.value)}
                    placeholder="e.g. Engr. Carlos Mendoza"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Role / Title
                  </label>
                  <input
                    type="text"
                    value={leadPMRole}
                    onChange={(e) => setLeadPMRole(e.target.value)}
                    placeholder="e.g. Senior Project Manager"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Corporate Division
                  </label>
                  <input
                    type="text"
                    value={leadPMDivision}
                    onChange={(e) => setLeadPMDivision(e.target.value)}
                    placeholder="e.g. Heavy Civil Infrastructure Division"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    PRC Professional License
                  </label>
                  <input
                    type="text"
                    value={leadPMLicense}
                    onChange={(e) => setLeadPMLicense(e.target.value)}
                    placeholder="e.g. Civil Engineer - Reg. No. 0089412"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Official Contact Email
                  </label>
                  <input
                    type="email"
                    value={leadPMContact}
                    onChange={(e) => setLeadPMContact(e.target.value)}
                    placeholder="e.g. pm.tumauini@staclara.com.ph"
                    className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>

            <div className="border-t border-slate-200 dark:border-slate-800 pt-4">
              <label className="text-xs font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-emerald-500" />
                Engineering Scope Packages (comma-separated)
              </label>
              <textarea
                rows={3}
                value={scopeInput}
                onChange={(e) => setScopeInput(e.target.value)}
                placeholder="e.g. Headrace Tunnel (3.8m dia), Surface Powerhouse, Penstock Erection, 69kV Switchyard"
                className="mt-1 w-full px-3 py-2 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
              <span className="text-[11px] text-slate-400">
                Enter distinct engineering packages separated by commas.
              </span>
            </div>
          </div>
        )}

        {/* TAB 4: MEDIA & IMAGERY */}
        {activeTab === "media" && (
          <div className="max-w-4xl">
            <ProjectImageManager
              projectId={initialData?.id}
              featuredImage={featuredImage}
              gallery={gallery}
              onFeaturedImageChange={setFeaturedImage}
              onGalleryChange={setGallery}
            />
          </div>
        )}

        {/* TAB 5: AUDIT & HISTORY */}
        {activeTab === "audit" && isEditing && (
          <div className="space-y-6 max-w-4xl">
            {/* Metadata Summary Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700">
              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Created</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {initialData?.createdAt ? new Date(initialData.createdAt).toLocaleString() : "—"}
                </p>
                <p className="text-[11px] text-slate-500">
                  By: {initialData?.createdBy?.name || "System Seed"} ({initialData?.createdBy?.email || "n/a"})
                </p>
              </div>

              <div>
                <span className="text-[11px] text-slate-400 uppercase font-semibold">Last Modified</span>
                <p className="text-xs font-medium text-slate-800 dark:text-slate-200 mt-0.5">
                  {initialData?.updatedAt ? new Date(initialData.updatedAt).toLocaleString() : "—"}
                </p>
                <p className="text-[11px] text-slate-500">
                  By: {initialData?.updatedBy?.name || "System"} ({initialData?.updatedBy?.email || "n/a"})
                </p>
              </div>
            </div>

            {/* Audit Logs Timeline */}
            <div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-3 flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-500" />
                Immutable Audit Log History
              </h4>

              {auditLogs.length > 0 ? (
                <div className="space-y-3">
                  {auditLogs.map((log) => (
                    <div
                      key={log.id}
                      className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 text-xs space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span
                            className={cn(
                              "px-2 py-0.5 rounded font-mono font-bold text-[10px]",
                              log.action === "CREATE"
                                ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30"
                                : log.action === "UPDATE"
                                ? "bg-blue-500/20 text-blue-600 dark:text-blue-400 border border-blue-500/30"
                                : "bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30"
                            )}
                          >
                            {log.action}
                          </span>
                          <span className="text-slate-700 dark:text-slate-300 font-medium">
                            {log.userName || log.userEmail || "System Administrator"}
                          </span>
                        </div>
                        <span className="text-slate-400 text-[11px]">
                          {new Date(log.createdAt).toLocaleString()}
                        </span>
                      </div>

                      {/* Diff readout */}
                      {log.diff && (
                        <div className="bg-slate-100 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800/80 font-mono text-[11px] overflow-x-auto space-y-1">
                          {Object.entries(log.diff).map(([key, change]: [string, any]) => (
                            <div key={key} className="flex items-start gap-2">
                              <span className="text-slate-500 shrink-0 font-semibold">{key}:</span>
                              {change && typeof change === "object" && "before" in change ? (
                                <span className="text-slate-700 dark:text-slate-300">
                                  <span className="text-rose-500 line-through">
                                    {String(change.before)}
                                  </span>{" "}
                                  <ArrowRight className="inline w-3 h-3 text-slate-400" />{" "}
                                  <span className="text-emerald-500 font-bold">
                                    {String(change.after)}
                                  </span>
                                </span>
                              ) : (
                                <span className="text-slate-700 dark:text-slate-300">
                                  {JSON.stringify(change)}
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl text-slate-400 text-xs">
                  No previous audit records recorded for this project yet.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer Submission Bar */}
      <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50">
        <span className="text-xs text-slate-500">
          All modifications are transactionally logged to PostgreSQL with field-level diffs.
        </span>

        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              type="button"
              onClick={onCancel}
              className="px-3 py-1.5 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
          )}

          <button
            type="button"
            disabled={isSubmitting}
            onClick={handleSubmit}
            className="flex items-center gap-1.5 px-5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSubmitting ? "Saving..." : isEditing ? "Save Project Changes" : "Create Project"}
          </button>
        </div>
      </div>
    </div>
  );
}
