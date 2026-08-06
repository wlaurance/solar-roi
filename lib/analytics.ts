import posthog from "posthog-js";

export type AnalyticsProps = Record<string, string | number | boolean | null | undefined>;

export function track(event: string, properties?: AnalyticsProps) {
  if (typeof window === "undefined") return;
  posthog.capture(event, properties);
}

export function identifyUser(
  userId: string,
  traits?: { email?: string | null; full_name?: string | null },
) {
  if (typeof window === "undefined") return;
  posthog.identify(userId, {
    email: traits?.email ?? undefined,
    name: traits?.full_name ?? undefined,
  });
}

export function resetAnalytics() {
  if (typeof window === "undefined") return;
  posthog.reset();
}

/** Headers so API routes attribute events to the same person/session. */
export function posthogRequestHeaders(): Record<string, string> {
  if (typeof window === "undefined") return {};
  return {
    "X-POSTHOG-DISTINCT-ID": posthog.get_distinct_id(),
    "X-POSTHOG-SESSION-ID": posthog.get_session_id(),
  };
}

export function trackException(error: unknown, properties?: AnalyticsProps) {
  if (typeof window === "undefined") return;
  posthog.captureException(error, properties);
}
