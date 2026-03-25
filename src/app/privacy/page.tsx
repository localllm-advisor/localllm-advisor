'use client';

import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import PageHero from '@/components/PageHero';
import Footer from '@/components/Footer';
import { useTheme } from '@/components/ThemeProvider';

export default function PrivacyPolicyPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const h2 = `text-xl font-semibold mt-8 mb-3 ${isDark ? 'text-white' : 'text-gray-900'}`;
  const h3 = `text-lg font-medium mt-6 mb-2 ${isDark ? 'text-gray-200' : 'text-gray-800'}`;
  const p = `text-sm leading-relaxed mb-3 ${isDark ? 'text-gray-400' : 'text-gray-600'}`;
  const li = `text-sm leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`;

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-purple-950/40' : 'bg-purple-50/70'}`}>
      <Navbar />
      <BackButton />

      <PageHero
        title="Privacy Policy"
        subtitle="Last updated: March 24, 2026"
        accent="purple"
      />

      <main className="flex-1 mx-auto w-full max-w-3xl px-4 py-8">
        <div className={`rounded-xl border p-6 sm:p-8 ${isDark ? 'border-gray-700 bg-gray-800/50' : 'border-gray-200 bg-gray-50'}`}>

          <h2 className={h2}>1. What is this</h2>
          <p className={p}>
            LocalLLM Advisor is a free, client-side, privacy-first web tool that helps users find the best local large-language model (LLM) or the best hardware for their LLM, based on their specific configuration and needs. We do not collect or store any personal data from users. The tool runs entirely in the browser, ensuring that all computations and data processing happen locally on your device. We do not sell user data or share it with third parties. Our mission is to empower individuals to run AI locally while keeping their data private and secure. For enterprise customers, we offer a paid service that provides personalized recommendations, priority support, and additional features. This service is designed for businesses looking to optimize their AI infrastructure
            for their hardware. The service is based in Italy and is accessible at{' '}
            <span className={isDark ? 'text-blue-400' : 'text-blue-600'}>localllm-advisor.com</span>.
          </p>

          <h2 className={h2}>2. Data We Collect</h2>

          <h3 className={h3}>2.1 Core Functionality — Zero Data Collection</h3>
          <p className={p}>
            All model recommendations, hardware matching, VRAM calculations, and benchmark
            comparisons run entirely in your browser. We do not send your hardware
            specifications, GPU data, or search queries to any server. No accounts are required.
          </p>

          <h3 className={h3}>2.2 Google Analytics (Optional)</h3>
          <p className={p}>
            If you accept analytics cookies via the consent banner, we use Google Analytics 4 to
            collect anonymous usage statistics such as page views, approximate geography, device
            type, and session duration. IP addresses are anonymized (&ldquo;anonymize_ip: true&rdquo;).
            If you decline, no analytics scripts are loaded and no cookies are set.
          </p>

          <h3 className={h3}>2.3 Newsletter Subscription (Optional)</h3>
          <p className={p}>
            If you voluntarily subscribe to our newsletter, we collect your email address and
            send it to Buttondown (our newsletter provider) for the sole purpose of delivering
            emails. You can unsubscribe at any time via the link in every email.
          </p>

          <h3 className={h3}>2.4 Enterprise Contact Form (Optional)</h3>
          <p className={p}>
            If you fill out the enterprise contact form, the information you provide (name,
            email, company, phone, and message) is sent to Web3Forms and/or stored in our
            Supabase database solely to respond to your inquiry. We never sell or share this
            data with third parties.
          </p>

          <h2 className={h2}>3. Cookies</h2>
          <p className={p}>
            We only set cookies if you accept analytics via the consent banner. The cookies set are:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
            <li className={li}><strong>_ga</strong> — Google Analytics identifier (expires: 2 years)</li>
            <li className={li}><strong>_ga_*</strong> — Google Analytics session data (expires: 2 years)</li>
            <li className={li}><strong>llm_cookie_consent</strong> — Your cookie preference (localStorage, no expiry)</li>
            <li className={li}><strong>theme</strong> — Your preferred color theme, light or dark (localStorage, no expiry)</li>
          </ul>
          <p className={p}>
            The localStorage items above are not cookies and are never sent to any server.
            They stay on your device and are used only to remember your preferences between visits.
            No cookies are set if you decline or ignore the consent banner.
          </p>

          <h2 className={h2}>4. Third-Party Services</h2>
          <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
            <li className={li}><strong>Google Analytics 4</strong> — usage analytics (only with consent)</li>
            <li className={li}><strong>Buttondown</strong> — newsletter delivery (only if you subscribe)</li>
            <li className={li}><strong>Web3Forms</strong> — enterprise form delivery (only if you submit)</li>
            <li className={li}><strong>Supabase</strong> — database for enterprise leads and community benchmarks</li>
            {/* Stripe — payment processing for enterprise plans: will be added when payments go live */}
            <li className={li}><strong>GitHub Pages</strong> — static site hosting</li>
          </ul>
          <p className={p}>
            Each service has its own privacy policy. We encourage you to review them.
          </p>

          <h2 className={h2}>5. Your Rights (GDPR)</h2>
          <p className={p}>
            Under the EU General Data Protection Regulation, you have the right to:
          </p>
          <ul className="list-disc list-inside space-y-1 mb-3 ml-2">
            <li className={li}>Access the personal data we hold about you</li>
            <li className={li}>Request correction or deletion of your data</li>
            <li className={li}>Withdraw consent at any time (e.g. decline analytics, unsubscribe)</li>
            <li className={li}>Request data portability</li>
            <li className={li}>Lodge a complaint with the Italian data protection authority (Garante per la protezione dei dati personali)</li>
          </ul>
          <p className={p}>
            To exercise any of these rights, email us at{' '}
            <a href="mailto:privacy@localllm-advisor.com" className={isDark ? 'text-blue-400 underline' : 'text-blue-600 underline'}>
              privacy@localllm-advisor.com
            </a>.
          </p>

          <h2 className={h2}>6. Data Retention</h2>
          <p className={p}>
            Analytics data is retained according to Google Analytics defaults (14 months).
            Newsletter subscriptions are retained until you unsubscribe. Enterprise form
            submissions are retained for 24 months or until you request deletion.
          </p>

          <h2 className={h2}>7. Security</h2>
          <p className={p}>
            The site is served over HTTPS. All external API communications use encrypted
            connections. We apply Content Security Policy headers and rate-limit form
            submissions. Since the core tool runs entirely client-side, your hardware and
            model data never leaves your device.
          </p>

          <h2 className={h2}>8. Children</h2>
          <p className={p}>
            This service is not directed at children under 18. We do not knowingly collect
            data from minors.
          </p>

          <h2 className={h2}>9. Changes to This Policy</h2>
          <p className={p}>
            We may update this policy from time to time. Changes will be posted on this page
            with an updated &ldquo;Last updated&rdquo; date. Continued use of the site after
            changes constitutes acceptance of the revised policy.
          </p>

          <h2 className={h2}>10. Contact</h2>
          <p className={p}>
            For privacy-related questions, contact us at{' '}
            <a href="mailto:privacy@localllm-advisor.com" className={isDark ? 'text-blue-400 underline' : 'text-blue-600 underline'}>
              privacy@localllm-advisor.com
            </a>.
          </p>

        </div>
      </main>

      <Footer />
    </div>
  );
}
