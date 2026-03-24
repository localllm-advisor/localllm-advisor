/**
 * Supabase Edge Function: send-contact-email
 *
 * Handles general contact form submissions (support, general, complaint).
 * Sends notification to info@localllm-advisor.com + auto-reply to sender.
 *
 * Environment variables needed (set in Supabase Dashboard → Edge Functions → Secrets):
 *   RESEND_API_KEY=<your Resend.com API key>
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CONTACT_EMAIL = 'info@localllm-advisor.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

serve(async (req) => {
  try {
    const body = await req.json();
    const { name, email, type, subject, message, company, autoReplyTemplate } = body;

    if (!RESEND_API_KEY) {
      return new Response(
        JSON.stringify({ error: 'Email service not configured' }),
        { status: 503, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const typeLabel: Record<string, string> = {
      enterprise: 'Enterprise Inquiry',
      general: 'General Contact',
      support: 'Support Request',
      complaint: 'Feedback / Complaint',
    };

    // 1. Notification to us
    const notificationBody = [
      `Type: ${typeLabel[type] || type}`,
      `Name: ${name}`,
      `Email: ${email}`,
      company ? `Company: ${company}` : '',
      `Subject: ${subject}`,
      ``,
      `Message:`,
      message,
    ].filter(Boolean).join('\n');

    await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: `LocalLLM Advisor <${CONTACT_EMAIL}>`,
        to: [CONTACT_EMAIL],
        reply_to: email,
        subject: `[${typeLabel[type] || 'Contact'}] ${subject}`,
        text: notificationBody,
      }),
    });

    // 2. Auto-reply to sender
    if (autoReplyTemplate) {
      const replyBody = autoReplyTemplate.body.replace(/\{\{name\}\}/g, name);
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `LocalLLM Advisor <${CONTACT_EMAIL}>`,
          to: [email],
          subject: autoReplyTemplate.subject,
          text: replyBody,
        }),
      });
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Edge function error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
});
