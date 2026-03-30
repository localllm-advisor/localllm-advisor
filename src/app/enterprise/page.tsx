'use client';

import { useState } from 'react';
import Navbar from '@/components/Navbar';
import BackButton from '@/components/BackButton';
import PageHero from '@/components/PageHero';
import SiteFooter from '@/components/SiteFooter';
import { useTheme } from '@/components/ThemeProvider';
import Reveal from '@/components/Reveal';
import CountUp from '@/components/CountUp';
import EnterpriseSizingCalculator from '@/components/EnterpriseSizingCalculator';
import TcoComparisonTool from '@/components/TcoComparisonTool';
import { isSupabaseConfigured } from '@/lib/supabase';
import { submitEnterpriseLeadWithEmail, isEmailConfigured, CONTACT_EMAIL } from '@/lib/email';
import CollapsibleSection from '@/components/CollapsibleSection';
import { cooldownCheck } from '@/lib/rateLimit';
import type {
  EnterpriseIndustry,
  EnterpriseCompanySize,
  EnterpriseUseCase,
  EnterpriseDeployment,
  EnterpriseBudget,
  EnterpriseTimeline,
  EnterpriseLeadFormData,
} from '@/lib/types';

type TabId = 'sizing' | 'tco' | 'contact';

const INDUSTRIES: { value: EnterpriseIndustry; label: string }[] = [
  { value: 'healthcare', label: 'Healthcare' },
  { value: 'finance', label: 'Financial Services' },
  { value: 'legal', label: 'Legal' },
  { value: 'government', label: 'Government / Public Sector' },
  { value: 'manufacturing', label: 'Manufacturing' },
  { value: 'technology', label: 'Technology' },
  { value: 'education', label: 'Education' },
  { value: 'retail', label: 'Retail / E-commerce' },
  { value: 'energy', label: 'Energy / Utilities' },
  { value: 'other', label: 'Other' },
];

const COMPANY_SIZES: { value: EnterpriseCompanySize; label: string }[] = [
  { value: '1_50', label: '1–50 employees' },
  { value: '51_200', label: '51–200 employees' },
  { value: '201_1000', label: '201–1,000 employees' },
  { value: '1001_5000', label: '1,001–5,000 employees' },
  { value: '5000_plus', label: '5,000+ employees' },
];

const USE_CASES: { value: EnterpriseUseCase; label: string }[] = [
  { value: 'customer_support', label: 'Customer Support / Chatbot' },
  { value: 'internal_knowledge', label: 'Internal Knowledge Base / RAG' },
  { value: 'code_assistant', label: 'Code Assistant / Developer Tools' },
  { value: 'document_processing', label: 'Document Processing / Extraction' },
  { value: 'data_analysis', label: 'Data Analysis / Reporting' },
  { value: 'content_generation', label: 'Content Generation / Marketing' },
  { value: 'translation', label: 'Translation / Multilingual' },
  { value: 'compliance_review', label: 'Compliance Review / Audit' },
  { value: 'other', label: 'Other' },
];

const DEPLOYMENTS: { value: EnterpriseDeployment; label: string }[] = [
  { value: 'on_premise', label: 'On-Premise (own datacenter)' },
  { value: 'private_cloud', label: 'Private Cloud (AWS/GCP/Azure VPC)' },
  { value: 'hybrid', label: 'Hybrid (on-prem + cloud)' },
  { value: 'undecided', label: 'Not sure yet' },
];

const BUDGETS: { value: EnterpriseBudget; label: string }[] = [
  { value: 'under_10k', label: 'Under $10,000' },
  { value: '10k_50k', label: '$10,000 – $50,000' },
  { value: '50k_200k', label: '$50,000 – $200,000' },
  { value: '200k_plus', label: '$200,000+' },
  { value: 'undecided', label: 'Exploring options' },
];

const TIMELINES: { value: EnterpriseTimeline; label: string }[] = [
  { value: 'immediate', label: 'Immediately (within weeks)' },
  { value: '1_3_months', label: '1–3 months' },
  { value: '3_6_months', label: '3–6 months' },
  { value: '6_plus_months', label: '6+ months' },
  { value: 'exploring', label: 'Just exploring' },
];

const COMPLIANCE_OPTIONS = [
  'HIPAA',
  'GDPR',
  'SOC 2',
  'ISO 27001',
  'ITAR',
  'FedRAMP',
  'PCI DSS',
  'SOX',
];

export default function EnterprisePage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  // Will find and update the outer div below

  const [activeTab, setActiveTab] = useState<TabId>('sizing');

  // Contact form state
  const [formData, setFormData] = useState<EnterpriseLeadFormData>({
    companyName: '',
    contactName: '',
    email: '',
    industry: 'technology',
    companySize: undefined,
    jobTitle: '',
    phone: '',
    country: '',
    primaryUseCase: undefined,
    useCaseDescription: '',
    concurrentUsers: undefined,
    deployment: undefined,
    existingHardware: '',
    complianceRequirements: [],
    modelPreferences: '',
    budget: undefined,
    timeline: undefined,
    message: '',
    referralSource: '',
  });
  const [formSubmitting, setFormSubmitting] = useState(false);
  const [formSubmitted, setFormSubmitted] = useState(false);
  const [formError, setFormError] = useState('');

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value || undefined }));
  };

  const toggleCompliance = (item: string) => {
    setFormData(prev => {
      const current = prev.complianceRequirements || [];
      return {
        ...prev,
        complianceRequirements: current.includes(item)
          ? current.filter(c => c !== item)
          : [...current, item],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    const email = (formData.email || '').trim();
    if (!email || !emailRegex.test(email) || email.length > 254) {
      setFormError('Please enter a valid email address.');
      return;
    }

    // Rate limit: one submission every 10 seconds
    const { allowed, retryAfterMs } = cooldownCheck('enterprise-form', 10000);
    if (!allowed) {
      setFormError(`Please wait ${Math.ceil(retryAfterMs / 1000)}s before submitting again.`);
      return;
    }

    setFormSubmitting(true);
    setFormError('');

    try {
      const { success, error } = await submitEnterpriseLeadWithEmail(formData);
      if (success) {
        setFormSubmitted(true);
      } else {
        setFormError(error || 'Something went wrong. Please try again or email us directly.');
      }
    } catch {
      setFormError('Something went wrong. Please email us at info@localllm-advisor.com');
    } finally {
      setFormSubmitting(false);
    }
  };

  const inputCls = `w-full rounded-lg border px-4 py-2.5 text-sm transition-colors focus:outline-none focus:ring-2 ${
    isDark
      ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500 focus:ring-blue-500'
      : 'bg-white border-gray-300 text-gray-900 placeholder-gray-400 focus:ring-blue-500'
  }`;

  const labelCls = `block text-sm font-medium mb-1.5 ${isDark ? 'text-gray-300' : 'text-gray-700'}`;
  const optionalCls = `text-xs font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`;

  const tabs: { id: TabId; label: string; desc: string }[] = [
    { id: 'sizing', label: 'Fleet Sizing Calculator', desc: 'Calculate hardware requirements for your team' },
    { id: 'tco', label: 'TCO Comparison', desc: 'On-premise vs. cloud cost analysis' },
    { id: 'contact', label: 'Talk to Us', desc: 'Get a customized recommendation' },
  ];

  const benefits = [
    { icon: '🔒', title: 'Complete Data Sovereignty', desc: 'Your data never leaves your infrastructure. Full compliance with GDPR, HIPAA, SOC 2, and industry-specific regulations.' },
    { icon: '💰', title: 'Predictable Costs', desc: 'Eliminate per-token API fees. One-time hardware investment with fixed, forecastable operating costs.' },
    { icon: '🔧', title: 'Full Customization', desc: 'Fine-tune models on proprietary data. Choose your inference engine, context length, and deployment topology.' },
    { icon: '📊', title: 'Fleet-Level Sizing', desc: 'Go beyond single-GPU recommendations. Plan multi-node deployments with redundancy, peak handling, and growth.' },
    { icon: '⚡', title: 'No Vendor Lock-In', desc: 'Run open-weight models on commodity hardware. Switch models, GPUs, or providers without migration costs.' },
    { icon: '🏢', title: 'Dedicated Support', desc: 'Custom deployment plans, hardware BOM generation, TCO analysis, and ongoing optimization guidance.' },
  ];

  return (
    <div className={`min-h-screen flex flex-col ${isDark ? 'bg-indigo-950/40' : 'bg-indigo-50/70'}`}>
      <Navbar />
      <BackButton />
      <PageHero
        title="Enterprise Solutions"
        subtitle="Fleet sizing, TCO comparison, and custom deployment plans for teams and businesses."
        accent="indigo"
      />

      <main className="flex-1 w-full">
        {/* Hero Section */}
        <section className={`py-16 sm:py-24 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="mx-auto max-w-4xl px-4 text-center">
            <Reveal delay={0}>
              <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium mb-6 ${
                isDark ? 'bg-blue-900/30 text-blue-400 border border-blue-800' : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                Enterprise Solutions
              </div>
            </Reveal>
            <Reveal delay={50}>
              <h1 className={`text-4xl sm:text-5xl font-bold mb-6 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Deploy LLMs On-Premise with Confidence
              </h1>
            </Reveal>
            <Reveal delay={100}>
              <p className={`text-xl max-w-2xl mx-auto mb-10 ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                Size hardware fleets, compare TCO against cloud APIs, and plan compliant
                on-premise LLM deployments — from free reports to executive-grade analysis.
              </p>
            </Reveal>
            <Reveal delay={150}>
              <div className="flex flex-wrap justify-center gap-8 text-center">
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}><CountUp to={1046} suffix="+" /></p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>GPUs &amp; Models Supported</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <CountUp to={3} suffix=" vendors" />
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>NVIDIA · AMD · Intel</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}><CountUp to={36} suffix="mo" /></p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>TCO Projection Horizon</p>
                </div>
                <div>
                  <p className={`text-3xl font-bold ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    <CountUp to={4} />
                  </p>
                  <p className={`text-xs mt-1 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Cloud APIs Compared</p>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        {/* Benefits Grid */}
        <section className={`py-16 border-b ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="mx-auto max-w-6xl px-4">
            <Reveal delay={200}>
              <h2 className={`text-3xl font-bold text-center mb-12 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Why On-Premise?
              </h2>
            </Reveal>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {benefits.map((b, i) => (
                <Reveal key={i} delay={250 + i * 50}>
                  <div className={`rounded-xl p-6 border transition-all h-full ${
                    isDark ? 'bg-gray-800/30 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
                  }`}>
                    <div className="text-3xl mb-3">{b.icon}</div>
                    <h3 className={`text-base font-semibold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>{b.title}</h3>
                    <p className={`text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{b.desc}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* Tools Section — Tabbed */}
        <section className={`py-16 ${isDark ? 'bg-gray-900/50' : 'bg-gray-50/50'}`}>
          <div className="mx-auto max-w-6xl px-4">
            <Reveal delay={400}>
              <h2 className={`text-3xl font-bold text-center mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Enterprise Tools
              </h2>
              <p className={`text-center mb-8 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Free for individual use. Team features coming soon.
              </p>
            </Reveal>

            {/* Tab Navigation */}
            <Reveal delay={450}>
              <div className="flex flex-wrap gap-2 mb-8 justify-center">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`px-5 py-2.5 rounded-lg text-sm font-medium transition-all ${
                      activeTab === tab.id
                        ? isDark
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-600 text-white'
                        : isDark
                          ? 'bg-gray-800 text-gray-400 hover:text-white hover:bg-gray-700'
                          : 'bg-white text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </Reveal>

            {/* Tab Content */}
            <div className={`rounded-2xl border p-6 sm:p-8 ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-white border-gray-200'}`}>
              {activeTab === 'sizing' && (
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Fleet Sizing Calculator
                  </h3>
                  <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Select a model and your concurrency requirements. Get a complete hardware bill of materials
                    with GPU count, power draw, and estimated costs across budget, recommended, and premium tiers.
                  </p>
                  <EnterpriseSizingCalculator />
                </div>
              )}

              {activeTab === 'tco' && (
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Total Cost of Ownership Comparison
                  </h3>
                  <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Compare the cumulative cost of running LLMs on your own hardware vs. paying for cloud API tokens.
                    See exactly when on-premise breaks even.
                  </p>
                  <TcoComparisonTool />
                </div>
              )}

              {activeTab === 'contact' && (
                <div>
                  <h3 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                    Request a Custom Assessment
                  </h3>
                  <p className={`text-sm mb-6 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    Tell us about your use case and requirements. We&apos;ll prepare a tailored recommendation
                    covering model selection, hardware sizing, compliance, and deployment strategy.
                  </p>

                  {formSubmitted ? (
                    <div className={`rounded-xl p-8 text-center border ${isDark ? 'bg-green-900/20 border-green-700' : 'bg-green-50 border-green-200'}`}>
                      <div className="text-4xl mb-3">✓</div>
                      <h3 className={`text-xl font-semibold mb-2 ${isDark ? 'text-green-400' : 'text-green-700'}`}>
                        Thank You!
                      </h3>
                      <p className={isDark ? 'text-green-300' : 'text-green-600'}>
                        We&apos;ve received your inquiry. Our team will review your requirements and respond within 1–2 business days.
                      </p>
                      <p className={`text-sm mt-3 ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                        In the meantime, try our Fleet Sizing Calculator and TCO Comparison tools above.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleSubmit} className="space-y-6">
                      {/* Section 1: Company & Contact — always visible (required fields) */}
                      <div>
                        <h4 className={`text-sm font-semibold mb-4 pb-2 border-b ${isDark ? 'text-gray-300 border-gray-700' : 'text-gray-700 border-gray-200'}`}>
                          Company &amp; Contact Information
                        </h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Company Name *</label>
                            <input type="text" name="companyName" value={formData.companyName} onChange={handleInputChange} required className={inputCls} placeholder="Acme Corp" />
                          </div>
                          <div>
                            <label className={labelCls}>Your Name *</label>
                            <input type="text" name="contactName" value={formData.contactName} onChange={handleInputChange} required className={inputCls} placeholder="Jane Smith" />
                          </div>
                          <div>
                            <label className={labelCls}>Work Email *</label>
                            <input type="email" name="email" value={formData.email} onChange={handleInputChange} required className={inputCls} placeholder="jane@acme.com" />
                          </div>
                          <div>
                            <label className={labelCls}>Industry *</label>
                            <select name="industry" value={formData.industry} onChange={handleInputChange} required className={inputCls}>
                              {INDUSTRIES.map(i => <option key={i.value} value={i.value}>{i.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: Company Details — collapsible */}
                      <CollapsibleSection title="Company Details" subtitle="optional">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Job Title</label>
                            <input type="text" name="jobTitle" value={formData.jobTitle || ''} onChange={handleInputChange} className={inputCls} placeholder="CTO, VP Engineering, etc." />
                          </div>
                          <div>
                            <label className={labelCls}>Company Size</label>
                            <select name="companySize" value={formData.companySize || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              {COMPANY_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Phone</label>
                            <input type="tel" name="phone" value={formData.phone || ''} onChange={handleInputChange} className={inputCls} placeholder="+1 (555) 123-4567" />
                          </div>
                          <div>
                            <label className={labelCls}>Country</label>
                            <input type="text" name="country" value={formData.country || ''} onChange={handleInputChange} className={inputCls} placeholder="United States" />
                          </div>
                        </div>
                      </CollapsibleSection>

                      {/* Section 3: Use Case & Technical — collapsible */}
                      <CollapsibleSection title="Use Case &amp; Technical Requirements" subtitle="optional">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Primary Use Case</label>
                            <select name="primaryUseCase" value={formData.primaryUseCase || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              {USE_CASES.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Expected Concurrent Users</label>
                            <input type="number" name="concurrentUsers" min={1} value={formData.concurrentUsers || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. 50" />
                          </div>
                          <div>
                            <label className={labelCls}>Deployment Preference</label>
                            <select name="deployment" value={formData.deployment || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              {DEPLOYMENTS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Model Preferences</label>
                            <input type="text" name="modelPreferences" value={formData.modelPreferences || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. Llama 3.1 70B, Mistral, any open-weight" />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Existing Hardware</label>
                            <input type="text" name="existingHardware" value={formData.existingHardware || ''} onChange={handleInputChange} className={inputCls} placeholder="e.g. 4x A100 80GB, Dell PowerEdge R750xa, etc." />
                          </div>
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Use Case Description</label>
                            <textarea name="useCaseDescription" value={formData.useCaseDescription || ''} onChange={handleInputChange} rows={3} className={`${inputCls} resize-none`} placeholder="Briefly describe your use case, expected workload, and any specific requirements..." />
                          </div>
                        </div>

                        {/* Compliance */}
                        <div className="mt-4">
                          <label className={labelCls}>Compliance Requirements <span className={optionalCls}>(select all that apply)</span></label>
                          <div className="flex flex-wrap gap-2 mt-1">
                            {COMPLIANCE_OPTIONS.map(item => {
                              const selected = (formData.complianceRequirements || []).includes(item);
                              return (
                                <button
                                  key={item}
                                  type="button"
                                  onClick={() => toggleCompliance(item)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                                    selected
                                      ? isDark
                                        ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                                        : 'bg-blue-50 border-blue-300 text-blue-700'
                                      : isDark
                                        ? 'bg-gray-800 border-gray-700 text-gray-500 hover:text-gray-300'
                                        : 'bg-white border-gray-200 text-gray-400 hover:text-gray-600'
                                  }`}
                                >
                                  {item}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      </CollapsibleSection>

                      {/* Section 4: Budget & Timeline — collapsible */}
                      <CollapsibleSection title="Budget &amp; Timeline" subtitle="optional">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className={labelCls}>Budget Range</label>
                            <select name="budget" value={formData.budget || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              {BUDGETS.map(b => <option key={b.value} value={b.value}>{b.label}</option>)}
                            </select>
                          </div>
                          <div>
                            <label className={labelCls}>Timeline</label>
                            <select name="timeline" value={formData.timeline || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              {TIMELINES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                          </div>
                        </div>
                      </CollapsibleSection>

                      {/* Section 5: Additional — collapsible */}
                      <CollapsibleSection title="Additional Information" subtitle="optional">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div className="sm:col-span-2">
                            <label className={labelCls}>Message</label>
                            <textarea name="message" value={formData.message || ''} onChange={handleInputChange} rows={4} className={`${inputCls} resize-none`} placeholder="Anything else you'd like us to know — questions, constraints, special requirements..." />
                          </div>
                          <div>
                            <label className={labelCls}>How did you find us?</label>
                            <select name="referralSource" value={formData.referralSource || ''} onChange={handleInputChange} className={inputCls}>
                              <option value="">Select...</option>
                              <option value="search">Search Engine</option>
                              <option value="social">Social Media</option>
                              <option value="colleague">Colleague / Word of mouth</option>
                              <option value="blog">Blog / Article</option>
                              <option value="other">Other</option>
                            </select>
                          </div>
                        </div>
                      </CollapsibleSection>

                      {/* Error */}
                      {formError && (
                        <div className={`rounded-lg p-4 text-sm ${isDark ? 'bg-red-900/20 text-red-400 border border-red-800' : 'bg-red-50 text-red-600 border border-red-200'}`}>
                          {formError}
                        </div>
                      )}

                      {/* Submit */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        <button
                          type="submit"
                          disabled={formSubmitting}
                          className="px-8 py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 text-white font-semibold rounded-lg transition-colors"
                        >
                          {formSubmitting ? 'Submitting...' : 'Submit Inquiry'}
                        </button>
                        <p className={`text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
                          Only company name, your name, email, and industry are required.
                          The more details you provide, the better we can help.
                          {(!isSupabaseConfigured && !isEmailConfigured) && (
                            <span className="block mt-1">
                              You can also reach us directly at{' '}
                              <a href={`mailto:${CONTACT_EMAIL}`} className="text-blue-500 hover:underline">{CONTACT_EMAIL}</a>
                            </span>
                          )}
                        </p>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Pricing Plans */}
        <section className={`py-16 border-t ${isDark ? 'border-gray-800' : 'border-gray-200'}`}>
          <div className="mx-auto max-w-5xl px-4">
            <Reveal delay={500}>
              <h2 className={`text-3xl font-bold text-center mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>
                Report Tiers
              </h2>
              <p className={`text-center mb-10 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Free reports give you the essentials. Upgrade for full cost data, extended analysis, and compliance documentation.
              </p>
            </Reveal>

            <Reveal delay={550}>
              <div className="grid md:grid-cols-3 gap-6">
                {/* Free Tier */}
                <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`text-xs font-semibold mb-3 ${isDark ? 'text-green-400' : 'text-green-600'}`}>FREE</div>
                  <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Free</h3>
                  <p className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>&euro;0<span className={`text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}> forever</span></p>
                  <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Best-value GPU recommendation</li>
                    <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Architecture overview (TP, replicas, nodes)</li>
                    <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Performance metrics (tok/s, concurrent users)</li>
                    <li className="flex gap-2"><span className="text-green-500">&#10003;</span> On-prem vs. cloud break-even verdict</li>
                    <li className="flex gap-2"><span className="text-green-500">&#10003;</span> Unlimited analyses</li>
                  </ul>
                </div>

                {/* Plus Tier */}
                <div className={`rounded-xl p-6 border-2 relative ${isDark ? 'bg-blue-900/10 border-blue-600' : 'bg-blue-50/50 border-blue-400'}`}>
                  <div className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold bg-blue-600 text-white`}>MOST POPULAR</div>
                  <div className={`text-xs font-semibold mb-3 ${isDark ? 'text-blue-400' : 'text-blue-600'}`}>PLUS</div>
                  <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Plus</h3>
                  <p className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>&euro;149<span className={`text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}> one-time</span></p>
                  <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> All GPU configurations compared</li>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> Full cost breakdown per GPU</li>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> First-year TCO analysis</li>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> Month-by-month cumulative timeline</li>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> Exact dollar savings per provider</li>
                    <li className="flex gap-2"><span className="text-blue-500">&#10003;</span> Exportable data for procurement</li>
                  </ul>
                </div>

                {/* Ultra Tier */}
                <div className={`rounded-xl p-6 border ${isDark ? 'bg-gray-800/30 border-gray-700' : 'bg-white border-gray-200'}`}>
                  <div className={`text-xs font-semibold mb-3 ${isDark ? 'text-purple-400' : 'text-purple-600'}`}>ULTRA</div>
                  <h3 className={`text-xl font-bold mb-1 ${isDark ? 'text-white' : 'text-gray-900'}`}>Ultra</h3>
                  <p className={`text-3xl font-bold mb-4 ${isDark ? 'text-white' : 'text-gray-900'}`}>&euro;300<span className={`text-sm font-normal ${isDark ? 'text-gray-500' : 'text-gray-400'}`}> one-time</span></p>
                  <ul className={`space-y-2 text-sm ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> Everything in Plus</li>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> GDPR infrastructure compliance assessment</li>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> Multi-model fleet optimization</li>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> 12-month scaling roadmap</li>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> Executive-ready PDF report</li>
                    <li className="flex gap-2"><span className="text-purple-500">&#10003;</span> Carbon footprint &amp; sensitivity analysis</li>
                  </ul>
                  <button
                    onClick={() => setActiveTab('contact')}
                    className={`mt-6 w-full py-2.5 rounded-lg text-sm font-semibold transition-colors ${
                      isDark ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-purple-600 hover:bg-purple-700 text-white'
                    }`}
                  >
                    Contact Us
                  </button>
                </div>
              </div>
            </Reveal>

            <Reveal delay={600}>
              <p className={`text-center text-xs mt-6 ${isDark ? 'text-gray-600' : 'text-gray-400'}`}>
                Payments will be activated soon via Stripe.
              </p>
            </Reveal>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
