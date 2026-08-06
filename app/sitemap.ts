import type { MetadataRoute } from "next";
import { listLocations } from "@/lib/locations/catalog";

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.URL?.replace(/\/$/, "") ||
    "https://solarflow.app"
  );
}

export default function sitemap(): MetadataRoute.Sitemap {
  const origin = siteOrigin();
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${origin}/`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: `${origin}/solar-in`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.9,
    },
    {
      url: `${origin}/signup`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: `${origin}/login`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
  ];

  const locationRoutes: MetadataRoute.Sitemap = listLocations().map((loc) => ({
    url: `${origin}/solar-in/${loc.slug}`,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: loc.type === "city" ? 0.75 : 0.7,
  }));

  return [...staticRoutes, ...locationRoutes];
}
