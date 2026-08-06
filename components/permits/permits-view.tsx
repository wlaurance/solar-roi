import type { PermitJurisdictionWithSteps } from "@/lib/types";

export function PermitsView({
  projectName,
  projectCity,
  jurisdictions,
}: {
  projectName: string;
  projectCity: string;
  jurisdictions: PermitJurisdictionWithSteps[];
}) {
  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-8">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-brass">
          Permitting
        </p>
        <h1 className="font-display mt-1 text-4xl text-ink">County & utility steps</h1>
        <p className="mt-2 text-sm text-ink-muted">
          Guided path for {projectName}
          {projectCity ? ` in ${projectCity}` : ""}. Content is stored in Supabase so it
          can be edited in Studio without a code change.
        </p>
      </div>

      {jurisdictions.length === 0 ? (
        <p className="rounded-md bg-stone-2/60 px-4 py-3 text-sm text-ink-muted">
          No permit jurisdictions seeded yet. Run Supabase migrations.
        </p>
      ) : (
        <div className="space-y-8">
          {jurisdictions.map((j) => (
            <section key={j.id}>
              <div className="mb-3 border-b border-stone-2/80 pb-2">
                <h2 className="text-xl font-medium text-ink">{j.name}</h2>
                {j.region ? (
                  <p className="text-sm text-ink-muted">{j.region}</p>
                ) : null}
              </div>
              <ol className="space-y-4">
                {j.permit_steps.map((step, idx) => (
                  <li
                    key={step.id}
                    className="relative rounded-2xl border border-stone-2/80 bg-surface/90 p-4 pl-14 shadow-sm"
                  >
                    <span className="absolute left-4 top-4 flex h-7 w-7 items-center justify-center rounded-full bg-canopy text-xs font-medium text-white">
                      {idx + 1}
                    </span>
                    <h3 className="font-medium text-ink">{step.title}</h3>
                    <p className="mt-1 text-sm leading-relaxed text-ink-muted">
                      {step.body}
                    </p>
                    {step.link_url ? (
                      <a
                        href={step.link_url}
                        target="_blank"
                        rel="noreferrer"
                        className="mt-2 inline-block text-sm font-medium text-canopy hover:underline"
                      >
                        {step.link_label ?? "Learn more"} →
                      </a>
                    ) : null}
                  </li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
