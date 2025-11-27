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
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const { email, firstName, recaptchaToken } = await req.json();

    // 1. Verify reCAPTCHA token
    if (RECAPTCHA_SECRET_KEY) {
      const isHuman = await verifyRecaptcha(recaptchaToken);
      if (!isHuman) {
        return jsonResponse({ error: 'reCAPTCHA verification failed. Please try again.' }, 400);
      }
    }

    // 2. Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email)) {
      return jsonResponse({ error: 'Invalid email format' }, 400);
    }

    // Validate first name (optional field, but if provided must be valid)
    if (firstName && (firstName.trim().length < 1 || firstName.trim().length > 50)) {
      return jsonResponse({ error: 'First name must be between 1 and 50 characters' }, 400);
    }

    // 3. Check for disposable email domains
    const domain = email.split('@')[1].toLowerCase();
    if (DISPOSABLE_DOMAINS.includes(domain)) {
      return jsonResponse({ error: 'Disposable email addresses are not allowed' }, 400);
    }

    // 4. Rate limiting by IP
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown';
    const rateLimit = await checkRateLimit(ip);

    if (!rateLimit.allowed) {
      return jsonResponse({
        error: 'Too many signups. Please try again later.',
        retryAfter: rateLimit.retryAfter
      }, 429);
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
      }, 200);
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
      return jsonResponse({ error: 'Failed to save email' }, 500);
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
    }, 201);

  } catch (error) {
    console.error('Website signup error:', error);
    return jsonResponse({ error: 'Internal server error' }, 500);
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
      from: 'SafePath <hello@mail.safepathgo.com>',
      to: [email],
      subject: '🎉 Welcome to SafePath - Early Access',
      html: buildWelcomeEmail(firstName)
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(`Resend API error: ${JSON.stringify(error)}`);
  }
}

function buildWelcomeEmail(firstName?: string): string {
  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #2A5C99 0%, #1A4679 50%, #5FB878 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center;">
                  <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold;">🛡️ SafePath</h1>
                  <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px;">Navigate Safely. Belong Everywhere.</p>
                </td>
              </tr>
              <!-- Content -->
              <tr>
                <td style="padding: 40px;">
                  <h2 style="margin: 0 0 20px 0; color: #2A5C99; font-size: 24px;">Welcome to SafePath ${firstName ? ', ' + firstName : ''}! 🎉</h2>
                  <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                    Thank you for joining our community of conscious travelers! You're now on the early access list for the first GPS app that prioritizes safety for everyone.
                  </p>
                  
                  <div style="background-color: #F5F7FA; padding: 20px; border-radius: 8px; margin: 30px 0;">
                    <h3 style="margin: 0 0 15px 0; color: #2A5C99; font-size: 18px;">What's Next?</h3>
                    <ul style="margin: 0; padding-left: 20px; color: #4a4a4a; line-height: 1.8;">
                      <li>📱 You'll be first to know when we launch on iOS</li>
                      <li>🎁 Early adopters get premium features free for 3 months</li>
                      <li>💬 Join our community and help shape SafePath</li>
                      <li>🗺️ Get exclusive safety insights and travel tips</li>
                    </ul>
                  </div>

                  <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">
                    We're working hard to launch soon. In the meantime, follow us on social media for updates and behind-the-scenes content.
                  </p>

                  <div style="text-align: center; margin: 30px 0;">
                    <a href="https://safepathgo.com" style="display: inline-block; padding: 14px 30px; background: linear-gradient(135deg, #2A5C99 0%, #1A4679 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600;">Visit Our Website</a>
                  </div>
                </td>
              </tr>
              <!-- Footer -->
              <tr>
                <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                  <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px;">
                    You're receiving this because you signed up at safepathgo.com
                  </p>
                  <p style="margin: 0; color: #9a9a9a; font-size: 12px;">
                    © 2025 SafePath. All rights reserved.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
}

function jsonResponse(data: any, status: number) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
    },
  });
}