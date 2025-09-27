// supabase/functions/route-safety-scorer/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders } from '../_shared/cors.ts';
import { EDGE_CONFIG } from '../_shared/config.ts';

// Types
interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface UserDemographics {
  race_ethnicity?: string[];
  gender?: string;
  lgbtq_status?: string[];
  religion?: string;
  disability_status?: string[];
  age_range?: string;
}

interface RouteSegment {
  start: RouteCoordinate;
  end: RouteCoordinate;
  center: RouteCoordinate;
  distance_meters: number;
  safety_score: number;
  comfort_score: number;
  overall_score: number;
  confidence: number;
  risk_factors: string[];
  nearby_locations: any[];
  danger_zones: any[];
}

interface RouteSafetyResponse {
  overall_route_safety: number;
  overall_route_comfort: number;
  overall_route_score: number;
  total_distance_meters: number;
  confidence: number;
  segment_scores: RouteSegment[];
  danger_zone_intersections: any[];
  high_risk_segments: RouteSegment[];
  improvement_suggestions: string[];
  route_summary: {
    safe_segments: number;
    mixed_segments: number;
    unsafe_segments: number;
    danger_zones_count: number;
  };
}

// Route configuration from appConfig equivalent
const ROUTE_CONFIG = {
  SEGMENT_LENGTH_METERS: 1000,              // 1km segments for scoring
  SCORING_RADIUS_METERS: 500,               // 500m radius for nearby location scoring
  MAX_NEARBY_LOCATIONS: 20,                 // Max locations to consider per segment
  DANGER_ZONE_PENALTY: 2.0,                 // Penalty for intersecting danger zones
  SAFE_SCORE_THRESHOLD: 4.0,                // Score >= 4.0 considered safe
  MIXED_SCORE_THRESHOLD: 3.0,               // Score >= 3.0 considered mixed
  MIN_CONFIDENCE_FOR_RECOMMENDATIONS: 0.6,  // Minimum confidence for suggestions
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Initialize Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    const { route_coordinates, user_demographics, waypoints } = await req.json();

    // Validate input
    if (!route_coordinates || !Array.isArray(route_coordinates) || route_coordinates.length < 2) {
      throw new Error('Invalid route_coordinates: must be array with at least 2 points');
    }

    if (!user_demographics) {
      throw new Error('user_demographics is required');
    }

    console.log(`🗺️ Processing route with ${route_coordinates.length} coordinates`);
    console.log(`👤 User demographics:`, user_demographics);

    // Step 1: Divide route into segments
    const segments = divideRouteIntoSegments(route_coordinates);
    console.log(`📊 Created ${segments.length} route segments`);

    // Step 2: Score each segment
    const scoredSegments: RouteSegment[] = [];
    let totalSafety = 0;
    let totalComfort = 0;
    let totalOverall = 0;
    let totalDistance = 0;
    let totalConfidence = 0;
    const allDangerZones: any[] = [];

    for (const segment of segments) {
      console.log(`🔍 Scoring segment: ${segment.center.latitude}, ${segment.center.longitude}`);

      // Get nearby locations for this segment
      const nearbyLocations = await getNearbyLocationsForSegment(
        supabaseClient,
        segment.center,
        ROUTE_CONFIG.SCORING_RADIUS_METERS
      );

      // Get danger zones intersecting this segment
      const dangerZones = await getDangerZonesForSegment(
        supabaseClient,
        segment.center,
        ROUTE_CONFIG.SCORING_RADIUS_METERS
      );

      // Score the segment using safety-predictor logic
      const segmentScore = await scoreRouteSegment(
        supabaseClient,
        segment,
        nearbyLocations,
        dangerZones,
        user_demographics
      );

      scoredSegments.push(segmentScore);
      totalSafety += segmentScore.safety_score;
      totalComfort += segmentScore.comfort_score;
      totalOverall += segmentScore.overall_score;
      totalDistance += segment.distance_meters;
      totalConfidence += segmentScore.confidence;
      allDangerZones.push(...dangerZones);
    }

    // Step 3: Calculate overall route scores
    const segmentCount = scoredSegments.length;
    const overallSafety = totalSafety / segmentCount;
    const overallComfort = totalComfort / segmentCount;
    const overallScore = totalOverall / segmentCount;
    const overallConfidence = totalConfidence / segmentCount;

    // Step 4: Identify high-risk segments and generate recommendations
    const highRiskSegments = scoredSegments.filter(
      seg => seg.overall_score < ROUTE_CONFIG.MIXED_SCORE_THRESHOLD
    );

    const uniqueDangerZones = removeDuplicateDangerZones(allDangerZones);

    const improvementSuggestions = generateImprovementSuggestions(
      scoredSegments,
      highRiskSegments,
      uniqueDangerZones,
      overallConfidence
    );

    // Step 5: Create route summary
    const routeSummary = {
      safe_segments: scoredSegments.filter(s => s.overall_score >= ROUTE_CONFIG.SAFE_SCORE_THRESHOLD).length,
      mixed_segments: scoredSegments.filter(s =>
        s.overall_score >= ROUTE_CONFIG.MIXED_SCORE_THRESHOLD &&
        s.overall_score < ROUTE_CONFIG.SAFE_SCORE_THRESHOLD
      ).length,
      unsafe_segments: scoredSegments.filter(s => s.overall_score < ROUTE_CONFIG.MIXED_SCORE_THRESHOLD).length,
      danger_zones_count: uniqueDangerZones.length,
    };

    const response: RouteSafetyResponse = {
      overall_route_safety: Number(overallSafety.toFixed(2)),
      overall_route_comfort: Number(overallComfort.toFixed(2)),
      overall_route_score: Number(overallScore.toFixed(2)),
      total_distance_meters: Math.round(totalDistance),
      confidence: Number(overallConfidence.toFixed(2)),
      segment_scores: scoredSegments,
      danger_zone_intersections: uniqueDangerZones,
      high_risk_segments: highRiskSegments,
      improvement_suggestions: improvementSuggestions,
      route_summary: routeSummary,
    };

    console.log(`✅ Route analysis complete. Overall safety: ${overallSafety.toFixed(2)}, High-risk segments: ${highRiskSegments.length}`);

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('❌ Error in route-safety-scorer:', error);
    return new Response(JSON.stringify({
      error: error.message,
      details: 'Failed to analyze route safety'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});

// Helper Functions

function divideRouteIntoSegments(coordinates: RouteCoordinate[]): any[] {
  const segments = [];

  for (let i = 0; i < coordinates.length - 1; i++) {
    const start = coordinates[i];
    const end = coordinates[i + 1];

    // Calculate distance between points
    const distance = calculateDistance(start, end);

    // If segment is longer than max length, subdivide it
    if (distance > ROUTE_CONFIG.SEGMENT_LENGTH_METERS) {
      const subSegments = subdivideSegment(start, end, ROUTE_CONFIG.SEGMENT_LENGTH_METERS);
      segments.push(...subSegments);
    } else {
      // Create single segment
      const center = {
        latitude: (start.latitude + end.latitude) / 2,
        longitude: (start.longitude + end.longitude) / 2,
      };

      segments.push({
        start,
        end,
        center,
        distance_meters: distance,
      });
    }
  }

  return segments;
}

function subdivideSegment(start: RouteCoordinate, end: RouteCoordinate, maxLength: number): any[] {
  const totalDistance = calculateDistance(start, end);
  const numSegments = Math.ceil(totalDistance / maxLength);
  const segments = [];

  for (let i = 0; i < numSegments; i++) {
    const ratio1 = i / numSegments;
    const ratio2 = (i + 1) / numSegments;

    const segStart = {
      latitude: start.latitude + (end.latitude - start.latitude) * ratio1,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio1,
    };

    const segEnd = {
      latitude: start.latitude + (end.latitude - start.latitude) * ratio2,
      longitude: start.longitude + (end.longitude - start.longitude) * ratio2,
    };

    const center = {
      latitude: (segStart.latitude + segEnd.latitude) / 2,
      longitude: (segStart.longitude + segEnd.longitude) / 2,
    };

    segments.push({
      start: segStart,
      end: segEnd,
      center,
      distance_meters: calculateDistance(segStart, segEnd),
    });
  }

  return segments;
}

function calculateDistance(point1: RouteCoordinate, point2: RouteCoordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = point1.latitude * Math.PI / 180;
  const φ2 = point2.latitude * Math.PI / 180;
  const Δφ = (point2.latitude - point1.latitude) * Math.PI / 180;
  const Δλ = (point2.longitude - point1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

async function getNearbyLocationsForSegment(
  supabaseClient: any,
  center: RouteCoordinate,
  radiusMeters: number
): Promise<any[]> {
  try {
    const { data, error } = await supabaseClient.rpc('get_nearby_locations_with_scores', {
      lat: center.latitude,
      lng: center.longitude,
      radius_meters: radiusMeters,
      limit_count: ROUTE_CONFIG.MAX_NEARBY_LOCATIONS
    });

    if (error) {
      console.warn(`⚠️ Error fetching nearby locations: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn(`⚠️ Exception fetching nearby locations: ${error.message}`);
    return [];
  }
}

async function getDangerZonesForSegment(
  supabaseClient: any,
  center: RouteCoordinate,
  radiusMeters: number
): Promise<any[]> {
  try {
    const { data, error } = await supabaseClient.rpc('get_danger_zones', {
      lat: center.latitude,
      lng: center.longitude,
      radius_miles: radiusMeters / 1609.34 // Convert meters to miles
    });

    if (error) {
      console.warn(`⚠️ Error fetching danger zones: ${error.message}`);
      return [];
    }

    return data || [];
  } catch (error) {
    console.warn(`⚠️ Exception fetching danger zones: ${error.message}`);
    return [];
  }
}

async function scoreRouteSegment(
  supabaseClient: any,
  segment: any,
  nearbyLocations: any[],
  dangerZones: any[],
  userDemographics: UserDemographics
): Promise<RouteSegment> {

  // Base scores - start with neutral
  let safetyScore = EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;
  let comfortScore = EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;
  let overallScore = EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;
  let confidence = 0.15; // Base confidence
  const riskFactors: string[] = [];

  // Apply scoring based on nearby locations (use existing safety-predictor logic)
  if (nearbyLocations.length > 0) {
    let locationSafetySum = 0;
    let locationComfortSum = 0;
    let locationOverallSum = 0;
    let locationCount = 0;

    nearbyLocations.forEach(location => {
      if (location.safety_scores && location.safety_scores.length > 0) {
        location.safety_scores.forEach((score: any) => {
          // Prioritize demographic-specific scores
          if (matchesDemographic(score, userDemographics)) {
            locationSafetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
            locationComfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
            locationOverallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
            locationCount += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          } else if (score.demographic_type === 'overall') {
            locationSafetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
            locationComfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
            locationOverallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
            locationCount += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
          }
        });
      }
    });

    if (locationCount > 0) {
      safetyScore = locationSafetySum / locationCount;
      comfortScore = locationComfortSum / locationCount;
      overallScore = locationOverallSum / locationCount;
      confidence = Math.min(0.8, 0.15 + (locationCount / 10)); // Increase confidence based on data
    }
  }

  // Apply danger zone penalties
  if (dangerZones.length > 0) {
    dangerZones.forEach(zone => {
      const penalty = ROUTE_CONFIG.DANGER_ZONE_PENALTY * (zone.severity_multiplier || 1);
      safetyScore = Math.max(1, safetyScore - penalty);
      overallScore = Math.max(1, overallScore - penalty);
      riskFactors.push(`Danger zone: ${zone.description || 'High-risk area'}`);
    });

    riskFactors.push(`${dangerZones.length} danger zone(s) detected`);
  }

  // Identify additional risk factors based on scores
  if (safetyScore < ROUTE_CONFIG.MIXED_SCORE_THRESHOLD) {
    riskFactors.push('Below-average safety rating');
  }
  if (confidence < 0.5) {
    riskFactors.push('Limited safety data available');
  }

  return {
    start: segment.start,
    end: segment.end,
    center: segment.center,
    distance_meters: segment.distance_meters,
    safety_score: Number(safetyScore.toFixed(2)),
    comfort_score: Number(comfortScore.toFixed(2)),
    overall_score: Number(overallScore.toFixed(2)),
    confidence: Number(confidence.toFixed(2)),
    risk_factors: riskFactors,
    nearby_locations: nearbyLocations.map(loc => ({
      id: loc.id,
      name: loc.name,
      place_type: loc.place_type,
      distance_meters: calculateDistance(segment.center, { latitude: loc.latitude, longitude: loc.longitude })
    })),
    danger_zones: dangerZones.map(zone => ({
      id: zone.id,
      description: zone.description,
      severity_multiplier: zone.severity_multiplier
    }))
  };
}

function matchesDemographic(score: any, userDemographics: UserDemographics): boolean {
  // Check if the score matches any of the user's demographics
  if (score.demographic_type === 'race_ethnicity' && userDemographics.race_ethnicity) {
    return userDemographics.race_ethnicity.includes(score.demographic_value);
  }
  if (score.demographic_type === 'gender' && userDemographics.gender) {
    return userDemographics.gender === score.demographic_value;
  }
  if (score.demographic_type === 'lgbtq_status' && userDemographics.lgbtq_status) {
    return userDemographics.lgbtq_status.includes(score.demographic_value);
  }
  if (score.demographic_type === 'religion' && userDemographics.religion) {
    return userDemographics.religion === score.demographic_value;
  }
  if (score.demographic_type === 'disability_status' && userDemographics.disability_status) {
    return userDemographics.disability_status.includes(score.demographic_value);
  }
  return false;
}

function removeDuplicateDangerZones(zones: any[]): any[] {
  const seen = new Set();
  return zones.filter(zone => {
    if (seen.has(zone.id)) {
      return false;
    }
    seen.add(zone.id);
    return true;
  });
}

function generateImprovementSuggestions(
  allSegments: RouteSegment[],
  highRiskSegments: RouteSegment[],
  dangerZones: any[],
  overallConfidence: number
): string[] {
  const suggestions: string[] = [];

  if (highRiskSegments.length > 0) {
    suggestions.push(`Route contains ${highRiskSegments.length} high-risk segment(s). Consider alternative routes.`);
  }

  if (dangerZones.length > 0) {
    suggestions.push(`Route passes through ${dangerZones.length} danger zone(s). Extra caution recommended.`);
  }

  if (overallConfidence < ROUTE_CONFIG.MIN_CONFIDENCE_FOR_RECOMMENDATIONS) {
    suggestions.push('Limited safety data available for this route. Consider well-traveled alternatives.');
  }

  const unsafeSegmentPercentage = (highRiskSegments.length / allSegments.length) * 100;
  if (unsafeSegmentPercentage > 30) {
    suggestions.push('More than 30% of route segments have safety concerns. Strong recommendation to find alternative route.');
  } else if (unsafeSegmentPercentage > 10) {
    suggestions.push('Some route segments have safety concerns. Consider avoiding during evening/night hours.');
  }

  if (suggestions.length === 0) {
    suggestions.push('Route appears safe based on available data. Enjoy your trip!');
  }

  return suggestions;
}