"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Plus, Trash2, ArrowLeft, Loader2 } from "lucide-react";
import type { EquipmentCategory, EquipmentStatus, EquipmentCondition, SiteLocation } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { createEquipment, updateEquipment } from "../actions";

interface EquipmentFormClientProps {
  projectId: string;
  locations: SiteLocation[];
  initialData?: {
    id: string;
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
    status: EquipmentStatus;
    condition: EquipmentCondition;
    specifications: Record<string, string>;
  };
}

export function EquipmentFormClient({ projectId, locations, initialData }: EquipmentFormClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [tag, setTag] = useState(initialData?.equipmentTag || "");
  const [name, setName] = useState(initialData?.name || "");
  const [category, setCategory] = useState<EquipmentCategory>(initialData?.category || "TURBINE");
  const [manufacturer, setManufacturer] = useState(initialData?.manufacturer || "");
  const [model, setModel] = useState(initialData?.model || "");
  const [serialNumber, setSerialNumber] = useState(initialData?.serialNumber || "");
  
  // Format Date for input: YYYY-MM-DD
  const formatDateForInput = (d: Date | null | undefined) => {
    if (!d) return "";
    return new Date(d).toISOString().split("T")[0];
  };

  const [installationDate, setInstallationDate] = useState(formatDateForInput(initialData?.installationDate));
  const [commissionDate, setCommissionDate] = useState(formatDateForInput(initialData?.commissionDate));
  const [locationStr, setLocationStr] = useState(initialData?.location || "");
  const [siteLocationId, setSiteLocationId] = useState(initialData?.siteLocationId || "");
  const [status, setStatus] = useState<EquipmentStatus>(initialData?.status || "INSTALLED");
  const [condition, setCondition] = useState<EquipmentCondition>(initialData?.condition || "GOOD");

  // Specifications
  const initialSpecs = initialData?.specifications
    ? Object.entries(initialData.specifications).map(([key, value]) => ({ key, value }))
    : [{ key: "", value: "" }];
  const [specs, setSpecs] = useState<{ key: string; value: string }[]>(initialSpecs);

  const handleAddSpec = () => setSpecs([...specs, { key: "", value: "" }]);
  const handleRemoveSpec = (index: number) => {
    if (specs.length === 1) {
      setSpecs([{ key: "", value: "" }]);
    } else {
      setSpecs(specs.filter((_, i) => i !== index));
    }
  };
  const handleSpecChange = (index: number, field: "key" | "value", val: string) => {
    const next = [...specs];
    next[index][field] = val;
    setSpecs(next);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tag.trim() || !name.trim()) {
      toast.error("Tag and Name are required fields.");
      return;
    }

    // Convert specs array to JSON object
    const specObj: Record<string, string> = {};
    specs.forEach((s) => {
      if (s.key.trim() && s.value.trim()) {
        specObj[s.key.trim()] = s.value.trim();
      }
    });

    const payload = {
      equipmentTag: tag.trim(),
      name: name.trim(),
      category,
      manufacturer: manufacturer.trim() || undefined,
      model: model.trim() || undefined,
      serialNumber: serialNumber.trim() || undefined,
      installationDate: installationDate || null,
      commissionDate: commissionDate || null,
      location: locationStr.trim() || undefined,
      siteLocationId: siteLocationId || null,
      status,
      condition,
      specifications: specObj,
    };

    startTransition(async () => {
      try {
        if (initialData) {
          await updateEquipment(projectId, initialData.id, payload);
          toast.success("Equipment record updated successfully.");
          router.push(`/dashboard/equipment/${initialData.id}`);
        } else {
          const res = await createEquipment(projectId, payload);
          toast.success("Equipment record registered successfully.");
          router.push(`/dashboard/equipment/${res.id}`);
        }
        router.refresh();
      } catch (err: unknown) {
        toast.error((err as Error).message || "An error occurred.");
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={initialData ? `/dashboard/equipment/${initialData.id}` : "/dashboard/equipment"}>
          <Button type="button" variant="ghost" size="icon" className="text-text-muted hover:text-white rounded-full">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-display font-bold text-text-primary tracking-tight">
            {initialData ? `Edit ${initialData.equipmentTag}` : "Register Plant Equipment"}
          </h1>
          <p className="text-text-muted text-sm mt-1">
            {initialData ? "Update operational properties and technical specs" : "Add a new heavy asset to the Tumauini HEPP registry"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: General Fields */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3">
              General Identity
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Equipment Tag */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Equipment Tag *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. TU-01, TR-GSU-01"
                  value={tag}
                  onChange={(e) => setTag(e.target.value)}
                  className="w-full font-mono rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                />
              </div>

              {/* Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Equipment Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Francis Turbine Unit 1"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                />
              </div>

              {/* Category */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Category *</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as EquipmentCategory)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
                >
                  {["TURBINE", "GENERATOR", "TRANSFORMER", "GOVERNOR", "EXCITATION_SYSTEM", "CIRCUIT_BREAKER", "PROTECTION_RELAY", "GATE_VALVE", "CRANE_HOIST", "SCADA_PLC", "METERING_PANEL", "DC_SYSTEM", "FIRE_SUPPRESSION", "DIESEL_GENERATOR", "PUMP", "OTHER"].map((cat) => (
                    <option key={cat} value={cat}>
                      {cat.replace("_", " ")}
                    </option>
                  ))}
                </select>
              </div>

              {/* Serial Number */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Serial Number</label>
                <input
                  type="text"
                  placeholder="S/N or registry number"
                  value={serialNumber}
                  onChange={(e) => setSerialNumber(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                />
              </div>

              {/* Manufacturer */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Manufacturer</label>
                <input
                  type="text"
                  placeholder="e.g. ANDRITZ Hydro, Voith"
                  value={manufacturer}
                  onChange={(e) => setManufacturer(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                />
              </div>

              {/* Model */}
              <div className="space-y-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Model</label>
                <input
                  type="text"
                  placeholder="Model designation"
                  value={model}
                  onChange={(e) => setModel(e.target.value)}
                  className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Specifications key-value builder */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.05] pb-3">
              <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted">
                Technical Specifications
              </h2>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSpec}
                className="rounded-xl border-white/[0.08] hover:bg-white/[0.04] text-xs font-semibold text-flow-teal flex items-center gap-1 h-8"
              >
                <Plus className="h-3.5 w-3.5" /> Add Field
              </Button>
            </div>

            <p className="text-xs text-text-muted italic">Add technical details such as Rated Power, Design Head, Voltage class, capacity limits, etc.</p>

            <div className="space-y-3 pt-2">
              {specs.map((spec, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <input
                    type="text"
                    placeholder="Specification Name (e.g. Rated Power)"
                    value={spec.key}
                    onChange={(e) => handleSpecChange(idx, "key", e.target.value)}
                    className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                  />
                  <input
                    type="text"
                    placeholder="Value (e.g. 5.65 MW)"
                    value={spec.value}
                    onChange={(e) => handleSpecChange(idx, "value", e.target.value)}
                    className="flex-1 rounded-xl bg-white/[0.03] border border-white/[0.08] p-2.5 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemoveSpec(idx)}
                    className="rounded-xl text-text-muted hover:text-alert-red hover:bg-white/[0.04] shrink-0"
                  >
                    <Trash2 className="h-4.5 w-4.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Status & Logistics */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-6 shadow-xl space-y-5">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-text-muted border-b border-white/[0.05] pb-3">
              Status & Logistics
            </h2>

            {/* Status */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Operational Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as EquipmentStatus)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                {["INSTALLED", "COMMISSIONED", "UNDER_MAINTENANCE", "DECOMMISSIONED", "PENDING_DELIVERY"].map((st) => (
                  <option key={st} value={st}>
                    {st.replace("_", " ")}
                  </option>
                ))}
              </select>
            </div>

            {/* Condition */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Physical Condition</label>
              <select
                value={condition}
                onChange={(e) => setCondition(e.target.value as EquipmentCondition)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                {["EXCELLENT", "GOOD", "FAIR", "POOR", "CRITICAL"].map((cond) => (
                  <option key={cond} value={cond}>
                    {cond}
                  </option>
                ))}
              </select>
            </div>

            {/* Site Map Dropdown */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Sitemap Zone / Location</label>
              <select
                value={siteLocationId}
                onChange={(e) => setSiteLocationId(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors [&_option]:bg-bg-panel [&_option]:text-text-primary"
              >
                <option value="">No mapped zone (unlinked)</option>
                {locations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>

            {/* General Location Text */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Specific Location Note</label>
              <input
                type="text"
                placeholder="e.g. Powerhouse level 1, transformer bay"
                value={locationStr}
                onChange={(e) => setLocationStr(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary placeholder:text-text-muted/30 focus:border-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Installation Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Installation Date</label>
              <input
                type="date"
                value={installationDate}
                onChange={(e) => setInstallationDate(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors"
              />
            </div>

            {/* Commissioning Date */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold uppercase tracking-wider text-text-muted">Commissioning Date</label>
              <input
                type="date"
                value={commissionDate}
                onChange={(e) => setCommissionDate(e.target.value)}
                className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] p-3 text-sm text-text-primary focus:border-flow-teal outline-none transition-colors"
              />
            </div>
          </div>

          {/* Form Actions */}
          <div className="rounded-2xl border border-white/[0.08] bg-bg-panel/50 backdrop-blur-xl p-5 shadow-xl flex items-center justify-end gap-3">
            <Link href={initialData ? `/dashboard/equipment/${initialData.id}` : "/dashboard/equipment"}>
              <Button type="button" variant="outline" className="rounded-xl border-white/[0.08] hover:bg-white/[0.04]">
                Cancel
              </Button>
            </Link>
            <Button
              type="submit"
              disabled={isPending}
              className="rounded-xl bg-flow-teal hover:bg-flow-teal/90 text-bg-panel font-semibold flex items-center gap-2"
            >
              {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {initialData ? "Save Changes" : "Register Equipment"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
