import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import {
  getSeverityLevel,
  wasRecentlyNotifiedAboutLocation,
  logNotification,
  type PushNotification,
  type UserProfile,
} from "../_shared/notification-helpers.ts";
import { EDGE_CONFIG } from "@_shared/config.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const EXPO_PUSH_URL = "https://exp.host/--/api/v2/push/send";


serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const { type, record } = await req.json();
  console.log("📬 [Location Safety Change] Received webhook:", type, "for review:", record.id);

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

    console.log(`${severity.emoji} ${severity.label} review detected! Finding users who reviewed this location...`);

    // FETCH THE LOCATION DETAILS
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
    console.log(`📍 Location: ${reviewLocation.name}`);

    // FIND USERS WHO PREVIOUSLY REVIEWED THIS LOCATION
    const { data: previousReviewers, error: reviewersError } = await supabaseClient
      .from("reviews")
      .select(`
        user_id,
        safety_rating,
        created_at,
        user_profile:user_profiles!reviews_user_id_fkey (
          id,
          push_token,
          notification_preferences
        )
      `)
      .eq("location_id", review.location_id)
      .neq("user_id", review.user_id)  // Don't notify the person who just reviewed
      .eq("status", "active");

    if (reviewersError) {
      console.error("❌ Error fetching previous reviewers:", reviewersError);
      throw reviewersError;
    }

    if (!previousReviewers || previousReviewers.length === 0) {
      console.log("ℹ️ No previous reviewers found for this location");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No previous reviewers to notify",
          severity: severity.label,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log(`👥 Found ${previousReviewers.length} users who previously reviewed this location`);

    const notifications: PushNotification[] = [];
    const notificationLogs: any[] = [];

    // Check each previous reviewer
    for (const reviewer of previousReviewers) {
      if (!reviewer.user_profile?.push_token) {
        console.log(`⏭️ Skipping user ${reviewer.user_id}: No push token`);
        continue;
      }

      // Check if user has this preference enabled
      const prefs = reviewer.user_profile.notification_preferences || {};
      if (prefs.location_safety_changes === false) {
        console.log(`⏭️ Skipping user ${reviewer.user_id}: Has disabled location_safety_changes preference`);
        continue;
      }

      // Check rate limiting for this notification type
      const wasNotifiedRecently = await wasRecentlyNotifiedAboutLocation(
        supabaseClient,
        reviewer.user_id,
        review.location_id,
        "location_safety_change",
        EDGE_CONFIG.REVIEWS.RATE_LIMIT_WINDOW_HOURS
      );

      if (wasNotifiedRecently) {
        console.log(`⏭️ Skipping user ${reviewer.user_id}: Recently notified about this location (within ${EDGE_CONFIG.REVIEWS.RATE_LIMIT_WINDOW_HOURS}h)`);
        continue;
      }

      // Calculate "safety drop" if the previous review was positive
      let safetyContext = "";
      if (reviewer.safety_rating && reviewer.safety_rating >= 3.5) {
        const drop = reviewer.safety_rating - review.safety_rating;
        if (drop >= 2.0) {
          safetyContext = ` (was ${reviewer.safety_rating}★)`;
        }
      }

      console.log(`📤 Sending ${severity.label} alert to user ${reviewer.user_id}`);

      // Send notification
      notifications.push({
        to: reviewer.user_profile.push_token,
        sound: "default",
        priority: severity.priority === 3 ? "high" : "default",
        title: `${severity.emoji} Safety Update: ${reviewLocation.name}`,
        body: `New ${severity.label.toLowerCase()} review (${review.safety_rating}★${safetyContext}) at a location you previously reviewed.`,
        data: {
          type: "location_safety_change",
          locationId: review.location_id,
          reviewId: review.id,
          locationName: reviewLocation.name,
          safetyRating: review.safety_rating,
          severity: severity.label,
          severityEmoji: severity.emoji,
          previousRating: reviewer.safety_rating,
        },
      });

      // Log for rate limiting
      notificationLogs.push({
        user_id: reviewer.user_id,
        route_id: null,  // Not route-specific
        notification_type: "location_safety_change",
        sent_at: new Date().toISOString(),
        review_ids: [review.id],
        metadata: {
          location_id: review.location_id,
          location_name: reviewLocation.name,
          severity: severity.label,
          previous_rating: reviewer.safety_rating,
          new_rating: review.safety_rating,
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
          message: "Location safety change notifications sent",
          count: notifications.length,
          severity: severity.label,
          location: reviewLocation.name,
          result,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    console.log("ℹ️ No users to notify (all filtered out by preferences/rate limiting)");

    return new Response(
      JSON.stringify({
        success: true,
        message: "No users to notify",
        severity: severity.label,
        location: reviewLocation.name,
        reason: "All previous reviewers filtered out by preferences or rate limiting",
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("❌ Error sending location safety change notifications:", error);
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