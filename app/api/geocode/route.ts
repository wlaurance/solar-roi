import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/google/geocode";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = typeof body.address === "string" ? body.address : "";
    if (!address.trim()) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }
    const result = await geocodeAddress(address);
    if (!result) {
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Geocode failed" },
      { status: 502 },
    );
  }
}
