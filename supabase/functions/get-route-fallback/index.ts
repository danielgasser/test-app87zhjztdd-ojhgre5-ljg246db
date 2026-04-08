import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let shift = 0, result = 0, byte;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lat += ((result & 1) ? ~(result >> 1) : (result >> 1));
    shift = 0; result = 0;
    do { byte = encoded.charCodeAt(index++) - 63; result |= (byte & 0x1f) << shift; shift += 5; } while (byte >= 0x20);
    lng += ((result & 1) ? ~(result >> 1) : (result >> 1));
    coordinates.push([lng / 1e5, lat / 1e5]);
  }
  return coordinates;
}

function maneuverToLegacy(maneuver: string | undefined): string | undefined {
  if (!maneuver) return undefined;
  const mapping: Record<string, string> = {
    'TURN_LEFT': 'turn-left', 'TURN_RIGHT': 'turn-right',
    'TURN_SLIGHT_LEFT': 'turn-slight-left', 'TURN_SLIGHT_RIGHT': 'turn-slight-right',
    'TURN_SHARP_LEFT': 'turn-sharp-left', 'TURN_SHARP_RIGHT': 'turn-sharp-right',
    'U_TURN_LEFT': 'uturn-left', 'U_TURN_RIGHT': 'uturn-right',
    'STRAIGHT': 'straight', 'MERGE': 'merge', 'FORK_LEFT': 'fork-left',
    'FORK_RIGHT': 'fork-right', 'FERRY': 'ferry',
    'ROUNDABOUT_LEFT': 'roundabout-left', 'ROUNDABOUT_RIGHT': 'roundabout-right',
    'DEPART': 'depart', 'NAME_CHANGE': 'straight',
  };
  return mapping[maneuver] || maneuver.toLowerCase().replace(/_/g, '-');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
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

    const rateLimit = await checkRateLimit(anonClient, user.id, 'GET_ROUTE');
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit);
    }
    const { origin, destination, waypoints = [] } = await req.json() as {
      origin: RouteCoordinate;
      destination: RouteCoordinate;
      waypoints?: RouteCoordinate[];
    };

    if (!origin || !destination) {
      return new Response(
        JSON.stringify({ error: "origin and destination are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const googleApiKey = Deno.env.get("EXPO_PUBLIC_GOOGLE_MAPS_API_KEY_EDGE");
    if (!googleApiKey) {
      throw new Error("Google Maps API key not configured");
    }

    const requestBody: Record<string, unknown> = {
      origin: { location: { latLng: { latitude: origin.latitude, longitude: origin.longitude } } },
      destination: { location: { latLng: { latitude: destination.latitude, longitude: destination.longitude } } },
      travelMode: "DRIVE",
      routingPreference: "TRAFFIC_AWARE",
      computeAlternativeRoutes: true,
      languageCode: "en-US",
      units: "METRIC",
    };

    if (waypoints.length > 0) {
      requestBody.intermediates = waypoints.map((wp) => ({
        location: { latLng: { latitude: wp.latitude, longitude: wp.longitude } },
      }));
    }

    const response = await fetch("https://routes.googleapis.com/directions/v2:computeRoutes", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": googleApiKey,
        "X-Goog-FieldMask": "routes.duration,routes.distanceMeters,routes.polyline,routes.legs.steps",
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Google Routes API error: ${response.status} ${errorText}`);
    }

    const data = await response.json();

    if (!data.routes || data.routes.length === 0) {
      throw new Error("No routes found");
    }

    const transformedRoutes = data.routes.map((route: any) => {
      const coordinates = decodePolyline(route.polyline?.encodedPolyline ?? "");
      const steps = (route.legs ?? []).flatMap((leg: any) =>
        (leg.steps ?? []).map((step: any) => ({
          instruction: step.navigationInstruction?.instructions ?? "",
          distance_meters: step.distanceMeters ?? 0,
          duration_seconds: parseInt(step.staticDuration ?? "0s") || 0,
          start_location: {
            latitude: step.startLocation?.latLng?.latitude ?? 0,
            longitude: step.startLocation?.latLng?.longitude ?? 0,
          },
          end_location: {
            latitude: step.endLocation?.latLng?.latitude ?? 0,
            longitude: step.endLocation?.latLng?.longitude ?? 0,
          },
          maneuver: maneuverToLegacy(step.navigationInstruction?.maneuver),
        }))
      );

      return {
        duration: parseInt(route.duration ?? "0s") || 0,
        distance: route.distanceMeters ?? 0,
        geometry: { coordinates, type: "LineString" },
        steps,
      };
    });

    return new Response(
      JSON.stringify({ routes: transformedRoutes }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("get-route error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});