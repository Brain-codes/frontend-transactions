import { useEffect, useRef } from "react";
import { getSupabase } from "@/lib/supabaseClient";

export type PerfTabKey = "agents" | "partners" | "states";

/**
 * Fires a debounced `performance-report:changed:<tab>` window event whenever
 * one of the given Supabase tables changes. The parent page decides whether
 * to refresh the tab immediately (if active) or just mark it stale.
 */
export function useRealtimeRefresh(tabKey: PerfTabKey, tables: string[]) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const supabase = getSupabase();
    const channel = supabase.channel(`perf-report-${tabKey}`);

    const trigger = () => {
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        window.dispatchEvent(new CustomEvent(`performance-report:changed:${tabKey}`));
      }, 5000);
    };

    tables.forEach((table) => {
      channel.on(
        "postgres_changes" as any,
        { event: "*", schema: "public", table },
        trigger,
      );
    });

    channel.subscribe();

    return () => {
      if (timer.current) clearTimeout(timer.current);
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tabKey, tables.join("|")]);
}

/**
 * Subscribe to the manual/auto refresh event for a given tab.
 * The handler is called whenever the parent page dispatches
 * `performance-report:refresh:<tab>`.
 */
export function useRefreshListener(tabKey: PerfTabKey, handler: () => void) {
  useEffect(() => {
    const evt = `performance-report:refresh:${tabKey}`;
    const fn = () => handler();
    window.addEventListener(evt, fn);
    return () => window.removeEventListener(evt, fn);
  }, [tabKey, handler]);
}
