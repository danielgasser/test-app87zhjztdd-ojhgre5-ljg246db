import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { EDGE_CONFIG } from '../_shared/config.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// Helper function to match user demographics with score demographics
function matchesDemographic(score: any, user_demographics: any): boolean {
  if (score.demographic_type === 'race_ethnicity' && user_demographics.race_ethnicity) {
    return user_demographics.race_ethnicity.includes(score.demographic_value);
  }
  if (score.demographic_type === 'gender' && user_demographics.gender) {
    return user_demographics.gender === score.demographic_value;
  }
  if (score.demographic_type === 'lgbtq' && user_demographics.lgbtq_status !== null) {
    return (user_demographics.lgbtq_status && score.demographic_value === 'yes') ||
      (!user_demographics.lgbtq_status && score.demographic_value === 'no');
  }
  return false;
}

// Calculate safety score from neighborhood statistics
function calculateStatsScore(stats: any): number {
  if (!stats) return EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;

  // Lower crime rates = higher safety scores
  // Scale: 5.0 (very safe) to 1.0 (very unsafe)
  const crimeRate = stats.crime_rate_per_1000 || 0;
  const violentRate = stats.violent_crime_rate || 0;
  const hateIncidents = stats.hate_crime_incidents || 0;

  // Scoring formula (inverted - lower crime = higher score)
  // Base score starts at 5.0 and decreases with crime
  let score = 5.0;

  // General crime impact (up to -1.5 points)
  if (crimeRate > 100) score -= 1.5;
  else if (crimeRate > 50) score -= 1.0;
  else if (crimeRate > 25) score -= 0.5;

  // Violent crime impact (up to -1.5 points)
  if (violentRate > 10) score -= 1.5;
  else if (violentRate > 5) score -= 1.0;
  else if (violentRate > 2) score -= 0.5;

  // Hate crime impact (up to -1.0 points)
  if (hateIncidents > 10) score -= 1.0;
  else if (hateIncidents > 5) score -= 0.5;
  else if (hateIncidents > 0) score -= 0.25;

  // Diversity bonus (diverse areas often safer for minorities)
  const diversityIndex = stats.diversity_index || 0;
  if (diversityIndex > 0.7) score += 0.3;
  else if (diversityIndex > 0.5) score += 0.2;

  // Clamp to valid range
  return Math.max(1.0, Math.min(5.0, score));
}

// Calculate demographics-based score from stats
function calculateDemographicsScore(stats: any, user_demographics: any): number {
  if (!stats) return EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;

  let score = 5.0;

  // Diversity index (higher = safer for minorities)
  const diversityIndex = stats.diversity_index || 0;
  const pctMinority = stats.pct_minority || 0;

  // For minority users, higher diversity = safer
  const isMinority = user_demographics.race_ethnicity?.some((race: string) =>
    !['White', 'Caucasian'].includes(race)
  );

  if (isMinority) {
    if (diversityIndex < 0.3) score -= 1.0;  // Low diversity
    else if (diversityIndex < 0.5) score -= 0.5;
    else if (diversityIndex > 0.7) score += 0.5;  // High diversity
  }

  // Hate crime incidents
  const hateIncidents = stats.hate_crime_incidents || 0;
  if (hateIncidents > 10) score -= 1.5;
  else if (hateIncidents > 5) score -= 1.0;
  else if (hateIncidents > 0) score -= 0.5;

  return Math.max(1.0, Math.min(5.0, score));
}

// Query vote statistics for a location
async function getVoteStats(supabaseClient: any, locationId: string, googlePlaceId?: string) {
  if (locationId && locationId !== 'temp-location' && locationId !== 'none') {
    // Database location - check safety_scores table
    const { data } = await supabaseClient
      .from('safety_scores')
      .select('accurate_count, inaccurate_count')
      .eq('location_id', locationId)
      .eq('demographic_type', 'overall')
      .single();

    if (data) {
      const total = (data.accurate_count || 0) + (data.inaccurate_count || 0);
      return {
        accurate: data.accurate_count || 0,
        inaccurate: data.inaccurate_count || 0,
        total,
        accuracyRate: total > 0 ? data.accurate_count / total : 0
      };
    }
  }

  if (googlePlaceId) {
    // Temporary location - check prediction_votes table directly
    const { data } = await supabaseClient
      .from('prediction_votes')
      .select('vote_type')
      .eq('google_place_id', googlePlaceId);

    if (data && data.length > 0) {
      const accurate = data.filter((v: any) => v.vote_type === 'accurate').length;
      const inaccurate = data.filter((v: any) => v.vote_type === 'inaccurate').length;
      const total = accurate + inaccurate;

      return {
        accurate,
        inaccurate,
        total,
        accuracyRate: total > 0 ? accurate / total : 0
      };
    }
  }

  return { accurate: 0, inaccurate: 0, total: 0, accuracyRate: 0 };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { location_id, google_place_id, latitude, longitude, user_demographics, place_type } = await req.json();
    // Must have either location_id OR coordinates
    if ((!location_id && (!latitude || !longitude)) || !user_demographics) {
      throw new Error('Either location_id or (latitude + longitude) and user_demographics are required');
    }

    // Get location details
    let location;
    let lat: number, lng: number;

    if (location_id) {
      const { data, error: locError } = await supabase
        .rpc('get_location_with_coords', { location_id: location_id })
        .single();

      if (locError || !data) {
        throw new Error('Location not found');
      }
      location = data;
      lat = data.latitude;
      lng = data.longitude;
    } else {
      location = {
        id: 'temp-location',
        name: 'Temporary Location',
        latitude: latitude,
        longitude: longitude,
        place_type: place_type || 'other',
        google_place_id: google_place_id
      };
      lat = latitude;
      lng = longitude;
    }

    // ====================================================================
    // STEP 1: Fetch neighborhood statistical data
    // ====================================================================
    const { data: neighborhoodStats } = await supabase.rpc('get_neighborhood_stats_for_point', {
      lat: lat,
      lng: lng
    });

    const stats = neighborhoodStats && neighborhoodStats.length > 0 ? neighborhoodStats[0] : null;

    // ====================================================================
    // STEP 2: Check for existing user reviews
    // ====================================================================
    const { data: existingScores } = await supabase
      .from('safety_scores')
      .select('*')
      .eq('location_id', location.id || 'none');

    const hasReviews = existingScores && existingScores.length > 0;

    // Find demographic-matching reviews
    const demographicMatchingReviews = existingScores?.filter(score =>
      matchesDemographic(score, user_demographics)
    ) || [];

    // ====================================================================
    // STEP 3: Fetch ML prediction data (place type, nearby locations)
    // ====================================================================
    const { data: placeTypeScores } = await supabase
      .from('locations')
      .select(`
        id,
        name,
        place_type,
        safety_scores:safety_scores(*)
      `)
      .eq('place_type', location.place_type)
      .neq('id', location.id || 'none')
      .limit(10);

    const { data: nearbyLocations } = await supabase.rpc('get_nearby_locations', {
      lat: lat,
      lng: lng,
      radius_meters: EDGE_CONFIG.ML_PARAMS.NEARBY_LOCATION_RADIUS
    });

    // ====================================================================
    // STEP 3.5: Query vote statistics for this location
    // ====================================================================
    const voteStats = await getVoteStats(supabase, location.id, location.google_place_id);

    // ====================================================================
    // STEP 4: Determine scoring scenario and calculate weighted score
    // ====================================================================
    let finalScore: number;
    let confidence: number;
    let primarySource: string;
    let breakdown: any = {};
    let basedOn: any = {};

    // Scenario determination
    let weights;

    if (hasReviews && demographicMatchingReviews.length > 0) {
      // SCENARIO: WITH_REVIEWS - User reviews from matching demographics exist
      weights = EDGE_CONFIG.STATISTICAL_WEIGHTS.WITH_REVIEWS;
      primarySource = 'community_reviews';

      // Calculate review-based score
      const reviewSum = demographicMatchingReviews.reduce((sum, score) =>
        sum + Number(score.avg_overall_score || score.avg_safety_score), 0
      );
      const reviewScore = reviewSum / demographicMatchingReviews.length;

      // Calculate ML prediction score
      let mlSum = 0, mlCount = 0;
      placeTypeScores?.forEach((loc: any) => {
        loc.safety_scores?.forEach((score: any) => {
          if (score.demographic_type === 'overall') {
            mlSum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
            mlCount += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
          }
        });
      });
      const mlScore = mlCount > 0 ? mlSum / mlCount : EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;

      // Calculate stats score
      const statsScore = calculateStatsScore(stats);

      // Apply weights
      finalScore = (
        reviewScore * weights.userReviews +
        mlScore * weights.mlPrediction +
        statsScore * weights.statistics
      );

      confidence = Math.min(demographicMatchingReviews.length / 5, 0.95); // High confidence with reviews
      // Adjust confidence based on vote feedback
      if (voteStats.total >= EDGE_CONFIG.ML_PARAMS.VOTE_WEIGHTS.MIN_VOTES_FOR_CONFIDENCE_ADJUSTMENT) {
        confidence *= voteStats.accuracyRate;
      }
      breakdown = {
        userReviews: reviewScore.toFixed(2),
        mlPrediction: mlScore.toFixed(2),
        statistics: statsScore.toFixed(2),
        weightsUsed: weights
      };

      basedOn = {
        reviewsFromMatchingDemo: demographicMatchingReviews.length,
        hasMLPrediction: mlCount > 0,
        hasStatisticalData: !!stats
      };

    } else if (placeTypeScores && placeTypeScores.length > 0) {
      // SCENARIO: ML_ONLY - No matching reviews but have ML prediction data
      weights = EDGE_CONFIG.STATISTICAL_WEIGHTS.ML_ONLY;
      primarySource = 'ml_prediction';

      // Calculate ML prediction
      let mlSum = 0, mlCount = 0;

      // Place type scores
      placeTypeScores.forEach((loc: any) => {
        loc.safety_scores?.forEach((score: any) => {
          if (score.demographic_type === 'overall') {
            mlSum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
            mlCount += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.PLACE_TYPE_OVERALL;
          }
          if (matchesDemographic(score, user_demographics)) {
            mlSum += Number(score.avg_safety_score) * EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
            mlCount += EDGE_CONFIG.ML_PARAMS.PREDICTION_WEIGHTS.DEMOGRAPHIC_MATCHES;
          }
        });
      });

      const mlScore = mlCount > 0 ? mlSum / mlCount : EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;

      // Calculate demographics score from stats
      const demoScore = calculateDemographicsScore(stats, user_demographics);

      // Calculate stats score
      const statsScore = calculateStatsScore(stats);

      // Apply weights
      finalScore = (
        mlScore * weights.mlPrediction +
        demoScore * weights.demographics +
        statsScore * weights.statistics
      );

      confidence = Math.min((placeTypeScores.length + (stats ? 3 : 0)) / 15, 0.75);
      // Adjust confidence based on vote feedback
      if (voteStats.total >= EDGE_CONFIG.ML_PARAMS.VOTE_WEIGHTS.MIN_VOTES_FOR_CONFIDENCE_ADJUSTMENT) {
        confidence *= voteStats.accuracyRate;
      }
      breakdown = {
        mlPrediction: mlScore.toFixed(2),
        demographics: demoScore.toFixed(2),
        statistics: statsScore.toFixed(2),
        weightsUsed: weights
      };

      basedOn = {
        reviewsFromMatchingDemo: 0,
        hasMLPrediction: true,
        hasStatisticalData: !!stats
      };

    } else {
      // SCENARIO: COLD_START - No reviews, no similar locations
      weights = EDGE_CONFIG.STATISTICAL_WEIGHTS.COLD_START;
      primarySource = 'statistics';

      // Calculate stats score
      const statsScore = calculateStatsScore(stats);

      // Calculate demographics score
      const demoScore = calculateDemographicsScore(stats, user_demographics);

      // ML extrapolation (use neutral baseline with slight adjustment)
      const mlExtrapolation = EDGE_CONFIG.ML_PARAMS.NEUTRAL_SCORE_BASELINE;

      // Apply weights
      finalScore = (
        statsScore * weights.statistics +
        demoScore * weights.demographics +
        mlExtrapolation * weights.mlExtrapolation
      );

      confidence = stats ? 0.35 : 0.15; // Low confidence without reviews or predictions
      // Adjust confidence based on vote feedback
      if (voteStats.total >= EDGE_CONFIG.ML_PARAMS.VOTE_WEIGHTS.MIN_VOTES_FOR_CONFIDENCE_ADJUSTMENT) {
        confidence *= voteStats.accuracyRate;
      }
      breakdown = {
        statistics: statsScore.toFixed(2),
        demographics: demoScore.toFixed(2),
        mlExtrapolation: mlExtrapolation.toFixed(2),
        weightsUsed: weights
      };

      basedOn = {
        reviewsFromMatchingDemo: 0,
        hasMLPrediction: false,
        hasStatisticalData: !!stats
      };
    }

    // ====================================================================
    // STEP 5: Return comprehensive prediction response
    // ====================================================================
    return new Response(JSON.stringify({
      location_id: location.id,
      location_name: location.name,
      location_type: location.place_type,

      // Core prediction
      predicted_safety_score: Number(finalScore.toFixed(2)),
      predicted_comfort_score: Number(finalScore.toFixed(2)), // For now, same as safety
      predicted_overall_score: Number(finalScore.toFixed(2)),

      // Confidence and transparency
      confidence: Number(confidence.toFixed(2)),
      vote_validation: voteStats.total > 0 ? {
        total_votes: voteStats.total,
        accurate_votes: voteStats.accurate,
        inaccurate_votes: voteStats.inaccurate,
        accuracy_rate: Number(voteStats.accuracyRate.toFixed(2))
      } : null,

      primary_source: primarySource,

      // Detailed breakdown
      score_breakdown: breakdown,
      based_on: basedOn,

      // Statistical data included (if available)
      neighborhood_stats: stats ? {
        name: stats.name,
        city: stats.city,
        state_code: stats.state_code,
        crime_rate_per_1000: stats.crime_rate_per_1000,
        violent_crime_rate: stats.violent_crime_rate,
        hate_crime_incidents: stats.hate_crime_incidents,
        diversity_index: stats.diversity_index,
        pct_minority: stats.pct_minority
      } : null,

      // Metadata
      calculation_timestamp: new Date().toISOString(),
      scenario_used: hasReviews && demographicMatchingReviews.length > 0
        ? 'WITH_REVIEWS'
        : (placeTypeScores && placeTypeScores.length > 0 ? 'ML_ONLY' : 'COLD_START')
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('Prediction error:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Prediction failed',
        details: error instanceof Error ? error.stack : undefined
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400
      }
    );
  }
});