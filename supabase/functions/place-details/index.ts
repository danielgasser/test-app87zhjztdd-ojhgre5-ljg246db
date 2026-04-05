// v5

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Extract and validate user from JWT

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const anonClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await anonClient.auth.getUser(token);
    if (userError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }


    // Rate limit — 30 requests per hour per user
    const rateLimit = await checkRateLimit(anonClient, user.id, 'PLACE_DETAILS');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    const { place_id, fields, session_token } = await req.json();

    if (!place_id) {
      return new Response(
        JSON.stringify({ error: 'place_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const googleApiKey = Deno.env.get('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_EDGE');
    if (!googleApiKey) {
      return new Response(
        JSON.stringify({ error: 'Google Maps API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default to cheap/free fields only
    const requestFields = fields || [
      'place_id',
      'name',
      'formatted_address',
      'geometry',
      'types',
    ];

    let url = `https://maps.googleapis.com/maps/api/place/details/json?` +
      `place_id=${encodeURIComponent(place_id)}` +
      `&fields=${requestFields.join(',')}` +
      `&key=${googleApiKey}`;

    if (session_token) {
      url += `&sessiontoken=${encodeURIComponent(session_token)}`;
    }

    const response = await fetch(url);
    const data = await response.json();

    if (data.status !== 'OK') {
      return new Response(
        JSON.stringify({ error: `Google API status: ${data.status}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ result: data.result }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Place details error:', JSON.stringify(error), error instanceof Error ? error.message : 'not an error object', error instanceof Error ? error.stack : '');
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});