/**
 * Supabase Auth Email Hook - Sends emails via Resend
 * 
 * This Edge Function is called by Supabase Auth whenever an email needs to be sent.
 * It uses Resend's HTTP API instead of SMTP for reliable delivery.
 * 
 * Required environment variable:
 * - RESEND_API_KEY: Your Resend API key (re_...)
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '').replace('v1,whsec_', '');
const RESEND_API_URL = 'https://api.resend.com/emails';
serve(async (req) => {
  try {
    // Verify JWT (basic security check)
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    // This will throw if verification fails
    const { user, email_data } = wh.verify(payload, headers);
    const { email_action_type, token, redirect_to } = email_data;

    console.log('📧 Action type:', email_action_type) // ← ADD THIS
    console.log('👤 User email:', user.email) // ← ADD THIS // Build email content based on action type
    const emailContent = buildEmailContent(email_action_type, token, redirect_to, user);
    // Send email via Resend
    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'SafePath <noreply@mail.safepathgo.com>',
        to: [
          user.email
        ],
        subject: emailContent.subject,
        html: emailContent.html
      })
    });
    const resendResponse = await response.json();
    if (!response.ok) {
      console.error('Resend API error:', resendResponse);
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: resendResponse
      }), {
        status: 500,
        headers: {
          'Content-Type': 'application/json'
        }
      });
    }
    console.log('Email sent successfully:', resendResponse);
    return new Response(JSON.stringify({
      success: true,
      messageId: resendResponse.id
    }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in send-email-hook:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json'
      }
    });
  }
});
function buildEmailContent(actionType, token, redirectTo, user) {
  const baseUrl = Deno.env.get('SUPABASE_URL') || 'https://jglobmuqzqzfcwpifocz.supabase.co';
  const confirmationUrl = `${baseUrl}/auth/v1/verify?token=${token}&type=${actionType}&redirect_to=${encodeURIComponent(redirectTo)}`;
  switch (actionType) {
    case 'signup':
      return {
        subject: 'Confirm your SafePath account',
        html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
          <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Welcome to SafePath! 🎉</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Thank you for joining our community of conscious travelers. We're excited to help you navigate the world safely and inclusively.</p>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">To get started, please confirm your email address by clicking the button below:</p>
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Confirm Your Email</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 20px 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; color: #667eea; font-size: 13px; word-break: break-all; font-family: monospace;">${confirmationUrl}</p>
                      <!-- Divider -->
                      <div style="margin: 30px 0; height: 1px; background-color: #e5e5e5;"></div>
                      <!-- What's Next Section -->
                      <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">What's Next?</h3>
                      <ul style="margin: 0 0 20px 0; padding-left: 20px; color: #4a4a4a; font-size: 15px; line-height: 1.8;">
                        <li>Complete your demographic profile for personalized recommendations</li>
                        <li>Explore safety ratings for locations you care about</li>
                        <li>Share your experiences to help others travel safely</li>
                      </ul>
                      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.6; font-style: italic;">This confirmation link will expire in 24 hours for security purposes.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">If you didn't create a SafePath account, you can safely ignore this email.</p>
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
    case 'email_change':
      return {
        subject: 'Verify Your New Email Address',
        html: `
         <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
         <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Verify Your New Email Address 📧</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">You recently requested to update your email address for your SafePath account.</p>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">To complete this update, please verify your new email address by clicking the button below:</p>
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Verify New Email</a>
                          </td>
                        </tr>
                      </table>
                      <!-- Divider -->
                      <div style="margin: 30px 0; height: 1px; background-color: #e5e5e5;"></div>
                      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.6; font-style: italic;">This link will expire in 24 hours.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">If you didn't request this change, please ignore this email and your email address will remain unchanged.</p>
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
    case 'recovery':
      return {
        subject: 'Reset your SafePath password',
        html: `
         <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
         <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Reset Your Password 🔑</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">We received a request to reset the password for your SafePath account.</p>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Click the button below to create a new password:</p>
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Reset Password</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 20px 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; color: #667eea; font-size: 13px; word-break: break-all; font-family: monospace;">${confirmationUrl}</p>
                      <!-- Divider -->
                      <div style="margin: 30px 0; height: 1px; background-color: #e5e5e5;"></div>
                      <!-- Security Notice -->
                      <div style="padding: 20px; background-color: #ffebee; border-left: 4px solid #f44336; border-radius: 6px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #c62828; font-size: 14px; line-height: 1.6;"><strong>⚠️ Security Alert:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged. Consider changing your password if you're concerned about unauthorized access.</p>
                      </div>
                      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.6; font-style: italic;">This password reset link will expire in 1 hour for security purposes.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">If you didn't request a password reset, you can safely ignore this email.</p>
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
    case 'magiclink':
      return {
        subject: 'Your SafePath magic link',
        html: `
         <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
         <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Your Magic Link is Here! ✨</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Click the button below to sign in to your SafePath account. No password needed!</p>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">This link is unique to you and will sign you in automatically:</p>
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Sign In to SafePath</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 20px 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; color: #667eea; font-size: 13px; word-break: break-all; font-family: monospace;">${confirmationUrl}</p>
                      <!-- Divider -->
                      <div style="margin: 30px 0; height: 1px; background-color: #e5e5e5;"></div>
                      <!-- Security Notice -->
                      <div style="padding: 20px; background-color: #fff3cd; border-left: 4px solid #ffc107; border-radius: 6px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #856404; font-size: 14px; line-height: 1.6;"><strong>🔒 Security Notice:</strong> This magic link will expire in 1 hour and can only be used once. If you didn't request this link, please ignore this email.</p>
                      </div>
                      <p style="margin: 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">For your security, we recommend not sharing this link with anyone else.</p>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">If you didn't request this magic link, you can safely ignore this email.</p>
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
    case 'reauthentication':
      return {
        subject: 'Confirm your identity',
        html: `
         <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
         <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <!-- Header with Logo/Brand -->
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <!-- Main Content -->
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">Confirm It's You 👤</h2>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">For your security, we need to verify your identity before you can proceed with this sensitive action.</p>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Click the button below to confirm your identity:</p>
                      <!-- CTA Button -->
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Verify My Identity</a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 0 0 20px 0; color: #6a6a6a; font-size: 14px; line-height: 1.6;">Or copy and paste this link into your browser:</p>
                      <p style="margin: 0 0 30px 0; padding: 15px; background-color: #f8f9fa; border-radius: 6px; color: #667eea; font-size: 13px; word-break: break-all; font-family: monospace;">${confirmationUrl}</p>
                      <!-- Divider -->
                      <div style="margin: 30px 0; height: 1px; background-color: #e5e5e5;"></div>
                      <!-- Info Section -->
                      <h3 style="margin: 0 0 15px 0; color: #1a1a1a; font-size: 18px; font-weight: 600;">Why am I seeing this?</h3>
                      <p style="margin: 0 0 20px 0; color: #4a4a4a; font-size: 15px; line-height: 1.8;">We require additional verification when you're performing sensitive actions like changing your password, updating your email, or modifying security settings. This helps keep your account secure.</p>
                      <!-- Security Notice -->
                      <div style="padding: 20px; background-color: #e3f2fd; border-left: 4px solid #2196f3; border-radius: 6px; margin-bottom: 20px;">
                        <p style="margin: 0; color: #1565c0; font-size: 14px; line-height: 1.6;"><strong>🔒 Security Tip:</strong> This verification link will expire in 15 minutes. If you didn't attempt any sensitive actions, please ignore this email and consider changing your password.</p>
                      </div>
                    </td>
                  </tr>
                  <!-- Footer -->
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0 0 10px 0; color: #6a6a6a; font-size: 13px; line-height: 1.6;">If you didn't attempt this action, you can safely ignore this email.</p>
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
    default:
      return {
        subject: 'SafePath notification',
        html: `
         <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body>
         <!-- Wrapper -->
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f5f5f5; padding: 40px 20px;">
            <tr>
              <td align="center">
                <!-- Email Container -->
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 40px 30px 40px; border-radius: 12px 12px 0 0; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 32px; font-weight: bold; letter-spacing: -0.5px;">🛡️ SafePath</h1>
                      <p style="margin: 10px 0 0 0; color: rgba(255,255,255,0.9); font-size: 16px; font-weight: 500;">Travel with Confidence</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <h2 style="margin: 0 0 20px 0; color: #1a1a1a; font-size: 24px; font-weight: 600;">SafePath Notification</h2>
                      <p style="margin: 0 0 30px 0; color: #4a4a4a; font-size: 16px; line-height: 1.6;">Click the button below to continue:</p>
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
                        <tr>
                          <td align="center" style="padding: 10px 0 30px 0;">
                            <a href="${confirmationUrl}" style="display: inline-block; padding: 16px 40px; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 600; box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);">Continue</a>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 30px 40px; background-color: #f8f9fa; border-radius: 0 0 12px 12px; text-align: center;">
                      <p style="margin: 0; color: #9a9a9a; font-size: 12px;">© 2025 SafePath. All rights reserved.</p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
          </body>
          </html> `
      };
  }
}
