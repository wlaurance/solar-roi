import { describe, expect, it } from "vitest";
import { OG_IMAGES, pageMetadata, siteOrigin } from "@/lib/seo";

describe("pageMetadata", () => {
  it("sets canonical, OG, and Twitter fields with branded social title", () => {
    const meta = pageMetadata({
      title: "Solar incentives 2026",
      description: "A short description for homeowners researching solar.",
      path: "/incentives",
      image: "incentives",
      keywords: ["solar incentives"],
    });

    expect(meta.title).toBe("Solar incentives 2026");
    expect(meta.alternates).toEqual({ canonical: "/incentives" });
    expect(meta.openGraph?.title).toBe("Solar incentives 2026 | SolarFlow");
    expect(meta.openGraph?.images).toEqual([
      {
        url: OG_IMAGES.incentives,
        width: 1200,
        height: 630,
        alt: "Solar incentives 2026 | SolarFlow",
      },
    ]);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: "Solar incentives 2026 | SolarFlow",
      images: [OG_IMAGES.incentives],
    });
    expect(meta.keywords).toEqual(["solar incentives"]);
  });

  it("marks shared reports as noindex", () => {
    const meta = pageMetadata({
      title: "Shared solar report",
      description: "Private report",
      path: "/r/abc",
      noIndex: true,
    });
    expect(meta.robots).toMatchObject({ index: false, follow: false });
  });

  it("truncates long descriptions for meta tags", () => {
    const long = "word ".repeat(80).trim();
    const meta = pageMetadata({
      title: "Long",
      description: long,
      path: "/x",
    });
    expect(String(meta.description).length).toBeLessThanOrEqual(155);
    expect(String(meta.description).endsWith("…")).toBe(true);
  });
});

describe("siteOrigin", () => {
  it("falls back to production host", () => {
    const prevApp = process.env.NEXT_PUBLIC_APP_URL;
    const prevUrl = process.env.URL;
    delete process.env.NEXT_PUBLIC_APP_URL;
    delete process.env.URL;
    expect(siteOrigin()).toBe("https://solarflow.app");
    if (prevApp !== undefined) process.env.NEXT_PUBLIC_APP_URL = prevApp;
    if (prevUrl !== undefined) process.env.URL = prevUrl;
  });
});
