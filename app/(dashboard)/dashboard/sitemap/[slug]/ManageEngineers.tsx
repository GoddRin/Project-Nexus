"use client";

import { useState, useTransition } from "react";
import { UserCombobox, ComboboxUser } from "@/components/shared/UserCombobox";
import { assignEngineer, removeEngineer } from "../actions";
import { Plus, Trash2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AssignedEngineer {
  id: string;
  userId: string;
  role: string | null;
  user: {
    name: string;
    email: string;
  };
}

interface ManageEngineersProps {
  locationId: string;
  assignedEngineers: AssignedEngineer[];
  users: ComboboxUser[];
}

export function ManageEngineers({ locationId, assignedEngineers, users }: ManageEngineersProps) {
  const [showAddForm, setShowAddForm] = useState(false);

  const [roleText, setRoleText] = useState("");
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Filter out users who are already assigned to this site
  const assignedUserIds = new Set(assignedEngineers.map((e) => e.userId));
  const availableUsers = users.filter((u) => !assignedUserIds.has(u.id));

  const handleAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const form = e.currentTarget as HTMLFormElement;
    const formData = new FormData(form);
    const userId = formData.get("userId") as string;
    const userName = formData.get("userName") as string;

    if (!userId && (!userName || !userName.trim())) {
      setErrorMsg("Please select a user or type a name to assign.");
      return;
    }

    startTransition(async () => {
      try {
        await assignEngineer(locationId, userId || null, roleText.trim() || "Site Engineer", userName || null);
        setShowAddForm(false);
        setRoleText("");
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Failed to assign engineer.");
      }
    });
  };

  const handleRemove = async (userId: string) => {
    setErrorMsg(null);
    if (!confirm("Are you sure you want to remove this engineer?")) return;

    startTransition(async () => {
      try {
        await removeEngineer(locationId, userId);
      } catch (err: unknown) {
        setErrorMsg((err as Error).message || "Failed to remove engineer.");
      }
    });
  };

  return (
    <div className="p-6 rounded-2xl bg-bg-panel border border-white/5 shadow-lg space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-text-muted uppercase tracking-wider flex items-center gap-2">
          Assigned Crew & Heads
        </h3>
        {!showAddForm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowAddForm(true)}
            className="text-xs text-flow-teal hover:text-flow-teal/80 hover:bg-white/[0.02] flex items-center gap-1.5 p-0 px-2 h-7"
          >
            <Plus className="h-3.5 w-3.5" /> Add
          </Button>
        )}
      </div>

      {errorMsg && (
        <div className="p-3 rounded-xl bg-alert-red/10 border border-alert-red/20 flex items-start gap-2.5 text-xs text-alert-red">
          <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Engineers list */}
      {assignedEngineers.length === 0 ? (
        <p className="text-sm text-text-muted italic">No engineers or assigned heads on this site.</p>
      ) : (
        <ul className="space-y-3.5">
          {assignedEngineers.map((eng) => {
            const initials = (eng.user?.name || "")
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase() || "EN";
            return (
              <li key={eng.id} className="flex items-center justify-between gap-3 group">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-white/[0.08] border border-white/5 flex items-center justify-center text-xs font-semibold text-text-primary uppercase tracking-wide">
                    {initials}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-text-primary">
                      {eng.user?.name || "Unknown Crew"}
                    </p>
                    <p className="text-xs text-text-muted">{eng.role || "Site Engineer"}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleRemove(eng.userId)}
                  disabled={isPending}
                  className="p-1.5 rounded-lg hover:bg-white/[0.04] text-text-muted hover:text-alert-red opacity-0 group-hover:opacity-100 focus:opacity-100 transition-all disabled:opacity-30"
                  title="Remove Engineer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {/* Add engineer form */}
      {showAddForm && (
        <form onSubmit={handleAssign} className="pt-4 border-t border-white/5 space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Select User</label>
            <UserCombobox
              inputName="userId"
              fallbackName="userName"
              users={availableUsers}
              placeholder="Search available team members..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-text-muted">Role / Title</label>
            <input
              type="text"
              placeholder="e.g. Assigned Head, Lead Civil Engineer"
              value={roleText}
              onChange={(e) => setRoleText(e.target.value)}
              className="w-full rounded-xl bg-white/[0.03] border border-white/[0.08] px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-muted/40 focus:border-flow-teal transition-colors"
            />
          </div>

          <div className="flex items-center gap-2 justify-end pt-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowAddForm(false);
                setErrorMsg(null);
              }}
              className="text-xs text-text-muted hover:text-text-primary rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="text-xs font-semibold rounded-xl bg-flow-teal text-bg-panel hover:bg-flow-teal/90"
            >
              Assign
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
