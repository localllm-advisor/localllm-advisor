/**
 * Supabase Edge Function: send-enterprise-lead-email
 *
 * Sends email notification to info@localllm-advisor.com when a new
 * enterprise lead submits the contact form, plus an auto-reply to the lead.
 *
 * Environment variables needed (set in Supabase Dashboard → Edge Functions → Secrets):
 *   ZOHO_SMTP_USER=info@localllm-advisor.com
 *   ZOHO_SMTP_PASS=<your Zoho app-specific password>
 *   RESEND_API_KEY=<optional: Resend.com API key as alternative to Zoho>
 */

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';

const CONTACT_EMAIL = 'info@localllm-advisor.com';
const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';

const AUTO_REPLY_BODY = (name: string) => `Dear ${name},

Thank you for reaching out to LocalLLM Advisor Enterprise Solutions.

We have received your inquiry and our team is reviewing your requirements. Given the details you've provided, we'll prepare a tailored response addressing your specific needs for on-premise LLM deployment.

What happens next:
- Our solutions team will review your technical requirements within 1-2 business days
- You'll receive a personalized assessment based on your infrastructure and use case
- We'll schedule a consultation call if needed to discuss your deployment strategy

In the meantime, feel free to explore our free tools:
- Fleet Sizing Calculator — estimate your hardware requirements
- TCO Comparison Tool — compare on-prem vs. cloud costs

If you have any urgent questions, don't hesitate to reply to this email.

Best regards,
The LocalLLM Advisor Team
info@localllm-advisor.com`;

serve(async (req) => {
  try {
    const body = await req.json();
    const {
      companyName,
      contactName,
      email,
      industry,
      companySize,
      jobTitle,
      primaryUseCase,
      deployment,
      budget,
      timeline,
      message,
    } = body;

    // Build notification email body
    const notificationBody = [
      `New Enterprise Lead`,
      `===================`,
      ``,
      `Company: ${companyName}`,
      `Contact: ${contactName}`,
      `Email: ${email}`,
      jobTitle ? `Title: ${jobTitle}` : '',
      `Industry: ${industry}`,
      companySize ? `Size: ${companySize}` : '',
      primaryUseCase ? `Use Case: ${primaryUseCase}` : '',
      deployment ? `Deployment: ${deployment}` : '',
      budget ? `Budget: ${budget}` : '',
      timeline ? `Timeline: ${timeline}` : '',
      message ? `\nMessage:\n${message}` : '',
    ].filter(Boolean).join('\n');

    // Send via Resend (recommended for serverless)
    if (RESEND_API_KEY) {
      // 1. Notification to us
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
          subject: `[Enterprise Lead] ${companyName} — ${industry}`,
          text: notificationBody,
        }),
      });

      // 2. Auto-reply to lead
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: `LocalLLM Advisor <${CONTACT_EMAIL}>`,
          to: [email],
          subject: 'Thank you for your interest in LocalLLM Advisor Enterprise',
          text: AUTO_REPLY_BODY(contactName),
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
