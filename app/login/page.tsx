import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
