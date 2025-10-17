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
    console.log('1. Function started')

    const authHeader = req.headers.get('Authorization')
    console.log('2. Auth header:', authHeader ? 'EXISTS' : 'MISSING')

    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'No authorization header' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log('3. Creating supabase client')
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    console.log('4. Extracting token')
    const token = authHeader.replace('Bearer ', '')
    console.log('5. Token length:', token.length)

    console.log('6. Calling getUser')
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)

    console.log('7. getUser result - user:', user ? 'EXISTS' : 'NULL', 'error:', authError?.message || 'NONE')

    if (authError || !user) {
      return new Response(JSON.stringify({
        error: 'Unauthorized',
        details: authError?.message,
        debug: 'getUser failed'
      }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ success: true, user_id: user.id, message: 'Auth works!' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  })