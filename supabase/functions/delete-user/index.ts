import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Verify the request has a valid JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    // Initialize Supabase client with SERVICE ROLE for admin access
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    // Initialize regular client to verify the requesting user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the authenticated user (the one making the request)
    const {
      data: { user: requestingUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !requestingUser) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const body = await req.json();
    const { user_id } = body;

    if (!user_id) {
      throw new Error("user_id is required");
    }

    // SECURITY: Only allow users to delete their own account
    // OR check if user is admin (you can add admin check here)
    if (user_id !== requestingUser.id) {
      // Optional: Check if requesting user is admin
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', requestingUser.id)
        .single();

      if (profile?.role !== 'admin') {
        throw new Error("You can only delete your own account");
      }
    }

    console.log(`Deleting user ${user_id}...`);

    // Delete user-related data (but keep reviews, votes, locations)
    await supabaseAdmin.from('saved_locations').delete().eq('user_id', user_id);
    await supabaseAdmin.from('routes').delete().eq('user_id', user_id);
    await supabaseAdmin.from('notification_logs').delete().eq('user_id', user_id);
    await supabaseAdmin.from('user_profiles').delete().eq('id', user_id);
    await supabaseAdmin.from('profiles').delete().eq('user_id', user_id);

    // Delete the user from auth.users
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(
      user_id
    );

    if (deleteError) {
      throw deleteError;
    }

    console.log(`User ${user_id} deleted successfully`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `User deleted (reviews, votes, and locations preserved)`,
        user_id,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error deleting user:", error);

    const errorMessage = error instanceof Error ? error.message : "Unknown error";

    return new Response(
      JSON.stringify({
        success: false,
        error: errorMessage,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: errorMessage === "Unauthorized" ? 401 : 400,
      }
    );
  }
});