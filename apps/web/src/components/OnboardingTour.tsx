'use client';

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  ArrowRight, 
  ArrowLeft, 
  X, 
  CheckCircle2, 
  MousePointer2,
  FileStack,
  CalendarClock,
  Bot,
  History,
  SlidersHorizontal
} from 'lucide-react';

export interface TourStep {
  title: string;
  badge: string;
  description: string;
  targetId: string;
  tabKey: 'kb' | 'reminders' | 'bulk' | 'history' | 'settings';
  icon: React.ReactNode;
  hint: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-kb-nav',
    tabKey: 'kb',
    badge: 'Step 1 of 5',
    title: 'Document Knowledge Base & Scoping',
    description: 'Control exactly which documents FormPilot can access. Toggle documents on/off to scope retrieval, and add semantic descriptions so the AI understands each document context.',
    icon: <FileStack className="text-cyan-500" size={20} />,
    hint: 'Pro-tip: Disable sensitive identity scans unless a form explicitly requests passport verification.'
  },
  {
    targetId: 'tour-reminders-nav',
    tabKey: 'reminders',
    badge: 'Step 2 of 5',
    title: 'Autonomous Form Reminders & Actions',
    description: 'Attach deadlines to specific website forms. If not manually submitted in time, FormPilot executes your autonomous action policy (Notify, Auto-Draft, or Auto-Submit).',
    icon: <CalendarClock className="text-cyan-500" size={20} />,
    hint: 'Autonomous submission will only trigger if field confidence exceeds your required threshold (e.g. 85%).'
  },
  {
    targetId: 'tour-bulk-nav',
    tabKey: 'bulk',
    badge: 'Step 3 of 5',
    title: 'Bulk Multi-Site Form Fleet',
    description: 'Paste batches of job applications or grant portals. FormPilot fans out background agent workers to analyze DOMs and fill fields across multiple sites simultaneously.',
    icon: <Bot className="text-cyan-500" size={20} />,
    hint: 'Each bulk job logs granular field counts and live agent status.'
  },
  {
    targetId: 'tour-history-nav',
    tabKey: 'history',
    badge: 'Step 4 of 5',
    title: 'Confidence Heatmaps & Citations',
    description: 'Audit every submission with color-coded heatmap scoring (🟢 ≥90% verified, 🟡 50-89% inferred, 🔴 <50% low confidence) and exact source document citations.',
    icon: <History className="text-cyan-500" size={20} />,
    hint: 'Click any historical log to view line-by-line questions, answers, and confidence levels.'
  },
  {
    targetId: 'tour-settings-nav',
    tabKey: 'settings',
    badge: 'Step 5 of 5',
    title: 'Persona Tone & System Directives',
    description: 'Tailor FormPilot’s voice for different types of forms (Requesting, Informative, Professional, Casual) and inject custom instructions into the system prompt.',
    icon: <SlidersHorizontal className="text-cyan-500" size={20} />,
    hint: 'Custom instructions are injected into all autonomous browser filling operations.'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStepChange: (tabKey: 'kb' | 'reminders' | 'bulk' | 'history' | 'settings') => void;
  onComplete: () => void;
}

export default function OnboardingTour({
  isOpen,
  onClose,
  onStepChange,
  onComplete
}: OnboardingTourProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [cursorPos, setCursorPos] = useState<{ x: number; y: number } | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Update target element focus and cursor position
  useEffect(() => {
    if (!isOpen) return;

    onStepChange(step.tabKey);

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        // Position cursor slightly inside/beside the element
        setCursorPos({
          x: rect.right - 24,
          y: rect.top + rect.height / 2
        });
      }
    };

    updatePosition();
    const timer = setTimeout(updatePosition, 100);
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      clearTimeout(timer);
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isOpen, currentStepIndex, step.targetId, step.tabKey, onStepChange]);

  if (!isOpen) return null;

  const handleNext = () => {
    if (currentStepIndex < TOUR_STEPS.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      onComplete();
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  return (
    <div className="fixed inset-0 z-50 pointer-events-none select-none">
      {/* Semi-translucent dark vignette backdrop to focus attention */}
      <div 
        className="absolute inset-0 bg-navy-950/40 backdrop-blur-[2px] pointer-events-auto transition-opacity duration-300" 
        onClick={onClose}
      />

      {/* Guided Animated Cursor */}
      {cursorPos && (
        <div 
          className="fixed z-50 transition-all duration-500 ease-out pointer-events-none"
          style={{
            left: `${cursorPos.x}px`,
            top: `${cursorPos.y}px`,
            transform: 'translate(-50%, -50%)'
          }}
        >
          {/* Pulsing Target Radar Halo */}
          <div className="relative">
            <span className="animate-ping absolute -top-4 -left-4 w-8 h-8 rounded-full bg-cyan-400 opacity-75"></span>
            <span className="absolute -top-3 -left-3 w-6 h-6 rounded-full bg-cyan-500/40 backdrop-blur-xs"></span>
            
            {/* SVG Cursor Pointer with Glow */}
            <div className="relative z-10 flex items-center gap-1.5 drop-shadow-[0_4px_12px_rgba(0,186,198,0.5)]">
              <MousePointer2 
                size={28} 
                className="text-white fill-navy-800 stroke-[1.5] -rotate-12 transform" 
              />
              <span className="bg-navy-800 text-cyan-300 border border-cyan-400/80 text-[10px] font-bold px-2 py-0.5 rounded-full shadow-md whitespace-nowrap animate-bounce">
                Click here
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Floating Guided Tour Card */}
      <div className="fixed bottom-8 right-6 sm:right-10 z-50 pointer-events-auto max-w-md w-full">
        <div className="bg-white/95 backdrop-blur-xl border border-white/80 rounded-3xl shadow-[0_20px_60px_-15px_rgba(17,38,79,0.25),0_0_0_1px_rgba(226,232,240,0.8)] p-6 space-y-5 transition-all">
          {/* Card Top Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-cyan-700 bg-cyan-50 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-200">
                  {step.badge}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition"
              title="Skip Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Card Content */}
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-navy-800 tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Pro Tip Callout */}
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 flex items-start gap-2">
            <Sparkles size={14} className="text-cyan-600 shrink-0 mt-0.5" />
            <span>{step.hint}</span>
          </div>

          {/* Bottom Step Indicator & Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {/* Step Dots */}
            <div className="flex items-center gap-1.5">
              {TOUR_STEPS.map((_, idx) => (
                <div 
                  key={idx}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentStepIndex 
                      ? 'w-6 bg-cyan-500' 
                      : idx < currentStepIndex 
                        ? 'w-2 bg-navy-800' 
                        : 'w-2 bg-slate-200'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="btn-lightup-subtle px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 border border-slate-200 hover:border-slate-300 transition flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <CheckCircle2 size={14} className="text-cyan-400" />
                ) : (
                  <ArrowRight size={14} className="text-cyan-400" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
