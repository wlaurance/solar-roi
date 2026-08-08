import { Suspense } from "react";
import { LoginForm } from "@/components/auth/login-form";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Sign in",
  description:
    "Sign in to SolarFlow to model solar ROI, roof layouts, permits, and nearby installers across your projects.",
  path: "/login",
  image: "signup",
});

export default function LoginPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-ink-muted">Loading…</p>}>
        <LoginForm />
      </Suspense>
    </main>
  );
}
