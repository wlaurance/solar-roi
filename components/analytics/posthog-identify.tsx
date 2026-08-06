"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";
import { identifyUser, resetAnalytics } from "@/lib/analytics";

/** Keep PostHog person identity in sync with Supabase auth. */
export function PostHogIdentify() {
  useEffect(() => {
    const supabase = createClient();

    supabase.auth.getUser().then(({ data: { user } }) => {
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          full_name:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
        });
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        resetAnalytics();
        return;
      }
      const user = session?.user;
      if (user) {
        identifyUser(user.id, {
          email: user.email,
          full_name:
            typeof user.user_metadata?.full_name === "string"
              ? user.user_metadata.full_name
              : null,
        });
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  return null;
}
