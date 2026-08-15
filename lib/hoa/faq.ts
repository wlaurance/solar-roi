export type HoaFaq = {
  question: string;
  answer: string;
  tags?: string[];
};

export type HoaTopic = {
  slug: string;
  title: string;
  summary: string;
  faqs: HoaFaq[];
};

/** Public marketing FAQ content for homeowners navigating HOA solar approval. */
export const HOA_TOPICS: HoaTopic[] = [
  {
    slug: "what-hoas-want",
    title: "What HOAs usually want to know",
    summary:
      "Architectural committees care about visibility, mounting, and whether your packet matches their forms — not your utility rate.",
    faqs: [
      {
        question: "Will the panels be visible from the street?",
        answer:
          "Most HOAs ask for roof plane photos, a site plan, and a rendering that shows street-facing elevations. If your best array faces the street, expect aesthetic conditions (color-matched frames, low-profile racking, or setbacks from the ridge). Document street views early so the board is not surprised at the meeting.",
        tags: ["visibility", "aesthetics"],
      },
      {
        question: "What brand and color are the panels and racking?",
        answer:
          "Boards often prefer black-on-black modules and dark anodized rails. Include manufacturer cut sheets and a one-line note on frame color. If your installer has not finalized equipment, list approved options and commit to HOA-friendly finishes.",
        tags: ["equipment", "aesthetics"],
      },
      {
        question: "How will the array be mounted and waterproofed?",
        answer:
          "Attach a racking detail, flashing method, and installer license/insurance. Committees want assurance the roof warranty and water intrusion risk are managed — especially on tile or steep roofs.",
        tags: ["structural", "roof"],
      },
      {
        question: "Is this ground-mount or rooftop?",
        answer:
          "Rooftop is usually easier. Ground-mount and carport arrays trigger more setback, screening, and neighbor-view questions. State that clearly on page one of the application.",
        tags: ["placement"],
      },
      {
        question: "Will inverters and disconnects be screened?",
        answer:
          "Many CC&Rs treat wall-mounted equipment like utilities: side/rear yards, screened from common areas. Show equipment locations on the site plan and note conduit paint matching the siding.",
        tags: ["equipment", "aesthetics"],
      },
    ],
  },
  {
    slug: "application-packet",
    title: "Building an approval packet",
    summary:
      "A complete packet beats a perfect quote. Boards deny incomplete packages more often than they deny solar itself.",
    faqs: [
      {
        question: "What documents belong in a typical HOA solar packet?",
        answer:
          "Usually: completed architectural application, plot/site plan, roof plan with module layout, elevation or photo sims, equipment cut sheets, installer license/insurance, and any neighbor notice forms required by your association. Some communities also want a structural letter for older roofs.",
        tags: ["packet"],
      },
      {
        question: "Do I need to submit CC&Rs with my application?",
        answer:
          "You do not re-submit the whole CC&Rs book. You do need to cite the solar / architectural sections and follow their form. Upload your guidelines so SolarFlow can extract the checklist your board actually uses.",
        tags: ["rules"],
      },
      {
        question: "How long do HOA reviews take?",
        answer:
          "Many associations aim for 30–60 days after a complete packet. Incomplete submissions reset the clock. Ask for the meeting calendar and submittal deadline when you open the application.",
        tags: ["timeline"],
      },
      {
        question: "What if my HOA has no solar-specific form?",
        answer:
          "Use the generic architectural modification form and attach a solar exhibit: scope of work, drawings, and equipment list. A short cover letter that maps each attachment to a CC&R section helps reviewers.",
        tags: ["templates"],
      },
      {
        question: "Should my installer submit for me?",
        answer:
          "Some HOAs only accept owner-signed applications. Others allow contractor agents with a signed authorization. Confirm who must appear at the hearing — owners are often required even when the installer prepares drawings.",
        tags: ["process"],
      },
    ],
  },
  {
    slug: "rights-and-rules",
    title: "Solar rights vs HOA rules",
    summary:
      "Many states limit HOA bans on solar, but associations can still enforce reasonable aesthetic and safety rules.",
    faqs: [
      {
        question: "Can my HOA ban solar outright?",
        answer:
          "In many states, solar access / solar rights laws prevent total bans and unreasonable restrictions that make solar effectively impractical. That does not mean rubber-stamp approval — boards can still require applications, fees, and reasonable aesthetic conditions. Check your state’s statute and your recorded CC&Rs together.",
        tags: ["law"],
      },
      {
        question: "What counts as an unreasonable restriction?",
        answer:
          "Rules that force you onto a heavily shaded roof, require screening that voids warranties, or impose fees far above other architectural applications are often challenged. Keep written denials and compare conditions applied to similar homes.",
        tags: ["law"],
      },
      {
        question: "Do I still need city permits if the HOA approves?",
        answer:
          "Yes. HOA approval is separate from the building permit and utility interconnection / Permission to Operate. Plan the three tracks in parallel so construction is not blocked by paperwork sequencing.",
        tags: ["permits"],
      },
      {
        question: "What about batteries and EV chargers?",
        answer:
          "Treat storage and EVSE as separate scopes if your guidelines do. Battery wall packs and exterior disconnects often get more scrutiny than roof modules. Call them out explicitly in the packet.",
        tags: ["battery"],
      },
    ],
  },
  {
    slug: "neighbors-and-meetings",
    title: "Neighbors, hearings, and denials",
    summary:
      "Most approvals are won with a calm packet and a short presentation — not a debate about energy policy.",
    faqs: [
      {
        question: "Do I need neighbor signatures?",
        answer:
          "Some associations require notice or consent from adjacent lots for roof changes. Others only notify. Follow the form exactly; forged or missing signatures are a common rejection reason.",
        tags: ["neighbors"],
      },
      {
        question: "What should I say at the architectural hearing?",
        answer:
          "Stay factual: system size, roof planes used, visibility mitigation, installer credentials, and that municipal permits will follow. Bring printed elevations. Avoid arguing politics or comparing other homes unless asked.",
        tags: ["hearing"],
      },
      {
        question: "What if the board denies or conditions the project?",
        answer:
          "Ask for the decision in writing with cited CC&R sections. Many denials are fixable (relocate a row, change rail color, screen the inverter). Appeal windows are short — calendar them the day you receive notice.",
        tags: ["denial"],
      },
      {
        question: "Can I start installation before HOA approval?",
        answer:
          "Usually no. Installing early can trigger stop-work, fines, or forced removal. Get written approval (or a written waiver) before mobilization.",
        tags: ["process"],
      },
    ],
  },
  {
    slug: "fees-and-deposits",
    title: "Fees, deposits, and insurance",
    summary:
      "Budget HOA review fees separately from permits and interconnection — they rarely appear on the solar quote.",
    faqs: [
      {
        question: "How much do HOA review fees cost?",
        answer:
          "Review fees commonly range from tens to a few hundred dollars; some communities also hold refundable deposits. Confirm the fee schedule with management before you submit so the packet is not held for nonpayment.",
        tags: ["fees"],
      },
      {
        question: "Does the HOA need a copy of my homeowner insurance?",
        answer:
          "Sometimes, especially for structural work or common-element attachments. More often they want the installer’s COI naming the association as interested party. Ask management which certificate they expect.",
        tags: ["insurance"],
      },
      {
        question: "Who pays if the roof needs reinforcement?",
        answer:
          "Structural upgrades are typically the homeowner’s cost, outside the solar equipment contract unless negotiated. If your HOA requires an engineer letter, get that scoped before equipment is ordered.",
        tags: ["structural"],
      },
    ],
  },
];

export function listHoaTopics(): HoaTopic[] {
  return HOA_TOPICS;
}

export function getHoaTopic(slug: string): HoaTopic | undefined {
  return HOA_TOPICS.find((t) => t.slug === slug);
}

export function allHoaFaqs(): HoaFaq[] {
  return HOA_TOPICS.flatMap((t) => t.faqs);
}
