'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { 
  FileStack, 
  CalendarClock, 
  Bot, 
  History, 
  SlidersHorizontal, 
  ShieldCheck, 
  Sparkles, 
  ArrowRight, 
  CheckCircle2, 
  ExternalLink,
  Zap,
  Lock,
  Layers,
  FileCheck2,
  ChevronRight,
  Upload,
  Cpu,
  Eye,
  Check,
  Plane,
  Menu,
  X
} from 'lucide-react';

export default function LandingPage() {
  const [activeInteractiveTab, setActiveInteractiveTab] = useState<'heatmap' | 'reminders' | 'bulk'>('heatmap');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col selection:bg-cyan-100 selection:text-cyan-900">
      {/* 1. Header Navigation Bar - Expanded Width with Lightup CTAs */}
      <header className="bg-white/95 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50 transition-all">
        <div className="max-w-[1540px] mx-auto px-4 sm:px-8 lg:px-12 h-20 flex items-center justify-between">
          {/* Logo Brand */}
          <Link href="/" className="flex items-center gap-3 shrink-0">
            <img 
              src="/brand/logo-full.png" 
              alt="FormPilot AI" 
              className="h-10 sm:h-12 md:h-14 w-auto object-contain cursor-pointer transition hover:opacity-95"
            />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600">
            <a href="#features" className="hover:text-navy-800 transition">Features</a>
            <a href="#how-it-works" className="hover:text-navy-800 transition">How It Works</a>
            <a href="#security" className="hover:text-navy-800 transition">Security & Privacy</a>
            <a href="#extension" className="hover:text-navy-800 transition">Chrome Extension</a>
          </nav>

          {/* Auth Action Buttons with Click Lightup Effect */}
          <div className="hidden sm:flex items-center gap-3">
            <Link
              href="/login"
              className="btn-lightup-subtle text-xs font-bold text-navy-800 hover:text-cyan-800 px-4 py-2.5 rounded-xl border border-transparent hover:border-slate-200 transition"
            >
              Sign In
            </Link>
            <Link
              href="/login"
              className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-sm hover:shadow flex items-center gap-2 border border-transparent"
            >
              <span>Get Started Free</span>
              <ArrowRight size={14} className="text-cyan-400" />
            </Link>
          </div>

          {/* Mobile Menu Trigger Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-navy-800 hover:bg-slate-100 transition"
            aria-label="Toggle navigation menu"
          >
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden bg-white border-b border-slate-200 px-6 py-5 space-y-4 shadow-lg animate-fadeIn">
            <nav className="flex flex-col space-y-3 text-sm font-semibold text-slate-700">
              <a 
                href="#features" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-navy-800 py-1"
              >
                Features
              </a>
              <a 
                href="#how-it-works" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-navy-800 py-1"
              >
                How It Works
              </a>
              <a 
                href="#security" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-navy-800 py-1"
              >
                Security & Privacy
              </a>
              <a 
                href="#extension" 
                onClick={() => setIsMobileMenuOpen(false)}
                className="hover:text-navy-800 py-1"
              >
                Chrome Extension
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100 flex flex-col gap-2.5">
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-lightup-subtle text-center text-xs font-bold text-navy-800 py-2.5 rounded-xl border border-slate-200"
              >
                Sign In
              </Link>
              <Link
                href="/login"
                onClick={() => setIsMobileMenuOpen(false)}
                className="btn-lightup text-center bg-navy-800 text-white text-xs font-bold py-2.5 rounded-xl shadow-xs flex items-center justify-center gap-2"
              >
                <span>Get Started Free</span>
                <ArrowRight size={14} className="text-cyan-400" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* 2. Hero Section */}
      <section className="relative pt-16 pb-20 overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-gradient-to-tr from-cyan-100/60 to-navy-100/40 blur-3xl -z-10 rounded-full pointer-events-none" />

        <div className="max-w-7xl mx-auto px-6 text-center space-y-6">
          {/* Eyebrow Badge */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs font-bold shadow-2xs">
            <Sparkles size={14} className="text-cyan-600" />
            <span>FormPilot AI 2.0 • Autonomous Context Engine</span>
          </div>

          {/* Main Headline */}
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-navy-800 tracking-tight max-w-4xl mx-auto leading-[1.12]">
            Stop Re-typing Forms. <br />
            <span className="bg-gradient-to-r from-navy-800 via-navy-700 to-cyan-600 bg-clip-text text-transparent">
              Fill Any Web Form with Grounded Document AI.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed font-normal">
            FormPilot AI analyzes job applications, grant proposals, and government portals on the fly. Grounded strictly in your verified Knowledge Base—zero hallucinations, visual confidence heatmaps, and autonomous deadline execution.
          </p>

          {/* CTAs with Lightup Effect */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2">
            <Link
              href="/login"
              className="btn-lightup w-full sm:w-auto bg-navy-800 hover:bg-navy-900 text-white text-sm font-bold px-7 py-3.5 rounded-xl shadow-md hover:shadow-lg flex items-center justify-center gap-2.5"
            >
              <span>Launch Web Workspace</span>
              <ArrowRight size={16} className="text-cyan-400" />
            </Link>

            <Link
              href="/dashboard"
              className="btn-lightup-subtle w-full sm:w-auto bg-white hover:bg-slate-50 text-navy-800 border border-slate-300 text-sm font-bold px-7 py-3.5 rounded-xl shadow-2xs hover:shadow-xs flex items-center justify-center gap-2"
            >
              <Cpu size={16} className="text-cyan-600" />
              <span>Explore Interactive Demo</span>
            </Link>
          </div>

          {/* Social Proof Bar */}
          <div className="pt-6 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500 font-medium">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>Zero Hallucinations</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-cyan-600" />
              <span>Real-Time Citations</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-navy-800" />
              <span>Strict Email Verification</span>
            </div>
            <span className="hidden sm:inline">•</span>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 size={15} className="text-emerald-600" />
              <span>&lt; 3s Execution Speed</span>
            </div>
          </div>
        </div>

        {/* 3. Product Visual Mockup Showcase */}
        <div className="max-w-6xl mx-auto px-6 mt-12">
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl overflow-hidden">
            {/* Window Topbar */}
            <div className="bg-slate-100/80 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-rose-400"></div>
                <div className="w-3 h-3 rounded-full bg-amber-400"></div>
                <div className="w-3 h-3 rounded-full bg-emerald-400"></div>
                <span className="ml-2 text-xs font-mono text-slate-500 font-medium">
                  https://jobs.lever.co/company/staff-software-engineer/apply
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
                <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                <span>FormPilot Copilot Active</span>
              </div>
            </div>

            {/* Split Screen Showcase: Target Form on Left, FormPilot Extension on Right */}
            <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[440px]">
              {/* Left: Target Form with Confidence Heatmap */}
              <div className="lg:col-span-8 p-6 sm:p-8 bg-white border-r border-slate-200 space-y-5">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
                    Live Form Analysis
                  </span>
                  <h3 className="text-lg font-bold text-navy-800">Application: Staff Software Engineer</h3>
                  <p className="text-xs text-slate-500">Universal DOM parser automatically identified 6 inputs.</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Field 1: High Confidence */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-800">Full Name *</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Zap size={10} /> 99% Confirmed
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/20 border-2 border-emerald-500 rounded-xl text-xs text-slate-800 font-medium">
                      Alex Morgan
                    </div>
                    <span className="text-[10px] text-slate-400 block">Cited from: Resume_2026.pdf (Page 1)</span>
                  </div>

                  {/* Field 2: High Confidence */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-800">Email Address *</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Zap size={10} /> 99% Confirmed
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/20 border-2 border-emerald-500 rounded-xl text-xs text-slate-800 font-medium">
                      alex.morgan@example.com
                    </div>
                    <span className="text-[10px] text-slate-400 block">Verified primary contact</span>
                  </div>

                  {/* Field 3: High Confidence */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-800">Phone Number *</label>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Zap size={10} /> 96% Confirmed
                      </span>
                    </div>
                    <div className="p-2.5 bg-emerald-50/20 border-2 border-emerald-500 rounded-xl text-xs text-slate-800 font-medium">
                      +1 (555) 019-2834
                    </div>
                    <span className="text-[10px] text-slate-400 block">Standard international format</span>
                  </div>

                  {/* Field 4: Amber Confidence */}
                  <div className="space-y-1 relative">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-navy-800">Years of Experience</label>
                      <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Zap size={10} /> 85% Review
                      </span>
                    </div>
                    <div className="p-2.5 bg-amber-50/20 border-2 border-amber-500 rounded-xl text-xs text-slate-800 font-medium">
                      4+ Years (Fullstack & AI)
                    </div>
                    <span className="text-[10px] text-slate-400 block">Inferred from employment history</span>
                  </div>
                </div>

                {/* Free Text Essay Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800">Why are you a fit for this role?</label>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                      ⚡ 92% Synthesized
                    </span>
                  </div>
                  <div className="p-3 bg-emerald-50/15 border-2 border-emerald-500 rounded-xl text-xs text-slate-700 leading-relaxed font-normal">
                    With over 4 years of engineering scalable TypeScript, Next.js, and autonomous multi-agent systems, I lead cross-functional architecture and deliver reliable production pipelines.
                  </div>
                </div>
              </div>

              {/* Right: FormPilot Side Panel Simulation */}
              <div className="lg:col-span-4 p-5 bg-slate-50 flex flex-col justify-between space-y-4">
                <div className="space-y-4">
                  {/* Sidepanel Header */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-200">
                    <div className="flex items-center gap-2">
                      <img src="/brand/logo-mark.png" alt="Mark" className="w-8 h-8 object-contain" />
                      <span className="font-extrabold text-xs text-navy-800 tracking-wide">
                        FORM PILOT <span className="text-cyan-600">AI</span>
                      </span>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-cyan-100 text-cyan-800">
                      Side Panel
                    </span>
                  </div>

                  {/* Primary Fill Form Button */}
                  <div className="bg-navy-800 text-white rounded-xl p-3 flex items-center justify-center gap-2 text-xs font-bold shadow-sm">
                    <Zap size={14} className="text-cyan-400" />
                    <span>Form Successfully Filled</span>
                  </div>

                  {/* Active Document Scope Switcher */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-navy-800 uppercase tracking-wider block">
                      Active Knowledge Base
                    </span>
                    <div className="space-y-2">
                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                        <span className="text-xs font-medium text-navy-800 truncate max-w-[150px]">
                          Resume_2026.pdf
                        </span>
                        <div className="w-8 h-4.5 bg-cyan-500 rounded-full flex items-center justify-end px-0.5">
                          <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
                        <span className="text-xs font-medium text-navy-800 truncate max-w-[150px]">
                          Tax_Return_1040.pdf
                        </span>
                        <div className="w-8 h-4.5 bg-cyan-500 rounded-full flex items-center justify-end px-0.5">
                          <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                        </div>
                      </div>

                      <div className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between opacity-60">
                        <span className="text-xs font-medium text-slate-500 truncate max-w-[150px]">
                          Passport_Scan.pdf
                        </span>
                        <div className="w-8 h-4.5 bg-slate-300 rounded-full flex items-center justify-start px-0.5">
                          <div className="w-3.5 h-3.5 bg-white rounded-full"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Floating Micro-Prompt Bar */}
                <div className="bg-white border border-slate-200 p-2.5 rounded-xl shadow-xs space-y-1.5">
                  <div className="flex items-center gap-1.5 text-[11px] font-semibold text-navy-800">
                    <Sparkles size={12} className="text-cyan-600" />
                    <span>In-Page Micro-Prompt Bar</span>
                  </div>
                  <div className="text-[11px] text-slate-500 italic bg-slate-50 p-1.5 rounded-lg border border-slate-200">
                    &quot;Make answer 3 more concise and emphasize Kubernetes&quot;
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 4. Core Features Grid */}
      <section id="features" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
              Engine Capabilities
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-800 tracking-tight">
              Everything Needed for Zero-Effort Form Completion
            </h2>
            <p className="text-sm text-slate-600">
              From individual job seeker portals to high-volume multi-site application pipelines.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <FileStack size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Multi-Document Knowledge Base</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Upload resumes, tax filings, diplomas, and IDs. Toggle documents on or off with 1 click to strictly scope what data is exposed to any given form.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <CalendarClock size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Deadline Reminders & Auto-Action</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Set deadline alerts for scholarship and grant portals. If unreviewed before the deadline, our autonomous agent automatically executes and submits!
              </p>
            </div>

            {/* Feature 3 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <Bot size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Bulk Multi-Site Runner</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Paste 20+ form URLs at once. A fleet of background agents visits each page, reasons over your KB, populates inputs, and generates batch reports.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <Zap size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Confidence Heatmap & Citations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Filled fields are color-coded: 🟢 90%+ certainty, 🟡 needs review, 🔴 missing data. Click any badge to view the exact document passage citation.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <Layers size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Multi-Step Form Navigator</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detects multi-page wizards (&quot;Step 1 of 4&quot;), preserves input state across SPA route transitions, and navigates sequential pages seamlessly.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="bg-slate-50 rounded-2xl border border-slate-200 p-6 space-y-3 hover:border-cyan-400 transition hover:shadow-xs">
              <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-400 flex items-center justify-center font-bold">
                <SlidersHorizontal size={20} />
              </div>
              <h3 className="font-bold text-base text-navy-800">Tone & Micro-Prompt Directives</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Configure default voice (Professional, Informative, Requesting, Casual) or issue on-the-fly conversational tweaks directly on the target webpage.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. How It Works Section */}
      <section id="how-it-works" className="py-20 bg-[#F8FAFC]">
        <div className="max-w-7xl mx-auto px-6 space-y-12">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-cyan-700 bg-cyan-50 px-3 py-1 rounded-full border border-cyan-200">
              Simple 3-Step Flow
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-800 tracking-tight">
              How FormPilot AI Automates Your Workflow
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-4">
              <span className="text-3xl font-black text-cyan-500 font-mono">01</span>
              <h3 className="font-bold text-lg text-navy-800">Upload Your Documents</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Drop your resumes, official transcripts, tax declarations, and identity proof into your secure Knowledge Base vault. Add semantic tags so the AI knows what lives in each file.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-4">
              <span className="text-3xl font-black text-cyan-500 font-mono">02</span>
              <h3 className="font-bold text-lg text-navy-800">Open Extension on Any Form</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Navigate to any website. Click the FormPilot extension side panel. The Universal DOM Analyzer traverses custom dropdowns, react inputs, and file upload fields instantly.
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-3xl p-7 shadow-xs space-y-4">
              <span className="text-3xl font-black text-cyan-500 font-mono">03</span>
              <h3 className="font-bold text-lg text-navy-800">Review & Submit with Citations</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Inspect visual confidence highlights right on the form fields. Verify citations with a single hover, or adjust phrasing using the In-Page Micro-Prompt Bar.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 6. Security & Privacy Section */}
      <section id="security" className="py-20 bg-white border-t border-slate-200">
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-navy-800 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/20 text-cyan-300 text-xs font-semibold">
                <ShieldCheck size={14} className="text-cyan-400" />
                <span>Enterprise Grade Security</span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
                Your Credentials. Your Vault. Zero Document Sale.
              </h2>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                We enforce client-side PII protection and strict grounding policies. Your documents are used exclusively to reason over form fields you explicitly choose to fill—never sold, rented, or shared with third-party data brokers.
              </p>
              <div className="pt-2 flex flex-wrap gap-4 text-xs text-cyan-200 font-medium">
                <span>✓ Client-Side PII Encryption</span>
                <span>✓ Strict Anti-Hallucination Grounding</span>
                <span>✓ Instant Scope Disabling</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 7. Bottom CTA Section */}
      <section className="py-20 bg-[#F8FAFC] text-center">
        <div className="max-w-4xl mx-auto px-6 space-y-6">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-navy-800 tracking-tight">
            Ready to Automate Your Next 100 Web Forms?
          </h2>
          <p className="text-sm text-slate-600 max-w-xl mx-auto">
            Create your account today with a standard primary email and start experiencing context-grounded autofill in minutes.
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            <Link
              href="/login"
              className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-sm font-bold px-8 py-3.5 rounded-xl shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span>Get Started Free</span>
              <ArrowRight size={16} className="text-cyan-400" />
            </Link>
          </div>
        </div>
      </section>

      {/* 8. Footer - Expanded Width */}
      <footer className="bg-white border-t border-slate-200 py-10">
        <div className="max-w-[1540px] mx-auto px-6 sm:px-10 lg:px-12 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src="/brand/logo-full.png" alt="FormPilot AI" className="h-11 w-auto object-contain" />
          </div>
          <p className="text-xs text-slate-500 font-medium">
            © {new Date().getFullYear()} FormPilot AI. Grounded Context-Aware Operations.
          </p>
          <div className="flex items-center gap-4 text-xs font-semibold text-slate-500">
            <Link href="/login" className="hover:text-navy-800 transition">Sign In</Link>
            <Link href="/dashboard" className="hover:text-navy-800 transition">Workspace</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
