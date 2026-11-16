'use client';

import React, { useState } from 'react';
import { 
  Sparkles, 
  CheckCircle2, 
  User, 
  Briefcase, 
  Globe, 
  CheckSquare, 
  ArrowRight,
  Bot
} from 'lucide-react';
import { PersonaTone } from '@formpilot/shared';

export interface UserInitialProfile {
  tone: PersonaTone;
  profession: string;
  referralSource: string;
  primaryUseCases: string[];
}

interface InitialInfoModalProps {
  isOpen: boolean;
  userName?: string;
  onSave: (profile: UserInitialProfile) => void;
  onSkip?: () => void;
}

const TONES: { id: PersonaTone; title: string; desc: string }[] = [
  { id: 'professional', title: 'Professional', desc: 'Formal, articulate & executive-ready' },
  { id: 'informative', title: 'Informative', desc: 'Precise, factual, evidence-focused' },
  { id: 'requesting', title: 'Requesting', desc: 'Polite, persuasive & petitioning' },
  { id: 'casual', title: 'Casual', desc: 'Approachable, warm & concise' },
];

const PROFESSIONS = [
  'Software Engineer / Tech',
  'Founder / Business Owner',
  'Student / Researcher',
  'Legal & Compliance',
  'Operations & Admin',
  'Finance & Accounting',
  'Other'
];

const REFERRAL_SOURCES = [
  'Google / Web Search',
  'GitHub / Developer Community',
  'Twitter / X',
  'Colleague / Friend',
  'LinkedIn',
  'Product Hunt',
  'Other'
];

const USE_CASES = [
  'Job & Career Applications',
  'Visa & Immigration Filings',
  'Grants & Scholarships',
  'Financial & Tax Portals',
  'Company Internal Tools'
];

export default function InitialInfoModal({
  isOpen,
  userName = 'Pilot',
  onSave,
  onSkip
}: InitialInfoModalProps) {
  const [tone, setTone] = useState<PersonaTone>('professional');
  const [profession, setProfession] = useState<string>(PROFESSIONS[0]);
  const [referralSource, setReferralSource] = useState<string>(REFERRAL_SOURCES[0]);
  const [selectedUseCases, setSelectedUseCases] = useState<string[]>([USE_CASES[0]]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const toggleUseCase = (item: string) => {
    setSelectedUseCases(prev => 
      prev.includes(item) ? prev.filter(u => u !== item) : [...prev, item]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setTimeout(() => {
      onSave({
        tone,
        profession,
        referralSource,
        primaryUseCases: selectedUseCases
      });
      setIsSubmitting(false);
    }, 300);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-navy-950/70 backdrop-blur-xs">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 sm:px-8 pt-7 pb-5 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-r from-cyan-50/50 via-white to-white dark:from-slate-900 dark:to-slate-900">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <Bot size={22} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
                  Welcome Setup
                </span>
                <span className="text-xs text-slate-400">Step 1 of 1</span>
              </div>
              <h2 className="text-lg sm:text-xl font-extrabold text-navy-800 dark:text-white tracking-tight mt-0.5">
                Configure Your AI Copilot, {userName}
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
            Answer a few quick questions so FormPilot AI can adapt its reasoning tone and contextual fill strategies to your exact needs.
          </p>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="overflow-y-auto px-6 sm:px-8 py-6 space-y-6 flex-1">
          
          {/* Question 1: Preferred Agent Tone */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles size={14} className="text-cyan-600" />
              <span>1. Preferred Agent Tone</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {TONES.map(item => (
                <button
                  type="button"
                  key={item.id}
                  onClick={() => setTone(item.id)}
                  className={`p-3.5 rounded-2xl border text-left transition-all ${
                    tone === item.id
                      ? 'bg-navy-800 border-navy-800 dark:bg-cyan-600 dark:border-cyan-600 text-white shadow-sm'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-400'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs">{item.title}</span>
                    {tone === item.id && <CheckCircle2 size={14} className="text-cyan-400 dark:text-white" />}
                  </div>
                  <p className={`text-[11px] mt-1 ${tone === item.id ? 'text-slate-200 dark:text-cyan-100' : 'text-slate-500 dark:text-slate-400'}`}>
                    {item.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Question 2: Profession */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Briefcase size={14} className="text-cyan-600" />
              <span>2. What is your profession or primary role?</span>
            </label>
            <select
              value={profession}
              onChange={(e) => setProfession(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
            >
              {PROFESSIONS.map(p => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>
          </div>

          {/* Question 3: How did you hear about us? */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <Globe size={14} className="text-cyan-600" />
              <span>3. How did you hear about FormPilot AI?</span>
            </label>
            <select
              value={referralSource}
              onChange={(e) => setReferralSource(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
            >
              {REFERRAL_SOURCES.map(r => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          {/* Question 4: Primary Use Cases */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
              <CheckSquare size={14} className="text-cyan-600" />
              <span>4. What forms do you plan to automate? (Select all that apply)</span>
            </label>
            <div className="flex flex-wrap gap-2 pt-1">
              {USE_CASES.map(item => {
                const isSelected = selectedUseCases.includes(item);
                return (
                  <button
                    type="button"
                    key={item}
                    onClick={() => toggleUseCase(item)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition ${
                      isSelected
                        ? 'bg-cyan-50 dark:bg-cyan-950/80 border-cyan-400 text-cyan-800 dark:text-cyan-200'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}{item}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Footer Submit */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {onSkip ? (
              <button
                type="button"
                onClick={onSkip}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 font-semibold"
              >
                Skip for now
              </button>
            ) : <div />}

            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white px-5 py-2.5 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-sm"
            >
              <span>{isSubmitting ? 'Saving...' : 'Save & Launch Copilot'}</span>
              <ArrowRight size={14} className="text-cyan-400" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
