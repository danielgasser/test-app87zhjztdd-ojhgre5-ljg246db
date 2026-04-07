import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { checkRateLimit, rateLimitResponse } from '../_shared/rate-limiter.ts';
import { isValidCoordinate, isValidString, validationError } from '../_shared/validators.ts';
import { EDGE_CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const GOOGLE_API_KEY = Deno.env.get('EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_EDGE')!;
const PLACES_BASE = 'https://maps.googleapis.com/maps/api/place';
const GEOCODE_BASE = 'https://maps.googleapis.com/maps/api/geocode/json';

type ProxyType = 'autocomplete' | 'reverse_geocode' | 'forward_geocode' | 'nearby_search';

function getRateLimitKey(type: ProxyType): keyof typeof EDGE_CONFIG.FUNCTION_RATE_LIMITS {
  switch (type) {
    case 'autocomplete': return 'GOOGLE_MAPS_AUTOCOMPLETE';
    case 'reverse_geocode':
    case 'forward_geocode': return 'GOOGLE_MAPS_GEOCODING';
    case 'nearby_search': return 'GOOGLE_MAPS_NEARBY';
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
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

    const body = await req.json();
    const { type, ...params } = body;

    if (!type || !['autocomplete', 'reverse_geocode', 'forward_geocode', 'nearby_search'].includes(type)) {
      return validationError('Invalid or missing type');
    }

    // Rate limit per type
    const rateLimitKey = getRateLimitKey(type as ProxyType);
    const rateLimit = await checkRateLimit(anonClient, user.id, rateLimitKey);
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }

    let googleUrl: string;

    switch (type as ProxyType) {
      case 'autocomplete': {
        const { query, latitude, longitude, radius, types, components, session_token } = params;
        if (!query || !isValidString(query, 200)) {
          return validationError('Invalid query');
        }
        googleUrl = `${PLACES_BASE}/autocomplete/json?input=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}`;
        if (session_token) googleUrl += `&sessiontoken=${encodeURIComponent(session_token)}`;
        if (latitude != null && longitude != null && isValidCoordinate(latitude, longitude)) {
          googleUrl += `&location=${latitude},${longitude}`;
          if (radius) googleUrl += `&radius=${Math.min(Number(radius), 50000)}`;
        }
        if (types) googleUrl += `&types=${encodeURIComponent(types)}`;
        if (components) googleUrl += `&components=${encodeURIComponent(components)}`;
        break;
      }

      case 'reverse_geocode': {
        const { latitude, longitude, result_type, location_type } = params;
        if (!isValidCoordinate(latitude, longitude)) {
          return validationError('Invalid coordinates');
        }
        googleUrl = `${GEOCODE_BASE}?latlng=${latitude},${longitude}&key=${GOOGLE_API_KEY}`;
        if (result_type?.length) googleUrl += `&result_type=${result_type.join('|')}`;
        if (location_type?.length) googleUrl += `&location_type=${location_type.join('|')}`;
        break;
      }

      case 'forward_geocode': {
        const { address, components, bounds } = params;
        if (!address || !isValidString(address, 500)) {
          return validationError('Invalid address');
        }
        googleUrl = `${GEOCODE_BASE}?address=${encodeURIComponent(address)}&key=${GOOGLE_API_KEY}`;
        if (components) googleUrl += `&components=${encodeURIComponent(components)}`;
        if (bounds) {
          googleUrl += `&bounds=${bounds.southwest.lat},${bounds.southwest.lng}|${bounds.northeast.lat},${bounds.northeast.lng}`;
        }
        break;
      }

      case 'nearby_search': {
        const { latitude, longitude, radius, type: placeType, keyword, minprice, maxprice, opennow } = params;
        if (!isValidCoordinate(latitude, longitude)) {
          return validationError('Invalid coordinates');
        }
        googleUrl = `${PLACES_BASE}/nearbysearch/json?location=${latitude},${longitude}&radius=${Math.min(Number(radius) || 5000, 50000)}&key=${GOOGLE_API_KEY}`;
        if (placeType) googleUrl += `&type=${encodeURIComponent(placeType)}`;
        if (keyword) googleUrl += `&keyword=${encodeURIComponent(keyword)}`;
        if (minprice !== undefined) googleUrl += `&minprice=${minprice}`;
        if (maxprice !== undefined) googleUrl += `&maxprice=${maxprice}`;
        if (opennow) googleUrl += `&opennow=true`;
        break;
      }
    }

    const googleResponse = await fetch(googleUrl!);
    if (!googleResponse.ok) {
      return new Response(
        JSON.stringify({ error: `Google API error: ${googleResponse.status}` }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await googleResponse.json();

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('google-maps-proxy error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});