import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EDGE_CONFIG } from "../_shared/config.ts";
import {
  getSeverityLevel,
  isDemographicallyRelevant,
  calculateDistance,
} from "../_shared/notification-helpers.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { type, record } = await req.json();
  console.log(
    "📡 [Broadcast Navigation Reviews] Received webhook:",
    type,
    "for review:",
    record.id
  );

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Only process INSERT events
    if (type !== "INSERT") {
      return new Response(
        JSON.stringify({ message: "Not an insert event" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const review = record;

    // Only broadcast dangerous reviews (safety_rating < 3.0)
    if (review.safety_rating >= 3.0) {
      console.log("✅ Review not dangerous, no broadcast needed");
      return new Response(
        JSON.stringify({ message: "Review not dangerous enough for broadcast" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    const severity = getSeverityLevel(review.safety_rating);
    if (!severity) {
      return new Response(
        JSON.stringify({ message: "Invalid rating for severity" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(
      `${severity.emoji} ${severity.label} review detected — checking active navigators...`
    );

    // Fetch review location coordinates
    const { data: reviewLocationArray, error: locationError } =
      await supabaseClient.rpc("get_location_with_coords", {
        location_id: review.location_id,
      });

    if (locationError || !reviewLocationArray || reviewLocationArray.length === 0) {
      console.error("❌ Error fetching location:", locationError);
      return new Response(
        JSON.stringify({ message: "Location not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: locationError ? 500 : 404,
        }
      );
    }

    const reviewLocation = reviewLocationArray[0];
    console.log(
      `📍 Review at: ${reviewLocation.latitude}, ${reviewLocation.longitude}`
    );

    // Fetch reviewer demographics for demographic matching
    const { data: reviewerProfile } = await supabaseClient
      .from("user_profiles")
      .select(
        "race_ethnicity, gender, lgbtq_status, disability_status, religion"
      )
      .eq("id", review.user_id)
      .single();

    // Find ALL active navigation routes (no push_token filter)
    const { data: activeRoutes, error: routeError } = await supabaseClient
      .from("routes")
      .select(
        `
        id,
        user_id,
        route_coordinates,
        user_profile:user_profiles!inner (
          id,
          race_ethnicity,
          gender,
          lgbtq_status,
          disability_status,
          religion
        )
      `
      )
      .not("navigation_started_at", "is", null)
      .is("navigation_ended_at", null);

    if (routeError) {
      console.error("❌ Error fetching active routes:", routeError);
      throw routeError;
    }

    if (!activeRoutes || activeRoutes.length === 0) {
      console.log("ℹ️ No active navigation routes found");
      return new Response(
        JSON.stringify({ message: "No active routes" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`🗺️ Found ${activeRoutes.length} active routes`);

    let broadcastCount = 0;

    for (const route of activeRoutes) {
      // Skip reviewer's own route
      if (route.user_id === review.user_id) {
        console.log("⏭️ Skipping reviewer's own route");
        continue;
      }

      // Check demographic relevance
      const userDemographics = {
        race_ethnicity: route.user_profile?.race_ethnicity,
        gender: route.user_profile?.gender,
        lgbtq_status: route.user_profile?.lgbtq_status,
        disability_status: route.user_profile?.disability_status,
        religion: route.user_profile?.religion,
      };

      if (
        !isDemographicallyRelevant(reviewerProfile || {}, userDemographics)
      ) {
        console.log(
          `⏭️ Skipping user ${route.user_id}: Not demographically relevant`
        );
        continue;
      }

      // Calculate minimum distance from review to route
      const routeCoords = route.route_coordinates || [];
      let minDistance = Infinity;

      for (const coord of routeCoords) {
        const distance = calculateDistance(
          reviewLocation.latitude,
          reviewLocation.longitude,
          coord.latitude,
          coord.longitude
        );
        minDistance = Math.min(minDistance, distance);
      }

      if (minDistance > EDGE_CONFIG.NAVIGATION.BROADCAST_ROUTE_PROXIMITY_METERS) {
        console.log(
          `⏭️ Skipping user ${route.user_id}: Too far (${Math.round(minDistance)}m)`
        );
        continue;
      }

      console.log(
        `📡 Broadcasting to user ${route.user_id} (${Math.round(minDistance)}m from route)`
      );

      // Broadcast via Supabase Realtime
      const channel = supabaseClient.channel(
        `navigation-alerts:${route.user_id}`,
        { config: { private: true } }
      );

      await channel.send({
        type: "broadcast",
        event: "dangerous-review",
        payload: {
          id: review.id,
          user_id: review.user_id,
          location_id: review.location_id,
          location_name: reviewLocation.name,
          location_address: reviewLocation.address || "",
          location_latitude: reviewLocation.latitude,
          location_longitude: reviewLocation.longitude,
          safety_rating: review.safety_rating,
          overall_rating: review.overall_rating,
          title: review.title,
          content: review.content,
          created_at: review.created_at,
          distance_to_route: Math.round(minDistance),
          severity: severity.label,
        },
      });

      await supabaseClient.removeChannel(channel);
      broadcastCount++;
    }

    console.log(`✅ Broadcast complete: ${broadcastCount} users notified`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "Broadcast complete",
        broadcast_count: broadcastCount,
        severity: severity.label,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error in broadcast-navigation-reviews:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});