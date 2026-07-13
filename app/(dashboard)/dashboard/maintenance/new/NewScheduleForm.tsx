"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, X, Wrench, Calendar, RefreshCw, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createSchedule } from "../actions";
import { toast } from "sonner";

type Asset = { id: string; name: string; category: string };

type Props = {
  assets: Asset[];
  projectId: string;
  defaultAssetId?: string;
};

export function NewScheduleForm({ assets, projectId, defaultAssetId = "" }: Props) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [assetId, setAssetId] = useState(defaultAssetId);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [frequencyDays, setFrequencyDays] = useState<number | "">(30);
  const [nextDueDate, setNextDueDate] = useState("");
  const [tasks, setTasks] = useState<string[]>([""]); // At least one task row

  function addTask() {
    setTasks((prev) => [...prev, ""]);
  }

  function removeTask(index: number) {
    setTasks((prev) => prev.filter((_, i) => i !== index));
  }

  function updateTask(index: number, value: string) {
    setTasks((prev) => prev.map((t, i) => (i === index ? value : t)));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();

    if (!assetId) { toast.error("Please select an asset."); return; }
    if (!title.trim()) { toast.error("Please enter a schedule title."); return; }
    if (!frequencyDays || Number(frequencyDays) < 1) { toast.error("Please enter a valid repeat frequency."); return; }
    if (!nextDueDate) { toast.error("Please select a next due date."); return; }

    startTransition(async () => {
      try {
        await createSchedule(
          projectId,
          assetId,
          title.trim(),
          description.trim() || null,
          Number(frequencyDays),
          new Date(nextDueDate),
          tasks.filter((t) => t.trim() !== "")
        );
        toast.success("Maintenance schedule created.");
        router.push("/dashboard/maintenance");
      } catch (err: unknown) {
        toast.error(err instanceof Error ? err.message : "Failed to create schedule.");
      }
    });
  }

  const inputCls =
    "w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted/50 focus:border-flow-teal focus:ring-1 focus:ring-flow-teal outline-none transition-colors";

  const labelCls = "text-xs font-semibold uppercase tracking-wider text-text-muted";

  return (
    <form onSubmit={handleSubmit} className="space-y-6">

      {/* Asset Selector */}
      <div className="space-y-1.5">
        <label className={labelCls}>Asset *</label>
        <select
          value={assetId}
          onChange={(e) => setAssetId(e.target.value)}
          required
          className={inputCls + " [&_option]:bg-bg-panel [&_option]:text-text-primary"}
        >
          <option value="">Select an asset...</option>
          {assets.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} — {a.category}
            </option>
          ))}
        </select>
      </div>

      {/* Title */}
      <div className="space-y-1.5">
        <label className={labelCls}>Schedule Title *</label>
        <div className="relative">
          <Wrench className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="e.g. Monthly Oil Change & Filter Inspection"
            required
            className={inputCls + " pl-10"}
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1.5">
        <label className={labelCls}>Description</label>
        <div className="relative">
          <FileText className="absolute left-3 top-3 h-4 w-4 text-text-muted pointer-events-none" />
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Optional: describe the scope of this maintenance schedule."
            className={inputCls + " pl-10 resize-none"}
          />
        </div>
      </div>

      {/* Frequency + Due Date row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <label className={labelCls}>Repeat Frequency (days) *</label>
          <div className="relative">
            <RefreshCw className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="number"
              min={1}
              max={3650}
              value={frequencyDays}
              onChange={(e) => {
                const val = e.target.value;
                setFrequencyDays(val === "" ? "" : Number(val));
              }}
              required
              className={inputCls + " pl-10"}
            />
          </div>
          <p className="text-[11px] text-text-muted/60">
            After completion, the next due date auto-advances by this many days.
          </p>
        </div>

        <div className="space-y-1.5">
          <label className={labelCls}>First Due Date *</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-muted pointer-events-none" />
            <input
              type="date"
              value={nextDueDate}
              onChange={(e) => setNextDueDate(e.target.value)}
              required
              className={inputCls + " pl-10"}
            />
          </div>
        </div>
      </div>

      {/* Checklist Tasks */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className={labelCls}>Checklist Tasks</label>
          <button
            type="button"
            onClick={addTask}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium text-flow-teal ring-1 ring-flow-teal/30 hover:bg-flow-teal/10 transition-colors"
          >
            <Plus className="h-3.5 w-3.5" />
            Add Task
          </button>
        </div>

        <div className="space-y-2">
          {tasks.map((task, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-white/[0.05] text-[11px] font-mono text-text-muted">
                {i + 1}
              </span>
              <input
                type="text"
                value={task}
                onChange={(e) => updateTask(i, e.target.value)}
                placeholder={`Task ${i + 1}...`}
                className={inputCls + " flex-1"}
              />
              {tasks.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeTask(i)}
                  className="text-text-muted hover:text-signal-red transition-colors"
                  tabIndex={-1}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          ))}
        </div>
        <p className="text-[11px] text-text-muted/60">
          Each task becomes a checkbox item technicians tick off during the maintenance run.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 border-t border-white/[0.05] pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.back()}
          disabled={isPending}
        >
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? "Creating..." : "Create Schedule"}
        </Button>
      </div>
    </form>
  );
}
