"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CLIENT_REFRESH } from "@/lib/home/refreshPolicy";

export interface LiveFeed<T> {
  data: T;
  /** when the data on screen was fetched (ISO) */
  updatedAt: string | null;
  isRefreshing: boolean;
  /** the last refresh failed, or the server said its source failed: this is the last good copy */
  isStale: boolean;
  /** fetch now (at most once every 30 s; extra calls are ignored) */
  refresh: () => void;
}

interface Options<T> {
  /** when the server-rendered data was fetched */
  initialUpdatedAt?: string | null;
  /** read "the source failed" out of a payload (e.g. data.status.ok === false) */
  isStaleData?: (data: T) => boolean;
  /** read the fetch time out of a payload (e.g. data.status.updatedAt) */
  updatedAtOf?: (data: T) => string | null | undefined;
  /** set false to stop polling (the hook still serves its data) */
  enabled?: boolean;
}

/**
 * Keeps one section of Nexus Home fresh. It starts from the server-rendered data (no loading
 * flash), then polls `url` every `intervalMs`, but only while the tab is visible; it refetches
 * when the tab becomes visible again and when the connection returns. On an error it keeps the
 * data it has, marks it stale, and backs off (doubling, to at most four times the interval).
 * The routes answer `{ data: T }`; a null `data` is treated as a failure.
 */
export function useLiveFeed<T>(url: string, intervalMs: number, initialData: T, options: Options<T> = {}): LiveFeed<T> {
  const { initialUpdatedAt = null, isStaleData, updatedAtOf, enabled = true } = options;
  const [data, setData] = useState<T>(initialData);
  const [updatedAt, setUpdatedAt] = useState<string | null>(initialUpdatedAt ?? updatedAtOf?.(initialData) ?? null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [failed, setFailed] = useState(false);

  const timer = useRef(0);
  const failures = useRef(0);
  const inFlight = useRef<AbortController | null>(null);
  const lastManual = useRef(0);
  // (the server-rendered data counts as a fetch made at mount)
  const lastFetch = useRef(0);
  useEffect(() => {
    lastFetch.current = Date.now();
  }, []);
  const optionRefs = useRef({ updatedAtOf });
  useEffect(() => {
    optionRefs.current = { updatedAtOf };
  }, [updatedAtOf]);

  const load = useCallback(async () => {
    if (inFlight.current) return;
    const controller = new AbortController();
    inFlight.current = controller;
    setIsRefreshing(true);
    try {
      const res = await fetch(url, { signal: controller.signal, cache: "no-store", headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(String(res.status));
      const json = (await res.json()) as { data?: T | null };
      if (json.data === null || json.data === undefined) throw new Error("no data");
      setData(json.data);
      setUpdatedAt(optionRefs.current.updatedAtOf?.(json.data) ?? new Date().toISOString());
      setFailed(false);
      failures.current = 0;
    } catch (err) {
      if ((err as Error)?.name !== "AbortError") {
        failures.current += 1;
        setFailed(true);
      }
    } finally {
      lastFetch.current = Date.now();
      inFlight.current = null;
      setIsRefreshing(false);
    }
  }, [url]);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    const schedule = () => {
      window.clearTimeout(timer.current);
      const backoff = Math.min(CLIENT_REFRESH.maxBackoffFactor, 2 ** failures.current);
      timer.current = window.setTimeout(async () => {
        if (cancelled) return;
        if (document.visibilityState === "visible" && navigator.onLine !== false) await load();
        if (!cancelled) schedule();
      }, intervalMs * backoff);
    };
    const wake = () => {
      // back in view (or back online) after at least one interval away: refresh now
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastFetch.current >= intervalMs) void load().then(() => !cancelled && schedule());
    };
    schedule();
    document.addEventListener("visibilitychange", wake);
    window.addEventListener("online", wake);
    return () => {
      cancelled = true;
      window.clearTimeout(timer.current);
      document.removeEventListener("visibilitychange", wake);
      window.removeEventListener("online", wake);
      inFlight.current?.abort();
    };
  }, [enabled, intervalMs, load]);

  const refresh = useCallback(() => {
    const now = Date.now();
    if (now - lastManual.current < CLIENT_REFRESH.manualThrottle) return;
    lastManual.current = now;
    void load();
  }, [load]);

  return { data, updatedAt, isRefreshing, isStale: failed || !!isStaleData?.(data), refresh };
}
