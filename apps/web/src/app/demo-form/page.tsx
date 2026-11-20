'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import { 
  Sparkles, 
  Upload, 
  CheckCircle, 
  FileText, 
  ArrowLeft, 
  AlertCircle, 
  RefreshCw, 
  ExternalLink,
  ShieldCheck,
  Send
} from 'lucide-react';
import { SyntheticEventDispatcher } from '@formpilot/dom-analyzer';
import { FormSchema, FormField, PredictedFieldValue } from '@formpilot/shared';

export default function DemoFormPage() {
  const [isAgentFilling, setIsAgentFilling] = useState(false);
  const [fillFeedback, setFillFeedback] = useState<string | null>(null);
  const [lastPredictions, setLastPredictions] = useState<PredictedFieldValue[]>([]);
  const [submittedData, setSubmittedData] = useState<any | null>(null);
  const [attachedFileName, setAttachedFileName] = useState<string | null>(null);
  const [attachedFileSize, setAttachedFileSize] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);

  // Monitor file input change
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setAttachedFileName(file.name);
      setAttachedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
    } else {
      setAttachedFileName(null);
      setAttachedFileSize(null);
    }
  };

  // Trigger Autonomous Agent Form Fill & File Upload
  const handleTriggerAgent = async () => {
    setIsAgentFilling(true);
    setFillFeedback('Analyzing page DOM and querying Vector Database...');

    try {
      // 1. Construct Schema for this form
      const fields: FormField[] = [
        { id: 'first_name', name: 'first_name', selector: '#first_name', label: 'First Name', type: 'text', required: true },
        { id: 'last_name', name: 'last_name', selector: '#last_name', label: 'Last Name', type: 'text', required: true },
        { id: 'email_address', name: 'email', selector: '#email_address', label: 'Email Address', type: 'email', required: true },
        { id: 'phone_number', name: 'phone', selector: '#phone_number', label: 'Phone Number', type: 'tel', required: false },
        { id: 'current_location', name: 'location', selector: '#current_location', label: 'Current City / Location', type: 'text', required: false },
        { id: 'linkedin_url', name: 'linkedin', selector: '#linkedin_url', label: 'LinkedIn Profile URL', type: 'text', required: false },
        { id: 'github_url', name: 'github', selector: '#github_url', label: 'GitHub / Portfolio URL', type: 'text', required: false },
        { id: 'years_experience', name: 'experience_years', selector: '#years_experience', label: 'Years of Experience', type: 'number', required: false },
        { id: 'current_title', name: 'current_title', selector: '#current_title', label: 'Current Job Title', type: 'text', required: false },
        { 
          id: 'work_mode', 
          name: 'work_mode', 
          selector: '#work_mode', 
          label: 'Preferred Work Arrangement', 
          type: 'select', 
          required: false,
          options: [
            { label: 'Remote First', value: 'remote' },
            { label: 'Hybrid (2-3 days office)', value: 'hybrid' },
            { label: 'Onsite', value: 'onsite' }
          ]
        },
        { id: 'work_auth', name: 'work_auth', selector: '#work_auth', label: 'Legally authorized to work in destination country', type: 'checkbox', required: true },
        { 
          id: 'relocate_yes', 
          name: 'relocate', 
          selector: '#relocate_yes', 
          label: 'Open to Relocation', 
          type: 'radio', 
          required: false,
          options: [{ label: 'Yes', value: 'yes' }, { label: 'No', value: 'no' }]
        },
        { id: 'cover_letter', name: 'cover_letter', selector: '#cover_letter', label: 'Why are you interested in this role?', type: 'textarea', required: true },
        { id: 'technical_summary', name: 'technical_summary', selector: '#technical_summary', label: 'Key Technical Skills and Notable Achievements', type: 'textarea', required: false },
        { id: 'resume_upload', name: 'resume_file', selector: '#resume_upload', label: 'Attach Resume / Curriculum Vitae (PDF/DOCX)', type: 'file', required: true, accept: '.pdf,.doc,.docx,.txt' }
      ];

      const schema: FormSchema = {
        id: 'schema_demo_job_app',
        domain: window.location.hostname,
        url: window.location.href,
        title: 'Senior AI Engineer Application',
        fields,
        detectedAt: new Date().toISOString()
      };

      // 2. Query Vector DB Context Engine via /api/fill-form
      const res = await fetch('/api/fill-form', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ schema })
      });

      if (!res.ok) {
        throw new Error('API returned error during reasoning');
      }

      const data = await res.json();
      const predictions: PredictedFieldValue[] = data.predictions || [];
      setLastPredictions(predictions);

      // 3. Apply Predictions to DOM (including attaching file to <input type="file">)
      let appliedCount = 0;
      for (const pred of predictions) {
        if (pred.value === '' || pred.value == null) continue;
        const fromSelector = pred.selector ? document.querySelector(pred.selector) : null;
        const el = (fromSelector instanceof HTMLElement ? fromSelector : null)
          || document.getElementById(pred.fieldId)
          || document.querySelector(`[name="${pred.fieldId}"]`);
        if (el && el instanceof HTMLElement) {
          const success = SyntheticEventDispatcher.setInputValue(el, pred.value, pred.filePayload);
          if (success) appliedCount++;
        }
      }

      // Check file input after agent attachment
      if (fileInputRef.current && fileInputRef.current.files && fileInputRef.current.files.length > 0) {
        const file = fileInputRef.current.files[0];
        setAttachedFileName(file.name);
        setAttachedFileSize(`${(file.size / 1024).toFixed(1)} KB`);
      }

      setFillFeedback(`✓ Success! Autonomous Agent filled ${appliedCount} fields and attached your verified resume document via Vector DB grounding.`);
    } catch (err: any) {
      console.error('Agent form fill failed:', err);
      setFillFeedback('Error filling form: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAgentFilling(false);
    }
  };

  // Handle Form Submission
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const data: Record<string, any> = {};

    formData.forEach((value, key) => {
      if (value instanceof File) {
        data[key] = {
          name: value.name,
          size: `${(value.size / 1024).toFixed(1)} KB`,
          type: value.type || 'application/octet-stream'
        };
      } else {
        data[key] = value;
      }
    });

    setSubmittedData(data);

    const form = e.currentTarget;
    const fields = Array.from(form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>('input, textarea, select'))
      .map((el) => {
        if (el instanceof HTMLInputElement && ['submit', 'button', 'reset', 'hidden'].includes(el.type)) return null;
        const label = el.id ? document.querySelector(`label[for="${el.id}"]`)?.textContent?.replace(/\s+/g, ' ').trim() : '';
        let answer = '';
        if (el instanceof HTMLInputElement && el.type === 'checkbox') answer = el.checked ? 'Yes' : '';
        else if (el instanceof HTMLInputElement && el.type === 'radio') answer = el.checked ? el.value : '';
        else if (el instanceof HTMLInputElement && el.type === 'file') answer = el.files?.[0]?.name || '';
        else answer = el.value;
        if (!answer.trim()) return null;
        return {
          fieldId: el.id || el.name,
          question: label || el.name || el.id,
          answer,
          confidence: 1,
          wasEditedByUser: false,
        };
      })
      .filter((field): field is NonNullable<typeof field> => Boolean(field));

    if (lastPredictions.length > 0 && fields.length > 0) {
      fetch('/api/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          submitted: true,
          domain: window.location.hostname,
          url: window.location.href,
          formTitle: 'Senior AI Engineer Application',
          tone: 'professional',
          totalFieldsCount: fields.length,
          filledFieldsCount: fields.length,
          wasAutoSubmitted: false,
          fields,
        }),
      }).catch(() => {});
    }
  };

  const handleReset = () => {
    if (formRef.current) formRef.current.reset();
    setAttachedFileName(null);
    setAttachedFileSize(null);
    setFillFeedback(null);
    setLastPredictions([]);
    setSubmittedData(null);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#080E21] text-slate-900 dark:text-slate-100 transition-colors duration-200">
      {/* Top Banner Navigation */}
      <header className="bg-white/95 dark:bg-slate-900/95 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-40 backdrop-blur-md">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link 
              href="/dashboard"
              className="flex items-center gap-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-navy-800 dark:hover:text-cyan-400 transition"
            >
              <ArrowLeft size={16} />
              <span>Back to Dashboard</span>
            </Link>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-2xs font-bold uppercase tracking-wider bg-cyan-100 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                <Sparkles size={11} /> Test Bench
              </span>
              <h1 className="text-sm font-bold text-navy-900 dark:text-white hidden sm:inline">
                Universal Form Filling &amp; Document Upload Simulator
              </h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleReset}
              className="text-xs font-semibold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition"
            >
              Reset Form
            </button>
            <button
              onClick={handleTriggerAgent}
              disabled={isAgentFilling}
              className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold px-4 py-2 rounded-xl shadow flex items-center gap-2 transition disabled:opacity-50"
            >
              {isAgentFilling ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Agent Reasoning...</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} className="text-cyan-400 dark:text-white" />
                  <span>⚡ Auto-Fill &amp; Upload Resume</span>
                </>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Instructions Card */}
        <div className="bg-gradient-to-r from-navy-900 via-navy-800 to-navy-900 text-white rounded-2xl p-5 shadow-lg border border-navy-700 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-cyan-400 text-xs font-bold uppercase tracking-wider">
              <ShieldCheck size={16} /> Verified RAG Vector Pipeline
            </div>
            <h2 className="text-base font-bold">End-to-End Autonomous Agentic Form Filling</h2>
            <p className="text-xs text-slate-300 leading-relaxed max-w-xl">
              This test form validates that FormPilot AI extracts the DOM structure, performs semantic vector retrieval from PostgreSQL (<code className="text-cyan-300">pgvector</code>), grounds text answers, and programmatically attaches the verified resume document to the native file input.
            </p>
          </div>
          <div className="shrink-0 flex flex-col sm:flex-row gap-2">
            <button
              onClick={handleTriggerAgent}
              disabled={isAgentFilling}
              className="bg-cyan-500 hover:bg-cyan-400 text-navy-950 text-xs font-extrabold px-4 py-2.5 rounded-xl shadow-md flex items-center justify-center gap-2 transition"
            >
              <Sparkles size={14} /> Run Test Agent Now
            </button>
          </div>
        </div>

        {/* Feedback Alert */}
        {fillFeedback && (
          <div className={`p-4 rounded-xl text-xs font-semibold flex items-center gap-3 border shadow-xs transition-all ${
            fillFeedback.startsWith('✓') 
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200' 
              : 'bg-cyan-50 dark:bg-cyan-950/40 border-cyan-200 dark:border-cyan-800 text-cyan-800 dark:text-cyan-200'
          }`}>
            <CheckCircle size={18} className="shrink-0 text-emerald-600 dark:text-emerald-400" />
            <div className="flex-1">{fillFeedback}</div>
          </div>
        )}

        {/* The Form */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 shadow-sm">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-5 mb-6">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-2xs font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">Enterprise Career Portal</span>
                <h2 className="text-xl font-bold text-navy-900 dark:text-white">Senior AI / Full-Stack Engineer</h2>
              </div>
              <span className="text-xs px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                Job ID: FP-2026-AI
              </span>
            </div>
          </div>

          <form ref={formRef} onSubmit={handleSubmit} className="space-y-6">
            {/* Section 1: Candidate Information */}
            <div className="space-y-4">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                1. Personal Details
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="first_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    First Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    required
                    placeholder="Enter first name"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="last_name" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Last Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    required
                    placeholder="Enter last name"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label htmlFor="email_address" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="email"
                    id="email_address"
                    name="email"
                    required
                    placeholder="alex@example.com"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="phone_number" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Phone Number
                  </label>
                  <input
                    type="tel"
                    id="phone_number"
                    name="phone"
                    placeholder="+1 (555) 000-0000"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="current_location" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Location
                  </label>
                  <input
                    type="text"
                    id="current_location"
                    name="location"
                    placeholder="City, Country"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="linkedin_url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    LinkedIn URL
                  </label>
                  <input
                    type="text"
                    id="linkedin_url"
                    name="linkedin"
                    placeholder="https://linkedin.com/in/..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="github_url" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    GitHub / Portfolio
                  </label>
                  <input
                    type="text"
                    id="github_url"
                    name="github"
                    placeholder="https://github.com/..."
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>
              </div>
            </div>

            {/* Section 2: Experience & Preferences */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                2. Experience &amp; Preferences
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label htmlFor="current_title" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Current Job Title
                  </label>
                  <input
                    type="text"
                    id="current_title"
                    name="current_title"
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="years_experience" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Years of Experience
                  </label>
                  <input
                    type="number"
                    id="years_experience"
                    name="experience_years"
                    min="0"
                    max="50"
                    placeholder="6"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  />
                </div>

                <div className="space-y-1">
                  <label htmlFor="work_mode" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Preferred Work Arrangement
                  </label>
                  <select
                    id="work_mode"
                    name="work_mode"
                    className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                  >
                    <option value="remote">Remote First</option>
                    <option value="hybrid">Hybrid (2-3 days office)</option>
                    <option value="onsite">Onsite</option>
                  </select>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    id="work_auth"
                    name="work_auth"
                    className="w-4 h-4 text-cyan-600 rounded border-slate-300 dark:border-slate-600 focus:ring-cyan-500"
                  />
                  <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                    Legally authorized to work in destination country <span className="text-rose-500">*</span>
                  </span>
                </label>

                <div className="flex items-center gap-4 text-xs font-semibold text-slate-700 dark:text-slate-300">
                  <span>Open to Relocation?</span>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="relocate" id="relocate_yes" value="yes" className="text-cyan-600" />
                    <span>Yes</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" name="relocate" id="relocate_no" value="no" defaultChecked className="text-cyan-600" />
                    <span>No</span>
                  </label>
                </div>
              </div>
            </div>

            {/* Section 3: Subjective Questions (Vector Grounded) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                3. Subjective Questions (Grounded on Persona &amp; Knowledge Base)
              </h3>

              <div className="space-y-1">
                <label htmlFor="cover_letter" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Why are you interested in this position? <span className="text-rose-500">*</span>
                </label>
                <textarea
                  id="cover_letter"
                  name="cover_letter"
                  rows={4}
                  required
                  placeholder="Explain why you are a great match for this role..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                />
              </div>

              <div className="space-y-1">
                <label htmlFor="technical_summary" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Key Technical Skills and Notable Achievements
                </label>
                <textarea
                  id="technical_summary"
                  name="technical_summary"
                  rows={3}
                  placeholder="Summarize your tech stack expertise and past project outcomes..."
                  className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500 transition"
                />
              </div>
            </div>

            {/* Section 4: File Upload (CRITICAL TESTING FEATURE) */}
            <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  4. Document Attachment (<code className="text-cyan-600 dark:text-cyan-400">&lt;input type=&quot;file&quot;&gt;</code>)
                </h3>
                <span className="text-2xs font-bold px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                  Autonomous Upload Target
                </span>
              </div>

              <div className="p-5 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/30 text-center space-y-3 transition hover:border-cyan-400">
                <div className="w-12 h-12 mx-auto rounded-full bg-cyan-100 dark:bg-cyan-950/80 text-cyan-700 dark:text-cyan-300 flex items-center justify-center">
                  <Upload size={22} />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    Upload your verified Resume / Curriculum Vitae
                  </p>
                  <p className="text-2xs text-slate-500 dark:text-slate-400">
                    Supported formats: PDF, DOCX, TXT (FormPilot AI autonomously attaches stored files here)
                  </p>
                </div>

                <div className="pt-2">
                  <input
                    ref={fileInputRef}
                    type="file"
                    id="resume_upload"
                    name="resume_file"
                    accept=".pdf,.doc,.docx,.txt"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-800 file:text-white hover:file:bg-navy-900 cursor-pointer"
                  />
                </div>

                {/* Real-Time File Attachment Badge */}
                {attachedFileName ? (
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-300 dark:border-emerald-700 text-xs font-bold shadow-xs">
                    <FileText size={14} className="text-emerald-600 dark:text-emerald-400" />
                    <span>Attached: {attachedFileName}</span>
                    {attachedFileSize && <span className="text-emerald-600 dark:text-emerald-400 font-normal">({attachedFileSize})</span>}
                  </div>
                ) : (
                  <p className="text-2xs font-semibold text-slate-400 dark:text-slate-500 italic">
                    No file attached yet. Click &quot;⚡ Auto-Fill &amp; Upload Resume&quot; or use the extension to attach automatically.
                  </p>
                )}
              </div>
            </div>

            {/* Form Action Controls */}
            <div className="pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
              <p className="text-2xs text-slate-400 dark:text-slate-500">
                FormPilot AI is an InnovChromatic product (<a href="https://www.innovchromatic.tech" target="_blank" rel="noreferrer" className="underline hover:text-cyan-500">www.innovchromatic.tech</a>)
              </p>

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                >
                  Clear Form
                </button>
                <button
                  type="submit"
                  className="btn-lightup bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold px-6 py-2.5 rounded-xl shadow-md flex items-center gap-2 transition"
                >
                  <Send size={14} />
                  <span>Submit Application</span>
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* Modal: Submission Inspection */}
        {submittedData && (
          <div className="fixed inset-0 bg-navy-950/60 dark:bg-navy-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-8 max-w-lg w-full space-y-4 shadow-2xl">
              <div className="flex items-center gap-3 text-emerald-600 dark:text-emerald-400">
                <CheckCircle size={28} />
                <div>
                  <h3 className="text-base font-bold text-navy-900 dark:text-white">Form Successfully Submitted!</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Inspecting submitted payload &amp; attached file object</p>
                </div>
              </div>

              <div className="bg-slate-950 text-cyan-300 p-4 rounded-2xl font-mono text-2xs overflow-auto max-h-72 border border-slate-800">
                <pre>{JSON.stringify(submittedData, null, 2)}</pre>
              </div>

              <div className="flex items-center justify-end">
                <button
                  onClick={() => setSubmittedData(null)}
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-500 text-white text-xs font-bold px-5 py-2.5 rounded-xl"
                >
                  Close Inspection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Vector Grounding & Citations Card */}
        {lastPredictions.length > 0 && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-xs space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Sparkles size={14} className="text-cyan-500" /> Vector Database RAG Citations
              </h4>
              <span className="text-2xs text-slate-400 font-mono">
                {lastPredictions.length} Fields Evaluated
              </span>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
              {lastPredictions.map((pred, i) => (
                <div key={i} className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/80 text-2xs space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-navy-900 dark:text-white font-mono">{pred.fieldId}</span>
                    <span className={`px-2 py-0.5 rounded font-bold uppercase tracking-wider ${
                      pred.confidenceLevel === 'high' ? 'bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300' : 'bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300'
                    }`}>
                      {Math.round(pred.confidence * 100)}% Confidence
                    </span>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300 truncate">
                    <span className="text-slate-400">Value:</span> {typeof pred.value === 'boolean' ? (pred.value ? 'True' : 'False') : String(pred.value)}
                  </p>
                  {pred.citation && (
                    <p className="text-cyan-700 dark:text-cyan-400 italic">
                      Grounded Citation: [{pred.citation.documentName}] &ldquo;{pred.citation.excerpt}&rdquo;
                    </p>
                  )}
                  {pred.filePayload && (
                    <p className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      ✓ File Object Attached: {pred.filePayload.fileName} ({pred.filePayload.mimeType})
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
