import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
        "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    // Handle CORS
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        // Create Supabase client
        const supabaseClient = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_ANON_KEY") ?? "",
            {
                global: {
                    headers: { Authorization: req.headers.get("Authorization")! },
                },
            }
        );

        // Get the user from the auth header
        const {
            data: { user },
            error: userError,
        } = await supabaseClient.auth.getUser();

        if (userError || !user) {
            return new Response(
                JSON.stringify({ error: "Unauthorized" }),
                {
                    status: 401,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        const userId = user.id;

        // Create admin client for deletion operations
        const supabaseAdmin = createClient(
            Deno.env.get("SUPABASE_URL") ?? "",
            Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
        );

        console.log(`Deleting account for user: ${userId}`);

        // 1. Delete user reviews
        const { error: reviewsError } = await supabaseAdmin
            .from("reviews")
            .delete()
            .eq("user_id", userId);

        if (reviewsError) {
            console.error("Error deleting reviews:", reviewsError);
        }

        // 2. Delete user profile
        const { error: profileError } = await supabaseAdmin
            .from("user_profiles")
            .delete()
            .eq("id", userId);

        if (profileError) {
            console.error("Error deleting profile:", profileError);
        }

        // 3. Delete auth user (this will cascade delete related data)
        const { error: authError } = await supabaseAdmin.auth.admin.deleteUser(
            userId
        );

        if (authError) {
            console.error("Error deleting auth user:", authError);
            return new Response(
                JSON.stringify({ error: "Failed to delete account" }),
                {
                    status: 500,
                    headers: { ...corsHeaders, "Content-Type": "application/json" },
                }
            );
        }

        console.log(`Successfully deleted account for user: ${userId}`);

        return new Response(
            JSON.stringify({ message: "Account deleted successfully" }),
            {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    } catch (error) {
        console.error("Error in delete-user-account function:", error);
        return new Response(
            JSON.stringify({ error: "Internal server error" }),
            {
                status: 500,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
        );
    }
});