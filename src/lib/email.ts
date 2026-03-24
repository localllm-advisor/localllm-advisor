/**
 * Email Service for LocalLLM Advisor
 *
 * Architecture:
 * - Primary: Web3Forms API (free, works with static sites, no backend needed)
 * - Secondary: Supabase Edge Function (for auto-replies and advanced workflows)
 * - Fallback: mailto: link (graceful degradation)
 *
 * Setup:
 * 1. Go to https://web3forms.com → Get a free Access Key
 * 2. Set NEXT_PUBLIC_WEB3FORMS_KEY in .env.local
 * 3. Web3Forms forwards submissions to info@localllm-advisor.com
 */

import type { EnterpriseLeadFormData } from './types';
import { supabase, isSupabaseConfigured } from './supabase';

// ============================================
// Configuration
// ============================================

const WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const WEB3FORMS_KEY = process.env.NEXT_PUBLIC_WEB3FORMS_KEY || '';
const CONTACT_EMAIL = 'info@localllm-advisor.com';

export const isEmailConfigured = !!WEB3FORMS_KEY;

// ============================================
// Contact Form Types
// ============================================

export type ContactType = 'enterprise' | 'general' | 'support' | 'complaint';

export interface ContactFormData {
  name: string;
  email: string;
  type: ContactType;
  subject: string;
  message: string;
  company?: string;
}

// ============================================
// Auto-Reply Templates
// ============================================

const AUTO_REPLY_TEMPLATES: Record<ContactType, { subject: string; body: string }> = {
  enterprise: {
    subject: 'Thank you for your interest in LocalLLM Advisor Enterprise',
    body: `Dear {{name}},

Thank you for reaching out to LocalLLM Advisor Enterprise Solutions.

We have received your inquiry and our team is reviewing your requirements. Given the details you've provided, we'll prepare a tailored response addressing your specific needs for on-premise LLM deployment.

What happens next:
• Our solutions team will review your technical requirements within 1-2 business days
• You'll receive a personalized assessment based on your infrastructure and use case
• We'll schedule a consultation call if needed to discuss your deployment strategy

In the meantime, feel free to explore our free tools:
• Fleet Sizing Calculator — estimate your hardware requirements
• TCO Comparison Tool — compare on-prem vs. cloud costs

If you have any urgent questions, don't hesitate to reply to this email.

Best regards,
The LocalLLM Advisor Team
info@localllm-advisor.com`,
  },

  general: {
    subject: 'Thanks for reaching out to LocalLLM Advisor!',
    body: `Hi {{name}},

Thank you for getting in touch with us! We truly appreciate your interest in LocalLLM Advisor.

We've received your message and will get back to you as soon as possible, typically within 1-2 business days.

LocalLLM Advisor is a community-driven project dedicated to making local AI accessible to everyone. Whether you're looking to contribute, collaborate, or just share ideas — we'd love to hear from you.

Here are some ways to stay connected:
• Explore our tools at localllm-advisor.com
• Check out our Enterprise solutions for team deployments
• Share your benchmark results with the community

Thank you for being part of the local AI movement!

Warm regards,
The LocalLLM Advisor Team
info@localllm-advisor.com`,
  },

  support: {
    subject: 'We received your support request — LocalLLM Advisor',
    body: `Hi {{name}},

Thank you for reaching out to LocalLLM Advisor support.

We've received your message and our team will review it promptly. We aim to respond to all support inquiries within 24-48 hours.

While you wait, here are some resources that might help:
• FAQ page — answers to the most common questions
• Methodology page — how our calculations and recommendations work
• Enterprise page — for team and business deployment needs

If your issue is urgent, please reply to this email with "URGENT" in the subject line and we'll prioritize your request.

We're committed to providing you with the best possible experience.

Kind regards,
The LocalLLM Advisor Support Team
info@localllm-advisor.com`,
  },

  complaint: {
    subject: 'Your feedback is important to us — LocalLLM Advisor',
    body: `Dear {{name}},

Thank you for taking the time to share your feedback with us. We take every concern seriously and appreciate your honesty — it helps us improve.

Your message has been flagged as a priority item and will be reviewed by our team within 24 hours. We are committed to resolving any issues and ensuring your experience with LocalLLM Advisor meets your expectations.

What you can expect:
• A personal response from our team within 24 hours
• A clear explanation of any steps we're taking to address your concern
• Follow-up communication to ensure satisfaction

Your trust matters to us, and we want to make things right.

Sincerely,
The LocalLLM Advisor Team
info@localllm-advisor.com`,
  },
};

// ============================================
// Email Sending Functions
// ============================================

/**
 * Submit a general contact form via Web3Forms.
 * Web3Forms forwards the email to info@localllm-advisor.com.
 */
export async function submitContactForm(
  data: ContactFormData
): Promise<{ success: boolean; error?: string }> {
  // Try Web3Forms first (works with static sites)
  if (WEB3FORMS_KEY) {
    try {
      const typeLabel = {
        enterprise: 'Enterprise Inquiry',
        general: 'General Contact',
        support: 'Support Request',
        complaint: 'Feedback / Complaint',
      }[data.type];

      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          botcheck: '',
          subject: `[${typeLabel}] ${data.subject}`,
          from_name: data.name,
          replyto: data.email,
          name: data.name,
          email: data.email,
          company: data.company || 'N/A',
          type: typeLabel,
          message: data.message,
          // Web3Forms auto-reply feature
          autoreply: {
            enabled: true,
            subject: AUTO_REPLY_TEMPLATES[data.type].subject,
            message: AUTO_REPLY_TEMPLATES[data.type].body.replace(/\{\{name\}\}/g, data.name),
            from: `LocalLLM Advisor <${CONTACT_EMAIL}>`,
          },
        }),
      });

      const result = await response.json();
      if (result.success) {
        return { success: true };
      }
      return { success: false, error: result.message || 'Form submission failed' };
    } catch (err) {
      console.error('Web3Forms submission error:', err);
      // Fall through to Supabase
    }
  }

  // Fallback: Supabase Edge Function
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase.functions.invoke('send-contact-email', {
        body: {
          ...data,
          autoReplyTemplate: AUTO_REPLY_TEMPLATES[data.type],
        },
      });
      if (!error) return { success: true };
      console.warn('Supabase email fallback failed:', error.message);
    } catch {
      console.warn('Supabase Edge Function unavailable');
    }
  }

  return {
    success: false,
    error: `Unable to send your message right now. Please email us directly at ${CONTACT_EMAIL}`,
  };
}

/**
 * Submit enterprise lead form.
 * Stores in Supabase (if configured) + sends notification + auto-reply.
 */
export async function submitEnterpriseLeadWithEmail(
  formData: EnterpriseLeadFormData
): Promise<{ success: boolean; error?: string }> {
  // 1. Store in Supabase (if configured)
  if (isSupabaseConfigured && supabase) {
    try {
      const { error } = await supabase
        .from('enterprise_leads')
        .insert({
          company_name: formData.companyName,
          contact_name: formData.contactName,
          email: formData.email,
          industry: formData.industry,
          company_size: formData.companySize || null,
          job_title: formData.jobTitle || null,
          phone: formData.phone || null,
          country: formData.country || null,
          primary_use_case: formData.primaryUseCase || null,
          use_case_description: formData.useCaseDescription || null,
          concurrent_users: formData.concurrentUsers || null,
          deployment: formData.deployment || null,
          existing_hardware: formData.existingHardware || null,
          compliance_requirements: formData.complianceRequirements || [],
          model_preferences: formData.modelPreferences || null,
          budget: formData.budget || null,
          timeline: formData.timeline || null,
          message: formData.message || null,
          referral_source: formData.referralSource || null,
          status: 'new',
        });
      if (error) {
        console.error('Error storing enterprise lead:', error);
      }
    } catch {
      console.warn('Supabase storage unavailable');
    }
  }

  // 2. Send notification + auto-reply via Web3Forms
  if (WEB3FORMS_KEY) {
    try {
      const useCaseLabel = formData.primaryUseCase
        ? formData.primaryUseCase.replace(/_/g, ' ')
        : 'Not specified';

      const messageBody = [
        `Company: ${formData.companyName}`,
        `Contact: ${formData.contactName}`,
        `Email: ${formData.email}`,
        formData.jobTitle ? `Title: ${formData.jobTitle}` : '',
        formData.phone ? `Phone: ${formData.phone}` : '',
        formData.country ? `Country: ${formData.country}` : '',
        `Industry: ${formData.industry}`,
        formData.companySize ? `Company Size: ${formData.companySize}` : '',
        `Use Case: ${useCaseLabel}`,
        formData.useCaseDescription ? `Details: ${formData.useCaseDescription}` : '',
        formData.concurrentUsers ? `Concurrent Users: ${formData.concurrentUsers}` : '',
        formData.deployment ? `Deployment: ${formData.deployment}` : '',
        formData.existingHardware ? `Existing Hardware: ${formData.existingHardware}` : '',
        formData.complianceRequirements?.length ? `Compliance: ${formData.complianceRequirements.join(', ')}` : '',
        formData.modelPreferences ? `Model Preferences: ${formData.modelPreferences}` : '',
        formData.budget ? `Budget: ${formData.budget}` : '',
        formData.timeline ? `Timeline: ${formData.timeline}` : '',
        formData.message ? `\nMessage:\n${formData.message}` : '',
      ].filter(Boolean).join('\n');

      const response = await fetch(WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          access_key: WEB3FORMS_KEY,
          botcheck: '',
          subject: `[Enterprise Lead] ${formData.companyName} — ${formData.industry}`,
          from_name: formData.contactName,
          replyto: formData.email,
          name: formData.contactName,
          email: formData.email,
          message: messageBody,
          autoreply: {
            enabled: true,
            subject: AUTO_REPLY_TEMPLATES.enterprise.subject,
            message: AUTO_REPLY_TEMPLATES.enterprise.body.replace(/\{\{name\}\}/g, formData.contactName),
            from: `LocalLLM Advisor <${CONTACT_EMAIL}>`,
          },
        }),
      });

      const result = await response.json();
      if (!result.success) {
        console.warn('Web3Forms enterprise notification failed:', result.message);
      }
    } catch (err) {
      console.error('Enterprise email notification error:', err);
    }
  }

  // 3. Also try Supabase Edge Function for email
  if (isSupabaseConfigured && supabase) {
    try {
      await supabase.functions.invoke('send-enterprise-lead-email', {
        body: formData,
      });
    } catch {
      console.warn('Supabase email notification unavailable');
    }
  }

  return { success: true };
}

/**
 * Get the auto-reply template for a given contact type.
 */
export function getAutoReplyTemplate(type: ContactType, name: string) {
  const template = AUTO_REPLY_TEMPLATES[type];
  return {
    subject: template.subject,
    body: template.body.replace(/\{\{name\}\}/g, name),
  };
}

export { CONTACT_EMAIL };
