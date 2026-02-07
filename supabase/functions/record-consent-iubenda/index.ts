import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const IUBENDA_API_URL = "https://consent.iubenda.com/consent";
const IUBENDA_PRIVATE_API_KEY = Deno.env.get("IUBENDA_PRIVATE_API_KEY");

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

    // Initialize Supabase client to verify the user
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: { headers: { Authorization: authHeader } },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request body
    const body = await req.json();
    const { consent_type, accepted } = body;

    // Validate consent_type
    const validConsentTypes = ["terms", "privacy_policy", "location_disclosure"];
    if (!validConsentTypes.includes(consent_type)) {
      throw new Error(`Invalid consent_type: ${consent_type}`);
    }

    if (typeof accepted !== "boolean") {
      throw new Error("accepted must be a boolean");
    }

    // Build the iubenda consent payload
    const consentPayload = {
      subject: {
        id: user.id,
        email: user.email,
      },
      legal_notices: [
        {
          identifier: consent_type,
        },
      ],
      proofs: [
        {
          content: `User ${accepted ? "accepted" : "declined"} ${consent_type} in TruGuide mobile app`,
          form: `TruGuide app - ${consent_type} acceptance screen`,
        },
      ],
      preferences: {
        [consent_type]: accepted,
      },
    };

    console.log("Recording consent to iubenda:", {
      userId: user.id,
      consent_type,
      accepted,
    });

    // Send to iubenda Consent Database API
    const iubendaResponse = await fetch(IUBENDA_API_URL, {
      method: "POST",
      headers: {
        ApiKey: IUBENDA_PRIVATE_API_KEY!,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(consentPayload),
    });

    if (!iubendaResponse.ok) {
      const errorText = await iubendaResponse.text();
      console.error("iubenda API error:", errorText);
      throw new Error(`iubenda API error: ${iubendaResponse.status}`);
    }

    const iubendaResult = await iubendaResponse.json();
    console.log("iubenda consent recorded:", iubendaResult);

    return new Response(
      JSON.stringify({
        success: true,
        consent_id: iubendaResult.id,
        timestamp: iubendaResult.timestamp,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error recording consent:", error);

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