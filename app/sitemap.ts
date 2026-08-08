import type { MetadataRoute } from "next";
import { listFederalIncentiveIndex, listStateIncentiveIndex } from "@/lib/incentives/catalog";
import { listLocations } from "@/lib/locations/catalog";
import { listManufacturerIndex } from "@/lib/manufacturers/catalog";
import { siteOrigin } from "@/lib/seo";
import { listUtilityIndex } from "@/lib/utilities/catalog";

const PERMIT_SLUGS = [
  "contra-costa",
  "walnut-creek",
  "pge",
  "los-angeles",
  "sce-interconnection",
  "san-diego",
] as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${origin}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/solar-in`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/solar-for`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/solar-permits`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${origin}/incentives`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${origin}/equipment`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${origin}/tools/quote-check`, lastModified: now, changeFrequency: "monthly", priority: 0.85 },
    { url: `${origin}/upload-bill`, lastModified: now, changeFrequency: "weekly", priority: 0.85 },
    { url: `${origin}/signup`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${origin}/login`, lastModified: now, changeFrequency: "monthly", priority: 0.4 },
  ];

  const locationRoutes = listLocations().map((loc) => ({
    url: `${origin}/solar-in/${loc.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: loc.type === "city" ? 0.75 : 0.7,
  }));

  const utilityRoutes = listUtilityIndex().map((u) => ({
    url: `${origin}/solar-for/${u.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const uploadBillRoutes = listUtilityIndex().map((u) => ({
    url: `${origin}/upload-bill/${u.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const permitRoutes = PERMIT_SLUGS.map((slug) => ({
    url: `${origin}/solar-permits/${slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  const federalRoutes = listFederalIncentiveIndex().map((f) => ({
    url: `${origin}/incentives/federal/${f.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.85,
  }));

  const stateRoutes = listStateIncentiveIndex().map((s) => ({
    url: `${origin}/incentives/${s.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.8,
  }));

  const equipmentRoutes = listManufacturerIndex().map((m) => ({
    url: `${origin}/equipment/${m.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: 0.75,
  }));

  return [
    ...staticRoutes,
    ...utilityRoutes,
    ...uploadBillRoutes,
    ...federalRoutes,
    ...stateRoutes,
    ...equipmentRoutes,
    ...permitRoutes,
    ...locationRoutes,
  ];
}
