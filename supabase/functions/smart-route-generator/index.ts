// supabase/functions/smart-route-generator/index.ts
// PURPOSE: Generate demographically-safe routes that actively avoid danger zones

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { decodePolyline } from '../_shared/polyline-decoder';
// Import Deno global type for TypeScript
/// <reference lib="deno.ns" />

// ================================
// TYPES
// ================================

interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface UserDemographics {
  race_ethnicity: string;
  gender: string;
  lgbtq_status: string;
  religion: string;
  disability_status: string;
  age_range: string;
}

interface SmartRouteRequest {
  origin: RouteCoordinate;
  destination: RouteCoordinate;
  user_demographics: UserDemographics;
  route_preferences: {
    prioritize_safety: boolean;
    max_detour_minutes?: number;
    avoid_evening_danger?: boolean;
  };
}

interface DangerousSegment {
  segment_index: number;
  center: RouteCoordinate;
  safety_score: number;
  danger_zones: number;
  risk_factors: string[];
}

interface SafeWaypoint {
  coordinate: RouteCoordinate;
  reason: string;
  safety_score: number;
}

interface SmartRouteResponse {
  success: boolean;
  original_route: any;
  optimized_route: any;
  improvement_summary: {
    original_safety_score: number;
    optimized_safety_score: number;
    safety_improvement: number;
    time_added_minutes: number;
    distance_added_km: number;
    danger_zones_avoided: number;
  };
  waypoints_added: SafeWaypoint[];
  message: string;
  original_safety?: any;
  optimized_safety?: any;
}

// ================================
// CONFIGURATION
// ================================

const CONFIG = {
  UNSAFE_THRESHOLD: 2.5,                    // Segments below this need bypass
  MAX_WAYPOINTS: 3,                         // Max waypoints to add per route
  MAX_DETOUR_MULTIPLIER: 1.4,               // Max 40% time increase
  BYPASS_SEARCH_RADIUS_MILES: 5,            // Search radius for safe waypoints
  MIN_SAFETY_IMPROVEMENT: 0.5,              // Minimum improvement to justify detour
};

// ================================
// HELPER FUNCTIONS
// ================================

/**
 * Call Mapbox Directions API to get route
 */
async function getGoogleRoute(
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  waypoints: RouteCoordinate[] = []
): Promise<any> {
  const googleApiKey = Deno.env.get('GOOGLE_MAPS_API_KEY');
  if (!googleApiKey) {
    throw new Error('Google Maps API key not configured');
  }

  // Build waypoints string if provided
  let waypointsParam = '';
  if (waypoints.length > 0) {
    const waypointCoords = waypoints
      .map(wp => `${wp.latitude},${wp.longitude}`)
      .join('|');
    waypointsParam = `&waypoints=${waypointCoords}`;
  }

  const url = `https://maps.googleapis.com/maps/api/directions/json?` +
    `origin=${origin.latitude},${origin.longitude}` +
    `&destination=${destination.latitude},${destination.longitude}` +
    waypointsParam +
    `&key=${googleApiKey}`;

  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Google API error: ${response.status}`);
  }

  const data = await response.json();

  if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
    throw new Error(`No routes found: ${data.status}`);
  }

  // Transform to match expected format
  const route = data.routes[0];
  return {
    duration: route.legs.reduce((sum: number, leg: any) => sum + leg.duration.value, 0),
    distance: route.legs.reduce((sum: number, leg: any) => sum + leg.distance.value, 0),
    geometry: {
      coordinates: (() => {
        const detailedCoords: [number, number][] = [];
        route.legs.forEach((leg: any) => {
          leg.steps.forEach((step: any) => {
            if (step.polyline?.points) {
              detailedCoords.push(...decodePolyline(step.polyline.points));
            }
          });
        });
        return detailedCoords.length > 0 ? detailedCoords : decodePolyline(route.overview_polyline.points);
      })(),
      type: 'LineString'
    }
  };
}

/**
 * Score a route using the route-safety-scorer function
 */
async function scoreRoute(
  routeCoordinates: RouteCoordinate[],
  userDemographics: UserDemographics,
  routePreferences?: { avoid_evening_danger?: boolean; max_detour_minutes?: number; prioritize_safety?: boolean }
): Promise<any> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  const response = await fetch(`${supabaseUrl}/functions/v1/route-safety-scorer`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabaseKey}`
    },
    body: JSON.stringify({
      route_coordinates: routeCoordinates,
      user_demographics: userDemographics,
      route_preferences: {
        avoid_evening_danger: routePreferences?.avoid_evening_danger ?? false
      }
    })
  });

  if (!response.ok) {
    throw new Error('Route safety scoring failed');
  }

  return await response.json();
}

/**
 * Convert Mapbox geometry to RouteCoordinate array
 */
function geometryToCoordinates(geometry: any): RouteCoordinate[] {
  return geometry.coordinates.map(([lng, lat]: [number, number]) => ({
    latitude: lat,
    longitude: lng
  }));
}

/**
 * Identify dangerous segments that need bypassing
 */
function identifyDangerousSegments(safetyAnalysis: any): DangerousSegment[] {
  if (!safetyAnalysis.segment_scores) {
    return [];
  }

  return safetyAnalysis.segment_scores
    .filter((seg: any) => seg.safety_score < CONFIG.UNSAFE_THRESHOLD)
    .map((seg: any) => ({
      segment_index: seg.segment_index,
      center: {
        latitude: (seg.start_lat + seg.end_lat) / 2,
        longitude: (seg.start_lng + seg.end_lng) / 2
      },
      safety_score: seg.safety_score,
      danger_zones: seg.danger_zones || 0,
      risk_factors: seg.risk_factors || []
    }));
}

/**
 * Find a safe waypoint to bypass a dangerous segment
 */
async function findSafeBypassWaypoint(
  dangerSegment: DangerousSegment,
  origin: RouteCoordinate,
  destination: RouteCoordinate,
  userDemographics: UserDemographics
): Promise<SafeWaypoint | null> {

  console.log(`🔍 Finding safe bypass for segment ${dangerSegment.segment_index} (score: ${dangerSegment.safety_score})`);

  // Calculate perpendicular offset from dangerous segment
  // This creates a point to the side of the danger zone
  const offsetDistanceDegrees = CONFIG.BYPASS_SEARCH_RADIUS_MILES / 69; // ~69 miles per degree

  // Try offsets in different directions (north, south, east, west)
  const candidatePoints: RouteCoordinate[] = [
    { latitude: dangerSegment.center.latitude + offsetDistanceDegrees, longitude: dangerSegment.center.longitude },     // North
    { latitude: dangerSegment.center.latitude - offsetDistanceDegrees, longitude: dangerSegment.center.longitude },     // South
    { latitude: dangerSegment.center.latitude, longitude: dangerSegment.center.longitude + offsetDistanceDegrees },     // East
    { latitude: dangerSegment.center.latitude, longitude: dangerSegment.center.longitude - offsetDistanceDegrees },     // West
    { latitude: dangerSegment.center.latitude + offsetDistanceDegrees * 0.7, longitude: dangerSegment.center.longitude + offsetDistanceDegrees * 0.7 },  // NE
    { latitude: dangerSegment.center.latitude - offsetDistanceDegrees * 0.7, longitude: dangerSegment.center.longitude + offsetDistanceDegrees * 0.7 },  // SE
  ];

  // Score each candidate waypoint
  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');

  for (const candidate of candidatePoints) {
    try {
      // Check safety score of this waypoint location
      const response = await fetch(`${supabaseUrl}/functions/v1/safety-predictor`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabaseKey}`
        },
        body: JSON.stringify({
          latitude: candidate.latitude,
          longitude: candidate.longitude,
          user_demographics: userDemographics,
          place_type: 'route_waypoint'
        })
      });

      if (response.ok) {
        const safetyData = await response.json();
        const waypointSafety = safetyData.predicted_safety || 3.0;

        // If this waypoint is safer than the danger segment, use it
        if (waypointSafety > dangerSegment.safety_score + CONFIG.MIN_SAFETY_IMPROVEMENT) {
          console.log(`✅ Found safe waypoint: safety ${waypointSafety} vs danger ${dangerSegment.safety_score}`);
          return {
            coordinate: candidate,
            reason: `Bypass danger zone (safety improved from ${dangerSegment.safety_score.toFixed(1)} to ${waypointSafety.toFixed(1)})`,
            safety_score: waypointSafety
          };
        }
      }
    } catch (error) {
      console.error('Error checking waypoint:', error);
      continue;
    }
  }

  console.log('⚠️ No safe waypoint found for this segment');
  return null;
}

/**
 * Generate optimized route with safe waypoints
 */
async function generateOptimizedRoute(
  request: SmartRouteRequest
): Promise<SmartRouteResponse> {

  console.log('🚀 Starting smart route generation...');

  // Step 1: Get original route from Mapbox
  console.log('📍 Step 1: Getting original route...');
  const originalRoute = await getGoogleRoute(request.origin, request.destination);
  const originalCoords = geometryToCoordinates(originalRoute.geometry);

  // Step 2: Score the original route
  console.log('🔍 Step 2: Scoring original route...');
  const originalSafety = await scoreRoute(originalCoords, request.user_demographics, request.route_preferences);
  console.log(`📊 Original route safety: ${originalSafety.overall_route_score.toFixed(2)}/5.0`);
  console.log(`⚠️ Danger zones intersected: ${originalSafety.danger_zones_intersected || 0}`);
  console.log(`🚨 High risk segments: ${originalSafety.high_risk_segments || 0}`);

  // Step 3: Check if route needs optimization
  if (originalSafety.overall_route_score >= 4.0 && originalSafety.high_risk_segments === 0) {
    console.log('✅ Original route is already safe, no optimization needed');
    return {
      success: true,
      original_route: originalRoute,
      optimized_route: originalRoute,
      improvement_summary: {
        original_safety_score: originalSafety.overall_route_score,
        optimized_safety_score: originalSafety.overall_route_score,
        safety_improvement: 0,
        time_added_minutes: 0,
        distance_added_km: 0,
        danger_zones_avoided: 0
      },
      waypoints_added: [],
      message: 'Fastest route is already safe - no detour needed',
      original_safety: originalSafety,
      optimized_safety: originalSafety
    };
  }

  // Step 4: Identify dangerous segments
  console.log('🎯 Step 3: Identifying dangerous segments...');
  const dangerousSegments = identifyDangerousSegments(originalSafety);

  if (dangerousSegments.length === 0) {
    console.log('✅ No dangerous segments found');
    return {
      success: true,
      original_route: originalRoute,
      optimized_route: originalRoute,
      improvement_summary: {
        original_safety_score: originalSafety.overall_route_score,
        optimized_safety_score: originalSafety.overall_route_score,
        safety_improvement: 0,
        time_added_minutes: 0,
        distance_added_km: 0,
        danger_zones_avoided: 0
      },
      waypoints_added: [],
      message: 'No dangerous segments requiring bypass',
      original_safety: originalSafety,
      optimized_safety: originalSafety
    };
  }

  console.log(`🚨 Found ${dangerousSegments.length} dangerous segment(s)`);

  // Step 5: Find safe waypoints for the most dangerous segments
  console.log('🔧 Step 4: Finding safe waypoints...');
  const safeWaypoints: SafeWaypoint[] = [];

  // Sort by safety score (worst first), take top 3
  const worstSegments = dangerousSegments
    .sort((a, b) => a.safety_score - b.safety_score)
    .slice(0, CONFIG.MAX_WAYPOINTS);

  for (const segment of worstSegments) {
    const waypoint = await findSafeBypassWaypoint(
      segment,
      request.origin,
      request.destination,
      request.user_demographics
    );

    if (waypoint) {
      safeWaypoints.push(waypoint);
    }
  }

  if (safeWaypoints.length === 0) {
    console.log('⚠️ Could not find any safe waypoints');
    return {
      success: false,
      original_route: originalRoute,
      optimized_route: originalRoute,
      improvement_summary: {
        original_safety_score: originalSafety.overall_route_score,
        optimized_safety_score: originalSafety.overall_route_score,
        safety_improvement: 0,
        time_added_minutes: 0,
        distance_added_km: 0,
        danger_zones_avoided: 0
      },
      waypoints_added: [],
      message: 'Unable to find safer alternative route'
    };
  }

  console.log(`✅ Found ${safeWaypoints.length} safe waypoint(s)`);

  // Step 6: Generate new route with waypoints
  console.log('🗺️ Step 5: Generating optimized route with waypoints...');
  const waypointCoords = safeWaypoints.map(wp => wp.coordinate);
  const optimizedRoute = await getGoogleRoute(request.origin, request.destination, waypointCoords);
  const optimizedCoords = geometryToCoordinates(optimizedRoute.geometry);

  // Step 7: Score the optimized route
  console.log('🔍 Step 6: Scoring optimized route...');
  const optimizedSafety = await scoreRoute(optimizedCoords, request.user_demographics, request.route_preferences);

  // Step 8: Calculate improvements
  const originalTime = originalRoute.duration / 60; // convert to minutes
  const optimizedTime = optimizedRoute.duration / 60;
  const timeAdded = optimizedTime - originalTime;

  const originalDistance = originalRoute.distance / 1000; // convert to km
  const optimizedDistance = optimizedRoute.distance / 1000;
  const distanceAdded = optimizedDistance - originalDistance;

  const safetyImprovement = optimizedSafety.overall_route_score - originalSafety.overall_route_score;
  const dangerZonesAvoided = (originalSafety.danger_zones_intersected || 0) - (optimizedSafety.danger_zones_intersected || 0);

  console.log(`\n📊 OPTIMIZATION RESULTS:`);
  console.log(`   Safety: ${originalSafety.overall_route_score.toFixed(2)} → ${optimizedSafety.overall_route_score.toFixed(2)} (+${safetyImprovement.toFixed(2)})`);
  console.log(`   Time: ${originalTime.toFixed(0)} min → ${optimizedTime.toFixed(0)} min (+${timeAdded.toFixed(0)} min)`);
  console.log(`   Danger zones avoided: ${dangerZonesAvoided}`);

  // Step 9: Check if detour is acceptable
  const maxDetourMinutes = request.route_preferences.max_detour_minutes || 30;

  if (timeAdded > maxDetourMinutes) {
    console.log(`⚠️ Detour time (${timeAdded.toFixed(0)} min) exceeds max (${maxDetourMinutes} min)`);
    return {
      success: false,
      original_route: originalRoute,
      optimized_route: optimizedRoute,
      improvement_summary: {
        original_safety_score: originalSafety.overall_route_score,
        optimized_safety_score: optimizedSafety.overall_route_score,
        safety_improvement: safetyImprovement,
        time_added_minutes: Math.round(timeAdded),
        distance_added_km: Math.round(distanceAdded * 10) / 10,
        danger_zones_avoided: dangerZonesAvoided
      },
      waypoints_added: safeWaypoints,
      message: `Safer route requires ${Math.round(timeAdded)} extra minutes (exceeds your ${maxDetourMinutes} min limit)`
    };
  }

  console.log('✅ Smart route generation complete!');

  return {
    success: true,
    original_route: originalRoute,
    optimized_route: optimizedRoute,
    improvement_summary: {
      original_safety_score: originalSafety.overall_route_score,
      optimized_safety_score: optimizedSafety.overall_route_score,
      safety_improvement: safetyImprovement,
      time_added_minutes: Math.round(timeAdded),
      distance_added_km: Math.round(distanceAdded * 10) / 10,
      danger_zones_avoided: dangerZonesAvoided
    },
    waypoints_added: safeWaypoints,
    message: `Found safer route (+${safetyImprovement.toFixed(1)} safety score, +${Math.round(timeAdded)} minutes)`,
    original_safety: originalSafety,
    optimized_safety: optimizedSafety
  };
}

// ================================
// MAIN HANDLER
// ================================

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    const request: SmartRouteRequest = await req.json();

    // Validate request
    if (!request.origin || !request.destination || !request.user_demographics) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: origin, destination, user_demographics' }),
        { status: 400, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } }
      );
    }

    // Generate optimized route
    const result = await generateOptimizedRoute(request);

    return new Response(
      JSON.stringify(result),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );

  } catch (error) {
    console.error('❌ Smart route generation error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        success: false
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*'
        }
      }
    );
  }
});