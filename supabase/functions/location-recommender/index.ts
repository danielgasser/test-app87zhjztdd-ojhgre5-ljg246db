import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface LocationRecommendation {
  location_id: string
  location_name: string
  location_address: string
  predicted_score: number
  confidence: number
  similar_users_count: number
  avg_rating_by_similar: number
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { user_id, limit = 10, min_confidence = 0.5 } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Step 1: Get similar users using our similarity calculator
    const similarUsersResponse = await fetch(`${supabaseUrl}/functions/v1/similarity-calculator`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ user_id, limit: 20 }) // Get more similar users for better recommendations
    })

    const { similar_users } = await similarUsersResponse.json()
    
    // Filter to only highly similar users
    const highSimilarityUsers = similar_users
      .filter((u: any) => u.similarity_score >= min_confidence)
      .map((u: any) => u.user_id)

    if (highSimilarityUsers.length === 0) {
      return new Response(
        JSON.stringify({ 
          user_id,
          recommendations: [],
          message: "No similar users found. Try visiting and reviewing more locations!"
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Step 2: Get locations the user hasn't visited
    const { data: userReviews } = await supabase
      .from('reviews')
      .select('location_id')
      .eq('user_id', user_id)

    const visitedLocationIds = userReviews?.map(r => r.location_id) || []

    // Step 3: Get highly-rated locations by similar users
    const { data: recommendations, error: recError } = await supabase
      .from('reviews')
      .select(`
        location_id,
        overall_rating,
        safety_rating,
        comfort_rating,
        locations!inner (
          id,
          name,
          address,
          city,
          place_type
        )
      `)
      .in('user_id', highSimilarityUsers)
      .not('location_id', 'in', `(${visitedLocationIds.join(',')})`)
      .gte('overall_rating', 4) // Only recommend places rated 4+ by similar users

    if (recError) throw recError

    // Step 4: Aggregate and score recommendations
    const locationScores = new Map<string, {
      location: any
      total_rating: number
      rating_count: number
      safety_sum: number
      comfort_sum: number
    }>()

    recommendations?.forEach((review: { location_id: any; locations: any; overall_rating: number; safety_rating: number; comfort_rating: number }) => {
      const locId = review.location_id
      if (!locationScores.has(locId)) {
        locationScores.set(locId, {
          location: review.locations,
          total_rating: 0,
          rating_count: 0,
          safety_sum: 0,
          comfort_sum: 0
        })
      }
      
      const scores = locationScores.get(locId)!
      scores.total_rating += review.overall_rating
      scores.rating_count += 1
      scores.safety_sum += review.safety_rating
      scores.comfort_sum += review.comfort_rating
    })

    // Step 5: Calculate final recommendations
    const finalRecommendations: LocationRecommendation[] = Array.from(locationScores.entries())
      .map(([location_id, data]) => {
        const avg_rating = data.total_rating / data.rating_count
        const confidence = Math.min(data.rating_count / 3, 1) // Confidence increases with more reviews, max at 3
        const predicted_score = avg_rating * confidence + 3.5 * (1 - confidence) // Blend with neutral score
        
        return {
          location_id,
          location_name: data.location.name,
          location_address: `${data.location.address}, ${data.location.city}`,
          predicted_score: Number(predicted_score.toFixed(2)),
          confidence: Number(confidence.toFixed(2)),
          similar_users_count: data.rating_count,
          avg_rating_by_similar: Number(avg_rating.toFixed(2)),
          avg_safety: Number((data.safety_sum / data.rating_count).toFixed(2)),
          avg_comfort: Number((data.comfort_sum / data.rating_count).toFixed(2)),
          place_type: data.location.place_type
        }
      })
      .sort((a, b) => b.predicted_score - a.predicted_score)
      .slice(0, limit)

    return new Response(
      JSON.stringify({ 
        user_id,
        recommendations: finalRecommendations,
        based_on_similar_users: highSimilarityUsers.length,
        calculation_timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})