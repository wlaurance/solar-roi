import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
