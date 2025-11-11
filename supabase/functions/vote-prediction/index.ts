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
      vote_type,
      prediction_source,
      predicted_safety_score,
      demographic_type,
      demographic_value,
      user_demographics
    } = await req.json()

    if (!location_id || !vote_type || !prediction_source || !predicted_safety_score) {
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

    // Check if user already voted
    const { data: existingVote } = await supabaseClient
      .from('prediction_votes')
      .select('*')
      .eq('location_id', location_id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      // User is changing or removing vote
      if (existingVote.vote_type === vote_type) {
        // Remove vote (toggle off)
        await supabaseClient
          .from('prediction_votes')
          .delete()
          .eq('location_id', location_id)
          .eq('user_id', user.id)

        // Decrement count
        const countField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
        await supabaseClient.rpc('decrement_prediction_vote_count', {
          p_location_id: location_id,
          p_demographic_type: demographic_type || 'overall',
          p_demographic_value: demographic_value || null,
          p_count_field: countField
        })

        return new Response(JSON.stringify({ success: true, action: 'removed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Switch vote type
        const oldCountField = existingVote.vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
        const newCountField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'

        // Update vote
        await supabaseClient
          .from('prediction_votes')
          .update({
            vote_type,
            prediction_source,
            predicted_safety_score,
            user_demographics,
            updated_at: new Date().toISOString()
          })
          .eq('location_id', location_id)
          .eq('user_id', user.id)

        // Decrement old count
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

        return new Response(JSON.stringify({ success: true, action: 'switched' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Insert new vote
      await supabaseClient
        .from('prediction_votes')
        .insert({
          location_id,
          user_id: user.id,
          vote_type,
          prediction_source,
          predicted_safety_score,
          user_demographics
        })

      // Increment count
      const countField = vote_type === 'accurate' ? 'accurate_count' : 'inaccurate_count'
      await supabaseClient.rpc('increment_prediction_vote_count', {
        p_location_id: location_id,
        p_demographic_type: demographic_type || 'overall',
        p_demographic_value: demographic_value || null,
        p_count_field: countField
      })

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