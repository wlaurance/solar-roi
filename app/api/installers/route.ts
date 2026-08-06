import { NextResponse } from "next/server";
import { searchSolarInstallers } from "@/lib/google/places";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address")?.trim() ?? "";
  const latRaw = searchParams.get("lat");
  const lngRaw = searchParams.get("lng");
  const lat = latRaw != null && latRaw !== "" ? Number(latRaw) : null;
  const lng = lngRaw != null && lngRaw !== "" ? Number(lngRaw) : null;
  const q = searchParams.get("q") ?? "solar installer";

  if (!address) {
    return NextResponse.json(
      { error: "address is required (use the project street address)" },
      { status: 400 },
    );
  }

  try {
    const installers = await searchSolarInstallers({
      address,
      lat: lat != null && Number.isFinite(lat) ? lat : null,
      lng: lng != null && Number.isFinite(lng) ? lng : null,
      query: q,
    });
    return NextResponse.json(
      { installers, searchedAddress: address },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      },
    );
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Places search failed" },
      { status: 502 },
    );
  }
}
