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
    const url = new URL(req.url);
    const token = url.searchParams.get('token');           // 6-digit OTP
    const token_hash = url.searchParams.get('token_hash'); // Secure hash
    const type = url.searchParams.get('type');
    const next = url.searchParams.get('next') ?? 'reset-password';

    console.log('Auth verify request:', { token: !!token, token_hash: !!token_hash, type, next });

    if ((!token && !token_hash) || !type) {
      throw new Error('Missing required parameters');
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const verifyParams: any = { type: type as any };

    // Use token_hash for all magic link verifications (signup, recovery, email_change)
    if (token_hash) {
      verifyParams.token_hash = token_hash;
    } else if (token) {
      // Use token only for OTP codes (6-digit codes)
      verifyParams.token = token;
    }
    // Verify the OTP/token_hash
    const { data, error } = await supabase.auth.verifyOtp(verifyParams);

    if (error) {
      console.error('OTP verification failed:', error);
      throw error;
    }

    console.log('OTP verification successful');

    // Create the redirect URL
    let redirectUrl = `safepath://${next}`;

    // Add session tokens to redirect for seamless login
    if (data.session) {
      const params = new URLSearchParams({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        type: type,
      });
      redirectUrl += `?${params.toString()}`;
    }

    console.log('Redirecting to:', redirectUrl);

    // Return redirect response
    return new Response('', {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': redirectUrl,
      },
    });

  } catch (error) {
    console.error('Auth verification error:', error);

    // Redirect to error/retry page
    const errorUrl = `safepath://forgot-password?error=verification_failed&message=${encodeURIComponent(error.message)}`;

    return new Response('', {
      status: 302,
      headers: {
        ...corsHeaders,
        'Location': errorUrl,
      },
    });
  }
})