"use client";

import { FormEvent, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { identifyUser, track } from "@/lib/analytics";

type Props = {
  email: string;
  initialName: string;
};

export function ProfileForm({ email, initialName }: Props) {
  const [fullName, setFullName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    const supabase = createClient();
    const { data, error: updateError } = await supabase.auth.updateUser({
      data: { full_name: fullName.trim() },
    });
    setSaving(false);
    if (updateError) {
      setError(updateError.message);
      return;
    }
    if (data.user) {
      identifyUser(data.user.id, {
        email: data.user.email,
        full_name: fullName.trim() || null,
      });
    }
    track("profile_updated");
    setSaved(true);
  }

  return (
    <form
      onSubmit={onSubmit}
      className="rounded-2xl border border-stone-2/80 bg-surface/90 p-6 shadow-sm"
    >
      <h2 className="text-lg font-medium text-ink">Account</h2>
      <p className="mt-1 text-sm text-ink-muted">
        This is how you show up across projects and emails.
      </p>

      <label className="label mt-6" htmlFor="fullName">
        Full name
      </label>
      <input
        id="fullName"
        className="input mb-4"
        type="text"
        autoComplete="name"
        value={fullName}
        onChange={(e) => {
          setFullName(e.target.value);
          setSaved(false);
        }}
      />

      <label className="label" htmlFor="email">
        Email
      </label>
      <input
        id="email"
        className="input mb-4 bg-stone/60"
        type="email"
        value={email}
        readOnly
      />

      {error ? (
        <p className="mb-3 rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}
      {saved ? (
        <p className="mb-3 rounded-md bg-canopy/10 px-3 py-2 text-sm text-canopy-deep">
          Profile saved.
        </p>
      ) : null}

      <button className="btn-primary" type="submit" disabled={saving}>
        {saving ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
