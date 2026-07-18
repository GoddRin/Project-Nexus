"use client";

import { useState } from "react";
import { X, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface IncidentDispatchModalProps {
  projectId: string;
  facilityName: string;
  facilityLat: number;
  facilityLng: number;
  facilityOsmId?: string;
  onClose: () => void;
  onDispatched: () => void;
}

export function IncidentDispatchModal({
  projectId,
  facilityName,
  facilityLat,
  facilityLng,
  facilityOsmId,
  onClose,
  onDispatched,
}: IncidentDispatchModalProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    type: "MEDICAL",
    severity: "MEDIUM",
    description: "",
    personnelInvolved: "",
    timeOfDeparture: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.description) {
      toast.error("Please provide an incident description.");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/incidents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId,
          ...formData,
          dispatchFacilityName: facilityName,
          dispatchFacilityLat: facilityLat,
          dispatchFacilityLng: facilityLng,
          dispatchFacilityOsmId: facilityOsmId,
        }),
      });

      if (!res.ok) throw new Error("Failed to dispatch incident");
      
      toast.success("Incident dispatched successfully");
      onDispatched();
      onClose();
      router.refresh();
    } catch (err) {
      console.error(err);
      toast.error("Error dispatching incident");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans">
      <div className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#161b16] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/5 px-6 py-4 bg-gradient-to-r from-red-500/10 to-transparent">
          <div className="flex items-center gap-3">
            <div className="rounded-full bg-red-500/20 p-2">
              <AlertTriangle className="h-5 w-5 text-red-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">Dispatch Incident</h2>
              <p className="text-xs text-text-muted">Dispatching to: <span className="font-medium text-flow-teal">{facilityName}</span></p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-full p-2 hover:bg-white/5 text-text-muted transition-colors">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted">Incident Type</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-flow-teal transition-colors [color-scheme:dark]"
              >
                <option value="MEDICAL" className="bg-[#161b16]">Medical Emergency</option>
                <option value="SECURITY" className="bg-[#161b16]">Security Breach</option>
                <option value="FIRE" className="bg-[#161b16]">Fire Emergency</option>
                <option value="OTHER" className="bg-[#161b16]">Other</option>
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-text-muted">Severity</label>
              <select
                value={formData.severity}
                onChange={(e) => setFormData({ ...formData, severity: e.target.value })}
                className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-flow-teal transition-colors [color-scheme:dark]"
              >
                <option value="LOW" className="bg-[#161b16]">Low</option>
                <option value="MEDIUM" className="bg-[#161b16]">Medium</option>
                <option value="HIGH" className="bg-[#161b16]">High</option>
                <option value="CRITICAL" className="bg-[#161b16]">Critical</option>
              </select>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted">Departure Time</label>
            <input
              type="datetime-local"
              lang="en-US"
              value={formData.timeOfDeparture}
              onChange={(e) => setFormData({ ...formData, timeOfDeparture: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-flow-teal transition-colors [color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted">Personnel Involved / Patient Name</label>
            <input
              type="text"
              placeholder="e.g. John Doe, Night Shift Security"
              value={formData.personnelInvolved}
              onChange={(e) => setFormData({ ...formData, personnelInvolved: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-flow-teal transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-medium text-text-muted">Incident Description</label>
            <textarea
              required
              placeholder="Briefly describe the incident and condition..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2.5 text-sm text-white outline-none focus:border-flow-teal transition-colors min-h-[100px] resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm font-medium text-text-muted hover:text-white hover:bg-white/5 transition-all"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all disabled:opacity-50"
            >
              {loading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              Confirm Dispatch
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
