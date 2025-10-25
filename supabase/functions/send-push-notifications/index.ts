import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { EDGE_CONFIG } from '../_shared/config.ts';
import {
  getSeverityLevel,
  isDemographicallyRelevant,
  wasRecentlyNotifiedForRoute,
  logNotification,
  calculateDistance,
  type PushNotification,
  type UserProfile,
} from "../_shared/notification-helpers.ts";

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
  metadata?: any;
}

interface BatchedReview {
  id: string;
  location_id: string;
  safety_rating: number;
  user_id: string;
  created_at: string;
  locations: {
    id: string;
    name: string;
    coordinates: any;
  };
  distance?: number;
  severity?: any;
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

/**
 * Find other recent dangerous reviews (within BATCH_WINDOW_SECONDS) that haven't been processed yet
 * This enables batching multiple alerts into a single notification
 */
async function findRecentBatchableReviews(
  supabase: any,
  currentReviewId: string,
  currentReviewTime: string
): Promise<any[]> {
  const batchCutoff = new Date(currentReviewTime);
  batchCutoff.setSeconds(batchCutoff.getSeconds() - BATCH_WINDOW_SECONDS);

  const { data, error } = await supabase
    .from("reviews")
    .select(`
      id,
      location_id,
      safety_rating,
      user_id,
      created_at,
      locations!inner (
        id,
        name,
        coordinates
      )
    `)
    .neq("id", currentReviewId)
    .lt("safety_rating", 3.0) // Only dangerous reviews
    .gte("created_at", batchCutoff.toISOString())
    .lte("created_at", currentReviewTime)
    .not("navigation_started_at", "is", null)
    .is("navigation_ended_at", null)
    .order("created_at", { ascending: false })
    .limit(10); // Max 10 reviews in a batch

  if (error) {
    console.error("Error finding batchable reviews:", error);
    return [];
  }

  return data || [];
}

/**
 * Check if reviews are relevant to the user's route and calculate distances
 */
function filterAndEnrichReviewsForRoute(
  reviews: any[],
  route: RouteWithProfile,
  reviewerDemographics: any
): BatchedReview[] {
  const routeCoords = route.route_coordinates?.coordinates || [];
  const enrichedReviews: BatchedReview[] = [];

  for (const review of reviews) {
    // Check demographic relevance
    const userDemographics = {
      race_ethnicity: route.user_profile?.race_ethnicity,
      gender: route.user_profile?.gender,
      lgbtq_status: route.user_profile?.lgbtq_status,
      disability_status: route.user_profile?.disability_status,
      religion: route.user_profile?.religion,
    };

    if (!isDemographicallyRelevant(reviewerDemographics, userDemographics)) {
      continue;
    }

    // Calculate minimum distance to route
    const locationCoords = review.locations.coordinates.coordinates;
    let minDistance = Infinity;

    for (const coord of routeCoords) {
      const distance = calculateDistance(
        locationCoords[1],
        locationCoords[0],
        coord[1],
        coord[0]
      );
      minDistance = Math.min(minDistance, distance);
    }

    // Only include if within 500m
    if (minDistance <= 500) {
      const severity = getSeverityLevel(review.safety_rating);
      enrichedReviews.push({
        ...review,
        distance: Math.round(minDistance),
        severity,
      });
    }
  }

  return enrichedReviews;
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

    console.log("👤 Reviewer demographics:", reviewerProfile ? "has profile" : "no profile");

    // 🆕 BATCH WINDOW: Check for other recent dangerous reviews
    console.log(`🔍 Checking for other reviews in last ${BATCH_WINDOW_SECONDS} seconds to batch...`);
    const batchableReviews = await findRecentBatchableReviews(
      supabaseClient,
      review.id,
      review.created_at
    );

    console.log(`📦 Found ${batchableReviews.length} other recent dangerous reviews`);

    // FIND ALL ACTIVE ROUTES
    const { data: activeRoutes, error: routeError } = await supabaseClient
      .from("routes")
      .select(`
        id,
        user_id,
        route_coordinates,
        origin_name,
        destination_name,
        user_profile:user_profiles!inner (
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
      .eq("status", "active")
      .not("user_profile.push_token", "is", null);

    if (routeError) {
      console.error("❌ Error fetching routes:", routeError);
      throw routeError;
    }

    if (!activeRoutes || activeRoutes.length === 0) {
      console.log("ℹ️ No active routes with push tokens found");
      return new Response(
        JSON.stringify({ message: "No active routes to notify" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`🗺️ Found ${activeRoutes.length} active routes`);

    const notifications: PushNotification[] = [];
    const notificationLogs: NotificationLog[] = [];

    // Process each route
    for (const route of activeRoutes) {
      // Check notification preferences
      const prefs = route.user_profile.notification_preferences || {};
      if (prefs.safety_alerts === false) {
        console.log(`⏭️ Skipping user ${route.user_id}: Has disabled safety_alerts preference`);
        continue;
      }

      // Check rate limiting
      const wasNotified = await wasRecentlyNotified(
        supabaseClient,
        route.user_id,
        route.id
      );

      if (wasNotified) {
        console.log(`⏭️ Skipping user ${route.user_id}: Recently notified (within ${RATE_LIMIT_WINDOW_MINUTES}min)`);
        continue;
      }

      // Calculate distance to the CURRENT review
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

      // Check if current review is relevant
      if (minDistance > 500) {
        console.log(`⏭️ Skipping user ${route.user_id}: Too far (${Math.round(minDistance)}m)`);
        continue;
      }

      // Check demographic relevance for current review
      const userDemographics = {
        race_ethnicity: route.user_profile?.race_ethnicity,
        gender: route.user_profile?.gender,
        lgbtq_status: route.user_profile?.lgbtq_status,
        disability_status: route.user_profile?.disability_status,
        religion: route.user_profile?.religion,
      };

      if (!isDemographicallyRelevant(reviewerProfile, userDemographics)) {
        console.log(`⏭️ Skipping user ${route.user_id}: Not demographically relevant`);
        continue;
      }

      console.log(`✓ User ${route.user_id}: Demographically relevant, ${Math.round(minDistance)}m from route`);

      // 🆕 Check if any batchable reviews are also relevant to this route
      const relevantBatchReviews = filterAndEnrichReviewsForRoute(
        batchableReviews,
        route,
        reviewerProfile
      );

      // Combine current review with batch
      const allRelevantReviews: BatchedReview[] = [
        {
          id: review.id,
          location_id: review.location_id,
          safety_rating: review.safety_rating,
          user_id: review.user_id,
          created_at: review.created_at,
          locations: {
            id: reviewLocation.id,
            name: reviewLocation.name,
            coordinates: { coordinates: [reviewLocation.longitude, reviewLocation.latitude] }
          },
          distance: Math.round(minDistance),
          severity,
        },
        ...relevantBatchReviews
      ];

      // Sort by distance (closest first)
      allRelevantReviews.sort((a, b) => (a.distance || 0) - (b.distance || 0));

      const isBatched = allRelevantReviews.length > 1;
      const highestSeverity = allRelevantReviews.reduce((highest, r) =>
        (r.severity?.priority || 0) > (highest?.priority || 0) ? r.severity : highest,
        severity
      );

      // Create notification title and body
      let title: string;
      let body: string;
      let notificationData: any;

      if (isBatched) {
        // Batched notification
        title = `${highestSeverity.emoji} ${allRelevantReviews.length} Safety Alerts on Your Route`;
        const closestReview = allRelevantReviews[0];
        body = `${closestReview.locations.name} (${closestReview.distance}m ahead) + ${allRelevantReviews.length - 1} more. Tap for details.`;

        notificationData = {
          type: "batched_route_safety_alerts",
          count: allRelevantReviews.length,
          routeId: route.id,
          reviews: allRelevantReviews.map(r => ({
            reviewId: r.id,
            locationId: r.location_id,
            locationName: r.locations.name,
            safetyRating: r.safety_rating,
            distance: r.distance,
            severity: r.severity?.label,
          })),
          severity: highestSeverity.label,
          severityEmoji: highestSeverity.emoji,
        };
      } else {
        // Single notification
        title = `${severity.emoji} ${severity.label}: Safety Alert on Your Route`;
        body = `${reviewLocation.name} - ${Math.round(minDistance)}m ahead. Rating: ${review.safety_rating}★. Stay alert.`;

        notificationData = {
          type: "route_safety_alert",
          locationId: review.location_id,
          reviewId: review.id,
          locationName: reviewLocation.name,
          routeId: route.id,
          safetyRating: review.safety_rating,
          distance: Math.round(minDistance),
          severity: severity.label,
          severityEmoji: severity.emoji,
        };
      }

      console.log(`📤 Sending ${isBatched ? 'BATCHED' : 'single'} ${highestSeverity.label} alert to user ${route.user_id}`);

      // Create notification with severity-based priority
      notifications.push({
        to: route.user_profile.push_token,
        sound: "default",
        priority: highestSeverity.priority === 3 ? "high" : "default",
        title,
        body,
        data: notificationData,
      });

      // Log for rate limiting
      notificationLogs.push({
        user_id: route.user_id,
        route_id: route.id,
        notification_type: "route_safety_alert",
        sent_at: new Date().toISOString(),
        review_ids: allRelevantReviews.map(r => r.id),
        metadata: {
          batch_size: allRelevantReviews.length,
          batched: isBatched,
          highest_severity: highestSeverity.label,
        },
      });
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
          batching_enabled: true,
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