import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { geocodeAddress } from "@/lib/google/geocode";
import { lookupCountySolarResources } from "@/lib/llm/county-lookup";

/**
 * Resolve county via Geocoding + LLM resource links for the project address.
 * Caches county + county_links on the project row.
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

    if (!county || force) {
      const geo = await geocodeAddress(fullAddress);
      if (!geo?.county) {
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

      await supabase
        .from("projects")
        .update({
          county,
          city,
          state,
          lat: geo.lat,
          lng: geo.lng,
        })
        .eq("id", projectId);
    }

    if (!force && project.county_links) {
      return NextResponse.json({
        county,
        state,
        city,
        links: project.county_links,
        cached: true,
      });
    }

    const lookup = await lookupCountySolarResources({
      county,
      state,
      city,
      address: fullAddress,
    });

    await supabase
      .from("projects")
      .update({ county, county_links: lookup })
      .eq("id", projectId);

    return NextResponse.json({
      county,
      state,
      city,
      links: lookup,
      cached: false,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "County lookup failed" },
      { status: 502 },
    );
  }
}
