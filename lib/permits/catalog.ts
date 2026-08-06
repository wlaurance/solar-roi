import { createClient } from "@/lib/supabase/server";

export type PermitJurisdiction = {
  id: string;
  slug: string;
  name: string;
  region: string;
};

export type PermitStep = {
  id: string;
  jurisdiction_id: string;
  sort_order: number;
  title: string;
  body: string;
  link_url: string | null;
  link_label: string | null;
};

export type PermitGuide = PermitJurisdiction & {
  steps: PermitStep[];
};

/** Fallback when DB is empty/unreachable — mirrors init seed. */
const FALLBACK: PermitGuide[] = [
  {
    id: "a0000000-0000-4000-8000-000000000001",
    slug: "contra-costa",
    name: "Contra Costa County",
    region: "Bay Area, CA",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000001",
        sort_order: 1,
        title: "Confirm jurisdiction",
        body: "Verify whether the property is in unincorporated Contra Costa County or within city limits (Walnut Creek, Concord, etc.). County permits apply only to unincorporated parcels.",
        link_url: "https://www.contracosta.ca.gov/5418/Building-Inspection",
        link_label: "County Building Inspection",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000001",
        sort_order: 2,
        title: "Submit building permit application",
        body: "File a residential solar PV building permit with plans showing array layout, structural attachment details, and one-line electrical diagram. Expedited review is often available for standard rooftop systems under 10–15 kW.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000001",
        sort_order: 3,
        title: "Plan check & corrections",
        body: "Respond to any plan-check comments (fire setbacks, grounding, Rapid Shutdown labeling). Once approved, pay fees and schedule inspections.",
        link_url: null,
        link_label: null,
      },
      {
        id: "4",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000001",
        sort_order: 4,
        title: "Rough / final inspection",
        body: "After installation, request final building inspection. Keep the approved permit package on-site for the inspector.",
        link_url: null,
        link_label: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000002",
    slug: "walnut-creek",
    name: "City of Walnut Creek",
    region: "Contra Costa County, CA",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000002",
        sort_order: 1,
        title: "Walnut Creek solar permit",
        body: "Most rooftop residential solar systems in Walnut Creek qualify for an expedited building permit. Apply through the City online portal with a site plan and electrical one-line.",
        link_url:
          "https://www.walnut-creek.org/departments/community-development/building",
        link_label: "WC Building Division",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000002",
        sort_order: 2,
        title: "Fire setbacks & access pathways",
        body: "Ensure pathways meet California Residential Code / local fire amendments (typically roof-edge and ridge clearances). South-facing arrays should respect ridge and eave clearances.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000002",
        sort_order: 3,
        title: "Schedule inspections",
        body: "After install, schedule final electrical/building inspection online. Pass inspection before requesting PG&E Permission to Operate (PTO).",
        link_url: null,
        link_label: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000003",
    slug: "pge",
    name: "PG&E Interconnection",
    region: "Northern California",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000003",
        sort_order: 1,
        title: "Apply for interconnection (Rule 21)",
        body: "Submit a PG&E interconnection application for your inverter/system size. For residential NEM / Net Billing Tariff (successor to NEM 2.0 / NEM 3.0 era), use the standard online application.",
        link_url:
          "https://www.pge.com/en/account/service-requests/building-and-renovation/interconnection.html",
        link_label: "PG&E Interconnection",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000003",
        sort_order: 2,
        title: "Net Billing Tariff awareness",
        body: "California's Net Billing Tariff credits exports at avoided-cost-based rates. Pairing solar with battery storage typically improves self-consumption and bill savings versus export-heavy designs.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000003",
        sort_order: 3,
        title: "Permission to Operate (PTO)",
        body: "After city/county final inspection and PG&E review, receive Permission to Operate. Do not energize export until PTO is granted.",
        link_url: null,
        link_label: null,
      },
      {
        id: "4",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000003",
        sort_order: 4,
        title: "Final meter / billing setup",
        body: "Confirm your rate schedule and that the bi-directional meter (or equivalent metering) is correctly reflecting generation and usage.",
        link_url: null,
        link_label: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000004",
    slug: "los-angeles",
    name: "City of Los Angeles",
    region: "Los Angeles County, CA",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000004",
        sort_order: 1,
        title: "Confirm LADBS solar permit path",
        body: "Most residential rooftop PV systems in the City of Los Angeles go through LADBS. Confirm whether your project qualifies for streamlined / express solar permitting versus standard plan check.",
        link_url: "https://www.ladbs.org/",
        link_label: "LADBS",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000004",
        sort_order: 2,
        title: "Submit plans & electrical one-line",
        body: "Provide site plan, array layout, structural attachment details, and a one-line diagram. Fire access pathways and Rapid Shutdown labeling are common correction items.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000004",
        sort_order: 3,
        title: "Inspections before utility PTO",
        body: "Pass final inspection before requesting Permission to Operate from your utility (often SCE or LADWP depending on the parcel).",
        link_url: null,
        link_label: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000005",
    slug: "sce-interconnection",
    name: "SCE Interconnection",
    region: "Southern California",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000005",
        sort_order: 1,
        title: "Submit SCE interconnection application",
        body: "Apply for interconnection with Southern California Edison for your inverter/system size. Keep equipment documentation ready (spec sheets, UL listings).",
        link_url: "https://www.sce.com/",
        link_label: "SCE",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000005",
        sort_order: 2,
        title: "Net Billing Tariff expectations",
        body: "Under California Net Billing, export credits are not classic 1:1 retail NEM. Ask your installer what self-consumption assumptions drive the savings chart.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000005",
        sort_order: 3,
        title: "Permission to Operate",
        body: "Energize export only after SCE issues PTO and local final inspection is complete.",
        link_url: null,
        link_label: null,
      },
    ],
  },
  {
    id: "a0000000-0000-4000-8000-000000000006",
    slug: "san-diego",
    name: "City of San Diego",
    region: "San Diego County, CA",
    steps: [
      {
        id: "1",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000006",
        sort_order: 1,
        title: "City of San Diego solar building permit",
        body: "File a residential PV permit with the City Development Services Department. Expedited pathways often exist for standard rooftop systems — confirm current checklist online.",
        link_url: "https://www.sandiego.gov/development-services",
        link_label: "San Diego DSD",
      },
      {
        id: "2",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000006",
        sort_order: 2,
        title: "Fire setbacks & structural notes",
        body: "Account for roof access pathways and structural attachment details. Coastal or older roofs may trigger extra review.",
        link_url: null,
        link_label: null,
      },
      {
        id: "3",
        jurisdiction_id: "a0000000-0000-4000-8000-000000000006",
        sort_order: 3,
        title: "Inspection then SDG&E interconnection",
        body: "After final inspection, complete SDG&E interconnection / PTO steps before exporting.",
        link_url: null,
        link_label: null,
      },
    ],
  },
];

export async function listPermitGuides(): Promise<PermitGuide[]> {
  try {
    const supabase = await createClient();
    const { data: jurisdictions, error } = await supabase
      .from("permit_jurisdictions")
      .select("id, slug, name, region")
      .order("name");
    if (error || !jurisdictions?.length) return FALLBACK;

    const { data: steps } = await supabase
      .from("permit_steps")
      .select(
        "id, jurisdiction_id, sort_order, title, body, link_url, link_label",
      )
      .order("sort_order");

    const byJurisdiction = new Map<string, PermitStep[]>();
    for (const step of (steps ?? []) as PermitStep[]) {
      const list = byJurisdiction.get(step.jurisdiction_id) ?? [];
      list.push(step);
      byJurisdiction.set(step.jurisdiction_id, list);
    }

    return (jurisdictions as PermitJurisdiction[]).map((j) => ({
      ...j,
      steps: byJurisdiction.get(j.id) ?? [],
    }));
  } catch {
    return FALLBACK;
  }
}

export async function getPermitGuideBySlug(
  slug: string,
): Promise<PermitGuide | null> {
  const guides = await listPermitGuides();
  return guides.find((g) => g.slug === slug) ?? null;
}
