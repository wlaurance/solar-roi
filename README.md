# SolarFlow — local development

Multi-project solar portfolio app: ROI modeling (Solar API–driven when available), Google Solar roof layouts on Maps satellite, Contra Costa / Walnut Creek / PG&E permit guides, and Places-backed installer search.

## Stack

- Next.js App Router + TypeScript + Tailwind
- Supabase Auth + Postgres (local via Docker)
- Google Maps Platform (Maps JS, Solar, Geocoding, Places)
- Chart.js

## Prerequisites

- Node 20+
- Docker Desktop running (for `supabase start`)
- A Google Cloud project with billing enabled

### Enable these GCP APIs

1. **Maps JavaScript API**
2. **Solar API**
3. **Geocoding API**
4. **Places API** (Places API / Places API (New) as required by your key)

Restrict the browser key by HTTP referrer in production. The same key is used server-side for Solar/Geocoding/Places proxies in local dev; for production you may split publishable vs server keys.

## Setup

```bash
npm install
npx supabase start
```

Copy local Supabase keys from `npx supabase status -o env` into `.env.local`:

```bash
cp .env.example .env.local
# then fill NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
```

`.env.local` should include:

```bash
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<from supabase status>
GOOGLE_MAPS_API_KEY=your_key
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=your_key
```

Apply migrations (happens automatically on first `supabase start` for local). To reset:

```bash
npx supabase db reset
```

Run the app:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, then **New design** and enter a property address.

## Scripts

| Command | Purpose |
|--------|---------|
| `npm run dev` | Next.js dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest (ROI engine) |
| `npm run typecheck` | `tsc --noEmit` |
| `npx supabase start` | Local Auth + Postgres + Studio |
| `npx supabase status` | URLs and keys |

## App routes

- `/projects` — portfolio CRUD entry
- `/projects/[id]/dashboard` — ROI toggles + 25-year chart + power bill upload/parse
- `/projects/[id]/roof` — Google Solar `buildingInsights` panel configs on satellite map
- `/projects/[id]/permits` — seeded jurisdiction steps from Supabase
- `/projects/[id]/installers` — Places nearby “solar installer”
- `/upload-bill` / `/upload-bill/[utility]` — marketing bill upload (auth-gated submit → Supabase + Gemini parse)
- `/financing` / `/financing/[slug]` — solar loan / embedded finance guides (lenders, marketplaces, aggregators)

## ROI notes

Prototype constants: base bill `$670`, HVAC `+$110`, water `+$40`, battery `$13,500` with **`$8,500` replacement at year 12**, federal residential ITC `×1.0` (0% after Dec 31, 2025 / OBBBA), inflation `5%`. When Solar insights are cached, system kW = `panelsCount × panelCapacityWatts / 1000` and offset blends from `yearlyEnergyDcKwh`.

## Visual direction

Instrument Sans + Instrument Serif; stone/sage surfaces; brass `#C4A035` and canopy `#3F6B4F` accents.
