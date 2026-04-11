import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const RECAPTCHA_SECRET_KEY = Deno.env.get('RECAPTCHA_SECRET_KEY');

// Create Supabase client with service role (bypasses RLS for rate limiting table)
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Common disposable email domains
const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'maildrop.cc', 'trashmail.com', 'yopmail.com',
  'temp-mail.org', 'getnada.com', 'fakeinbox.com', 'sharklasers.com'
];

serve(async (req) => {
  // Handle CORS
  const origin = req.headers.get('Origin') ?? '';
  const allowedOrigin = origin === 'https://truguide.app' ? origin : 'null';

  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': allowedOrigin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Vary': 'Origin',
      },
    });
  }

  try {
    const { email, firstName, recaptchaToken } = await req.json();

    // 1. Verify reCAPTCHA token
    if (RECAPTCHA_SECRET_KEY) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return jsonResponse({ error: 'reCAPTCHA verification failed. Please try again.' }, 400, allowedOrigin);
      }
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return jsonResponse({ error: 'Invalid email format' }, 400, allowedOrigin);
    }

    // Validate first name (optional field, but if provided must be valid)
    if (firstName && (firstName.trim().length < 1 || firstName.trim().length > 50)) {
      return jsonResponse({ error: 'First name must be between 1 and 50 characters' }, 400, allowedOrigin);
    }

    // 3. Check for disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return jsonResponse({ error: 'Disposable email addresses are not allowed' }, 400, allowedOrigin);
    }

    // 4. Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return jsonResponse({
        error: 'Too many signups. Please try again later.',
        retryAfter: rateLimit.retryAfter
      }, 429, allowedOrigin);
    }

    // 5. Check if email already exists
    const { data: existingEmail } = await supabase
      .from('email_signups')
      .select('email')
      .eq('email', email.toLowerCase())
      .single();

    if (existingEmail) {
      // Don't reveal if email exists (security), just say success
      return jsonResponse({
        success: true,
        message: 'Thank you for signing up!'
      }, 200, allowedOrigin);
    }

    // 6. Insert email into database
    const { error: insertError } = await supabase
      .from('email_signups')
      .insert({
        email: email.toLowerCase(),
        first_name: firstName.trim(),
        source: 'website',
        ip_address: ip
      });

    if (insertError) {
      console.error('Database insert error:', insertError);
      return jsonResponse({ error: 'Failed to save email' }, 500, allowedOrigin);
    }

    // 7. Send welcome email via Resend
    try {
      await sendWelcomeEmail(email, firstName);
    } catch (emailError) {
      // Log but don't fail - email is already saved
      console.error('Failed to send welcome email:', emailError);
    }

    // 8. Record rate limit
    await recordRateLimit(ip);

    return jsonResponse({
      success: true,
      message: 'Thank you for signing up! Check your email for updates.'
    }, 201, allowedOrigin);

  } catch (error) {
    console.error('Website signup error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500, allowedOrigin);
  }
});

// Verify reCAPTCHA token with Google
async function verifyRecaptcha(token: string): Promise<boolean> {
  if (!token || !RECAPTCHA_SECRET_KEY) {
    return false;
  }

  try {
    const response = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: `secret=${RECAPTCHA_SECRET_KEY}&response=${token}`,
    });

    const data = await response.json();

    // reCAPTCHA v3 returns a score (0.0 - 1.0)
    // 0.0 = very likely a bot, 1.0 = very likely a human
    // We'll accept scores of 0.5 or higher
    return data.success === true && data.score >= 0.5;
  } catch (error) {
    console.error('reCAPTCHA verification error:', error);
    return false; // Fail closed - reject on error
  }
}

// Rate limiting: max 3 signups per IP per hour
async function checkRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from('website_signup_rate_limits')
    .select('created_at')
    .eq('ip_address', ip)
    .gte('created_at', oneHourAgo);

  if (error) {
    console.error('Rate limit check error:', error);
    return { allowed: true }; // Allow on error (fail open)
  }

  const count = data?.length || 0;

  if (count >= 3) {
    // Calculate retry after (time until oldest entry expires)
    const oldestTimestamp = new Date(data![0].created_at).getTime();
    const retryAfter = Math.ceil((oldestTimestamp + 60 * 60 * 1000 - Date.now()) / 1000);
    return { allowed: false, retryAfter };
  }

  return { allowed: true };
}

async function recordRateLimit(ip: string): Promise<void> {
  await supabase
    .from('website_signup_rate_limits')
    .insert({ ip_address: ip });
}

async function sendWelcomeEmail(email: string, firstName: string): Promise<void> {
  if (!RESEND_API_KEY) {
    console.warn('RESEND_API_KEY not set, skipping email');
    return;
  }

  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'TruGuide <noreply@truguide.app>>',
      to: [email],
      subject: '🎉 Welcome to TruGuide - Early Access',
      html: buildWelcomeEmail(firstName)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
}

function buildWelcomeEmail(firstName?: string): string {
  const name = firstName ? firstName : 'there';
  return emailShell(`
    <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Hi ${name}, you're on the list! 🎉</h2>
    <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Thank you for signing up for early access to TruGuide — the first GPS app that shows you how safe a place is based on who you are.</p>
    <p style="margin:0 0 24px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">We'll be in touch as soon as your spot is ready. In the meantime, feel free to share TruGuide with anyone who could use safer, more inclusive navigation.</p>
    <div style="padding:16px;background-color:#f5f7fa;border-radius:4px;border-left:3px solid #2A5C99;">
      <p style="margin:0;color:#2C3E50;font-size:14px;line-height:1.6;"><strong>What to expect:</strong> Personalized safety ratings, demographic-aware route planning, and a community of conscious travelers.</p>
    </div>
  `, 'You\'re receiving this because you signed up at truguide.app. If this wasn\'t you, you can safely ignore this email.');
}

function jsonResponse(data: any, status: number, allowedOrigin: string) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': allowedOrigin,
      'Vary': 'Origin',
    },
  });
}