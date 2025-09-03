import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { EDGE_CONFIG } from '../_shared/config.ts';


const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
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
    const { location_id, user_demographics } = await req.json();
    if (!location_id || !user_demographics) {
      throw new Error('location_id and user_demographics are required');
    }
    // Get location details
    const { data: location, error: locError } = await supabase.from('locations').select('*').eq('id', location_id).single();
    if (locError || !location) {
      throw new Error('Location not found');
    }
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
    // No reviews exist - predict based on similar locations
    // Factor 1: Average scores for this place type
    const { data: placeTypeScores } = await supabase.from('locations').select(`
        id,
        place_type,
        safety_scores!inner (
          avg_safety_score,
          avg_comfort_score,
          avg_overall_score,
          demographic_type,
          demographic_value
        )
      `).eq('place_type', location.place_type).neq('id', location_id);
    // Factor 2: Neighborhood scores (nearby locations)
    const { data: nearbyLocations } = await supabase.rpc('get_nearby_locations', {
      lat: location.latitude || 0,
      lng: location.longitude || 0,
      radius_meters: 1000 // 1km radius
    });
    // Factor 3: Scores from similar demographics at similar places
    const demographicMatches = placeTypeScores?.filter((loc) => {
      return loc.safety_scores.some((score) => matchesDemographic(score, user_demographics));
    }) || [];
    // Calculate predictions
    let safetySum = 0, comfortSum = 0, overallSum = 0, count = 0;
    // Weight place type average
    placeTypeScores?.forEach((loc) => {
      loc.safety_scores.forEach((score) => {
        if (score.demographic_type === 'overall') {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL
            ;
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
          count += 0.3;
        }
      });
    });
    // Weight demographic-specific scores higher
    demographicMatches.forEach((loc) => {
      loc.safety_scores.forEach((score) => {
        if (matchesDemographic(score, user_demographics)) {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;// 70% weight
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          count += 0.7;
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
          count += 0.2;
        }
        // If demographic-specific nearby data exists, weight it higher
        if (matchesDemographic(score, user_demographics)) {
          safetySum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC; // 40% weight
          comfortSum += Number(score.avg_comfort_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC;
          overallSum += Number(score.avg_overall_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.NEARBY_DEMOGRAPHIC;
          count += 0.4;
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
