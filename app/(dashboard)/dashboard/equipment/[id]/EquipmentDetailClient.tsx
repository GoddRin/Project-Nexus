"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, FileText, Wrench, Calendar, MapPin, ShieldCheck, 
  Trash2, Edit, Plus, Upload, Download, Trash, Loader2, Sparkles, Server
} from "lucide-react";
import { 
  EquipmentCategory, EquipmentStatus, EquipmentCondition, 
  EquipmentDocument, EquipmentMaintenanceLog
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { uploadDocument, deleteDocument, logMaintenance, deleteEquipment } from "../actions";


interface EquipmentDetail {
  id: string;
  projectId: string;
  equipmentTag: string;
  name: string;
  category: EquipmentCategory;
  manufacturer: string | null;
  model: string | null;
  serialNumber: string | null;
  installationDate: Date | null;
  commissionDate: Date | null;
  location: string | null;
  siteLocationId: string | null;
  siteLocation: { name: string; slug: string } | null;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  specifications: Record<string, string>;
  createdAt: Date;
  createdBy: { name: string };
}

interface DocWithUrl extends EquipmentDocument {
  downloadUrl: string;
  uploadedBy: { name: string };
}

interface LogWithUser extends EquipmentMaintenanceLog {
  loggedBy: { name: string };
}

interface EquipmentDetailClientProps {
  equipment: EquipmentDetail;
  documents: DocWithUrl[];
  maintenanceLogs: LogWithUser[];
  role: string;
  projectId: string;
}

export function EquipmentDetailClient({
  equipment,
  documents,
  maintenanceLogs,
  role,
  projectId,
}: EquipmentDetailClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const isEditor = ["ADMINISTRATOR", "IT_SUPPORT", "PROJECT_MANAGER"].includes(role);
  const isManager = ["ADMINISTRATOR", "PROJECT_MANAGER"].includes(role);

  // File Upload State
  const [uploading, setUploading] = useState(false);

  // Maintenance Log Form State
  const [logType, setLogType] = useState("Inspection");
  const [logDesc, setLogDesc] = useState("");
  const [logFindings, setLogFindings] = useState("");
  const [logAction, setLogAction] = useState("");
  const [nextDue, setNextDue] = useState("");

  const handleUploadFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      await uploadDocument(projectId, equipment.id, formData);
      toast.success("Document uploaded successfully.");
      router.refresh();
    } catch (err: unknown) {
      toast.error((err as Error).message || "Failed to upload document.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm("Are you sure you want to delete this document?")) return;

    startTransition(async () => {
      try {
        await deleteDocument(projectId, equipment.id, docId);
        toast.success("Document deleted successfully.");
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to delete document.");
      }
    });
  };

  const handleLogMaintenance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!logDesc.trim()) {
      toast.error("Description is required.");
      return;
    }

    startTransition(async () => {
      try {
        await logMaintenance(projectId, equipment.id, {
          type: logType,
          description: logDesc.trim(),
          findings: logFindings.trim() || undefined,
          actionTaken: logAction.trim() || undefined,
          nextServiceDue: nextDue || null,
        });
        toast.success("Maintenance entry logged successfully.");
        setLogDesc("");
        setLogFindings("");
        setLogAction("");
        setNextDue("");
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to log maintenance.");
      }
    });
  };

  const handleDeleteEquipment = async () => {
    if (!confirm("CAUTION: Are you sure you want to delete this equipment record and all its associated documents?")) return;

    startTransition(async () => {
      try {
        await deleteEquipment(projectId, equipment.id);
        toast.success("Equipment record deleted successfully.");
        router.push("/dashboard/equipment");
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || "Failed to delete equipment.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/equipment">
            <Button variant="ghost" size="icon" className="text-text-muted hover:text-white rounded-full">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <span className="font-mono text-sm text-flow-teal font-semibold bg-flow-teal/10 px-2 py-0.5 rounded border border-flow-teal/20 tracking-wider">
                {equipment.equipmentTag}
              </span>
              <Badge variant="outline" className="px-2.5 py-0.5 rounded-full text-[10px] bg-white/5 border-white/10 uppercase text-text-muted tracking-wide">
                {equipment.category.replace("_", " ")}
              </Badge>
            </div>
            <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight mt-1">
              {equipment.name}
            </h1>
          </div>
        </div>

        {/* Edit / Delete Toolbar */}
        <div className="flex items-center gap-2">
          {isEditor && (
            <Link href={`/dashboard/equipment/${equipment.id}/edit`}>
              <Button variant="outline" className="rounded-xl border-white/[0.08] hover:bg-white/[0.04] text-sm font-semibold flex items-center gap-1.5">
                <Edit className="h-4 w-4" /> Edit Details
              </Button>
            </Link>
          )}
          {isManager && (
            <Button
              variant="outline"
              onClick={handleDeleteEquipment}
              disabled={isPending}
              className="rounded-xl border-alert-red/20 text-alert-red hover:bg-alert-red/10 text-sm font-semibold flex items-center gap-1.5"
            >
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />} Delete
            </Button>
          )}
        </div>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Columns (General Specs + Technical Specs) */}
        <div className="lg:col-span-2 space-y-6">
          {/* General Metadata Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-6">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3 flex items-center gap-2">
              <Server className="h-4 w-4 text-flow-teal" /> General Properties
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-6 text-sm">
              <div>
                <span className="text-text-muted block text-xs">Manufacturer</span>
                <span className="text-text-primary font-medium">{equipment.manufacturer || "—"}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Model Designation</span>
                <span className="text-text-primary font-medium">{equipment.model || "—"}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Serial Number</span>
                <span className="text-text-primary font-mono text-xs">{equipment.serialNumber || "—"}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Mapped Location (Sitemap)</span>
                {equipment.siteLocation ? (
                  <Link href={`/dashboard/sitemap/${equipment.siteLocation.slug}`} className="text-flow-teal hover:underline flex items-center gap-1">
                    <MapPin className="h-3.5 w-3.5" /> {equipment.siteLocation.name}
                  </Link>
                ) : (
                  <span className="text-text-muted italic">Unlinked</span>
                )}
              </div>
              <div>
                <span className="text-text-muted block text-xs">Physical Location Detail</span>
                <span className="text-text-primary font-medium">{equipment.location || "—"}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Registered By</span>
                <span className="text-text-primary font-medium">{equipment.createdBy.name}</span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Installation Date</span>
                <span className="text-text-primary font-medium">
                  {equipment.installationDate ? new Date(equipment.installationDate).toLocaleDateString() : "—"}
                </span>
              </div>
              <div>
                <span className="text-text-muted block text-xs">Commissioning Date</span>
                <span className="text-text-primary font-medium">
                  {equipment.commissionDate ? new Date(equipment.commissionDate).toLocaleDateString() : "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Technical Specs Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3 flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-flow-teal" /> Technical Specifications
            </h2>

            {Object.keys(equipment.specifications).length === 0 ? (
              <p className="text-xs text-text-muted italic">No specifications provided.</p>
            ) : (
              <div className="overflow-hidden border border-white/[0.05] rounded-xl bg-white/[0.01]">
                <table className="w-full text-left text-xs text-text-primary border-collapse">
                  <thead>
                    <tr className="bg-white/[0.02] border-b border-white/[0.08]">
                      <th className="px-4 py-2.5 font-semibold text-text-muted w-1/3">Parameter</th>
                      <th className="px-4 py-2.5 font-semibold text-text-muted">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] font-medium">
                    {Object.entries(equipment.specifications).map(([key, val]) => (
                      <tr key={key} className="hover:bg-white/[0.01]">
                        <td className="px-4 py-2.5 text-text-muted">{key}</td>
                        <td className="px-4 py-2.5 font-mono text-flow-teal">{val}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Maintenance Logs Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3 flex items-center gap-2">
              <Wrench className="h-4 w-4 text-flow-teal" /> Maintenance History
            </h2>

            {maintenanceLogs.length === 0 ? (
              <p className="text-xs text-text-muted italic">No maintenance logs registered yet.</p>
            ) : (
              <div className="space-y-4">
                {maintenanceLogs.map((log) => (
                  <div key={log.id} className="p-4 rounded-xl border border-white/[0.06] bg-white/[0.01] space-y-2">
                    <div className="flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="px-2 py-0.5 rounded bg-flow-teal/10 border-flow-teal/20 text-flow-teal text-[10px] uppercase font-semibold">
                          {log.type}
                        </Badge>
                        <span className="text-[11px] font-mono text-text-muted">
                          by {log.loggedBy.name}
                        </span>
                      </div>
                      <span className="text-[10px] text-text-muted">
                        {new Date(log.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-xs text-text-primary leading-relaxed font-medium">
                      {log.description}
                    </p>

                    {(log.findings || log.actionTaken || log.nextServiceDue) && (
                      <div className="mt-2.5 pt-2.5 border-t border-white/[0.04] grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] text-text-muted leading-normal">
                        {log.findings && (
                          <div>
                            <span className="font-semibold text-text-primary block">Findings:</span>
                            {log.findings}
                          </div>
                        )}
                        {log.actionTaken && (
                          <div>
                            <span className="font-semibold text-text-primary block">Action Taken:</span>
                            {log.actionTaken}
                          </div>
                        )}
                        {log.nextServiceDue && (
                          <div className="md:col-span-2 flex items-center gap-1.5 text-signal-amber font-medium">
                            <Calendar className="h-3 w-3" /> Next Service Due: {new Date(log.nextServiceDue).toLocaleDateString()}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Status Summary + Documents + Log Maintenance */}
        <div className="space-y-6">
          {/* Status & Condition Summary Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3 flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-flow-teal" /> Status & Condition
            </h2>

            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <span className="text-xs text-text-muted">Operational Status</span>
              <span className="font-semibold text-sm">
                {equipment.status.replace("_", " ")}
              </span>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-text-muted">Current Condition</span>
              <span className="font-semibold text-sm">
                {equipment.condition}
              </span>
            </div>
          </div>

          {/* Documents Section Card */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted flex items-center gap-2">
                <FileText className="h-4 w-4 text-flow-teal" /> Documents
              </h2>

              {isEditor && (
                <label className="cursor-pointer rounded-xl border border-white/[0.08] hover:bg-white/[0.04] text-xs font-semibold text-flow-teal flex items-center gap-1 px-3 py-1.5 h-8 transition-colors select-none">
                  <Upload className="h-3.5 w-3.5" />
                  <span>Upload</span>
                  <input
                    type="file"
                    className="hidden"
                    onChange={handleUploadFile}
                    disabled={uploading}
                  />
                </label>
              )}
            </div>

            {uploading && (
              <div className="flex items-center gap-2 text-xs text-flow-teal italic p-2 rounded bg-flow-teal/5 border border-flow-teal/10 justify-center">
                <Loader2 className="h-4 w-4 animate-spin" /> Uploading document...
              </div>
            )}

            {documents.length === 0 ? (
              <p className="text-xs text-text-muted italic">No documents attached.</p>
            ) : (
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between gap-3 p-3 rounded-xl border border-white/[0.05] bg-white/[0.01] hover:bg-white/[0.02] transition-colors group">
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-text-primary truncate" title={doc.name}>
                        {doc.name}
                      </p>
                      <span className="text-[10px] text-text-muted">
                        {doc.fileType} • by {doc.uploadedBy.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <a href={doc.downloadUrl} download target="_blank" rel="noopener noreferrer">
                        <Button variant="ghost" size="icon" className="h-8 w-8 text-text-muted hover:text-flow-teal rounded-lg">
                          <Download className="h-4 w-4" />
                        </Button>
                      </a>
                      {isEditor && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteDoc(doc.id)}
                          disabled={isPending}
                          className="h-8 w-8 text-text-muted hover:text-alert-red rounded-lg"
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Log Maintenance Form Card (PM/ADMIN Only) */}
          {isManager && (
            <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-4">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3 flex items-center gap-2">
                <Plus className="h-4 w-4 text-flow-teal" /> Log Maintenance
              </h2>

              <form onSubmit={handleLogMaintenance} className="space-y-3.5">
                {/* Log Type */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Type</label>
                  <select
                    value={logType}
                    onChange={(e) => setLogType(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-xs text-text-primary focus:border-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
                  >
                    <option value="Inspection">Inspection</option>
                    <option value="Calibration">Calibration</option>
                    <option value="Repair">Repair</option>
                    <option value="Overhaul">Overhaul</option>
                    <option value="Testing">Testing</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

                {/* Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Description *</label>
                  <textarea
                    required
                    placeholder="Describe the maintenance performed..."
                    value={logDesc}
                    onChange={(e) => setLogDesc(e.target.value)}
                    className="w-full min-h-[70px] rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors resize-none"
                  />
                </div>

                {/* Findings */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Findings</label>
                  <textarea
                    placeholder="Describe any mechanical/electrical findings..."
                    value={logFindings}
                    onChange={(e) => setLogFindings(e.target.value)}
                    className="w-full min-h-[50px] rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors resize-none"
                  />
                </div>

                {/* Action Taken */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Action Taken</label>
                  <textarea
                    placeholder="Actions taken to resolve issues..."
                    value={logAction}
                    onChange={(e) => setLogAction(e.target.value)}
                    className="w-full min-h-[50px] rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-xs text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors resize-none"
                  />
                </div>

                {/* Next Service Due */}
                <div className="space-y-1">
                  <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Next Service Due</label>
                  <input
                    type="date"
                    value={nextDue}
                    onChange={(e) => setNextDue(e.target.value)}
                    className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-xs text-text-primary focus:border-flow-teal outline-none transition-colors"
                  />
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isPending}
                  className="w-full rounded-xl bg-flow-teal hover:bg-flow-teal/90 text-bg-panel font-semibold text-xs py-2 flex items-center justify-center gap-1.5 mt-2"
                >
                  {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />} Submit Log
                </Button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
