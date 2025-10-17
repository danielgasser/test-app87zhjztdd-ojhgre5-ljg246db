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

    const { review_id, vote_type } = await req.json()

    if (!review_id || !vote_type || !['helpful', 'unhelpful'].includes(vote_type)) {
      return new Response(JSON.stringify({ error: 'Invalid parameters' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Check if user already voted
    const { data: existingVote } = await supabaseClient
      .from('review_votes')
      .select('*')
      .eq('review_id', review_id)
      .eq('user_id', user.id)
      .single()

    if (existingVote) {
      if (existingVote.vote_type !== vote_type) {
        // Switch vote
        await supabaseClient
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id)

        const oldCountField = existingVote.vote_type === 'helpful' ? 'helpful_count' : 'unhelpful_count'
        await supabaseClient.rpc('decrement_review_count', {
          review_id,
          count_field: oldCountField
        })

        await supabaseClient
          .from('review_votes')
          .insert({ review_id, user_id: user.id, vote_type })

        const newCountField = vote_type === 'helpful' ? 'helpful_count' : 'unhelpful_count'
        await supabaseClient.rpc('increment_review_count', {
          review_id,
          count_field: newCountField
        })

        return new Response(JSON.stringify({ success: true, action: 'updated' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      } else {
        // Toggle off
        await supabaseClient
          .from('review_votes')
          .delete()
          .eq('id', existingVote.id)

        const countField = vote_type === 'helpful' ? 'helpful_count' : 'unhelpful_count'
        await supabaseClient.rpc('decrement_review_count', {
          review_id,
          count_field: countField
        })

        return new Response(JSON.stringify({ success: true, action: 'removed' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
      }
    } else {
      // Add new vote
      await supabaseClient
        .from('review_votes')
        .insert({ review_id, user_id: user.id, vote_type })

      const countField = vote_type === 'helpful' ? 'helpful_count' : 'unhelpful_count'
      await supabaseClient.rpc('increment_review_count', {
        review_id,
        count_field: countField
      })

      return new Response(JSON.stringify({ success: true, action: 'added' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})