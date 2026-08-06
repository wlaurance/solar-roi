import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/google/geocode";
import { lookupCountySolarResources } from "@/lib/llm/county-lookup";
import type { CountyLinksPayload } from "@/lib/types";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";

function needsFreshLookup(pack: CountyLinksPayload | null | undefined): boolean {
  if (!pack) return true;
  // Older caches may only have links — regenerate so steps are persisted too
  if (!pack.steps?.length) return true;
  return false;
}

/**
 * Resolve county via Geocoding + LLM permitting content for the project address.
 * Persists county + county_links (summary, steps, links) on the project row.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const projectId = typeof body.projectId === "string" ? body.projectId : "";
    const force = Boolean(body.force);

    if (!projectId) {
      return NextResponse.json({ error: "projectId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const distinctId = distinctIdFromRequest(request, user.id);

    const { data: project, error: loadError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .maybeSingle();

    if (loadError || !project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    const fullAddress = [
      project.address,
      project.city,
      `${project.state} ${project.zip}`,
    ]
      .filter(Boolean)
      .join(", ");

    let county = project.county as string | null;
    let city = project.city as string;
    let state = project.state as string;
    const existingPack = project.county_links as CountyLinksPayload | null;

    if (!county || force) {
      const geo = await geocodeAddress(fullAddress);
      if (!geo?.county) {
        await captureServerEvent({
          distinctId,
          event: "server_county_resources_failed",
          properties: { project_id: projectId, reason: "no_county" },
        });
        return NextResponse.json(
          {
            error:
              "Could not determine county from this address via Google Geocoding.",
          },
          { status: 422 },
        );
      }
      county = geo.county;
      if (geo.city) city = geo.city;
      if (geo.state) state = geo.state;

      const { error: geoUpdateError } = await supabase
        .from("projects")
        .update({
          county,
          city,
          state,
          lat: geo.lat,
          lng: geo.lng,
        })
        .eq("id", projectId);
      if (geoUpdateError) {
        throw new Error(`Failed to save county: ${geoUpdateError.message}`);
      }
    }

    if (!force && !needsFreshLookup(existingPack)) {
      await captureServerEvent({
        distinctId,
        event: "server_county_resources_served",
        properties: { project_id: projectId, cached: true, county },
      });
      return NextResponse.json({
        county,
        state,
        city,
        links: existingPack,
        cached: true,
      });
    }

    const lookup = await lookupCountySolarResources({
      county: county!,
      state,
      city,
      address: fullAddress,
    });

    const { error: saveError } = await supabase
      .from("projects")
      .update({ county, county_links: lookup })
      .eq("id", projectId);

    if (saveError) {
      throw new Error(`Failed to save permitting content: ${saveError.message}`);
    }

    await captureServerEvent({
      distinctId,
      event: "server_county_resources_served",
      properties: {
        project_id: projectId,
        cached: false,
        county,
        force,
        step_count: lookup.steps?.length ?? 0,
      },
    });

    return NextResponse.json({
      county,
      state,
      city,
      links: lookup,
      cached: false,
    });
  } catch (err) {
    await captureServerEvent({
      distinctId: distinctIdFromRequest(request),
      event: "server_county_resources_failed",
      properties: {
        error: err instanceof Error ? err.message : "County lookup failed",
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "County lookup failed" },
      { status: 502 },
    );
  }
}
