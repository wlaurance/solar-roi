import { Suspense } from "react";
import { SignupForm } from "@/components/auth/signup-form";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata({
  title: "Create your free account",
  description:
    "Start a free SolarFlow project for your home address — ROI modeling, roof layout, permits, equipment, and nearby installers without outdated rebate assumptions.",
  path: "/signup",
  image: "signup",
  keywords: [
    "solar planning account",
    "solar ROI tool",
    "free solar project",
  ],
});

export default function SignupPage() {
  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <Suspense fallback={<p className="text-sm text-ink-muted">Loading…</p>}>
        <SignupForm />
      </Suspense>
    </main>
  );
}
