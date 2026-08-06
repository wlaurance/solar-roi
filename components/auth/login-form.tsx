"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icons } from "@/components/icons";
import { identifyUser, track, trackException } from "@/lib/analytics";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get("next") ?? "/projects";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    try {
      if (mode === "magic") {
        const { error: magicError } = await supabase.auth.signInWithOtp({
          email,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`,
          },
        });
        if (magicError) throw magicError;
        track("magic_link_requested", { email });
        setMessage("Check your email for the magic link.");
      } else {
        const { data, error: signInError } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (signInError) throw signInError;
        if (data.user) {
          identifyUser(data.user.id, { email: data.user.email });
        }
        track("user_logged_in", { method: "password" });
        router.push(next);
        router.refresh();
      }
    } catch (err) {
      track("login_failed", {
        method: mode,
        error: err instanceof Error ? err.message : "Sign-in failed",
      });
      trackException(err, { context: "login" });
      setError(err instanceof Error ? err.message : "Sign-in failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-canopy text-white">
          <Icons.sun className="h-6 w-6" />
        </div>
        <h1 className="font-display text-4xl text-ink">Welcome back</h1>
        <p className="mt-2 text-sm text-ink-muted">Sign in to your SolarFlow portfolio</p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-stone-2/80 bg-surface/90 p-6 shadow-sm"
      >
        <div className="mb-4 flex rounded-md bg-stone p-1 text-sm">
          <button
            type="button"
            className={`flex-1 rounded-md py-2 ${mode === "password" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}
            onClick={() => {
              setMode("password");
              track("login_mode_selected", { mode: "password" });
            }}
          >
            Password
          </button>
          <button
            type="button"
            className={`flex-1 rounded-md py-2 ${mode === "magic" ? "bg-surface text-ink shadow-sm" : "text-ink-muted"}`}
            onClick={() => {
              setMode("magic");
              track("login_mode_selected", { mode: "magic" });
            }}
          >
            Magic link
          </button>
        </div>

        <label className="label" htmlFor="email">
          Email
        </label>
        <input
          id="email"
          className="input mb-4"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />

        {mode === "password" ? (
          <>
            <label className="label" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className="input mb-4"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </>
        ) : null}

        {error ? (
          <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-md bg-canopy/10 px-3 py-2 text-sm text-canopy-deep">
            {message}
          </p>
        ) : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Working…" : mode === "magic" ? "Send magic link" : "Sign in"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          No account?{" "}
          <Link href="/signup" className="font-medium text-canopy hover:underline">
            Create one
          </Link>
        </p>
      </form>
    </div>
  );
}
