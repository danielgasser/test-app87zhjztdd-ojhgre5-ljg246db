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

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get the review data from the webhook
    const { type, record } = await req.json();

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

    const notifications: PushNotification[] = [];

    // 1. SAFETY ALERTS - Find users with push tokens and safety_alerts enabled
    const { data: users, error: usersError } = await supabaseClient
      .from("user_profiles")
      .select("id, push_token, notification_preferences")
      .not("push_token", "is", null);

    if (usersError) {
      console.error("Error fetching users:", usersError);
    }

    if (users) {
      console.log(`👥 Found ${users.length} users with push tokens`);

      for (const user of users) {
        const prefs = user.notification_preferences || {};

        // Check if user has safety_alerts enabled (default true)
        if (prefs.safety_alerts !== false && user.push_token) {
          notifications.push({
            to: user.push_token,
            sound: "default",
            title: "⚠️ Safety Alert",
            body: `${review.location_name}: New safety concern reported (${review.safety_rating}/5.0)`,
            data: {
              type: "safety_alert",
              locationId: review.location_id,
              reviewId: review.id,
              locationName: review.location_name,
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
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});