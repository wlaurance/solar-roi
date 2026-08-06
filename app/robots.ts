import type { MetadataRoute } from "next";

function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.URL?.replace(/\/$/, "") ||
    "https://solarflow.app"
  );
}

export default function robots(): MetadataRoute.Robots {
  const origin = siteOrigin();
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/projects/", "/api/"],
    },
    sitemap: `${origin}/sitemap.xml`,
  };
}
