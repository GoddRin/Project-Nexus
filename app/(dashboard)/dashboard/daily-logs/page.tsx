"use client";

import { useEffect, useState } from "react";
import {
  ClipboardCheck,
  Users,
  HardHat,
  ChevronDown,
  ChevronUp,
  Calendar,
  User,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Clock,
  MapPin,
} from "lucide-react";

interface DailyLogPtw {
  id: string;
  type: string;
  location: string;
  team: string;
  expiry: string;
  status: string;
}

interface DailyLog {
  id: string;
  logDate: string;
  totalHeadcount: number;
  zoneTunnels: number;
  zoneWeir: number;
  zoneTemfacil: number;
  zonePowerhouse: number;
  zoneSwitchyard: number;
  loggedBy: { name: string | null; email: string };
  ptws: DailyLogPtw[];
}

const ZONE_COLORS: Record<string, string> = {
  Tunnels: "#2DD4BF",
  Weir: "#60A5FA",
  Temfacil: "#A78BFA",
  Powerhouse: "#FBBF24",
  Switchyard: "#F97316",
};

const PTW_STATUS_COLOR: Record<string, string> = {
  Active: "#2DD4BF",
  Expired: "#EF4444",
  "Expiring Soon": "#FBBF24",
  Pending: "#94A3B8",
};

function formatDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-PH", {
    weekday: "short",
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function ZoneBadge({ zone, count }: { zone: string; count: number }) {
  const color = ZONE_COLORS[zone] ?? "#94A3B8";
  return (
    <div
      className="flex flex-col items-center justify-center rounded-lg px-3 py-2 text-center"
      style={{ background: `${color}15`, border: `1px solid ${color}30` }}
    >
      <span className="text-lg font-bold" style={{ color }}>
        {count}
      </span>
      <span className="text-[10px] text-slate-400 uppercase tracking-wide">{zone}</span>
    </div>
  );
}

function LogCard({ log, isToday }: { log: DailyLog; isToday: boolean }) {
  const [expanded, setExpanded] = useState(isToday);

  return (
    <div
      className="rounded-2xl border transition-all duration-200"
      style={{
        background: isToday
          ? "linear-gradient(135deg, rgba(45,212,191,0.08), rgba(45,212,191,0.02))"
          : "rgba(255,255,255,0.03)",
        borderColor: isToday ? "rgba(45,212,191,0.35)" : "rgba(255,255,255,0.07)",
      }}
    >
      {/* Header */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between p-5 text-left"
      >
        <div className="flex items-center gap-4">
          <div
            className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{
              background: isToday ? "rgba(45,212,191,0.15)" : "rgba(255,255,255,0.05)",
            }}
          >
            <ClipboardCheck
              size={20}
              style={{ color: isToday ? "#2DD4BF" : "#94A3B8" }}
            />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <p className="text-white font-semibold text-sm">{formatDate(log.logDate)}</p>
              {isToday && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-teal-500/20 text-teal-400 border border-teal-500/30">
                  TODAY
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <Clock size={11} />
                {formatTime(log.logDate)}
              </span>
              <span className="flex items-center gap-1 text-xs text-slate-400">
                <User size={11} />
                {log.loggedBy.name ?? log.loggedBy.email}
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right">
            <p className="text-2xl font-bold text-white">{log.totalHeadcount}</p>
            <p className="text-[10px] text-slate-400 uppercase tracking-wide">Total Headcount</p>
          </div>
          <div className="text-slate-500">
            {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </div>
        </div>
      </button>

      {/* Expanded Detail */}
      {expanded && (
        <div className="px-5 pb-5 space-y-5 border-t border-white/5 pt-4">
          {/* Zone Breakdown */}
          <div>
            <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
              <MapPin size={11} /> Zone Headcount Breakdown
            </p>
            <div className="grid grid-cols-5 gap-2">
              <ZoneBadge zone="Tunnels" count={log.zoneTunnels} />
              <ZoneBadge zone="Weir" count={log.zoneWeir} />
              <ZoneBadge zone="Temfacil" count={log.zoneTemfacil} />
              <ZoneBadge zone="Powerhouse" count={log.zonePowerhouse} />
              <ZoneBadge zone="Switchyard" count={log.zoneSwitchyard} />
            </div>
          </div>

          {/* PTWs */}
          {log.ptws.length > 0 ? (
            <div>
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1.5">
                <HardHat size={11} /> Permits to Work ({log.ptws.length})
              </p>
              <div className="space-y-2">
                {log.ptws.map((ptw) => {
                  const statusColor = PTW_STATUS_COLOR[ptw.status] ?? "#94A3B8";
                  return (
                    <div
                      key={ptw.id}
                      className="rounded-xl p-3 flex items-center justify-between"
                      style={{
                        background: `${statusColor}0D`,
                        border: `1px solid ${statusColor}25`,
                      }}
                    >
                      <div>
                        <p className="text-white text-xs font-semibold">{ptw.type}</p>
                        <p className="text-slate-400 text-[11px]">
                          {ptw.location} · {ptw.team}
                        </p>
                      </div>
                      <div className="text-right">
                        <span
                          className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                          style={{
                            background: `${statusColor}20`,
                            color: statusColor,
                            border: `1px solid ${statusColor}40`,
                          }}
                        >
                          {ptw.status}
                        </span>
                        <p className="text-[10px] text-slate-500 mt-1">Exp: {ptw.expiry}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="rounded-xl p-3 bg-white/3 border border-white/5 text-center">
              <p className="text-slate-500 text-xs">No Permits to Work recorded for this shift.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function DailyLogsPage() {
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const LIMIT = 20;

  const todayStr = new Date().toISOString().substring(0, 10);

  async function fetchLogs(p = 1) {
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/daily-logs?page=${p}&limit=${LIMIT}`);
      if (!res.ok) throw new Error(`Server error: ${res.status}`);
      const data = await res.json();
      setLogs(data.logs ?? []);
      setTotal(data.total ?? 0);
      setPage(p);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchLogs(1);
  }, []);

  const totalPages = Math.ceil(total / LIMIT);

  return (
    <div className="min-h-screen p-6 md:p-8" style={{ background: "transparent" }}>
      {/* Page Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(45,212,191,0.15)", border: "1px solid rgba(45,212,191,0.3)" }}
            >
              <ClipboardCheck size={20} className="text-teal-400" />
            </div>
            <h1 className="text-2xl font-bold text-white">Daily Safety Logs</h1>
          </div>
          <p className="text-slate-400 text-sm ml-13 pl-0">
            Historical record of shift sign-offs, site headcounts, and active Permits to Work.
          </p>
        </div>
        <button
          onClick={() => fetchLogs(page)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            color: "#94A3B8",
          }}
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          Refresh
        </button>
      </div>

      {/* Summary Stats */}
      {!loading && logs.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            {
              label: "Total Sign-Offs",
              value: total,
              icon: CheckCircle2,
              color: "#2DD4BF",
            },
            {
              label: "Avg. Headcount",
              value: Math.round(logs.reduce((s, l) => s + l.totalHeadcount, 0) / logs.length),
              icon: Users,
              color: "#60A5FA",
            },
            {
              label: "Total PTWs Logged",
              value: logs.reduce((s, l) => s + l.ptws.length, 0),
              icon: HardHat,
              color: "#FBBF24",
            },
            {
              label: "This Page",
              value: `${logs.length} / ${total}`,
              icon: Calendar,
              color: "#A78BFA",
            },
          ].map(({ label, value, icon: Icon, color }) => (
            <div
              key={label}
              className="rounded-2xl p-4"
              style={{
                background: `${color}0D`,
                border: `1px solid ${color}25`,
              }}
            >
              <div className="flex items-center gap-2 mb-2">
                <Icon size={14} style={{ color }} />
                <span className="text-[11px] text-slate-400 uppercase tracking-wide">{label}</span>
              </div>
              <p className="text-2xl font-bold" style={{ color }}>
                {value}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* States */}
      {loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-teal-400 border-t-transparent animate-spin" />
          <p className="text-slate-400 text-sm">Loading daily logs...</p>
        </div>
      )}

      {!loading && error && (
        <div className="rounded-2xl p-6 text-center" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <AlertTriangle size={28} className="text-red-400 mx-auto mb-3" />
          <p className="text-red-400 font-semibold mb-1">Failed to load logs</p>
          <p className="text-slate-400 text-sm">{error}</p>
          <button onClick={() => fetchLogs(1)} className="mt-4 px-4 py-2 rounded-xl bg-red-500/20 text-red-400 text-sm border border-red-500/30 hover:bg-red-500/30 transition-all">
            Try Again
          </button>
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div className="rounded-2xl p-12 text-center" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <ClipboardCheck size={40} className="text-slate-600 mx-auto mb-4" />
          <p className="text-slate-300 font-semibold mb-2">No sign-offs recorded yet</p>
          <p className="text-slate-500 text-sm">
            Daily logs will appear here after the Safety Officer signs off via the mobile app.
          </p>
        </div>
      )}

      {!loading && !error && logs.length > 0 && (
        <>
          <div className="space-y-3">
            {logs.map((log) => {
              const logDateStr = new Date(log.logDate).toISOString().substring(0, 10);
              return <LogCard key={log.id} log={log} isToday={logDateStr === todayStr} />;
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 mt-8">
              <button
                onClick={() => fetchLogs(page - 1)}
                disabled={page <= 1}
                className="px-4 py-2 rounded-xl text-sm disabled:opacity-30 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}
              >
                Previous
              </button>
              <span className="text-slate-400 text-sm">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchLogs(page + 1)}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl text-sm disabled:opacity-30 transition-all"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#94A3B8" }}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
