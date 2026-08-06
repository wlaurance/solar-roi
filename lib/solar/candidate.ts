/**
 * Heuristic solar-candidate rating from Google Solar sunshine metrics.
 *
 * `maxSunshineHoursPerYear` is Google's peak annual sunshine exposure on the
 * best part of the roof (not clock hours of daylight). CA / Southwest roofs
 * often land ~1600–2000; cloudy / heavily shaded sites fall lower.
 *
 * Thresholds are a practical proposal screening aid, not a engineering study.
 */

export type SolarCandidateTier = "excellent" | "good" | "fair" | "poor";

export type SolarCandidateAssessment = {
  tier: SolarCandidateTier;
  label: string;
  summary: string;
  /** Short answer suitable for UI: "Yes — strong candidate" etc. */
  candidateAnswer: string;
  sunshineHoursPerYear: number;
  /** 0–100 score for progress UI */
  score: number;
};

const TIERS: Array<{
  tier: SolarCandidateTier;
  minHours: number;
  label: string;
  candidateAnswer: string;
  summary: string;
}> = [
  {
    tier: "excellent",
    minHours: 1800,
    label: "Excellent",
    candidateAnswer: "Yes — excellent solar candidate",
    summary:
      "High annual sunshine on the roof. Typically a strong site for rooftop PV with good production potential.",
  },
  {
    tier: "good",
    minHours: 1500,
    label: "Good",
    candidateAnswer: "Yes — good solar candidate",
    summary:
      "Solid sunshine exposure. Most homes in this band are viable for solar, especially with a south- or west-facing array.",
  },
  {
    tier: "fair",
    minHours: 1200,
    label: "Fair",
    candidateAnswer: "Maybe — fair candidate",
    summary:
      "Moderate sun. Solar can still work, but expect lower yield; check shading, roof pitch, and battery/self-consumption.",
  },
  {
    tier: "poor",
    minHours: 0,
    label: "Poor",
    candidateAnswer: "Likely not ideal",
    summary:
      "Below typical thresholds for a strong rooftop case. Consider shading mitigation, ground-mount, or community solar alternatives.",
  },
];

export function assessSolarCandidate(
  maxSunshineHoursPerYear: number | null | undefined,
): SolarCandidateAssessment | null {
  if (
    maxSunshineHoursPerYear == null ||
    !Number.isFinite(maxSunshineHoursPerYear) ||
    maxSunshineHoursPerYear <= 0
  ) {
    return null;
  }

  const hours = Math.round(maxSunshineHoursPerYear);
  const match =
    TIERS.find((t) => hours >= t.minHours) ?? TIERS[TIERS.length - 1];

  // Map ~900–2100 hours onto a 0–100 score with soft clamps
  const score = Math.max(
    0,
    Math.min(100, Math.round(((hours - 900) / (2100 - 900)) * 100)),
  );

  return {
    tier: match.tier,
    label: match.label,
    summary: match.summary,
    candidateAnswer: match.candidateAnswer,
    sunshineHoursPerYear: hours,
    score,
  };
}
