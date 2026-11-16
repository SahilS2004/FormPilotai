'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FileStack, 
  CalendarClock, 
  Bot, 
  History, 
  SlidersHorizontal, 
  Plus, 
  CheckCircle2, 
  AlertTriangle, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  ShieldCheck, 
  Send,
  Search,
  FileText,
  Clock,
  ArrowRight,
  Layers,
  Pencil,
  X,
  FileCheck2,
  ChevronRight,
  CheckSquare,
  Compass,
  RotateCcw
} from 'lucide-react';
import OnboardingTour from '@/components/OnboardingTour';

const DEMO_MILESTONES = [
  { id: 'kb', label: '1. Explore KB Scopes', sub: 'Enable docs & descriptions', tab: 'kb' as const },
  { id: 'reminders', label: '2. Form Reminders', sub: 'Set auto-action policies', tab: 'reminders' as const },
  { id: 'bulk', label: '3. Bulk Multi-Site', sub: 'Fleet form processing', tab: 'bulk' as const },
  { id: 'history', label: '4. Fill History & Audit', sub: 'Confidence heatmaps', tab: 'history' as const },
  { id: 'settings', label: '5. Persona & Tone', sub: 'System directives', tab: 'settings' as const },
];
import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  PersonaTone, 
  DocumentRecommendation 
} from '@formpilot/shared';
import { 
  documentsStore, 
  remindersStore, 
  bulkJobsStore, 
  historyStore, 
  promptConfigStore, 
  gapRecommendationsStore 
} from '@/lib/store';

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'kb' | 'reminders' | 'bulk' | 'history' | 'settings'>('kb');
  
  // Onboarding & Demo Checklist State
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(['kb']);
  const [isTourOpen, setIsTourOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      const savedMilestones = localStorage.getItem('formpilot_milestones');
      if (savedMilestones) {
        setCompletedMilestones(JSON.parse(savedMilestones));
      }
      const hasCompletedTour = localStorage.getItem('formpilot_tour_completed');
      if (!hasCompletedTour) {
        const timer = setTimeout(() => setIsTourOpen(true), 900);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleMilestoneClick = (tab: 'kb' | 'reminders' | 'bulk' | 'history' | 'settings', id: string) => {
    setActiveTab(tab);
    if (!completedMilestones.includes(id)) {
      const updated = [...completedMilestones, id];
      setCompletedMilestones(updated);
      try {
        localStorage.setItem('formpilot_milestones', JSON.stringify(updated));
        fetch('/api/onboarding', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stepKey: id })
        }).catch(() => {});
      } catch {}
    }
  };

  const handleResetChecklist = () => {
    const initial = ['kb'];
    setCompletedMilestones(initial);
    try {
      localStorage.setItem('formpilot_milestones', JSON.stringify(initial));
    } catch {}
  };
  
  // State for KB documents
  const [docs, setDocs] = useState<KBDocument[]>(documentsStore);
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // State for Reminders
  const [reminders, setReminders] = useState<FormReminder[]>(remindersStore);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [reminderUrl, setReminderUrl] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDeadline, setReminderDeadline] = useState('');
  const [reminderPolicy, setReminderPolicy] = useState<'notify_only' | 'auto_fill_draft' | 'auto_submit'>('auto_submit');
  const [reminderConfidence, setReminderConfidence] = useState(0.85);

  // State for Bulk Job
  const [bulkJobs, setBulkJobs] = useState<BulkFormJob[]>(bulkJobsStore);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [bulkAutoSubmit, setBulkAutoSubmit] = useState(false);
  const [bulkJobName, setBulkJobName] = useState('');
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  // State for Settings
  const [tone, setTone] = useState<PersonaTone>(promptConfigStore.tone);
  const [customPrompt, setCustomPrompt] = useState(promptConfigStore.customPromptAddons || '');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  // Handlers for Knowledge Base
  const handleToggleDoc = (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isEnabled: !d.isEnabled } : d))
    );
  };

  const handleSaveDescription = (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, description: editDescription } : d))
    );
    setEditingDocId(null);
  };

  const handleAddDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim()) return;

    const newDoc: KBDocument = {
      id: `doc_${Date.now()}`,
      name: newDocName.endsWith('.pdf') ? newDocName : `${newDocName}.pdf`,
      originalFilename: newDocName,
      mimeType: 'application/pdf',
      sizeBytes: 256000,
      description: newDocDesc || 'Verified user credential document containing profile data.',
      isEnabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setDocs([newDoc, ...docs]);
    setNewDocName('');
    setNewDocDesc('');
    setShowAddDocModal(false);
  };

  const handleDeleteDoc = (id: string) => {
    setDocs(docs.filter((d) => d.id !== id));
  };

  // Handlers for Reminders
  const handleAddReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderUrl.trim()) return;

    let domain = 'custom-site.com';
    try {
      domain = new URL(reminderUrl).hostname;
    } catch {}

    const newRem: FormReminder = {
      id: `rem_${Date.now()}`,
      websiteUrl: reminderUrl,
      domain,
      title: reminderTitle || `${domain} Form Deadline`,
      deadlineTimestamp: reminderDeadline ? new Date(reminderDeadline).toISOString() : new Date(Date.now() + 86400000 * 3).toISOString(),
      reminderWindowMinutes: 120,
      autoActionPolicy: reminderPolicy,
      minConfidenceThreshold: reminderConfidence,
      status: 'pending',
      tone,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setReminders([newRem, ...reminders]);
    setReminderUrl('');
    setReminderTitle('');
    setShowAddReminderModal(false);
  };

  // Handlers for Bulk Runner
  const handleStartBulkJob = () => {
    const raw = bulkUrlsText.split('\n').map((u) => u.trim()).filter((u) => u.length > 0);
    if (raw.length === 0) return;

    setIsBulkRunning(true);
    const newJob: BulkFormJob = {
      id: `bulk_${Date.now()}`,
      name: bulkJobName || `Batch Run - ${new Date().toLocaleTimeString()}`,
      status: 'running',
      autoSubmit: bulkAutoSubmit,
      activeDocIds: docs.filter((d) => d.isEnabled).map((d) => d.id),
      tone,
      totalCount: raw.length,
      completedCount: 0,
      failedCount: 0,
      createdAt: new Date().toISOString(),
      urls: raw.map((u, i) => {
        let domain = 'web-portal';
        try { domain = new URL(u).hostname; } catch {}
        return {
          id: `item_${Date.now()}_${i}`,
          url: u,
          domain,
          status: 'scanning',
          formTitle: `${domain} Application Form`,
          totalFieldsCount: 12,
          filledFieldsCount: 0,
          averageConfidence: 0.94
        };
      })
    };

    setBulkJobs([newJob, ...bulkJobs]);
    setBulkUrlsText('');
    setBulkJobName('');

    setTimeout(() => {
      setBulkJobs((prev) =>
        prev.map((job) => {
          if (job.id === newJob.id) {
            return {
              ...job,
              status: 'completed',
              completedCount: job.totalCount,
              completedAt: new Date().toISOString(),
              urls: job.urls.map((item) => ({
                ...item,
                status: bulkAutoSubmit ? 'submitted' : 'filled',
                filledFieldsCount: item.totalFieldsCount
              }))
            };
          }
          return job;
        })
      );
      setIsBulkRunning(false);
    }, 3000);
  };

  const handleSaveSettings = () => {
    promptConfigStore.tone = tone;
    promptConfigStore.customPromptAddons = customPrompt;
    setSaveSuccessMessage(true);
    setTimeout(() => setSaveSuccessMessage(false), 3000);
  };

  const activeDocsCount = docs.filter((d) => d.isEnabled).length;
  const filteredDocs = docs.filter((d) => 
    d.name.toLowerCase().includes(searchDocQuery.toLowerCase()) || 
    d.description.toLowerCase().includes(searchDocQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col lg:flex-row">
      {/* 1. Left-Stuck Sidebar */}
      <aside className="w-full lg:w-72 bg-white border-r border-slate-200 lg:h-screen lg:sticky lg:top-0 flex flex-col justify-between shrink-0 z-30 shadow-2xs">
        <div className="p-5 space-y-5 overflow-y-auto max-h-[calc(100vh-160px)]">
          {/* Logo Header at top of sidebar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <Link href="/" className="block">
              <img 
                src="/brand/logo-full.png" 
                alt="FormPilot AI" 
                className="h-12 sm:h-13 w-auto object-contain cursor-pointer transition hover:opacity-90"
              />
            </Link>
          </div>

          {/* Navigation Links with Guided Tour Target IDs */}
          <nav className="space-y-1.5">
            <button
              id="tour-kb-nav"
              onClick={() => handleMilestoneClick('kb', 'kb')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'kb' 
                  ? 'bg-navy-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileStack size={18} className={activeTab === 'kb' ? 'text-cyan-400' : 'text-slate-400'} />
                <span>Knowledge Base</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'kb' ? 'bg-navy-700 text-cyan-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {docs.length}
              </span>
            </button>

            <button
              id="tour-reminders-nav"
              onClick={() => handleMilestoneClick('reminders', 'reminders')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'reminders' 
                  ? 'bg-navy-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarClock size={18} className={activeTab === 'reminders' ? 'text-cyan-400' : 'text-slate-400'} />
                <span>Reminders & Auto-Action</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'reminders' ? 'bg-navy-700 text-cyan-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {reminders.length}
              </span>
            </button>

            <button
              id="tour-bulk-nav"
              onClick={() => handleMilestoneClick('bulk', 'bulk')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'bulk' 
                  ? 'bg-navy-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className={activeTab === 'bulk' ? 'text-cyan-400' : 'text-slate-400'} />
                <span>Bulk Multi-Site Runner</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'bulk' ? 'bg-navy-700 text-cyan-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {bulkJobs.length}
              </span>
            </button>

            <button
              id="tour-history-nav"
              onClick={() => handleMilestoneClick('history', 'history')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'history' 
                  ? 'bg-navy-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <History size={18} className={activeTab === 'history' ? 'text-cyan-400' : 'text-slate-400'} />
                <span>Form Fill History</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'history' ? 'bg-navy-700 text-cyan-300' : 'bg-slate-100 text-slate-600'
              }`}>
                {historyStore.length}
              </span>
            </button>

            <button
              id="tour-settings-nav"
              onClick={() => handleMilestoneClick('settings', 'settings')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'settings' 
                  ? 'bg-navy-800 text-white shadow-sm' 
                  : 'text-slate-600 hover:bg-slate-50 hover:text-navy-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <SlidersHorizontal size={18} className={activeTab === 'settings' ? 'text-cyan-400' : 'text-slate-400'} />
                <span>Persona & Directives</span>
              </div>
            </button>
          </nav>

          {/* Initial Demo Checklist Widget for First-Time Users */}
          <div className="pt-4 border-t border-slate-100 space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <CheckSquare size={14} className="text-cyan-600" />
                <span className="text-xs font-extrabold text-navy-800 tracking-tight">Demo Checklist</span>
              </div>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                {completedMilestones.length}/5 Done
              </span>
            </div>

            {/* Progress Bar */}
            <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div 
                className="bg-gradient-to-r from-cyan-500 to-cyan-400 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round((completedMilestones.length / 5) * 100)}%` }}
              />
            </div>

            {/* Checklist Items */}
            <div className="space-y-1">
              {DEMO_MILESTONES.map((item) => {
                const isDone = completedMilestones.includes(item.id);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleMilestoneClick(item.tab, item.id)}
                    className={`w-full flex items-start gap-2.5 p-2 rounded-xl text-left transition group ${
                      activeTab === item.tab 
                        ? 'bg-slate-100/90 shadow-2xs' 
                        : 'hover:bg-slate-50'
                    }`}
                  >
                    <div className="mt-0.5 shrink-0">
                      {isDone ? (
                        <CheckCircle2 size={13} className="text-cyan-600 fill-cyan-50" />
                      ) : (
                        <div className="w-3 h-3 rounded-full border border-slate-300 group-hover:border-cyan-400 transition" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`text-[11px] font-bold leading-tight ${
                        isDone ? 'line-through text-slate-400' : 'text-navy-800'
                      }`}>
                        {item.label}
                      </p>
                      <span className="text-[9.5px] text-slate-500 block truncate">
                        {item.sub}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Quick Tour Launcher & Reset */}
            <div className="pt-2 flex items-center justify-between text-[11px] border-t border-slate-100">
              <button
                onClick={() => setIsTourOpen(true)}
                className="text-cyan-700 hover:text-cyan-800 font-bold flex items-center gap-1 transition"
              >
                <Compass size={12} className="animate-spin-slow" />
                <span>Guided Tour</span>
              </button>
              {completedMilestones.length === 5 && (
                <button
                  onClick={handleResetChecklist}
                  className="text-slate-400 hover:text-slate-600 flex items-center gap-1 transition text-[10px]"
                  title="Reset Demo Checklist"
                >
                  <RotateCcw size={10} />
                  <span>Reset</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Bottom of Sidebar */}
        <div className="p-5 border-t border-slate-100 space-y-3 bg-slate-50/50">
          <div className="flex items-center justify-between text-xs text-slate-600 bg-white p-2.5 rounded-xl border border-slate-200 shadow-2xs">
            <span className="font-medium">Active KB Scope</span>
            <span className="font-bold text-navy-800 bg-cyan-50 text-cyan-800 px-2 py-0.5 rounded-full border border-cyan-200 text-[10px]">
              {activeDocsCount} of {docs.length} Docs
            </span>
          </div>

          <div className="flex items-center gap-2 text-[11px] text-slate-500 font-medium px-1">
            <ShieldCheck size={14} className="text-cyan-600" />
            <span>Extension Ready</span>
          </div>

          <Link
            href="/"
            className="btn-lightup-subtle w-full flex items-center justify-center gap-1.5 text-xs text-slate-600 hover:text-navy-800 font-semibold p-2.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 transition shadow-2xs"
          >
            ← Back to Home
          </Link>
        </div>
      </aside>

      {/* 2. Main Workspace Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Floating Thick Fogged-Glass Navbar Header */}
        <header className="sticky top-4 sm:top-5 z-20 mx-4 sm:mx-6 lg:mx-8 mt-4 sm:mt-5 mb-2 px-6 sm:px-8 py-5 sm:py-6 min-h-[86px] sm:min-h-[94px] glass-fogged rounded-2xl sm:rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all">
          <div className="flex items-center gap-3.5 sm:gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-50 to-navy-50 border border-cyan-200/80 flex items-center justify-center text-cyan-600 shadow-xs shrink-0">
              {activeTab === 'kb' && <FileStack size={22} className="text-cyan-600" />}
              {activeTab === 'reminders' && <CalendarClock size={22} className="text-cyan-600" />}
              {activeTab === 'bulk' && <Bot size={22} className="text-cyan-600" />}
              {activeTab === 'history' && <History size={22} className="text-cyan-600" />}
              {activeTab === 'settings' && <SlidersHorizontal size={22} className="text-cyan-600" />}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-base sm:text-lg lg:text-xl font-extrabold text-navy-800 tracking-tight">
                  {activeTab === 'kb' && 'Document Knowledge Base'}
                  {activeTab === 'reminders' && 'Form Reminders & Auto-Action'}
                  {activeTab === 'bulk' && 'Bulk Multi-Site Runner'}
                  {activeTab === 'history' && 'Form Fill History & Audit'}
                  {activeTab === 'settings' && 'Persona & System Directives'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-50 text-navy-700 border border-navy-100">
                  Live
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium mt-0.5">
                Autonomous Form Completion & Grounded Context Engine
              </p>
            </div>
          </div>

          <div className="flex items-center flex-wrap gap-3 self-end sm:self-auto">
            {/* Guided Tour Trigger Button */}
            <button
              onClick={() => setIsTourOpen(true)}
              className="btn-lightup-subtle hidden lg:flex items-center gap-1.5 text-xs bg-white/80 hover:bg-white text-navy-800 font-bold px-3 py-2 rounded-xl border border-cyan-200/90 shadow-2xs transition"
            >
              <Compass size={14} className="text-cyan-600 animate-spin-slow" />
              <span>Guided Tour</span>
            </button>

            {/* Active KB Scope Chip */}
            <div className="hidden md:flex items-center gap-2 text-xs bg-white/70 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/80 text-slate-700 font-semibold shadow-2xs">
              <span className="text-slate-400 font-normal">Active Scope:</span>
              <span className="text-cyan-700 font-bold">{activeDocsCount}/{docs.length} Docs</span>
            </div>

            {/* Persona Tone Chip */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs bg-slate-100/90 backdrop-blur-sm px-3.5 py-2 rounded-xl border border-slate-200/80 text-slate-700 font-semibold">
              <span className="text-slate-400 font-normal">Tone:</span>
              <span className="capitalize text-navy-800 font-bold">{tone}</span>
            </div>

            {/* Retrieval Engine Status Indicator */}
            <div className="flex items-center gap-2.5 text-xs bg-cyan-50/90 backdrop-blur-sm px-4 py-2 rounded-xl border border-cyan-200/90 text-cyan-900 font-semibold shadow-2xs">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-cyan-500"></span>
              </span>
              <span>Grounded Engine Ready</span>
            </div>

            {/* User Profile / Status Badge */}
            <div className="w-10 h-10 rounded-xl bg-navy-800 text-cyan-300 font-extrabold text-xs flex items-center justify-center border border-navy-700 shadow-xs tracking-wider shrink-0 select-none">
              FP
            </div>
          </div>
        </header>

        {/* Dynamic Workspace Container */}
        <main className="p-4 sm:p-6 lg:p-8 pt-2 sm:pt-4 max-w-6xl w-full mx-auto space-y-6">
          {/* TAB 1: KNOWLEDGE BASE */}
          {activeTab === 'kb' && (
            <div className="space-y-6">
              {/* Header Title & Upload Action */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-800 tracking-tight">Document Knowledge Base</h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Manage reference documents. Add semantic descriptions and toggle scope on or off for web form autofills.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                >
                  <Plus size={16} className="text-cyan-400" />
                  <span>Upload Document</span>
                </button>
              </div>

              {/* AI Gap Suggestions Banner */}
              <div className="bg-gradient-to-r from-cyan-50/80 via-white to-white border border-cyan-200 rounded-2xl p-5 shadow-xs">
                <div className="flex items-start gap-3.5">
                  <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-xs shrink-0 mt-0.5">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-navy-800 uppercase tracking-wider">AI Document Gap Recommender</h3>
                      <span className="text-[10px] bg-cyan-100 text-cyan-800 font-semibold px-2 py-0.5 rounded-full">Automated Insight</span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {gapRecommendationsStore[0]?.reason}
                    </p>
                    <div className="pt-1 flex flex-wrap items-center gap-2.5">
                      <span className="text-xs font-semibold text-navy-800 bg-white px-2.5 py-1 rounded-lg border border-cyan-200 shadow-2xs">
                        Recommended: <strong>{gapRecommendationsStore[0]?.missingDocumentName}</strong>
                      </span>
                      <span className="text-[11px] text-slate-500">
                        Targeted Fields: {gapRecommendationsStore[0]?.targetedFields.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Search & Filter Bar */}
              <div className="bg-white border border-slate-200 rounded-xl p-2.5 flex items-center gap-3 shadow-xs">
                <Search size={16} className="text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search documents by name or semantic description..."
                  value={searchDocQuery}
                  onChange={(e) => setSearchDocQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-800 outline-none placeholder:text-slate-400"
                />
              </div>

              {/* Document List Cards */}
              <div className="space-y-3.5">
                {filteredDocs.map((doc) => (
                  <div 
                    key={doc.id}
                    className={`bg-white rounded-2xl border p-5 transition-all shadow-xs hover:shadow-sm ${
                      doc.isEnabled 
                        ? 'border-slate-200 hover:border-cyan-300' 
                        : 'border-slate-200/60 bg-slate-50/50 opacity-60'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4">
                        <div className="w-10 h-10 rounded-xl bg-navy-50 text-navy-800 border border-navy-100 flex items-center justify-center shrink-0 mt-0.5">
                          <FileText size={20} className="text-navy-800" />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-navy-800">{doc.name}</h4>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600 uppercase font-mono">
                              {(doc.sizeBytes / 1024).toFixed(0)} KB
                            </span>
                            {doc.isEnabled ? (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Active in Context
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">
                                Disabled
                              </span>
                            )}
                          </div>
                          
                          {/* Semantic Description with Inline Editor */}
                          {editingDocId === doc.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-white border border-cyan-400 rounded-xl p-2.5 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-200"
                                rows={2}
                                placeholder="Describe what data lives in this document to guide the AI..."
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveDescription(doc.id)}
                                  className="bg-navy-800 text-white text-xs px-3 py-1.5 rounded-lg font-semibold hover:bg-navy-900 transition"
                                >
                                  Save Description
                                </button>
                                <button
                                  onClick={() => setEditingDocId(null)}
                                  className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 font-medium"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div 
                              onClick={() => { setEditingDocId(doc.id); setEditDescription(doc.description); }}
                              className="group flex items-start gap-1.5 text-xs text-slate-600 cursor-pointer pt-1"
                              title="Click to edit semantic description"
                            >
                              <span className="font-semibold text-navy-800 shrink-0">Semantic Summary:</span>
                              <p className="group-hover:text-cyan-700 transition leading-relaxed">
                                {doc.description}
                              </p>
                              <Pencil size={12} className="text-slate-300 group-hover:text-cyan-600 shrink-0 mt-0.5 transition" />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Enable/Disable Toggle & Actions */}
                      <div className="flex items-center gap-3 shrink-0">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={doc.isEnabled}
                            onChange={() => handleToggleDoc(doc.id)}
                            className="sr-only peer"
                          />
                          <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                        </label>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-slate-400 hover:text-rose-600 transition p-2 rounded-lg hover:bg-slate-100"
                          title="Remove document from KB"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 2: REMINDERS & AUTONOMOUS ACTION */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-800 tracking-tight flex items-center gap-2">
                    Website Form Reminders & Autonomous Action
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                      Auto-Action Engine
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Track deadline-driven forms. If you haven&apos;t reviewed before the deadline, our autonomous agent will auto-fill or auto-submit!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddReminderModal(true)}
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                >
                  <Plus size={16} className="text-cyan-400" />
                  <span>Add Reminder</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {reminders.map((rem) => (
                  <div key={rem.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs hover:shadow-sm transition space-y-3">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-navy-800">{rem.title}</h4>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            rem.autoActionPolicy === 'auto_submit'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-cyan-50 text-cyan-700 border border-cyan-200'
                          }`}>
                            Policy: {rem.autoActionPolicy.replace(/_/g, ' ')}
                          </span>
                        </div>
                        <a 
                          href={rem.websiteUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-cyan-700 hover:text-cyan-900 font-medium hover:underline flex items-center gap-1"
                        >
                          {rem.websiteUrl} <ExternalLink size={11} />
                        </a>
                      </div>

                      <div className="text-right">
                        <span className="text-[11px] text-slate-500 block">Target Deadline</span>
                        <strong suppressHydrationWarning className="text-xs text-navy-800 font-semibold">
                          {isMounted 
                            ? `${new Date(rem.deadlineTimestamp).toLocaleDateString()} at ${new Date(rem.deadlineTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                            : 'Scheduled Deadline'
                          }
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2.5 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                      <div className="flex items-center gap-3">
                        <span>Min Confidence Required: <strong className="text-navy-800 font-semibold">{Math.round(rem.minConfidenceThreshold * 100)}%</strong></span>
                        <span>•</span>
                        <span>Tone: <strong className="capitalize text-navy-800 font-semibold">{rem.tone}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-cyan-500 animate-pulse"></span>
                        <span className="text-cyan-800 font-semibold text-xs">Autonomous Agent Active</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BULK MULTI-SITE RUNNER */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-800 tracking-tight flex items-center gap-2">
                  Bulk Multi-Site Form Queue Runner
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                    Fleet Dispatcher
                  </span>
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Enter multiple website form links to dispatch autonomous agents to scan, reason, and fill all forms in parallel.
                </p>
              </div>

              {/* Bulk Form Ingestion Card */}
              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800 uppercase tracking-wider">
                      Paste Form URLs (One per line)
                    </label>
                    <span className="text-[11px] text-slate-500">E.g., Greenhouse, Lever, Workday, Grant Portals</span>
                  </div>
                  <textarea
                    value={bulkUrlsText}
                    onChange={(e) => setBulkUrlsText(e.target.value)}
                    placeholder={"https://jobs.lever.co/company/role-1\nhttps://boards.greenhouse.io/startup/role-2\nhttps://ashbyhq.com/org/role-3"}
                    rows={4}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-900 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-slate-700 font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={bulkAutoSubmit}
                        onChange={(e) => setBulkAutoSubmit(e.target.checked)}
                        className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                      />
                      <span>Auto-Submit if Confidence $\ge 90\%$</span>
                    </label>

                    <div className="text-xs text-slate-500">
                      Using active documents: <strong className="text-navy-800">{activeDocsCount} files</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleStartBulkJob}
                    disabled={isBulkRunning || !bulkUrlsText.trim()}
                    className="btn-lightup bg-navy-800 hover:bg-navy-900 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                  >
                    <Send size={15} className="text-cyan-400" />
                    <span>{isBulkRunning ? 'Agents Running...' : 'Launch Fleet Runner'}</span>
                  </button>
                </div>
              </div>

              {/* Active / Past Bulk Batches */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-navy-800 uppercase tracking-wider">Recent Batch Runs</h3>
                {bulkJobs.map((job) => (
                  <div key={job.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-navy-50 text-navy-800">
                          <Layers size={18} />
                        </div>
                        <div>
                          <h4 className="font-bold text-sm text-navy-800">{job.name}</h4>
                          <span className="text-xs text-slate-500">{job.urls.length} sites in execution queue</span>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold capitalize">
                        {job.status}
                      </span>
                    </div>

                    {/* Progress Items */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {job.urls.map((item) => (
                        <div key={item.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-navy-800 truncate max-w-[150px]">{item.domain}</span>
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                              {item.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-500 flex items-center justify-between">
                            <span>Filled: {item.filledFieldsCount}/{item.totalFieldsCount}</span>
                            <span>Conf: {Math.round((item.averageConfidence || 0.9) * 100)}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 4: FORM HISTORY & RECORDER */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-800 tracking-tight">Form Fill History & Audit Log</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Inspect recorded web form submissions, questions asked, generated answers, and confidence indicators.
                </p>
              </div>

              <div className="space-y-4">
                {historyStore.map((record) => (
                  <div key={record.id} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-bold text-sm text-navy-800">{record.formTitle}</h4>
                          <span className="text-xs text-slate-500">({record.domain})</span>
                        </div>
                        <p suppressHydrationWarning className="text-xs text-slate-500">
                          Submitted on {isMounted ? new Date(record.submittedAt).toLocaleDateString() : 'Recently'} • Tone: <strong className="capitalize text-navy-800">{record.tone}</strong>
                        </p>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200 font-bold">
                        {record.filledFieldsCount} Fields Logged
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {record.fields.map((f, i) => (
                        <div key={i} className="flex items-start justify-between text-xs py-2 border-b border-slate-100 last:border-0">
                          <div className="space-y-0.5 max-w-lg">
                            <span className="text-slate-500 block font-semibold">{f.question}</span>
                            <span className="text-slate-800 block font-medium">{f.answer}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
                              ⚡ {Math.round(f.confidence * 100)}%
                            </span>
                            {f.wasEditedByUser && (
                              <span className="block text-[10px] text-amber-700 font-semibold mt-0.5">User Edited</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: PERSONA & TONE SETTINGS */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-800 tracking-tight">Persona, Tone & System Directives</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tune the voice of the FormPilot agent and supply custom user prompt add-ons.
                </p>
              </div>

              <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-6">
                {/* Tone Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-navy-800 uppercase tracking-wider block">
                    Default Tone Preset
                  </label>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { id: 'professional', label: 'Professional', desc: 'Articulate, formal, executive' },
                      { id: 'informative', label: 'Informative', desc: 'Factual, precise, concise' },
                      { id: 'requesting', label: 'Requesting', desc: 'Polite, persuasive, petitioning' },
                      { id: 'casual', label: 'Casual', desc: 'Approachable, relaxed, brief' }
                    ].map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setTone(item.id as PersonaTone)}
                        className={`p-4 rounded-xl border text-left transition-all ${
                          tone === item.id
                            ? 'bg-navy-800 border-navy-800 text-white shadow-sm'
                            : 'bg-white border-slate-200 text-slate-700 hover:border-slate-300'
                        }`}
                      >
                        <strong className="block text-sm font-bold capitalize">{item.label}</strong>
                        <span className={`text-[11px] block mt-0.5 ${tone === item.id ? 'text-cyan-300' : 'text-slate-500'}`}>
                          {item.desc}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Prompt Addons */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-navy-800 uppercase tracking-wider block">
                    Custom System Prompt Directives (Appended to agent brain)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    placeholder="E.g., 'Always format phone numbers with international code +91. Prioritize remote work preference. Emphasize full-stack React and autonomous AI experience.'"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500">
                    These instructions persist across all autofill actions in both the web app batch runner and browser extension.
                  </p>
                </div>

                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-semibold flex items-center gap-2">
                    <CheckCircle2 size={16} className="text-emerald-600" />
                    <span>Persona settings saved successfully!</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleSaveSettings}
                    className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-sm transition hover:shadow"
                  >
                    Save Persona & Prompt Directives
                  </button>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD DOCUMENT */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-800">Upload Reference Document</h3>
              <button onClick={() => setShowAddDocModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master_Degree_Transcript.pdf"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Semantic Description (To guide the AI)</label>
                <textarea
                  placeholder="Describe what information this document contains (e.g. 'Contains GPA, degree title, and graduation year')..."
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Add Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REMINDER */}
      {showAddReminderModal && (
        <div className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-800">Create Form Deadline Reminder</h3>
              <button onClick={() => setShowAddReminderModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Website Form URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://grants.gov/apply/form-101"
                  value={reminderUrl}
                  onChange={(e) => setReminderUrl(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Title / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Grant Application"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Target Deadline</label>
                <input
                  type="datetime-local"
                  value={reminderDeadline}
                  onChange={(e) => setReminderDeadline(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700">Auto-Action Policy</label>
                <select
                  value={reminderPolicy}
                  onChange={(e) => setReminderPolicy(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                >
                  <option value="auto_submit">Auto-Submit (if confidence meets threshold)</option>
                  <option value="auto_fill_draft">Auto-Fill Draft (save draft state)</option>
                  <option value="notify_only">Notify Only</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddReminderModal(false)}
                  className="text-xs text-slate-500 hover:text-slate-700 px-3 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Guided Cursor Interactive Onboarding Tour for First-Time Users */}
      <OnboardingTour
        isOpen={isTourOpen}
        onClose={() => setIsTourOpen(false)}
        onStepChange={(tab) => {
          handleMilestoneClick(tab, tab);
        }}
        onComplete={() => {
          const all = ['kb', 'reminders', 'bulk', 'history', 'settings'];
          setCompletedMilestones(all);
          setIsTourOpen(false);
          try {
            localStorage.setItem('formpilot_milestones', JSON.stringify(all));
            localStorage.setItem('formpilot_tour_completed', 'true');
            fetch('/api/onboarding', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ stepKey: 'all_completed' })
            }).catch(() => {});
          } catch {}
        }}
      />
    </div>
  );
}
