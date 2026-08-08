"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Icons } from "@/components/icons";
import { readDraftProject } from "@/lib/draft-project";
import { readPendingBillMeta } from "@/lib/pending-bill";
import { identifyUser, track, trackException } from "@/lib/analytics";

export function SignupForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const fromTeaser = searchParams.get("from") === "teaser";
  const fromBill = searchParams.get("from") === "bill";
  const nextPath = searchParams.get("next") || "/projects";
  const [hasDraft, setHasDraft] = useState(false);
  const [hasPendingBill, setHasPendingBill] = useState(false);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setHasDraft(Boolean(readDraftProject()));
      setHasPendingBill(Boolean(readPendingBillMeta()));
    });
    return () => {
      cancelled = true;
    };
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const draft = readDraftProject();
    const pendingBill = readPendingBillMeta();
    const redirectNext = pendingBill
      ? `/upload-bill/${pendingBill.utilitySlug}?claim=1`
      : draft
        ? "/projects"
        : nextPath;

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: { full_name: fullName },
          emailRedirectTo: `${window.location.origin}/auth/callback?next=${encodeURIComponent(redirectNext)}`,
        },
      });
      if (signUpError) throw signUpError;

      if (data.user) {
        identifyUser(data.user.id, {
          email: data.user.email,
          full_name: fullName || null,
        });
      }
      track("user_signed_up", {
        from_teaser: fromTeaser || Boolean(draft),
        from_bill: fromBill || Boolean(pendingBill),
        has_draft_project: Boolean(draft),
        has_pending_bill: Boolean(pendingBill),
        has_session: Boolean(data.session),
      });

      if (data.session) {
        router.push(redirectNext);
        router.refresh();
      } else {
        setMessage(
          pendingBill
            ? "Account created. Confirm your email, then sign in — we’ll submit the bill you attached."
            : draft
              ? "Account created. Confirm your email, then sign in — we’ll attach the address you entered as your first project."
              : "Account created. Check your email to confirm, or sign in if confirmations are disabled.",
        );
      }
    } catch (err) {
      track("signup_failed", {
        error: err instanceof Error ? err.message : "Sign-up failed",
      });
      trackException(err, { context: "signup" });
      setError(err instanceof Error ? err.message : "Sign-up failed");
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
        <h1 className="font-display text-4xl text-ink">Create account</h1>
        <p className="mt-2 text-sm text-ink-muted">
          {fromBill || hasPendingBill
            ? "Create an account to submit the bill you attached"
            : fromTeaser || hasDraft
              ? "Finish signup to unlock your full solar report"
              : "Start your SolarFlow portfolio"}
        </p>
      </div>

      <form
        onSubmit={onSubmit}
        className="rounded-2xl border border-stone-2/80 bg-surface/90 p-6 shadow-sm"
      >
        <label className="label" htmlFor="fullName">
          Full name
        </label>
        <input
          id="fullName"
          className="input mb-4"
          type="text"
          autoComplete="name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />

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

        <label className="label" htmlFor="password">
          Password
        </label>
        <input
          id="password"
          className="input mb-4"
          type="password"
          autoComplete="new-password"
          minLength={6}
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error ? (
          <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">{error}</p>
        ) : null}
        {message ? (
          <p className="mb-3 rounded-md bg-canopy/10 px-3 py-2 text-sm text-canopy-deep">
            {message}
          </p>
        ) : null}

        <button className="btn-primary w-full" type="submit" disabled={loading}>
          {loading ? "Creating…" : "Create account"}
        </button>

        <p className="mt-4 text-center text-sm text-ink-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-canopy hover:underline">
            Sign in
          </Link>
        </p>
      </form>
    </div>
  );
}
