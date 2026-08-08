import type { Metadata } from "next";

export const SITE_NAME = "SolarFlow";

export const SITE_DEFAULT_TITLE =
  "SolarFlow — model solar ROI before you sign";

export const SITE_DEFAULT_DESCRIPTION =
  "Model rooftop solar ROI without outdated federal rebate assumptions — roof layout, permits, utilities, equipment, and nearby installers for every project.";

export type OgImageKey =
  | "home"
  | "solar-in"
  | "solar-for"
  | "incentives"
  | "equipment"
  | "permits"
  | "quote-check"
  | "signup";

/** Static OG/Twitter images served from /public/og (1200×630). */
export const OG_IMAGES: Record<OgImageKey, string> = {
  home: "/og/og-home.jpg",
  "solar-in": "/og/og-solar-in.jpg",
  "solar-for": "/og/og-solar-for.jpg",
  incentives: "/og/og-incentives.jpg",
  equipment: "/og/og-equipment.jpg",
  permits: "/og/og-permits.jpg",
  "quote-check": "/og/og-quote-check.jpg",
  signup: "/og/og-signup.jpg",
};

const OG_IMAGE_SIZE = { width: 1200, height: 630 } as const;

export function siteOrigin(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.URL?.replace(/\/$/, "") ||
    "https://solarflow.app"
  );
}

export function absoluteUrl(path = "/"): string {
  const origin = siteOrigin();
  if (!path || path === "/") return `${origin}/`;
  return `${origin}${path.startsWith("/") ? path : `/${path}`}`;
}

function truncateDescription(text: string, max = 155): string {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (cleaned.length <= max) return cleaned;
  const sliced = cleaned.slice(0, max - 1);
  const lastSpace = sliced.lastIndexOf(" ");
  return `${(lastSpace > 80 ? sliced.slice(0, lastSpace) : sliced).trimEnd()}…`;
}

export type PageMetadataInput = {
  /** Short page title; root template appends "| SolarFlow" unless absolute. */
  title: string;
  description: string;
  /** Canonical path, e.g. "/solar-for/pge". */
  path: string;
  image?: OgImageKey;
  /** Use full title string without the root template. */
  absoluteTitle?: boolean;
  noIndex?: boolean;
  keywords?: string[];
  ogType?: "website" | "article";
};

export function pageMetadata({
  title,
  description,
  path,
  image = "home",
  absoluteTitle = false,
  noIndex = false,
  keywords,
  ogType = "website",
}: PageMetadataInput): Metadata {
  const desc = truncateDescription(description);
  const canonical = path.startsWith("/") ? path : `/${path}`;
  const url = absoluteUrl(canonical);
  const imagePath = OG_IMAGES[image];
  const socialTitle =
    absoluteTitle || title.includes(SITE_NAME)
      ? title
      : `${title} | ${SITE_NAME}`;
  const images = [
    {
      url: imagePath,
      width: OG_IMAGE_SIZE.width,
      height: OG_IMAGE_SIZE.height,
      alt: `${socialTitle}`,
    },
  ];

  return {
    title: absoluteTitle ? { absolute: title } : title,
    description: desc,
    keywords: keywords?.length ? keywords : undefined,
    alternates: { canonical },
    robots: noIndex
      ? { index: false, follow: false, googleBot: { index: false, follow: false } }
      : { index: true, follow: true },
    openGraph: {
      title: socialTitle,
      description: desc,
      url,
      siteName: SITE_NAME,
      locale: "en_US",
      type: ogType,
      images,
    },
    twitter: {
      card: "summary_large_image",
      title: socialTitle,
      description: desc,
      images: [imagePath],
    },
  };
}

export function rootMetadata(): Metadata {
  const home = pageMetadata({
    title: SITE_DEFAULT_TITLE,
    description: SITE_DEFAULT_DESCRIPTION,
    path: "/",
    image: "home",
    absoluteTitle: true,
    keywords: [
      "solar ROI",
      "rooftop solar",
      "solar permits",
      "solar incentives 2026",
      "solar quote comparison",
      "solar installers",
    ],
  });

  return {
    metadataBase: new URL(siteOrigin()),
    title: {
      default: SITE_DEFAULT_TITLE,
      template: `%s | ${SITE_NAME}`,
    },
    description: home.description,
    applicationName: SITE_NAME,
    authors: [{ name: SITE_NAME }],
    creator: SITE_NAME,
    publisher: SITE_NAME,
    category: "Solar energy",
    keywords: home.keywords,
    alternates: { canonical: "/" },
    robots: { index: true, follow: true },
    openGraph: {
      ...home.openGraph,
      title: SITE_DEFAULT_TITLE,
    },
    twitter: {
      ...home.twitter,
      title: SITE_DEFAULT_TITLE,
    },
    formatDetection: {
      telephone: false,
      email: false,
      address: false,
    },
  };
}
