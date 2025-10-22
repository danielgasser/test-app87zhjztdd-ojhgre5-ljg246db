import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EDGE_CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";

// NOTIFICATION RATE LIMITING CONFIG
const RATE_LIMIT_WINDOW_MINUTES = EDGE_CONFIG.NAVIGATION.NOTIFICATIONS.RATE_LIMIT_WINDOW_MINUTES; // Don't send duplicate alerts within 15 minutes
const BATCH_WINDOW_SECONDS = EDGE_CONFIG.NAVIGATION.NOTIFICATIONS.BATCH_WINDOW_SECONDS;; // Wait 30 seconds to batch multiple reviews

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

interface NotificationLog {
  id?: string;
  user_id: string;
  route_id: string;
  notification_type: string;
  sent_at: string;
  review_ids: string[];
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

// Check if user was recently notified for this route
async function wasRecentlyNotified(
  supabase: any,
  userId: string,
  routeId: string
): Promise<boolean> {
  const cutoffTime = new Date();
  cutoffTime.setMinutes(cutoffTime.getMinutes() - RATE_LIMIT_WINDOW_MINUTES);

  const { data, error } = await supabase
    .from("notification_logs")
    .select("id")
    .eq("user_id", userId)
    .eq("route_id", routeId)
    .eq("notification_type", "route_safety_alert")
    .gte("sent_at", cutoffTime.toISOString())
    .limit(1);

  if (error) {
    console.error("Error checking notification log:", error);
    return false; // On error, allow notification
  }

  return data && data.length > 0;
}

// Log that a notification was sent
async function logNotification(
  supabase: any,
  log: NotificationLog
): Promise<void> {
  const { error } = await supabase
    .from("notification_logs")
    .insert({
      user_id: log.user_id,
      route_id: log.route_id,
      notification_type: log.notification_type,
      sent_at: log.sent_at,
      review_ids: log.review_ids,
      metadata: {
        batch_size: log.review_ids.length,
      },
    });

  if (error) {
    console.error("Error logging notification:", error);
  }
}

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { type, record } = await req.json();
  console.log("📬 Received webhook:", type, "for review:", record.id);

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
    // FIX: Get first element from array response
    const { data: reviewLocationArray, error: locationError } = await supabaseClient
      .rpc("get_location_with_coords", { location_id: review.location_id });

    if (locationError) {
      console.error("❌ Error fetching location:", locationError);
      throw locationError;
    }

    if (!reviewLocationArray || reviewLocationArray.length === 0) {
      console.error("❌ Location not found for review:", review.location_id);
      return new Response(
        JSON.stringify({ message: "Location not found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 404,
        }
      );
    }

    // FIX: Extract first element
    const reviewLocation = reviewLocationArray[0];
    console.log(`📍 Review at: ${reviewLocation.latitude}, ${reviewLocation.longitude}`);

    const notifications: PushNotification[] = [];
    const notificationLogs: NotificationLog[] = [];

    console.log("🗺️ Checking for users navigating near this location...");

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
      const userIds = (activeRoutes as RouteWithProfile[]).map(
        (route: RouteWithProfile) => route.user_id
      );
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
      routes: activeRoutes?.length,
    });

    if (activeRoutes && activeRoutes.length > 0) {
      console.log(`🚗 Found ${activeRoutes.length} active navigation sessions`);

      for (const route of activeRoutes) {
        const prefs = route.user_profile?.notification_preferences || {};

        // Skip if user disabled safety alerts or has no push token
        if (prefs.safety_alerts === false || !route.user_profile?.push_token) {
          continue;
        }

        // ✅ RATE LIMITING: Check if user was recently notified for this route
        const recentlyNotified = await wasRecentlyNotified(
          supabaseClient,
          route.user_id,
          route.id
        );

        if (recentlyNotified) {
          console.log(
            `⏱️ User ${route.user_id} was recently notified for route ${route.id}, skipping...`
          );
          continue;
        }

        // Check if review location is near the route
        const routeCoords = route.route_coordinates as Array<{
          latitude: number;
          longitude: number;
        }>;
        console.log(`🛣️ Checking ${routeCoords.length} route points...`);

        let minDistance = Infinity;

        const isNearRoute = routeCoords.some((coord: any) => {
          const distance = calculateDistance(
            reviewLocation.latitude,
            reviewLocation.longitude,
            coord.latitude,
            coord.longitude
          );
          if (distance < minDistance) {
            minDistance = distance;
          }
          return distance < 500; // 500 meters
        });

        if (isNearRoute) {
          console.log(`⚠️ Route ${route.id} passes near dangerous location!`);
          console.log(`📏 Closest distance: ${Math.round(minDistance)}m`);

          // Create notification
          notifications.push({
            to: route.user_profile.push_token,
            sound: "default",
            title: "🚨 SAFETY ALERT ON YOUR ROUTE",
            body: `Danger reported ${Math.round(minDistance)}m from your route: ${reviewLocation.name} (${review.safety_rating}/5.0 safety rating). Stay alert.`,
            data: {
              type: "route_safety_alert",
              locationId: review.location_id,
              reviewId: review.id,
              locationName: reviewLocation.name,
              routeId: route.id,
              safetyRating: review.safety_rating,
              distance: Math.round(minDistance),
            },
          });

          // Log for rate limiting
          notificationLogs.push({
            user_id: route.user_id,
            route_id: route.id,
            notification_type: "route_safety_alert",
            sent_at: new Date().toISOString(),
            review_ids: [review.id],
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

      // Log all notifications for rate limiting
      for (const log of notificationLogs) {
        await logNotification(supabaseClient, log);
      }

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
        error: error instanceof Error ? error.message : "Unknown error occurred",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});