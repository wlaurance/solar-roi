import { absoluteUrl, SITE_DEFAULT_DESCRIPTION, SITE_NAME } from "@/lib/seo";

type JsonLdProps = {
  data: Record<string, unknown> | Record<string, unknown>[];
};

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

/** Organization + WebSite graph for the marketing homepage. */
export function HomeJsonLd() {
  const origin = absoluteUrl("/");
  return (
    <JsonLd
      data={[
        {
          "@context": "https://schema.org",
          "@type": "Organization",
          name: SITE_NAME,
          url: origin,
          logo: absoluteUrl("/icon.png"),
          description: SITE_DEFAULT_DESCRIPTION,
        },
        {
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: SITE_NAME,
          url: origin,
          description: SITE_DEFAULT_DESCRIPTION,
          publisher: {
            "@type": "Organization",
            name: SITE_NAME,
            url: origin,
          },
        },
      ]}
    />
  );
}
