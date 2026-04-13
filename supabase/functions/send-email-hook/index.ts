/**
 * Supabase Auth Email Hook - Sends emails via Resend
 * 
 * This Edge Function is called by Supabase Auth whenever an email needs to be sent.
 * It uses Resend's HTTP API instead of SMTP for reliable delivery.
 * 
 * Required environment variable:
 */ import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { Webhook } from 'https://esm.sh/standardwebhooks@1.0.0';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const hookSecret = (Deno.env.get('SEND_EMAIL_HOOK_SECRET') || '').replace('v1,', '');
const RESEND_API_URL = 'https://api.resend.com/emails';
import { emailShell, ctaButton } from '../_shared/email-templates.ts';

serve(async (req) => {
  try {
    const payload = await req.text();
    const headers = Object.fromEntries(req.headers);
    const wh = new Webhook(hookSecret);
    const { user, email_data } = wh.verify(payload, headers);
    const { email_action_type, token, token_hash, redirect_to } = email_data;

    let recipientEmail = user.email;

    if (email_action_type === 'email_change' && user.new_email) {
      recipientEmail = user.new_email;
    }

    let emailContent;
    try {
      emailContent = buildEmailContent(email_action_type, token, token_hash, redirect_to, user);
    } catch (err) {
      console.error('❌ buildEmailContent failed:', err);
      throw err;
    }

    const body = JSON.stringify({
      from: 'TruGuide <noreply@truguide.app>',
      to: [recipientEmail],
      subject: emailContent.subject,
      html: emailContent.html
    });

    const response = await fetch(RESEND_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: body
    });
    const resendResponse = await response.json();
    if (!response.ok) {
      console.error('Resend API error:', resendResponse);
      return new Response(JSON.stringify({
        error: 'Failed to send email',
        details: resendResponse
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
    console.log('Email sent successfully:', resendResponse);
    return new Response(JSON.stringify({
      success: true,
      messageId: resendResponse.id
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error in send-email-hook:', error);
    return new Response(JSON.stringify({
      error: error.message
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
});

function buildEmailContent(actionType, token, token_hash, redirectTo, user) {
  const baseUrl = Deno.env.get('SUPABASE_URL') || 'https://jglobmuqzqzfcwpifocz.supabase.co';
  const tokenToUse = actionType === 'email_change' ? token_hash : token;
  const getNextRoute = (actionType) => {
    switch (actionType) {
      case 'recovery': return 'reset-password';
      case 'signup': return 'welcome';
      case 'email_change': return 'email-change-confirm';
      case 'reauthentication': return 'reauthentication';
      default: return 'reset-password';
    }
  };
  const confirmationUrl = `https://truguide.app/verify?token=${tokenToUse}&token_hash=${token_hash}&type=${actionType}&next=${getNextRoute(actionType)}`; switch (actionType) {
    case 'signup':
      return {
        subject: 'Confirm your TruGuide account',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Welcome to TruGuide! 🎉</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Thank you for joining our community of conscious travelers. Enter this code in the app to confirm your email address:</p>
      <div style="margin:24px 0;padding:24px;background-color:#f5f7fa;border-radius:8px;text-align:center;">
        <p style="margin:0 0 8px 0;color:#607D8B;font-size:13px;letter-spacing:1px;text-transform:uppercase;">Your verification code</p>
        <p style="margin:0;font-size:40px;font-weight:700;color:#2A5C99;letter-spacing:8px;">${token}</p>
      </div>
      <p style="margin:0;color:#607D8B;font-size:13px;text-align:center;">This code expires in 1 hour.</p>
    `, 'If you didn\'t create a TruGuide account, you can safely ignore this email.')
      };

    case 'email_change':
      return {
        subject: 'Verify Your New Email Address',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Verify Your New Email Address</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">You recently requested to update the email address on your TruGuide account. Click below to confirm the change.</p>
      ${ctaButton(confirmationUrl, 'Verify New Email')}
      <p style="margin:16px 0 8px 0;color:#607D8B;font-size:13px;">Or copy this link into your browser:</p>
      <p style="margin:0;padding:12px;background-color:#f5f7fa;border-radius:4px;color:#2A5C99;font-size:12px;word-break:break-all;font-family:monospace;">${confirmationUrl}</p>
    `, 'This link will expire in 24 hours. If you didn\'t request this change, please ignore this email &mdash; your email address will remain unchanged.')
      };
    case 'recovery':
      return {
        subject: 'Reset your TruGuide password',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Reset Your Password 🔑</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">We received a request to reset the password for your TruGuide account.</p>
      ${ctaButton(confirmationUrl, 'Reset Password')}
      <p style="margin:16px 0 8px 0;color:#607D8B;font-size:13px;">Or copy this link into your browser:</p>
      <p style="margin:0 0 24px 0;padding:12px;background-color:#f5f7fa;border-radius:4px;color:#2A5C99;font-size:12px;word-break:break-all;font-family:monospace;">${confirmationUrl}</p>
      <div style="padding:14px 16px;background-color:#fff8f8;border-left:3px solid #EF5350;border-radius:4px;">
        <p style="margin:0;color:#c62828;font-size:13px;line-height:1.6;"><strong>Security notice:</strong> If you didn't request this, you can safely ignore this email. Your password will remain unchanged.</p>
      </div>
    `, 'This password reset link will expire in 1 hour.')
      };
    case 'magiclink':
      return {
        subject: 'Your TruGuide magic link',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Your Sign-In Link ✨</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Click the button below to sign in to your TruGuide account. No password needed.</p>
      ${ctaButton(confirmationUrl, 'Sign In to TruGuide')}
      <p style="margin:16px 0 8px 0;color:#607D8B;font-size:13px;">Or copy this link into your browser:</p>
      <p style="margin:0;padding:12px;background-color:#f5f7fa;border-radius:4px;color:#2A5C99;font-size:12px;word-break:break-all;font-family:monospace;">${confirmationUrl}</p>
    `, 'This link will expire in 1 hour and can only be used once. If you didn\'t request this, you can safely ignore this email.')
      };
    case 'reauthentication':
      return {
        subject: 'Confirm your identity',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Confirm It's You</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">For your security, we need to verify your identity before you can proceed with this action.</p>
      ${ctaButton(confirmationUrl, 'Confirm My Identity')}
      <p style="margin:16px 0 8px 0;color:#607D8B;font-size:13px;">Or copy this link into your browser:</p>
      <p style="margin:0;padding:12px;background-color:#f5f7fa;border-radius:4px;color:#2A5C99;font-size:12px;word-break:break-all;font-family:monospace;">${confirmationUrl}</p>
    `, 'If you didn\'t request this, please ignore this email and consider changing your password.')
      };
    default:
      return {
        subject: 'TruGuide notification',
        html: emailShell(`
      <h2 style="margin:0 0 16px 0;color:#2C3E50;font-size:22px;font-weight:600;">Action Required</h2>
      <p style="margin:0 0 16px 0;color:#4a4a4a;font-size:15px;line-height:1.6;">Click the button below to continue.</p>
      ${ctaButton(confirmationUrl, 'Continue')}
      <p style="margin:16px 0 8px 0;color:#607D8B;font-size:13px;">Or copy this link into your browser:</p>
      <p style="margin:0;padding:12px;background-color:#f5f7fa;border-radius:4px;color:#2A5C99;font-size:12px;word-break:break-all;font-family:monospace;">${confirmationUrl}</p>
    `, 'If you didn\'t expect this email, you can safely ignore it.')
      };
  }
}
