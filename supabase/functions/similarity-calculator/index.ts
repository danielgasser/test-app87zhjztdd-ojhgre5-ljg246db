import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface UserDemographics {
  id: string
  race_ethnicity: string[] | null
  gender: string | null
  lgbtq_status: boolean | null
  disability_status: string[] | null
  religion: string | null
  age_range: string | null
}

interface SimilarityScore {
  user_id: string
  similarity_score: number
  shared_demographics: string[]
}

serve(async (req: { method: string; json: () => PromiseLike<{ user_id: any; limit?: 10 | undefined }> | { user_id: any; limit?: 10 | undefined } }) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get request body
    const { user_id, limit = 10 } = await req.json()

    if (!user_id) {
      throw new Error('user_id is required')
    }

    // Get target user's demographics
    const { data: targetUser, error: targetError } = await supabase
      .from('user_profiles')
      .select('id, race_ethnicity, gender, lgbtq_status, disability_status, religion, age_range')
      .eq('id', user_id)
      .single()

    if (targetError || !targetUser) {
      throw new Error('User not found')
    }

    // Get all other users
    const { data: allUsers, error: usersError } = await supabase
      .from('user_profiles')
      .select('id, race_ethnicity, gender, lgbtq_status, disability_status, religion, age_range')
      .neq('id', user_id)

    if (usersError) {
      throw new Error('Failed to fetch users')
    }

    // Calculate similarity scores
    const similarities: SimilarityScore[] = allUsers.map(user => {
      const score = calculateSimilarity(targetUser, user)
      return {
        user_id: user.id,
        similarity_score: score.score,
        shared_demographics: score.shared
      }
    })

    // Sort by similarity score and limit results
    const topSimilar = similarities
      .sort((a, b) => b.similarity_score - a.similarity_score)
      .slice(0, limit)

    return new Response(
      JSON.stringify({ 
        target_user_id: user_id,
        similar_users: topSimilar,
        calculation_timestamp: new Date().toISOString()
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    )
  }
})

function calculateSimilarity(user1: UserDemographics, user2: UserDemographics): { score: number, shared: string[] } {
  let score = 0
  const shared: string[] = []
  const weights = {
    race_ethnicity: 0.25,
    gender: 0.20,
    lgbtq_status: 0.20,
    disability_status: 0.15,
    religion: 0.15,
    age_range: 0.05
  }

  // Race/ethnicity comparison (array)
  if (user1.race_ethnicity && user2.race_ethnicity) {
    const intersection = user1.race_ethnicity.filter(r => user2.race_ethnicity!.includes(r))
    if (intersection.length > 0) {
      score += weights.race_ethnicity * (intersection.length / Math.max(user1.race_ethnicity.length, user2.race_ethnicity.length))
      shared.push(`race_ethnicity: ${intersection.join(', ')}`)
    }
  }

  // Gender comparison
  if (user1.gender && user2.gender && user1.gender === user2.gender) {
    score += weights.gender
    shared.push(`gender: ${user1.gender}`)
  }

  // LGBTQ status comparison
  if (user1.lgbtq_status !== null && user2.lgbtq_status !== null && user1.lgbtq_status === user2.lgbtq_status) {
    score += weights.lgbtq_status
    if (user1.lgbtq_status) shared.push('lgbtq_status: yes')
  }

  // Disability status comparison (array)
  if (user1.disability_status && user2.disability_status && user1.disability_status.length > 0 && user2.disability_status.length > 0) {
    const intersection = user1.disability_status.filter(d => user2.disability_status!.includes(d))
    if (intersection.length > 0) {
      score += weights.disability_status
      shared.push(`disability: ${intersection.join(', ')}`)
    }
  }

  // Religion comparison
  if (user1.religion && user2.religion && user1.religion === user2.religion) {
    score += weights.religion
    shared.push(`religion: ${user1.religion}`)
  }

  // Age range comparison
  if (user1.age_range && user2.age_range && user1.age_range === user2.age_range) {
    score += weights.age_range
    shared.push(`age: ${user1.age_range}`)
  }

  return { score, shared }
}