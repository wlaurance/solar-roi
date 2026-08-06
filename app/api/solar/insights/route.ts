import { NextResponse } from "next/server";
import { fetchBuildingInsights } from "@/lib/google/solar";
import { systemKwFromPanels } from "@/lib/roi/calculate";
import { createClient } from "@/lib/supabase/server";
import {
  captureServerEvent,
  distinctIdFromRequest,
} from "@/lib/posthog-server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const lat = Number(searchParams.get("lat"));
  const lng = Number(searchParams.get("lng"));
  const projectId = searchParams.get("projectId");

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return NextResponse.json({ error: "lat and lng are required" }, { status: 400 });
  }

  try {
    const insights = await fetchBuildingInsights(lat, lng);
    let distinctId = distinctIdFromRequest(request);

    if (projectId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      distinctId = distinctIdFromRequest(request, user?.id);
      if (user) {
        const configs = insights.solarPotential?.solarPanelConfigs ?? [];
        const watts = insights.solarPotential?.panelCapacityWatts ?? 400;
        const midIndex =
          configs.length > 0
            ? Math.min(Math.floor(configs.length / 2), configs.length - 1)
            : 0;

        const { data: existing } = await supabase
          .from("projects")
          .select("selected_panel_config_index")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        const hasSavedIndex =
          existing != null &&
          typeof existing.selected_panel_config_index === "number";
        const configIndex = hasSavedIndex
          ? Math.max(
              0,
              Math.min(
                existing.selected_panel_config_index,
                Math.max(configs.length - 1, 0),
              ),
            )
          : midIndex;

        const selected = configs[configIndex];
        const systemKw = selected?.panelsCount
          ? systemKwFromPanels(selected.panelsCount, watts)
          : undefined;

        await supabase
          .from("projects")
          .update({
            solar_insights: insights,
            selected_panel_config_index: configIndex,
            ...(systemKw != null ? { system_kw_base: systemKw } : {}),
          })
          .eq("id", projectId)
          .eq("user_id", user.id);
      }
    }

    await captureServerEvent({
      distinctId,
      event: "server_solar_insights_fetched",
      properties: {
        project_id: projectId,
        config_count: insights.solarPotential?.solarPanelConfigs?.length ?? 0,
      },
    });

    return NextResponse.json({ insights });
  } catch (err) {
    await captureServerEvent({
      distinctId: distinctIdFromRequest(request),
      event: "server_solar_insights_failed",
      properties: {
        project_id: projectId,
        error: err instanceof Error ? err.message : "Solar API failed",
      },
    });
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Solar API failed" },
      { status: 502 },
    );
  }
}
