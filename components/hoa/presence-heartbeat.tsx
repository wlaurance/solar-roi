"use client";

import { useEffect, useRef } from "react";
import { useParams, usePathname } from "next/navigation";

function clientId(): string {
  const key = "sf_presence_client";
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const id = crypto.randomUUID();
    sessionStorage.setItem(key, id);
    return id;
  } catch {
    return "anonymous";
  }
}

/**
 * Heartbeats while the tab is visible so the server can email when the user
 * is away and Solar bot finishes a reply.
 */
export function PresenceHeartbeat() {
  const pathname = usePathname();
  const params = useParams<{ id?: string }>();
  const projectId = typeof params.id === "string" ? params.id : null;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function beat() {
      if (cancelled) return;
      if (typeof document !== "undefined" && document.visibilityState !== "visible") {
        return;
      }
      try {
        await fetch("/api/presence/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            path: pathname,
            projectId,
            clientId: clientId(),
          }),
          keepalive: true,
        });
      } catch {
        // ignore transient network errors
      }
    }

    void beat();
    timer.current = setInterval(beat, 30_000);

    function onVisibility() {
      if (document.visibilityState === "visible") void beat();
    }
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      if (timer.current) clearInterval(timer.current);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [pathname, projectId]);

  return null;
}
