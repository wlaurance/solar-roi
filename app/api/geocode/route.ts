import { NextResponse } from "next/server";
import { geocodeAddress } from "@/lib/google/geocode";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const address = typeof body.address === "string" ? body.address : "";
    if (!address.trim()) {
      return NextResponse.json({ error: "address is required" }, { status: 400 });
    }
    const result = await geocodeAddress(address);
    const distinctId = distinctIdFromRequest(request);
    if (!result) {
      await captureServerEvent({
        distinctId,
        event: "server_geocode_failed",
        properties: { address_length: address.length },
      });
      return NextResponse.json({ error: "Address not found" }, { status: 404 });
    }
    await captureServerEvent({
      distinctId,
      event: "server_geocode_succeeded",
      properties: {
        state: result.state,
        has_county: Boolean(result.county),
      },
    });
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Geocode failed" },
      { status: 502 },
    );
  }
}
