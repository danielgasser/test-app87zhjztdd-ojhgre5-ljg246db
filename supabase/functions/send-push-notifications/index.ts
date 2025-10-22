import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

interface PushNotification {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data?: any;
}
interface RouteWithProfile {
  id: string;
  user_id: string;
  route_coordinates: any;
  origin_name: string;
  destination_name: string;
  user_profile?: {
    id: string;
    push_token: string | null;
    notification_preferences: any;
  };
}
// Helper: Calculate distance between two coordinates in meters
function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}
serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  const { type, record } = await req.json();
  console.log("📬 Received webhook:", type, "for review:", record.id);
  await new Promise(resolve => setTimeout(resolve, 1000));
  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    console.log("📬 Received webhook:", type, "for review:", record.id);

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

    // Only send notifications for dangerous reviews (rating < 3.0)
    if (review.safety_rating >= 3.0) {
      console.log("✅ Review not dangerous, no notifications needed");
      return new Response(
        JSON.stringify({ message: "Review not dangerous enough for alerts" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("⚠️ Dangerous review detected! Finding affected users...");

    // FETCH THE LOCATION DETAILS (name, latitude, longitude)
    const { data: reviewLocation, error: locationError } = await supabaseClient
      .rpc("get_location_with_coords", { location_id: review.location_id });

    if (locationError) {
      console.error("❌ Error fetching location:", locationError);
    }

    if (!reviewLocation) {
      console.error("❌ Location not found for review:", review.location_id);
      return new Response(
        JSON.stringify({ message: "Location not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    const locationName = reviewLocation.name || "Unknown Location";
    const notifications: PushNotification[] = [];


    console.log("🗺️ Checking for users navigating near this location...");

    // Get the location details for this review
    // Find active navigation sessions
    const { data: activeRoutes, error: routesError } = await supabaseClient
      .from("routes")
      .select(`
    id,
    user_id,
    route_coordinates,
    origin_name,
    destination_name
  `)
      .not("navigation_started_at", "is", null)
      .is("navigation_ended_at", null);

    // Get user profiles separately for the active routes
    if (activeRoutes && activeRoutes.length > 0) {
      const userIds = (activeRoutes as RouteWithProfile[]).map((route: RouteWithProfile) => route.user_id);
      const { data: profiles } = await supabaseClient
        .from("user_profiles")
        .select("id, push_token, notification_preferences")
        .in("id", userIds);

      // Attach profiles to routes
      (activeRoutes as RouteWithProfile[]).forEach((route: RouteWithProfile) => {
        route.user_profile = profiles?.find((p: any) => p.id === route.user_id);
      });
    }
    console.log("🔍 Active routes query result:", {
      count: activeRoutes?.length || 0,
      error: routesError,
      routes: activeRoutes
    });
    if (activeRoutes && activeRoutes.length > 0) {
      console.log(`🚗 Found ${activeRoutes.length} active navigation sessions`);

      for (const route of activeRoutes) {
        const prefs = route.user_profile?.notification_preferences || {};

        if (prefs.safety_alerts === false || !route.user_profile?.push_token) {
          continue;
        }

        // Check if review location is near the route (within 500m of any point)
        const routeCoords = route.route_coordinates as Array<{ latitude: number, longitude: number }>;
        const isNearRoute = routeCoords.some((coord: any) => {
          const distance = calculateDistance(
            reviewLocation.latitude,
            reviewLocation.longitude,
            coord.latitude,
            coord.longitude
          );
          return distance < 500; // 500 meters
        });

        if (isNearRoute) {
          console.log(`⚠️ Route ${route.id} passes near dangerous location!`);

          notifications.push({
            to: route.user_profile.push_token,
            sound: "default",
            title: "🚨 SAFETY ALERT ON YOUR ROUTE",
            body: `Danger reported ahead: ${review.location_name} (${review.safety_rating}/5.0). Consider alternate route.`,
            data: {
              type: "route_safety_alert",
              locationId: review.location_id,
              reviewId: review.id,
              locationName: review.location_name,
              routeId: route.id,
              safetyRating: review.safety_rating,
            },
          });
        }
      }
    }

    // Send all notifications to Expo
    if (notifications.length > 0) {
      console.log(`📤 Sending ${notifications.length} notifications...`);

      const response = await fetch(EXPO_PUSH_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify(notifications),
      });

      const result = await response.json();

      console.log("✅ Notifications sent:", result);

      return new Response(
        JSON.stringify({
          success: true,
          message: "Notifications sent",
          count: notifications.length,
          result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("ℹ️ No notifications to send");

    return new Response(
      JSON.stringify({
        success: true,
        message: "No notifications to send",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending notifications:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});