import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { EDGE_CONFIG } from '../_shared/config.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper: Calculate safety score from crime statistics
function calculateStatsScore(stats: any): number {
  // Lower crime rate = higher safety (invert scale)
  // Crime rate typically 0-100+ per 1000, normalize to 1-5 scale
  const crimeScore = Math.max(1, 5 - (stats.crime_rate_per_1000 / 20));

  // Hate crimes significantly reduce safety
  const hateImpact = Math.min(2, stats.hate_crime_incidents * 0.5);

  return Math.max(1, Math.min(5, crimeScore - hateImpact));
}

// Helper: Calculate safety contribution from diversity metrics
function calculateDiversityScore(stats: any): number {
  // Higher diversity often correlates with safety for minorities
  // Diversity index 0-100, normalize to safety contribution
  return 2.5 + (stats.diversity_index / 100) * 2.5; // Range: 2.5-5.0
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const { location_id, latitude, longitude, user_demographics, place_type } = await req.json();

    // Must have either location_id OR coordinates
    if ((!location_id && (!latitude || !longitude)) || !user_demographics) {
      throw new Error('Either location_id or (latitude + longitude) and user_demographics are required');
    }
    // Get location details
    let location;

    if (location_id) {
      // Database location - fetch from locations table
      const { data, error: locError } = await supabase.from('locations').select('*').eq('id', location_id).single();
      if (locError || !data) {
        throw new Error('Location not found');
      }
      location = data;
    } else {
      // Temporary location with coordinates - create a minimal location object
      location = {
        id: 'temp-location',
        name: 'Temporary Location',
        latitude: latitude,
        longitude: longitude,
        place_type: place_type || 'other'
      };
    }

    // Fetch neighborhood stats for this location
    const { data: neighborhoodStats } = await supabase.rpc('get_neighborhood_stats_for_point', {
      lat: latitude || location.latitude,
      lng: longitude || location.longitude
    });

    const hasStats = neighborhoodStats && neighborhoodStats.length > 0;
    const stats = hasStats ? neighborhoodStats[0] : null;

    // Check if we already have reviews for this location
    const { data: existingScores } = await supabase.from('safety_scores').select('*').eq('location_id', location_id);
    if (existingScores && existingScores.length > 0) {
      // Find best matching demographic score
      const matchingScore = findBestDemographicMatch(existingScores, user_demographics);
      if (matchingScore) {
        return new Response(JSON.stringify({
          location_id,
          location_name: location.name,
          predicted_safety_score: Number(matchingScore.avg_safety_score),
          predicted_comfort_score: Number(matchingScore.avg_comfort_score),
          predicted_overall_score: Number(matchingScore.avg_overall_score),
          confidence: 1.0,
          source: 'actual_reviews',
          review_count: matchingScore.review_count
        }), {
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }

    const hasReviews = existingScores && existingScores.length > 0;
    const hasDemographicReviews = hasReviews && existingScores.some(score =>
      score.demographic_type !== 'overall'
    );

    // No reviews exist - predict based on similar locations
    // Factor 1: Average scores for this place type
    let placeTypeQuery = supabase.from('locations').select(`
    id,
    place_type,
    safety_scores!inner (
      avg_safety_score,
      avg_comfort_score,
      avg_overall_score,
      demographic_type,
      demographic_value
    )
  `).eq('place_type', location.place_type);

    // Only exclude the location if it's a real database location
    if (location_id) {
      placeTypeQuery = placeTypeQuery.neq('id', location_id);
    }
    const { data: placeTypeScores } = await placeTypeQuery;
    // Factor 2: Neighborhood scores (nearby locations)
    const { data: nearbyLocations } = await supabase.rpc('get_nearby_locations', {
      lat: location.latitude || latitude,
      lng: location.longitude || longitude,
      radius_meters: EDGE_CONFIG.ML_PARAMS.NEARBY_LOCATION_RADIUS
    });
    // Determine scoring scenario
    let scenario: 'WITH_REVIEWS' | 'ML_ONLY' | 'COLD_START';

    if (hasDemographicReviews) {
      scenario = 'WITH_REVIEWS';
    } else if ((placeTypeScores && placeTypeScores.length > 0) || (nearbyLocations && nearbyLocations.length > 0)) {
      scenario = 'ML_ONLY';
    } else {
      scenario = 'COLD_START';
    }

    const weights = EDGE_CONFIG.STATISTICAL_WEIGHTS[scenario];

    // Factor 3: Scores from similar demographics at similar places
    const demographicMatches = placeTypeScores?.filter((loc) => {
      return loc.safety_scores.some((score) => matchesDemographic(score, user_demographics));
    }) || [];

    // Weighted scoring based on scenario
    let safetyScore = 0;
    let totalWeight = 0;
    const breakdown: any = {};

    // 1. User Reviews (if available in WITH_REVIEWS scenario)
    if (scenario === 'WITH_REVIEWS' && hasReviews) {
      const reviewScore = existingScores.reduce((sum, score) =>
        sum + Number(score.avg_safety_score), 0) / existingScores.length;
      safetyScore += reviewScore * (weights as any).userReviews;
      totalWeight += (weights as any).userReviews;
      breakdown.userReviews = reviewScore;
    }

    // 2. ML Prediction (place type scores) - not used in COLD_START
    if (scenario !== 'COLD_START' && placeTypeScores && placeTypeScores.length > 0) {
      let mlScore = 0;
      let mlCount = 0;

      placeTypeScores.forEach((loc) => {
        loc.safety_scores.forEach((score) => {
          if (score.demographic_type === 'overall') {
            mlScore += Number(score.avg_safety_score);
            mlCount++;
          }
        });
      });

      if (mlCount > 0) {
        mlScore = mlScore / mlCount;
        safetyScore += mlScore * (weights as any).mlPrediction;
        totalWeight += (weights as any).mlPrediction;
        breakdown.mlPrediction = mlScore;
      }
    }

    // Weight demographic-specific scores higher
    demographicMatches.forEach((loc) => {
      loc.safety_scores.forEach((score) => {
        if (matchesDemographic(score, user_demographics)) {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;// 70% weight
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          count += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
        }
      });
    });
    // If no data, use neutral scores
    // Weight nearby location scores (add this section)
    nearbyLocations?.forEach((loc) => {
      // Get safety scores for nearby locations
      loc.safety_scores?.forEach((score) => {
        if (score.demographic_type === 'overall') {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_OVERALL; // 20% weight
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_OVERALL;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_OVERALL;
          count += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_OVERALL;
        }
        // If demographic-specific nearby data exists, weight it higher
        if (matchesDemographic(score, user_demographics)) {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC; // 40% weight
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC;
          count += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC;
        }
      });
    });
    if (count === 0) {
      safetySum = comfortSum = overallSum = 3.5;
      count = 1;
    }
    const predicted_safety = safetySum / count;
    const predicted_comfort = comfortSum / count;
    const predicted_overall = overallSum / count;
    // Calculate confidence based on data availability
    // Calculate confidence based on ACTUAL data sources used
    const placeTypeDataPoints = placeTypeScores?.length || 0;
    const nearbyDataPoints = nearbyLocations?.length || 0;
    const demographicMatchPoints = demographicMatches.length;

    const totalDataSources = placeTypeDataPoints + nearbyDataPoints + demographicMatchPoints;
    const confidence = totalDataSources === 0 ? 0.15 : Math.min(totalDataSources / 15, 0.8);
    const dataPoints = totalDataSources; // Keep this for the response

    return new Response(JSON.stringify({
      location_id,
      location_name: location.name,
      location_type: location.place_type,
      predicted_safety_score: Number(predicted_safety.toFixed(2)),
      predicted_comfort_score: Number(predicted_comfort.toFixed(2)),
      predicted_overall_score: Number(predicted_overall.toFixed(2)),
      confidence: Number(confidence.toFixed(2)),
      prediction_factors: {
        place_type_avg: Number(((safetySum + comfortSum + overallSum) / (count * 3)).toFixed(2)),
        similar_locations_count: placeTypeScores?.length || 0,
        demographic_matches: demographicMatches.length
      },
      based_on_locations: dataPoints,
      source: 'ml_prediction',
      calculation_timestamp: new Date().toISOString()
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 400
    });
  }
});
function findBestDemographicMatch(scores, demographics) {
  // First try exact demographic matches
  for (const score of scores) {
    if (score.demographic_type === 'race_ethnicity' && demographics.race_ethnicity?.includes(score.demographic_value)) {
      return score;
    }
    if (score.demographic_type === 'gender' && score.demographic_value === demographics.gender) {
      return score;
    }
    if (score.demographic_type === 'religion' && score.demographic_value === demographics.religion) {
      return score;
    }
  }
  // Fall back to overall
  return scores.find((s) => s.demographic_type === 'overall');
}
function matchesDemographic(score, demographics) {
  switch (score.demographic_type) {
    case 'race_ethnicity':
      return demographics.race_ethnicity?.includes(score.demographic_value);
    case 'gender':
      return score.demographic_value === demographics.gender;
    case 'religion':
      return score.demographic_value === demographics.religion;
    case 'lgbtq':
      return score.demographic_value === 'true' && demographics.lgbtq_status === true;
    default:
      return false;
  }
}
