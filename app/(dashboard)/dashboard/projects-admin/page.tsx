"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  Clock,
  AlertTriangle,
  MapPin,
  ExternalLink,
  Layers,
  X,
  XCircle,
  FileText,
} from "lucide-react";
import {
  PROJECT_CATEGORIES,
  PROJECT_STATUSES,
  ProjectCategoryId,
  ProjectStatusId,
  IslandGroupId,
  AdminProjectDTO,
} from "@/lib/validations/projectAtlasSchema";
import { ProjectAdminForm } from "@/components/atlas/admin/ProjectAdminForm";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectsAdminPage() {
  const router = useRouter();

  // Data states
  const [allProjects, setAllProjects] = useState<AdminProjectDTO[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filter & Pagination states
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [category, setCategory] = useState<string>("ALL");
  const [status, setStatus] = useState<string>("ALL");
  const [islandGroup, setIslandGroup] = useState<string>("ALL");

  // Pure Alphabetical Sort Order (strictly A-Z) regardless of filter
  const sortedProjects = useMemo(() => {
    return [...allProjects].sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
    );
  }, [allProjects]);

  // Client-side paginated slice: instantaneous 0ms page changes
  const paginatedProjects = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedProjects.slice(start, start + pageSize);
  }, [sortedProjects, page, pageSize]);

  const totalPages = Math.max(1, Math.ceil(sortedProjects.length / pageSize));

  // Drawer / Form state
  const [editingProject, setEditingProject] = useState<AdminProjectDTO | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Delete modal state
  const [projectToDelete, setProjectToDelete] = useState<AdminProjectDTO | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  // Fetch projects from /api/admin/projects (loads entire matching dataset for instant client pagination)
  const fetchProjects = useCallback(async () => {
    try {
      setIsLoading(true);
      const params = new URLSearchParams({
        page: "1",
        pageSize: "500",
        sortBy: "name",
        sortDirection: "asc",
        category,
        status,
        islandGroup,
      });

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`/api/admin/projects?${params.toString()}`);
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          toast.error("You are not authorized to view the administrative project workspace.");
          router.push("/dashboard/projects-map");
          return;
        }
        throw new Error("Failed to load project records");
      }

      const data = await res.json();
      const sorted = (data.data || []).slice().sort((a: AdminProjectDTO, b: AdminProjectDTO) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
      );
      setAllProjects(sorted);
      setTotal(data.total || (data.data ? data.data.length : 0));
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch projects");
    } finally {
      setIsLoading(false);
    }
  }, [debouncedSearch, category, status, islandGroup, router]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  // Soft delete handler
  const handleConfirmDelete = async () => {
    if (!projectToDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/admin/projects/${projectToDelete.id}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to archive project");
      }

      toast.success(`Project "${projectToDelete.name}" successfully archived.`);
      setProjectToDelete(null);
      fetchProjects();
    } catch (err: any) {
      toast.error(err.message || "Failed to archive project");
    } finally {
      setIsDeleting(false);
    }
  };

  // Summary counts across complete active dataset
  const ongoingCount = allProjects.filter((p) => p.status === "ONGOING").length;
  const completedCount = allProjects.filter((p) => p.status === "COMPLETED").length;
  const upcomingCount = allProjects.filter((p) => p.status === "UPCOMING").length;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-[1600px] mx-auto space-y-6">
      {/* Top Banner & Primary Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
            <Building2 className="w-7 h-7 text-emerald-600 dark:text-emerald-400" />
            Project Atlas Administration
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Maintain Sta. Clara corporate project portfolio, locations, leadership, imagery, and audit records with real-time map synchronization.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/dashboard/projects-map"
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-sm"
          >
            <MapPin className="w-3.5 h-3.5 text-emerald-500" />
            Open Atlas Map
          </Link>

          <button
            type="button"
            onClick={() => {
              setEditingProject(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white shadow-md transition-all active:scale-95"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            Add New Project
          </button>
        </div>
      </div>

      {/* Corporate Summary Counters */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 shadow-sm">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
            Total Projects
          </span>
          <div className="text-2xl font-black text-slate-900 dark:text-white mt-1">
            {total}
          </div>
          <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
            Active Corporate Registry
          </span>
        </div>

        <div className="p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 dark:bg-emerald-500/10 shadow-sm">
          <span className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
            Active Construction
          </span>
          <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400 mt-1">
            {ongoingCount}
          </div>
          <span className="text-[11px] text-slate-500">Visible on active radar</span>
        </div>

        <div className="p-4 rounded-xl border border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10 shadow-sm">
          <span className="text-[11px] font-bold text-sky-600 dark:text-sky-400 uppercase tracking-wider">
            Commissioned / Delivered
          </span>
          <div className="text-2xl font-black text-sky-600 dark:text-sky-400 mt-1">
            {completedCount}
          </div>
          <span className="text-[11px] text-slate-500">Historical delivery</span>
        </div>

        <div className="p-4 rounded-xl border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 shadow-sm">
          <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
            Upcoming / Mobilizing
          </span>
          <div className="text-2xl font-black text-amber-600 dark:text-amber-400 mt-1">
            {upcomingCount}
          </div>
          <span className="text-[11px] text-slate-500">Pipeline portfolio</span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm flex flex-col md:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search projects by name, code, client, municipality, province, or PM..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
          <select
            value={category}
            onChange={(e) => {
              setCategory(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {Object.values(PROJECT_CATEGORIES).map((cat) => (
              <option key={cat.id} value={cat.id}>
                {cat.shortLabel}
              </option>
            ))}
          </select>

          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Statuses</option>
            {Object.values(PROJECT_STATUSES).map((st) => (
              <option key={st.id} value={st.id}>
                {st.badgeLabel}
              </option>
            ))}
          </select>

          <select
            value={islandGroup}
            onChange={(e) => {
              setIslandGroup(e.target.value);
              setPage(1);
            }}
            className="px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="ALL">All Island Groups</option>
            <option value="LUZON">Luzon</option>
            <option value="VISAYAS">Visayas</option>
            <option value="MINDANAO">Mindanao</option>
          </select>

          <button
            type="button"
            title="Reset Filters"
            onClick={() => {
              setSearch("");
              setCategory("ALL");
              setStatus("ALL");
              setIslandGroup("ALL");
              setPage(1);
            }}
            className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-500"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Corporate Projects Data Table */}
      <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/75 dark:bg-slate-950/75 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Project</th>
                <th className="py-3 px-3">Code</th>
                <th className="py-3 px-3">Category</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3">Location</th>
                <th className="py-3 px-3">Coordinates</th>
                <th className="py-3 px-3">Lead PM</th>
                <th className="py-3 px-3">Last Modified</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {isLoading ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    <div className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
                      <span>Loading authoritative project portfolio from PostgreSQL...</span>
                    </div>
                  </td>
                </tr>
              ) : allProjects.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400">
                    No matching project records found in the database.
                  </td>
                </tr>
              ) : (
                paginatedProjects.map((p) => {
                  const cat = PROJECT_CATEGORIES[p.category] || PROJECT_CATEGORIES.OTHER;
                  const st = PROJECT_STATUSES[p.status] || PROJECT_STATUSES.ONGOING;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          {p.featuredImage ? (
                            <img
                              src={p.featuredImage}
                              alt=""
                              className="w-9 h-9 rounded-lg object-cover shrink-0 border border-slate-200 dark:border-slate-800 bg-slate-950"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "/logo.png";
                              }}
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 font-bold text-xs border border-emerald-500/20">
                              {p.name.slice(0, 2).toUpperCase()}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 dark:text-white truncate max-w-xs sm:max-w-sm">
                                {p.name}
                              </span>
                              {p.featured && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                                  FEATURED
                                </span>
                              )}
                            </div>
                            <span className="font-mono text-[10px] text-slate-400">
                              {p.slug}
                            </span>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-600 dark:text-slate-300">
                        {p.projectCode || "—"}
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            cat.twBg,
                            cat.twText,
                            cat.twBorder
                          )}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: cat.color }}
                          />
                          {cat.shortLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3">
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border",
                            st.twBg
                          )}
                        >
                          <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: st.color }}
                          />
                          {st.badgeLabel}
                        </span>
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        <div>{p.municipality}, {p.province}</div>
                        <span className="text-[10px] text-slate-400">{p.region}</span>
                      </td>

                      <td className="py-3 px-3 font-mono text-[10px] text-slate-500">
                        {p.latitude.toFixed(4)}, {p.longitude.toFixed(4)}
                      </td>

                      <td className="py-3 px-3 text-slate-700 dark:text-slate-300">
                        <div>{p.leadPMName || "—"}</div>
                        {p.leadPMRole && (
                          <span className="text-[10px] text-slate-400">{p.leadPMRole}</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-slate-500 text-[11px]">
                        <div>{p.updatedAt ? new Date(p.updatedAt).toLocaleDateString() : "—"}</div>
                        {p.updatedBy?.name && (
                          <span className="text-[10px] text-slate-400 truncate max-w-[100px] block">
                            by {p.updatedBy.name}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link
                            href={`/dashboard/projects-map?select=${p.id}`}
                            title="Inspect on Map"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-500/10 transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>

                          <Link
                            href={`/dashboard/projects/${p.id}`}
                            title="View Project Profile"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-[#0284C7] hover:bg-[#0284C7]/10 dark:hover:text-[#00E5FF] transition-colors"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>

                          <button
                            type="button"
                            title="Edit Project"
                            onClick={() => {
                              setEditingProject(p);
                              setIsFormOpen(true);
                            }}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            type="button"
                            title="Archive Project"
                            onClick={() => setProjectToDelete(p)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>
            Showing {allProjects.length > 0 ? (page - 1) * pageSize + 1 : 0} to{" "}
            {Math.min(page * pageSize, allProjects.length)} of {total} projects
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((prev) => Math.max(1, prev - 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Page {page} of {totalPages}
            </span>

            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
              className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Project Form Modal / Drawer */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-sm overflow-y-auto">
          <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto my-auto rounded-2xl shadow-2xl">
            <ProjectAdminForm
              initialData={editingProject}
              onCancel={() => {
                setIsFormOpen(false);
                setEditingProject(null);
              }}
              onSuccess={(saved) => {
                setIsFormOpen(false);
                setEditingProject(null);
                fetchProjects();
              }}
            />
          </div>
        </div>
      )}

      {/* Delete / Archive Confirmation Dialog */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl p-6 border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-600 dark:text-rose-400">
              <div className="w-10 h-10 rounded-full bg-rose-500/10 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Archive Project Record?
                </h3>
                <p className="text-xs text-slate-500">
                  This action is governed by strict soft-delete audit policy.
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              Are you sure you want to archive <strong>{projectToDelete.name}</strong>?
              The project will immediately disappear from the public Atlas map and directory.
              All audit history, tickets, assets, and equipment records will remain permanently intact in PostgreSQL.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setProjectToDelete(null)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-rose-600 hover:bg-rose-700 text-white shadow transition-colors disabled:opacity-50"
              >
                {isDeleting ? "Archiving..." : "Yes, Archive Project"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
