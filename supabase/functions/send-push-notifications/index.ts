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
const BATCH_WINDOW_SECONDS = EDGE_CONFIG.NAVIGATION.NOTIFICATIONS.BATCH_WINDOW_SECONDS; // Wait 30 seconds to batch multiple reviews

// SEVERITY LEVELS FOR ALERTS
const SEVERITY_LEVELS = {
  CRITICAL: EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.CRITICAL,
  WARNING: EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.WARNING,
  NOTICE: EDGE_CONFIG.NAVIGATION.SEVERITY_LEVELS.NOTICE,
};

// Helper: Get severity level for a rating
function getSeverityLevel(rating: number): typeof SEVERITY_LEVELS[keyof typeof SEVERITY_LEVELS] | null {
  if (rating >= SEVERITY_LEVELS.CRITICAL.min && rating <= SEVERITY_LEVELS.CRITICAL.max) {
    return SEVERITY_LEVELS.CRITICAL;
  }
  if (rating >= SEVERITY_LEVELS.WARNING.min && rating <= SEVERITY_LEVELS.WARNING.max) {
    return SEVERITY_LEVELS.WARNING;
  }
  if (rating >= SEVERITY_LEVELS.NOTICE.min && rating <= SEVERITY_LEVELS.NOTICE.max) {
    return SEVERITY_LEVELS.NOTICE;
  }
  return null;
}

// Helper: Check if review is demographically relevant to user
function isDemographicallyRelevant(
  reviewerDemographics: any,
  userDemographics: any
): boolean {
  if (!reviewerDemographics || !userDemographics) {
    return true; // If demographics missing, show to everyone (fail open)
  }

  let matchScore = 0;
  let totalChecks = 0;

  // Race/ethnicity match
  if (reviewerDemographics.race_ethnicity && userDemographics.race_ethnicity) {
    totalChecks++;
    const intersection = reviewerDemographics.race_ethnicity.filter((r: string) =>
      userDemographics.race_ethnicity.includes(r)
    );
    if (intersection.length > 0) matchScore++;
  }

  // Gender match
  if (reviewerDemographics.gender && userDemographics.gender) {
    totalChecks++;
    if (reviewerDemographics.gender === userDemographics.gender) matchScore++;
  }

  // LGBTQ status match
  if (reviewerDemographics.lgbtq_status !== null && userDemographics.lgbtq_status !== null) {
    totalChecks++;
    if (reviewerDemographics.lgbtq_status === userDemographics.lgbtq_status) matchScore++;
  }

  // Disability status match
  if (reviewerDemographics.disability_status && userDemographics.disability_status) {
    totalChecks++;
    const intersection = reviewerDemographics.disability_status.filter((d: string) =>
      userDemographics.disability_status.includes(d)
    );
    if (intersection.length > 0) matchScore++;
  }

  // Religion match
  if (reviewerDemographics.religion && userDemographics.religion) {
    totalChecks++;
    if (reviewerDemographics.religion === userDemographics.religion) matchScore++;
  }

  // If at least one demographic matches, it's relevant
  // If no demographics were compared (totalChecks === 0), show to everyone
  return matchScore > 0 || totalChecks === 0;
}

interface PushNotification {
  to: string;
  sound: "default";
  title: string;
  body: string;
  data?: any;
  priority?: "default" | "normal" | "high";
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
    race_ethnicity?: string[];
    gender?: string;
    lgbtq_status?: boolean;
    disability_status?: string[];
    religion?: string;
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

    // Get severity level
    const severity = getSeverityLevel(review.safety_rating);
    if (!severity) {
      console.log("⚠️ Review rating doesn't match any severity level");
      return new Response(
        JSON.stringify({ message: "Invalid rating for severity" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`${severity.emoji} ${severity.label} alert detected! Finding affected users...`);

    // FETCH THE LOCATION DETAILS (name, latitude, longitude)
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

    const reviewLocation = reviewLocationArray[0];
    console.log(`📍 Review at: ${reviewLocation.latitude}, ${reviewLocation.longitude}`);

    // FETCH REVIEWER'S DEMOGRAPHICS (for matching)
    const { data: reviewerProfile, error: reviewerError } = await supabaseClient
      .from("user_profiles")
      .select("race_ethnicity, gender, lgbtq_status, disability_status, religion")
      .eq("id", review.user_id)
      .single();

    if (reviewerError) {
      console.error("⚠️ Could not fetch reviewer demographics:", reviewerError);
    }

    console.log("👤 Reviewer demographics:", reviewerProfile ? "✓ Available" : "✗ Not available");

    const notifications: PushNotification[] = [];
    const notificationLogs: NotificationLog[] = [];

    console.log("🗺️ Checking for users navigating near this location...");

    // Find active navigation sessions with user profiles
    const { data: activeRoutes, error: routesError } = await supabaseClient
      .from("routes")
      .select(`
        id,
        user_id,
        route_coordinates,
        origin_name,
        destination_name,
        user_profile:user_profiles!routes_user_id_fkey (
          id,
          push_token,
          notification_preferences,
          race_ethnicity,
          gender,
          lgbtq_status,
          disability_status,
          religion
        )
      `)
      .not("navigation_started_at", "is", null)
      .is("navigation_ended_at", null);

    if (routesError) {
      console.error("❌ Error fetching routes:", routesError);
      throw routesError;
    }

    console.log(`📊 Found ${activeRoutes?.length || 0} active navigation sessions`);

    if (!activeRoutes || activeRoutes.length === 0) {
      return new Response(
        JSON.stringify({ message: "No active navigators found" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // For each active route, check if it's near the review location
    for (const route of activeRoutes as RouteWithProfile[]) {
      if (!route.user_profile?.push_token) {
        console.log(`⏭️ Skipping user ${route.user_id}: No push token`);
        continue;
      }

      // Check rate limiting
      const wasNotified = await wasRecentlyNotified(
        supabaseClient,
        route.user_id,
        route.id
      );

      if (wasNotified) {
        console.log(`⏭️ Skipping user ${route.user_id}: Recently notified`);
        continue;
      }

      // CHECK DEMOGRAPHIC MATCHING
      const isRelevant = isDemographicallyRelevant(
        reviewerProfile,
        route.user_profile
      );

      if (!isRelevant) {
        console.log(`⏭️ Skipping user ${route.user_id}: Demographics don't match (${reviewerProfile ? 'reviewer has profile' : 'no reviewer profile'})`);
        continue;
      }

      console.log(`✓ User ${route.user_id}: Demographically relevant`);

      // Calculate distance to the route
      const routeCoords = route.route_coordinates?.coordinates || [];
      let minDistance = Infinity;

      for (const coord of routeCoords) {
        const distance = calculateDistance(
          reviewLocation.latitude,
          reviewLocation.longitude,
          coord[1],
          coord[0]
        );
        minDistance = Math.min(minDistance, distance);
      }

      // If location is within 500m of route, send notification
      if (minDistance <= 500) {
        console.log(
          `🚨 Sending ${severity.label} alert to user ${route.user_id}: ${Math.round(minDistance)}m from route`
        );

        // Create notification with severity-based priority
        notifications.push({
          to: route.user_profile.push_token,
          sound: "default",
          priority: severity.priority === 3 ? "high" : "default",
          title: `${severity.emoji} ${severity.label}: Safety Alert on Your Route`,
          body: `${reviewLocation.name} - ${Math.round(minDistance)}m ahead. Rating: ${review.safety_rating}★. Stay alert.`,
          data: {
            type: "route_safety_alert",
            locationId: review.location_id,
            reviewId: review.id,
            locationName: reviewLocation.name,
            routeId: route.id,
            safetyRating: review.safety_rating,
            distance: Math.round(minDistance),
            severity: severity.label,
            severityEmoji: severity.emoji,
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
      } else {
        console.log(
          `⏭️ Skipping user ${route.user_id}: Too far (${Math.round(minDistance)}m)`
        );
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
          severity: severity.label,
          result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("ℹ️ No demographically-relevant users to notify");

    return new Response(
      JSON.stringify({
        success: true,
        message: "No relevant users to notify",
        severity: severity.label,
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