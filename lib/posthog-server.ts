import { PostHog } from "posthog-node";

export function getPostHogClient() {
  return new PostHog(process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN!, {
    host: process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com",
    flushAt: 1,
    flushInterval: 0,
  });
}

export async function captureServerEvent(input: {
  distinctId: string;
  event: string;
  properties?: Record<string, unknown>;
}) {
  if (!process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN) return;
  const posthog = getPostHogClient();
  try {
    posthog.capture({
      distinctId: input.distinctId,
      event: input.event,
      properties: input.properties,
    });
  } finally {
    await posthog.shutdown();
  }
}

/** Prefer client-forwarded distinct id; fall back to user id or anonymous. */
export function distinctIdFromRequest(
  request: Request,
  userId?: string | null,
): string {
  return (
    request.headers.get("x-posthog-distinct-id") ||
    userId ||
    request.headers.get("x-forwarded-for") ||
    "anonymous"
  );
}
