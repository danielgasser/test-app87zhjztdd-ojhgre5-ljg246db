// supabase/functions/route-safety-scorer/index.ts
// New Edge Function for comprehensive route safety analysis

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// Types
interface RouteCoordinate {
  latitude: number;
  longitude: number;
}

interface RouteSegment {
  start: RouteCoordinate;
  end: RouteCoordinate;
  center: RouteCoordinate;
  distance_meters: number;
  duration_seconds: number;
}

interface UserDemographics {
  race_ethnicity: string;
  gender: string;
  lgbtq_status: string;
  religion: string;
  disability_status: string;
  age_range: string;
}

interface RouteSafetyRequest {
  route_coordinates: RouteCoordinate[];
  user_demographics: UserDemographics;
  route_preferences?: {
    avoid_evening_danger?: boolean;
    safety_priority?: 'speed_focused' | 'balanced' | 'safety_focused';
  };
}

interface RouteSegmentScore {
  segment_index: number;
  start_lat: number;
  start_lng: number;
  end_lat: number;
  end_lng: number;
  safety_score: number;
  confidence: number;
  danger_zones: number;
  risk_factors: string[];
  distance_meters: number;
  duration_seconds: number;
}

interface RouteSafetyResponse {
  overall_route_score: number;
  overall_confidence: number;
  segment_scores: RouteSegmentScore[];
  danger_zones_intersected: number;
  high_risk_segments: number;
  total_segments: number;
  safety_summary: {
    safe_segments: number;
    mixed_segments: number;
    unsafe_segments: number;
  };
  safety_notes: string[];
  analysis_timestamp: string;
}

// Configuration
const CONFIG = {
  SEGMENT_LENGTH_MILES: 1.0,
  SCORING_RADIUS_MILES: 0.5,
  SAFE_THRESHOLD: 4.0,
  MIXED_THRESHOLD: 3.0,
  UNSAFE_THRESHOLD: 2.5,

  TIME_PENALTIES: {
    EVENING_MULTIPLIER: 1.2,
    NIGHT_MULTIPLIER: 1.5,
    EVENING_START: 18,
    NIGHT_START: 22,
    MORNING_END: 6,
  },

  DANGER_ZONE_PENALTIES: {
    HIGH: 2.0,
    MEDIUM: 1.0,
    LOW: 0.5,
  }
};

/**
 * Calculate distance between two coordinates in meters
 */
function calculateDistance(coord1: RouteCoordinate, coord2: RouteCoordinate): number {
  const R = 6371e3; // Earth's radius in meters
  const φ1 = coord1.latitude * Math.PI / 180;
  const φ2 = coord2.latitude * Math.PI / 180;
  const Δφ = (coord2.latitude - coord1.latitude) * Math.PI / 180;
  const Δλ = (coord2.longitude - coord1.longitude) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

/**
 * Segment route into analysis chunks
 */
function segmentRoute(coordinates: RouteCoordinate[]): RouteSegment[] {
  const segments: RouteSegment[] = [];
  const targetDistanceMeters = CONFIG.SEGMENT_LENGTH_MILES * 1609.34;

  let currentDistance = 0;
  let segmentStart = coordinates[0];

  for (let i = 1; i < coordinates.length; i++) {
    const segmentDistance = calculateDistance(coordinates[i - 1], coordinates[i]);
    currentDistance += segmentDistance;

    // Create segment when we've traveled the target distance or reached the end
    if (currentDistance >= targetDistanceMeters || i === coordinates.length - 1) {
      const segmentEnd = coordinates[i];
      const center: RouteCoordinate = {
        latitude: (segmentStart.latitude + segmentEnd.latitude) / 2,
        longitude: (segmentStart.longitude + segmentEnd.longitude) / 2
      };

      segments.push({
        start: segmentStart,
        end: segmentEnd,
        center,
        distance_meters: currentDistance,
        duration_seconds: Math.round(currentDistance / 13.4) // ~30 mph average
      });

      segmentStart = segmentEnd;
      currentDistance = 0;
    }
  }

  return segments;
}

/**
 * Analyze safety for a single route segment
 */
async function analyzeSegmentSafety(
  segment: RouteSegment,
  userDemographics: UserDemographics,
  segmentIndex: number,
  supabase: any
): Promise<RouteSegmentScore> {
  const riskFactors: string[] = [];
  let baseSafety = 3.0; // Default neutral score
  let confidence = 0.3;
  let dangerZoneCount = 0;

  try {
    // Call safety-predictor for this segment center
    const safetyResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/safety-predictor`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({
        latitude: segment.center.latitude,
        longitude: segment.center.longitude,
        user_demographics: userDemographics,
        place_type: 'route_segment'
      })
    });

    if (safetyResponse.ok) {
      const safetyData = await safetyResponse.json();
      baseSafety = safetyData.predicted_safety || 3.0;
      confidence = safetyData.confidence || 0.3;

      if (safetyData.risk_factors) {
        riskFactors.push(...safetyData.risk_factors);
      }
    }

    // Check for danger zones
    let dangerPenalty = 0;
    let timePenalty = 0;

    if (confidence > 0.5) {
      const dangerResponse = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/danger-zones`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
        },
        body: JSON.stringify({
          latitude: segment.center.latitude,
          longitude: segment.center.longitude,
          radius_miles: CONFIG.SCORING_RADIUS_MILES,
          user_demographics: userDemographics
        })
      });
    }

    let dangerPenalty = 0;
    if (dangerResponse.ok) {
      const dangerData = await dangerResponse.json();
      if (dangerData.zones && dangerData.zones.length > 0) {
        dangerZoneCount = dangerData.zones.length;

        for (const zone of dangerData.zones) {
          const severity = zone.severity_level || 1;
          if (severity >= 3) {
            dangerPenalty += CONFIG.DANGER_ZONE_PENALTIES.HIGH;
            riskFactors.push(`High danger zone: ${zone.reason || 'Unknown'}`);
          } else if (severity >= 2) {
            dangerPenalty += CONFIG.DANGER_ZONE_PENALTIES.MEDIUM;
            riskFactors.push(`Moderate danger zone: ${zone.reason || 'Unknown'}`);
          } else {
            dangerPenalty += CONFIG.DANGER_ZONE_PENALTIES.LOW;
            riskFactors.push(`Low danger zone: ${zone.reason || 'Unknown'}`);
          }
        }
      }
    }

    // Apply time-based penalties
    //let timePenalty = 0;
    const currentHour = new Date().getHours();

    if (currentHour >= CONFIG.TIME_PENALTIES.EVENING_START && currentHour < CONFIG.TIME_PENALTIES.NIGHT_START) {
      timePenalty = baseSafety * (CONFIG.TIME_PENALTIES.EVENING_MULTIPLIER - 1);
      riskFactors.push('Evening travel time');
    } else if (currentHour >= CONFIG.TIME_PENALTIES.NIGHT_START || currentHour < CONFIG.TIME_PENALTIES.MORNING_END) {
      timePenalty = baseSafety * (CONFIG.TIME_PENALTIES.NIGHT_MULTIPLIER - 1);
      riskFactors.push('Night travel time');
    } else {
      // Low confidence - insufficient data
      riskFactors.push('Limited safety data - stay alert');
    }

    // Calculate final safety score
    const finalScore = Math.max(1.0, Math.min(5.0, baseSafety - dangerPenalty - timePenalty));

    return {
      segment_index: segmentIndex,
      start_lat: segment.start.latitude,
      start_lng: segment.start.longitude,
      end_lat: segment.end.latitude,
      end_lng: segment.end.longitude,
      safety_score: finalScore,
      confidence,
      danger_zones: dangerZoneCount,
      risk_factors: riskFactors,
      distance_meters: segment.distance_meters,
      duration_seconds: segment.duration_seconds
    };

  } catch (error) {
    console.error(`Error analyzing segment ${segmentIndex}:`, error);

    return {
      segment_index: segmentIndex,
      start_lat: segment.start.latitude,
      start_lng: segment.start.longitude,
      end_lat: segment.end.latitude,
      end_lng: segment.end.longitude,
      safety_score: 3.0,
      confidence: 0.1,
      danger_zones: 0,
      risk_factors: ['Analysis unavailable'],
      distance_meters: segment.distance_meters,
      duration_seconds: segment.duration_seconds
    };
  }
}

/**
 * Generate safety summary and notes
 */
function generateSafetySummary(segmentScores: RouteSegmentScore[]): {
  summary: { safe_segments: number; mixed_segments: number; unsafe_segments: number; };
  notes: string[];
} {
  let safeSegments = 0;
  let mixedSegments = 0;
  let unsafeSegments = 0;
  const notes: string[] = [];

  for (const segment of segmentScores) {
    if (segment.safety_score >= CONFIG.SAFE_THRESHOLD) {
      safeSegments++;
    } else if (segment.safety_score >= CONFIG.MIXED_THRESHOLD) {
      mixedSegments++;
    } else {
      unsafeSegments++;
    }
  }

  // Generate contextual notes
  const totalSegments = segmentScores.length;
  const safePercentage = Math.round((safeSegments / totalSegments) * 100);
  const unsafePercentage = Math.round((unsafeSegments / totalSegments) * 100);

  if (safePercentage >= 80) {
    notes.push('This route is predominantly through safe areas');
  } else if (safePercentage >= 60) {
    notes.push('This route has mostly safe areas with some mixed zones');
  } else if (unsafePercentage >= 30) {
    notes.push('This route passes through several areas requiring caution');
  } else {
    notes.push('This route has mixed safety characteristics');
  }

  // Add specific warnings
  if (unsafeSegments > 0) {
    notes.push(`${unsafeSegments} segment(s) require extra caution`);
  }

  const totalDangerZones = segmentScores.reduce((sum, seg) => sum + seg.danger_zones, 0);
  if (totalDangerZones > 0) {
    notes.push(`Route intersects ${totalDangerZones} danger zone(s)`);
  }

  // Check for specific risk patterns
  const commonRisks = segmentScores
    .flatMap(seg => seg.risk_factors)
    .reduce((acc: { [key: string]: number }, risk) => {
      acc[risk] = (acc[risk] || 0) + 1;
      return acc;
    }, {});

  const frequentRisks = Object.entries(commonRisks)
    .filter(([_, count]) => count >= Math.ceil(totalSegments * 0.3))
    .map(([risk, _]) => risk);

  if (frequentRisks.length > 0) {
    notes.push(`Common concerns: ${frequentRisks.slice(0, 2).join(', ')}`);
  }

  return {
    summary: {
      safe_segments: safeSegments,
      mixed_segments: mixedSegments,
      unsafe_segments: unsafeSegments
    },
    notes: notes.slice(0, 5) // Limit to 5 most important notes
  };
}

/**
 * Main route safety analysis function
 */
async function analyzeRouteSafety(request: RouteSafetyRequest): Promise<RouteSafetyResponse> {
  console.log(`🔍 Analyzing route safety for ${request.route_coordinates.length} coordinates`);

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  // Segment the route
  const segments = segmentRoute(request.route_coordinates);
  console.log(`📍 Created ${segments.length} segments for analysis`);

  // Analyze each segment
  const segmentPromises = segments.map((segment, index) =>
    analyzeSegmentSafety(segment, request.user_demographics, index, supabase)
  );

  const segmentScores = await Promise.all(segmentPromises);

  // Calculate overall metrics
  const totalScore = segmentScores.reduce((sum, seg) => sum + seg.safety_score, 0);
  const overallScore = segments.length > 0 ? totalScore / segments.length : 3.0;

  const totalConfidence = segmentScores.reduce((sum, seg) => sum + seg.confidence, 0);
  const overallConfidence = Math.min(0.95, totalConfidence / segments.length);

  const dangerZonesIntersected = segmentScores.reduce((sum, seg) => sum + seg.danger_zones, 0);
  const highRiskSegments = segmentScores.filter(seg => seg.safety_score < CONFIG.UNSAFE_THRESHOLD).length;

  // Generate summary
  const { summary, notes } = generateSafetySummary(segmentScores);

  const result: RouteSafetyResponse = {
    overall_route_score: Math.round(overallScore * 10) / 10,
    overall_confidence: Math.round(overallConfidence * 100) / 100,
    segment_scores: segmentScores,
    danger_zones_intersected: dangerZonesIntersected,
    high_risk_segments: highRiskSegments,
    total_segments: segments.length,
    safety_summary: summary,
    safety_notes: notes,
    analysis_timestamp: new Date().toISOString()
  };

  console.log(`✅ Route analysis complete: Score ${result.overall_route_score}, ${result.total_segments} segments`);
  return result;
}

/**
 * Supabase Edge Function handler
 */
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
        {
          status: 405,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    const request: RouteSafetyRequest = await req.json();

    // Validate request
    if (!request.route_coordinates || !Array.isArray(request.route_coordinates)) {
      return new Response(
        JSON.stringify({ error: 'Invalid route coordinates' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    if (request.route_coordinates.length < 2) {
      return new Response(
        JSON.stringify({ error: 'Route must have at least 2 coordinates' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    if (!request.user_demographics) {
      return new Response(
        JSON.stringify({ error: 'User demographics required' }),
        {
          status: 400,
          headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
          }
        }
      );
    }

    // Analyze route safety
    const result = await analyzeRouteSafety(request);

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
    console.error('Route safety analysis error:', error);

    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error'
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