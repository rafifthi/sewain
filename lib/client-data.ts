"use client";

import { useEffect, useRef, useState } from "react";
import type { Row } from "@/lib/data";

export const SYNC_ERROR_EVENT = "sewain:sync-error";
export type SyncErrorDetail = { module: string; kind: "load" | "save" };

function emitSyncError(module: string, kind: "load" | "save") {
  window.dispatchEvent(new CustomEvent<SyncErrorDetail>(SYNC_ERROR_EVENT, { detail: { module, kind } }));
}

/** Retries once through /api/auth/refresh when the access token has expired. */
export async function fetchWithRefresh(input: RequestInfo, init?: RequestInit): Promise<Response> {
  let res = await fetch(input, init);
  if (res.status === 401) {
    const refreshed = await fetch("/api/auth/refresh", { method: "POST" });
    if (refreshed.ok) res = await fetch(input, init);
  }
  return res;
}

export async function putModuleRows(module: string, rows: Row[]): Promise<boolean> {
  try {
    const res = await fetchWithRefresh(`/api/data/${module}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rows }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/**
 * Server-backed replacement for the old localStorage `useStoredRows` hook.
 * Loads the module's rows from /api/data/<module> on mount, then persists
 * (debounced) every change back. If the server has no rows yet but the
 * browser still holds pre-database localStorage data under the same key,
 * that data is migrated up once so existing users keep their work.
 */
export function useDbRows(module: string): [Row[], React.Dispatch<React.SetStateAction<Row[]>>, boolean] {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const hydratedRef = useRef(false);
  const skipPersistRef = useRef(false);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const res = await fetchWithRefresh(`/api/data/${module}`);
        if (!res.ok) throw new Error(`load failed (${res.status})`);
        const data = await res.json();
        let next: Row[] = Array.isArray(data.rows) ? data.rows : [];

        if (next.length === 0) {
          const migrated = migrateLegacyRows(module);
          if (migrated && (await putModuleRows(module, migrated))) {
            next = migrated;
          }
        }

        if (!cancelled) {
          skipPersistRef.current = true;
          hydratedRef.current = true;
          setRows(next);
        }
      } catch {
        if (!cancelled) emitSyncError(module, "load");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [module]);

  useEffect(() => {
    if (!hydratedRef.current) return;
    if (skipPersistRef.current) {
      skipPersistRef.current = false;
      return;
    }
    const timer = window.setTimeout(async () => {
      if (!(await putModuleRows(module, rows))) emitSyncError(module, "save");
    }, 800);
    return () => window.clearTimeout(timer);
  }, [module, rows]);

  return [rows, setRows, loading];
}

function migrateLegacyRows(module: string): Row[] | null {
  try {
    const saved = localStorage.getItem(`sewain:${module}`);
    if (!saved) return null;
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return null;
    return parsed.filter(
      (row): row is Row => typeof row === "object" && row !== null && "id" in row
    );
  } catch {
    return null;
  }
}
