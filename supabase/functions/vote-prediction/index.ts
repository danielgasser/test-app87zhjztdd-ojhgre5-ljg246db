import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // Verify JWT
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const {
      location_id,
      google_place_id,
      vote_type,
      prediction_source,
      predicted_safety_score,
      demographic_type,
      demographic_value,
      user_demographics
    } = await req.json()

    if ((!location_id && !google_place_id) || !vote_type || !prediction_source || predicted_safety_score === undefined || predicted_safety_score === null) {
      return new Response(JSON.stringify({ error: 'Missing required fields' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (!['accurate', 'inaccurate'].includes(vote_type)) {
      return new Response(JSON.stringify({ error: 'Invalid vote_type' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    let existingVoteQuery = supabaseClient
      .from('prediction_votes')
      .select('*')
      .eq('user_id', user.id)

    if (location_id) {
      existingVoteQuery = existingVoteQuery.eq('location_id', location_id)
    } else {
      existingVoteQuery = existingVoteQuery.eq('google_place_id', google_place_id)
    }

    // Check if user already voted
    const { data: existingVote } = await existingVoteQuery.single()


    if (existingVote) {
      // User is changing or removing vote
      if (existingVote.vote_type === vote_type) {
        let deleteQuery = supabaseClient
          .from('prediction_votes')
          .delete()
          .eq('user_id', user.id)

        if (location_id) {
          deleteQuery = deleteQuery.eq('location_id', location_id)
        } else {
          deleteQuery = deleteQuery.eq('google_place_id', google_place_id)
        }
        await deleteQuery

        // Decrement count
        // Decrement count only if location exists in DB
        if (location_id) {
          const countField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
          await supabaseClient.rpc('decrement_prediction_vote_count', {
            p_location_id: location_id,
            p_demographic_type: demographic_type || 'overall',
            p_demographic_value: demographic_value || null,
            p_count_field: countField
          })
        }
        return new Response(JSON.stringify({ success: true, action: 'removed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Switch vote type
        const oldCountField = existingVote.vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
        const newCountField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'

        // Update vote
        let updateQuery = supabaseClient
          .from('prediction_votes')
          .update({
            vote_type,
            prediction_source,
            predicted_safety_score,
            user_demographics,
            updated_at: new Date().toISOString()
          })
          .eq('user_id', user.id)

        if (location_id) {
          updateQuery = updateQuery.eq('location_id', location_id)
        } else {
          updateQuery = updateQuery.eq('google_place_id', google_place_id)
        }

        await updateQuery
        if (location_id) {
          await supabaseClient.rpc('decrement_prediction_vote_count', {
            p_location_id: location_id,
            p_demographic_type: demographic_type || 'overall',
            p_demographic_value: demographic_value || null,
            p_count_field: oldCountField
          })

          // Increment new count
          await supabaseClient.rpc('increment_prediction_vote_count', {
            p_location_id: location_id,
            p_demographic_type: demographic_type || 'overall',
            p_demographic_value: demographic_value || null,
            p_count_field: newCountField
          })
        }
        return new Response(JSON.stringify({ success: true, action: 'switched' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Insert new vote
      await supabaseClient
        .from('prediction_votes')
        .insert({
          location_id: location_id || null,
          google_place_id: google_place_id || null,
          user_id: user.id,
          vote_type,
          prediction_source,
          predicted_safety_score,
          user_demographics
        })

      // Increment count
      if (location_id) {
        const countField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
        await supabaseClient.rpc('increment_prediction_vote_count', {
          p_location_id: location_id,
          p_demographic_type: demographic_type || 'overall',
          p_demographic_value: demographic_value || null,
          p_count_field: countField
        })
      }
      return new Response(JSON.stringify({ success: true, action: 'added' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    console.error('Vote prediction error:', error)
    return new Response(JSON.stringify({
      error: error instanceof Error ? error.message : 'Unknown error'
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})