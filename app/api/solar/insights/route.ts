import { NextResponse } from "next/server";
import { fetchBuildingInsights } from "@/lib/google/solar";
import { createClient } from "@/lib/supabase/server";

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

    if (projectId) {
      const supabase = await createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        // Pick a mid-range default config if unset / zero
        const configs = insights.solarPotential?.solarPanelConfigs ?? [];
        const midIndex =
          configs.length > 0 ? Math.min(Math.floor(configs.length / 2), configs.length - 1) : 0;

        const { data: existing } = await supabase
          .from("projects")
          .select("selected_panel_config_index")
          .eq("id", projectId)
          .eq("user_id", user.id)
          .maybeSingle();

        await supabase
          .from("projects")
          .update({
            solar_insights: insights,
            selected_panel_config_index:
              existing?.selected_panel_config_index &&
              existing.selected_panel_config_index > 0
                ? existing.selected_panel_config_index
                : midIndex,
          })
          .eq("id", projectId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ insights });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Solar API failed" },
      { status: 502 },
    );
  }
}
