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
  tabKey: 'kb' | 'reminders' | 'bulk' | 'history';
  icon: React.ReactNode;
  hint: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    targetId: 'tour-kb-nav',
    tabKey: 'kb',
    badge: 'Step 1 of 4',
    title: 'Document Knowledge Base & Scoping',
    description: 'Control exactly which documents FormPilot can access. Toggle documents on/off to scope retrieval, and add semantic descriptions so the AI understands each document context.',
    icon: <FileStack className="text-cyan-500" size={20} />,
    hint: 'Pro-tip: Disable sensitive identity scans unless a form explicitly requests passport verification.'
  },
  {
    targetId: 'tour-reminders-nav',
    tabKey: 'reminders',
    badge: 'Step 2 of 4',
    title: 'Autonomous Form Reminders & Actions',
    description: 'Attach deadlines to specific website forms. If not manually submitted in time, FormPilot executes your autonomous action policy (Notify, Auto-Draft, or Auto-Submit).',
    icon: <CalendarClock className="text-cyan-500" size={20} />,
    hint: 'Autonomous submission will only trigger if field confidence exceeds your required threshold (e.g. 85%).'
  },
  {
    targetId: 'tour-bulk-nav',
    tabKey: 'bulk',
    badge: 'Step 3 of 4',
    title: 'Bulk Multi-Site Form Fleet',
    description: 'Paste batches of job applications or grant portals. FormPilot fans out background agent workers to analyze DOMs and fill fields across multiple sites simultaneously.',
    icon: <Bot className="text-cyan-500" size={20} />,
    hint: 'Each bulk job logs granular field counts and live agent status.'
  },
  {
    targetId: 'tour-history-nav',
    tabKey: 'history',
    badge: 'Step 4 of 4',
    title: 'Confidence Heatmaps & Citations',
    description: 'Audit every submission with color-coded heatmap scoring (🟢 ≥90% verified, 🟡 50-89% inferred, 🔴 <50% low confidence) and exact source document citations.',
    icon: <History className="text-cyan-500" size={20} />,
    hint: 'Click any historical log to view line-by-line questions, answers, and confidence levels.'
  }
];

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
  onStepChange: (tabKey: 'kb' | 'reminders' | 'bulk' | 'history') => void;
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
  const [targetBox, setTargetBox] = useState<{ top: number; left: number; width: number; height: number } | null>(null);

  const step = TOUR_STEPS[currentStepIndex];

  // Update target element focus, cutout bounds, and cursor position
  useEffect(() => {
    if (!isOpen) return;

    onStepChange(step.tabKey);

    const updatePosition = () => {
      const el = document.getElementById(step.targetId);
      if (el) {
        const rect = el.getBoundingClientRect();
        setTargetBox({
          top: rect.top,
          left: rect.left,
          width: rect.width,
          height: rect.height
        });

        const rawX = rect.right - 18;
        const rawY = rect.top + rect.height / 2;
        // Clamp cursor within safe viewport bounds
        setCursorPos({
          x: Math.max(36, Math.min(window.innerWidth - 36, rawX)),
          y: Math.max(36, Math.min(window.innerHeight - 36, rawY))
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
      {/* Crystal-Clear Cutout Spotlight Window (No blur on target button) */}
      {targetBox ? (
        <div
          className="fixed pointer-events-auto transition-all duration-300 ease-out z-40 cursor-pointer"
          style={{
            top: `${Math.max(0, targetBox.top - 5)}px`,
            left: `${Math.max(0, targetBox.left - 5)}px`,
            width: `${targetBox.width + 10}px`,
            height: `${targetBox.height + 10}px`,
            borderRadius: '14px',
            boxShadow: '0 0 0 9999px rgba(11, 28, 61, 0.65), 0 0 24px 6px rgba(0, 186, 198, 0.75)',
            border: '2px solid #00BAC6',
            backgroundColor: 'transparent'
          }}
          onClick={handleNext}
          title="Click to advance tour"
        />
      ) : (
        <div 
          className="absolute inset-0 bg-navy-950/60 pointer-events-auto transition-opacity duration-300" 
          onClick={onClose}
        />
      )}

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

      {/* Floating Guided Tour Card - Fully Responsive on Mobile & Desktop */}
      <div className="fixed inset-x-4 bottom-4 sm:inset-x-auto sm:bottom-8 sm:right-8 z-50 pointer-events-auto sm:max-w-md w-auto sm:w-full">
        <div className="bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/80 dark:border-slate-800 rounded-3xl shadow-[0_20px_60px_-15px_rgba(17,38,79,0.25),0_0_0_1px_rgba(226,232,240,0.8)] dark:shadow-[0_20px_60px_-15px_rgba(0,0,0,0.6)] p-6 space-y-5 transition-all text-slate-800 dark:text-slate-100">
          {/* Card Top Row */}
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-cyan-50 dark:bg-slate-800 border border-cyan-200 dark:border-slate-700 flex items-center justify-center">
                {step.icon}
              </div>
              <div>
                <span className="text-[10px] font-extrabold text-cyan-700 dark:text-cyan-300 bg-cyan-50 dark:bg-cyan-950 px-2.5 py-0.5 rounded-full uppercase tracking-wider border border-cyan-200 dark:border-cyan-800">
                  {step.badge}
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              title="Skip Tour"
            >
              <X size={16} />
            </button>
          </div>

          {/* Card Content */}
          <div className="space-y-2">
            <h3 className="text-base font-extrabold text-navy-800 dark:text-white tracking-tight">
              {step.title}
            </h3>
            <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
              {step.description}
            </p>
          </div>

          {/* Pro Tip Callout */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-2">
            <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400 shrink-0 mt-0.5" />
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
                        ? 'w-2 bg-navy-800 dark:bg-cyan-400' 
                        : 'w-2 bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {/* Navigation Buttons */}
            <div className="flex items-center gap-2">
              {currentStepIndex > 0 && (
                <button
                  onClick={handlePrev}
                  className="btn-lightup-subtle px-3 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center gap-1.5"
                >
                  <ArrowLeft size={13} />
                  <span>Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 shadow-xs"
              >
                <span>{currentStepIndex === TOUR_STEPS.length - 1 ? 'Finish Tour' : 'Next Step'}</span>
                {currentStepIndex === TOUR_STEPS.length - 1 ? (
                  <CheckCircle2 size={14} className="text-cyan-400 dark:text-white" />
                ) : (
                  <ArrowRight size={14} className="text-cyan-400 dark:text-white" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
