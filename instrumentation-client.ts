import posthog from "posthog-js";

const token = process.env.NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN;
/** Prefer absolute host in production (Netlify) so we don't depend on /ingest rewrites. */
const apiHost =
  process.env.NEXT_PUBLIC_POSTHOG_HOST?.trim() || "/ingest";

if (!token) {
  console.error(
    "[PostHog] NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN is missing — events will not fire. Set it in Netlify env and redeploy.",
  );
} else {
  posthog.init(token, {
    api_host: apiHost,
    ui_host: "https://us.posthog.com",
    defaults: "2026-01-30",
    capture_exceptions: true,
    capture_pageview: true,
    capture_pageleave: true,
    debug: process.env.NODE_ENV === "development",
    loaded: (ph) => {
      if (process.env.NODE_ENV === "development") {
        console.info("[PostHog] initialized", {
          distinct_id: ph.get_distinct_id(),
          api_host: apiHost,
        });
      }
    },
  });
}

export default posthog;
