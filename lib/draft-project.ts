export const DRAFT_PROJECT_KEY = "solarflow_draft_project";

export type DraftProject = {
  name: string;
  address: string;
  city: string;
  state: string;
  zip: string;
  lat: number;
  lng: number;
  county: string | null;
  sourceSlug?: string;
};

export function saveDraftProject(draft: DraftProject): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(DRAFT_PROJECT_KEY, JSON.stringify(draft));
}

export function readDraftProject(): DraftProject | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(DRAFT_PROJECT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as DraftProject;
    if (
      !parsed.address ||
      !parsed.city ||
      !parsed.state ||
      !parsed.zip ||
      parsed.lat == null ||
      parsed.lng == null
    ) {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function clearDraftProject(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(DRAFT_PROJECT_KEY);
}
