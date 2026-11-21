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
  CheckCircle,
  CheckCircle2, 
  Upload,
  RefreshCw,
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
  ChevronDown,
  CheckSquare,
  Compass,
  RotateCcw,
  Menu,
  User,
  Settings,
  Sun,
  Moon,
  LogOut,
  Download
} from 'lucide-react';
import OnboardingTour from '@/components/OnboardingTour';
import InitialInfoModal, { UserInitialProfile } from '@/components/InitialInfoModal';
import SettingsProfileModal, { UserSession } from '@/components/SettingsProfileModal';
import { DEMO_MILESTONES_CONFIG } from '@/config/navigation';

const DEMO_MILESTONES = DEMO_MILESTONES_CONFIG;
import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  PersonaTone, 
  DocumentRecommendation 
} from '@formpilot/shared';
import { promptConfigStore } from '@/lib/store';

export default function DashboardPage() {
  const [isMounted, setIsMounted] = useState(false);
  const [activeTab, setActiveTab] = useState<'kb' | 'reminders' | 'bulk' | 'history'>('kb');
  
  // User Session & Profile Questionnaire State
  const [user, setUser] = useState<UserSession | null>(null);
  const [userProfile, setUserProfile] = useState<UserInitialProfile | null>(null);
  const [isInitialInfoOpen, setIsInitialInfoOpen] = useState(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<'persona' | 'model' | 'profile' | 'extension' | 'appearance'>('persona');
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isChecklistCollapsed, setIsChecklistCollapsed] = useState(true);

  // Onboarding & Demo Checklist State
  const [completedMilestones, setCompletedMilestones] = useState<string[]>(['kb']);
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    try {
      // 1. Load authenticated user
      const storedUser = localStorage.getItem('formpilot_user');
      if (storedUser) {
        setUser(JSON.parse(storedUser));
      }

      // 2. Load theme preference
      const savedTheme = localStorage.getItem('formpilot_theme');
      if (savedTheme === 'dark') {
        setIsDarkMode(true);
        document.documentElement.classList.add('dark');
      } else {
        setIsDarkMode(false);
        document.documentElement.classList.remove('dark');
      }

      // 3. Load user questionnaire profile
      const savedProfile = localStorage.getItem('formpilot_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        setUserProfile(parsed);
        if (parsed.tone) {
          setTone(parsed.tone);
        }
        const account = storedUser ? JSON.parse(storedUser) : { name: '', email: '' };
        fetch('/api/profile', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...parsed, name: account.name, email: account.email }),
        }).catch(() => {});
      }

      const needsInfo = localStorage.getItem('formpilot_show_initial_info');
      const alreadySaved = localStorage.getItem('formpilot_initial_info_saved');
      let hasBasics = false;
      if (savedProfile) {
        try {
          const parsed = JSON.parse(savedProfile);
          hasBasics = Boolean(parsed.dateOfBirth && parsed.address && parsed.phone && parsed.city && parsed.country);
        } catch {
          hasBasics = false;
        }
      }
      if (needsInfo === 'true' || !hasBasics) {
        setIsInitialInfoOpen(true);
      }

      // 4. Checklist Milestones
      const savedMilestones = localStorage.getItem('formpilot_milestones');
      if (savedMilestones) {
        setCompletedMilestones(JSON.parse(savedMilestones));
      }
    } catch {}
  }, []);

  const handleToggleTheme = (specificVal?: boolean | React.MouseEvent) => {
    const nextDark = typeof specificVal === 'boolean' ? specificVal : !isDarkMode;
    setIsDarkMode(nextDark);
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('formpilot_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('formpilot_theme', 'light');
    }
  };

  const handleSignOut = () => {
    try {
      localStorage.removeItem('formpilot_user');
      localStorage.removeItem('formpilot_token');
      document.cookie = 'formpilot_token=; path=/; max-age=0';
    } catch {}
    window.location.href = '/login';
  };

  const handleSaveInitialProfile = (profile: UserInitialProfile) => {
    setUserProfile(profile);
    setTone(profile.tone);
    try {
      localStorage.setItem('formpilot_user_profile', JSON.stringify(profile));
      localStorage.setItem('formpilot_initial_info_saved', 'true');
      localStorage.removeItem('formpilot_show_initial_info');
      fetch('/api/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...profile,
          name: user?.name,
          email: user?.email,
        }),
      }).catch(() => {});
      fetch('/api/persona', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tone: profile.tone })
      }).catch(() => {});
    } catch {}
    setIsInitialInfoOpen(false);
  };

  const handleMilestoneClick = (tab: 'kb' | 'reminders' | 'bulk' | 'history', id: string) => {
    setActiveTab(tab);
    setIsMobileNavOpen(false);
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
  const [docs, setDocs] = useState<KBDocument[]>([]);
  const [searchDocQuery, setSearchDocQuery] = useState('');
  const [editingDocId, setEditingDocId] = useState<string | null>(null);
  const [editDescription, setEditDescription] = useState<string>('');
  const [newDocName, setNewDocName] = useState('');
  const [newDocDesc, setNewDocDesc] = useState('');
  const [showAddDocModal, setShowAddDocModal] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [docCategory, setDocCategory] = useState<string>('resume');
  const [docTags, setDocTags] = useState<string>('experience, full-stack, contact');
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);
  const [vectorIndexNotice, setVectorIndexNotice] = useState<string | null>(null);

  const [reminders, setReminders] = useState<FormReminder[]>([]);
  const [showAddReminderModal, setShowAddReminderModal] = useState(false);
  const [reminderUrl, setReminderUrl] = useState('');
  const [reminderTitle, setReminderTitle] = useState('');
  const [reminderDeadline, setReminderDeadline] = useState('');
  const [reminderPolicy, setReminderPolicy] = useState<'notify_only' | 'auto_fill_draft' | 'auto_submit'>('notify_only');
  const [reminderWindowMinutes, setReminderWindowMinutes] = useState(15);
  const [reminderConfidence, setReminderConfidence] = useState(0.85);
  const [reminderNotice, setReminderNotice] = useState<{ title: string; body: string; href?: string } | null>(null);
  const [reminderIntent, setReminderIntent] = useState<'deadline' | 'status_check'>('deadline');

  // State for Bulk Job
  const [bulkJobs, setBulkJobs] = useState<BulkFormJob[]>([]);
  const [history, setHistory] = useState<FormFillHistoryRecord[]>([]);
  const [gapRecommendations] = useState<DocumentRecommendation[]>([]);
  const [bulkUrlsText, setBulkUrlsText] = useState('');
  const [bulkAutoSubmit, setBulkAutoSubmit] = useState(false);
  const [bulkJobName, setBulkJobName] = useState('');
  const [isBulkRunning, setIsBulkRunning] = useState(false);

  // State for Settings
  const [tone, setTone] = useState<PersonaTone>('professional');
  const [customPrompt, setCustomPrompt] = useState('');
  const [saveSuccessMessage, setSaveSuccessMessage] = useState(false);

  useEffect(() => {
    fetch('/api/documents')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.documents)) {
          setDocs(data.documents);
        }
      })
      .catch(err => console.warn('Failed to load DB documents', err));

    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data.history)) {
          setHistory(data.history);
        }
      })
      .catch(err => console.warn('Failed to load form history', err));
  }, []);

  useEffect(() => {
    let stopped = false;
    const load = async () => {
      try {
        const [reminderRes, noticeRes] = await Promise.all([
          fetch('/api/reminders'),
          fetch('/api/notifications'),
        ]);
        const reminderData = await reminderRes.json();
        const noticeData = await noticeRes.json();
        if (stopped) return;
        if (Array.isArray(reminderData.reminders)) setReminders(reminderData.reminders);
        const latest = Array.isArray(noticeData.notifications) ? noticeData.notifications[0] : null;
        if (latest && !latest.isRead) {
          setReminderNotice({ title: latest.title, body: latest.body, href: latest.href });
        }
      } catch {
        // The scheduler retries on the next poll.
      }
    };
    load();
    const timer = window.setInterval(load, 8000);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, []);

  // Handlers for Knowledge Base
  const handleToggleDoc = async (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, isEnabled: !d.isEnabled } : d))
    );
    const target = docs.find(d => d.id === id);
    if (target) {
      try {
        await fetch('/api/documents', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id, isEnabled: !target.isEnabled })
        });
      } catch {}
    }
  };

  const handleSaveDescription = async (id: string) => {
    setDocs((prev) =>
      prev.map((d) => (d.id === id ? { ...d, description: editDescription } : d))
    );
    setEditingDocId(null);
    try {
      await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, description: editDescription })
      });
    } catch {}
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setUploadFile(file);
      setNewDocName(file.name);

      const lower = file.name.toLowerCase();
      const cat = lower.includes('resume') || lower.includes('cv')
        ? 'resume'
        : lower.includes('tax') || lower.includes('w2')
          ? 'tax'
          : lower.includes('passport') || lower.includes('identity')
            ? 'identity'
            : 'general';
      setDocCategory(cat);
      setNewDocDesc(`Reference ${cat} file for form filling.`);
    }
  };

  const handleAddDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocName.trim() || !uploadFile) return;

    setIsUploadingDoc(true);
    try {
      const body = new FormData();
      body.set('file', uploadFile);
      body.set('name', newDocName);
      body.set('description', newDocDesc);
      body.set('docType', docCategory);
      body.set('tags', docTags);

      const res = await fetch('/api/documents', { method: 'POST', body });
      const data = await res.json();
      if (!res.ok) {
        setVectorIndexNotice(data.error || 'Upload failed');
        return;
      }
      if (data.document) {
        setDocs(prev => [data.document, ...prev.filter(d => d.id !== data.document.id)]);
      }
      const where = data.storage?.driver === 's3' ? 'S3' : 'local object storage';
      const chunks = data.vectorIndexing?.chunksStored ?? 0;
      setVectorIndexNotice(
        data.document?.indexStatus === 'indexed'
          ? `Saved to ${where} and indexed ${chunks} vector chunks.`
          : `Saved to ${where}. ${data.error || 'Indexing needs another try.'}`
      );
      setTimeout(() => setVectorIndexNotice(null), 7000);
      setUploadFile(null);
      setNewDocName('');
      setNewDocDesc('');
      setShowAddDocModal(false);
    } catch (err) {
      console.error('Failed to upload document', err);
      setVectorIndexNotice('Upload failed. Check that the app and object storage are running.');
    } finally {
      setIsUploadingDoc(false);
    }
  };

  const handleDeleteDoc = async (id: string) => {
    setDocs(docs.filter((d) => d.id !== id));
    try {
      await fetch(`/api/documents?id=${id}`, { method: 'DELETE' });
    } catch {}
  };

  // Handlers for Reminders
  const handleAddReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reminderUrl.trim()) return;

    const response = await fetch('/api/reminders', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        websiteUrl: reminderUrl,
        title: reminderTitle,
        deadlineTimestamp: reminderDeadline ? new Date(reminderDeadline).toISOString() : new Date(Date.now() + 86400000).toISOString(),
        reminderWindowMinutes,
        autoActionPolicy: reminderIntent === 'status_check' ? 'notify_only' : reminderPolicy,
        minConfidenceThreshold: reminderConfidence,
        tone,
        notes: reminderIntent === 'status_check'
          ? `Check the status of the submitted form at ${reminderUrl}`
          : '',
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      setReminderNotice({ title: 'Reminder was not saved', body: data.error || 'Check the URL and try again.' });
      return;
    }
    if (data.reminder) {
      setReminders((current) => [data.reminder, ...current.filter((item) => item.id !== data.reminder.id)]);
    }
    setReminderUrl('');
    setReminderTitle('');
    setReminderIntent('deadline');
    setShowAddReminderModal(false);
  };

  const openStatusReminder = (record: FormFillHistoryRecord) => {
    setReminderUrl(record.url);
    setReminderTitle(`Check status: ${record.formTitle}`);
    setReminderPolicy('notify_only');
    setReminderIntent('status_check');
    setShowAddReminderModal(true);
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
      {/* Mobile Drawer Backdrop */}
      {isMobileNavOpen && (
        <div 
          className="fixed inset-0 bg-navy-950/40 backdrop-blur-xs z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileNavOpen(false)}
        />
      )}

      {/* 1. Left Sidebar - Desktop Pinned, Mobile Slide-Out Drawer */}
      <aside className={`
        fixed inset-y-0 left-0 z-50 w-72 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col justify-between shadow-2xl transition-transform duration-300 ease-in-out
        lg:static lg:translate-x-0 lg:shadow-2xs lg:z-30 lg:h-screen lg:sticky lg:top-0
        ${isMobileNavOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="p-5 space-y-5 overflow-y-auto flex-1">
          {/* Logo Header at top of sidebar */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-150 dark:border-slate-800">
            <Link href="/" className="block">
              <img 
                src="/brand/logo-full.png" 
                alt="FormPilot AI" 
                className="h-10 sm:h-12 w-auto object-contain cursor-pointer transition hover:opacity-90"
              />
            </Link>
            <button
              onClick={() => setIsMobileNavOpen(false)}
              className="lg:hidden p-1.5 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Close sidebar"
            >
              <X size={18} />
            </button>
          </div>

          {/* Navigation Links with Guided Tour Target IDs */}
          <nav className="space-y-1.5">
            <button
              id="tour-kb-nav"
              onClick={() => handleMilestoneClick('kb', 'kb')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'kb' 
                  ? 'bg-navy-800 dark:bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <FileStack size={18} className={activeTab === 'kb' ? 'text-cyan-400 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>Knowledge Base</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'kb' ? 'bg-navy-700 dark:bg-cyan-700 text-cyan-300 dark:text-cyan-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {docs.length}
              </span>
            </button>

            <button
              id="tour-reminders-nav"
              onClick={() => handleMilestoneClick('reminders', 'reminders')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'reminders' 
                  ? 'bg-navy-800 dark:bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <CalendarClock size={18} className={activeTab === 'reminders' ? 'text-cyan-400 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>Reminders & Auto-Action</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'reminders' ? 'bg-navy-700 dark:bg-cyan-700 text-cyan-300 dark:text-cyan-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {reminders.length}
              </span>
            </button>

            <button
              id="tour-bulk-nav"
              onClick={() => handleMilestoneClick('bulk', 'bulk')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'bulk' 
                  ? 'bg-navy-800 dark:bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <Bot size={18} className={activeTab === 'bulk' ? 'text-cyan-400 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>Bulk Multi-Site Runner</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'bulk' ? 'bg-navy-700 dark:bg-cyan-700 text-cyan-300 dark:text-cyan-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {bulkJobs.length}
              </span>
            </button>

            <button
              id="tour-history-nav"
              onClick={() => handleMilestoneClick('history', 'history')}
              className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-semibold transition text-left ${
                activeTab === 'history' 
                  ? 'bg-navy-800 dark:bg-cyan-600 text-white shadow-sm' 
                  : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 hover:text-navy-800 dark:hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <History size={18} className={activeTab === 'history' ? 'text-cyan-400 dark:text-white' : 'text-slate-400 dark:text-slate-500'} />
                <span>Form Fill History</span>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-bold ${
                activeTab === 'history' ? 'bg-navy-700 dark:bg-cyan-700 text-cyan-300 dark:text-cyan-100' : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
              }`}>
                {history.length}
              </span>
            </button>
          </nav>
        </div>

        <div className="mt-auto shrink-0 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        {/* Bottom of Sidebar: Profile, Settings, Theme, and Sign Out Controls */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 space-y-3 bg-slate-50/60 dark:bg-slate-850">
          <div 
            onClick={() => {
              setSettingsInitialTab('profile');
              setIsSettingsModalOpen(true);
            }}
            className="flex items-center gap-3 p-2.5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-2xs hover:shadow-xs hover:border-cyan-300 dark:hover:border-cyan-600 transition cursor-pointer group"
            title="Open Profile & Settings"
          >
            <div className="w-9 h-9 rounded-xl bg-navy-800 text-cyan-300 font-extrabold text-xs flex items-center justify-center border border-navy-700 shrink-0">
              {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FP'}
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-xs font-bold text-navy-800 dark:text-white truncate block group-hover:text-cyan-600 transition">
                {user?.name || 'Account'}
              </span>
              <span className="text-[10px] text-slate-500 dark:text-slate-400 truncate block">
                {user?.email || ''}
              </span>
            </div>
            <Settings size={14} className="text-slate-400 group-hover:text-cyan-600 transition shrink-0" />
          </div>

          {/* Quick Action Buttons: Profile, Settings, Theme, Sign Out */}
          <div className="grid grid-cols-4 gap-1.5">
            <button
              onClick={() => {
                setSettingsInitialTab('profile');
                setIsSettingsModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white hover:border-cyan-400 transition flex items-center justify-center shadow-2xs"
              title="Profile details"
            >
              <User size={14} />
            </button>

            <button
              onClick={() => {
                setSettingsInitialTab('persona');
                setIsSettingsModalOpen(true);
              }}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white hover:border-cyan-400 transition flex items-center justify-center shadow-2xs"
              title="Persona, tone & model settings"
            >
              <Settings size={14} />
            </button>

            <button
              onClick={handleToggleTheme}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white hover:border-cyan-400 transition flex items-center justify-center shadow-2xs"
              title={isDarkMode ? "Switch to Light mode" : "Switch to Dark mode"}
            >
              {isDarkMode ? <Sun size={14} className="text-amber-400" /> : <Moon size={14} className="text-navy-700" />}
            </button>

            <button
              onClick={handleSignOut}
              className="p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-rose-500 hover:text-rose-700 hover:bg-rose-50 dark:hover:bg-rose-950/40 hover:border-rose-200 transition flex items-center justify-center shadow-2xs"
              title="Sign Out"
            >
              <LogOut size={14} />
            </button>
          </div>

          {/* Parent Company attribution */}
          <div className="pt-2 text-center border-t border-slate-200/60 dark:border-slate-800">
            <span className="text-[9.5px] text-slate-400 dark:text-slate-500 block truncate">
              An <a href="https://www.innovchromatic.tech" target="_blank" rel="noopener noreferrer" className="font-semibold text-slate-600 dark:text-slate-300 hover:text-cyan-600 dark:hover:text-cyan-400 hover:underline">InnovChromatic</a> Product • <a href="https://www.innovchromatic.tech" target="_blank" rel="noopener noreferrer" className="hover:underline">www.innovchromatic.tech</a>
            </span>
          </div>
        </div>
      </div>
      </aside>

      {/* 2. Main Workspace Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Floating Thick Fogged-Glass Navbar Header - Clean & Minimalist */}
        <header className="sticky top-3 sm:top-4 lg:top-5 z-20 mx-3 sm:mx-6 lg:mx-8 mt-3 sm:mt-5 mb-2 px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 min-h-[68px] sm:min-h-[76px] glass-fogged rounded-2xl sm:rounded-3xl flex items-center justify-between gap-3 sm:gap-4 transition-all">
          
          {/* Left: Section Icon & Title (Informative Display) */}
          <div className="flex items-center gap-3 sm:gap-4 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-tr from-cyan-50 to-navy-50 dark:from-slate-800 dark:to-slate-800 border border-cyan-200/80 dark:border-slate-700 flex items-center justify-center text-cyan-600 shadow-xs shrink-0">
              {activeTab === 'kb' && <FileStack size={20} className="text-cyan-600" />}
              {activeTab === 'reminders' && <CalendarClock size={20} className="text-cyan-600" />}
              {activeTab === 'bulk' && <Bot size={20} className="text-cyan-600" />}
              {activeTab === 'history' && <History size={20} className="text-cyan-600" />}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base lg:text-lg font-extrabold text-navy-800 dark:text-white tracking-tight truncate">
                  {activeTab === 'kb' && 'Document Knowledge Base'}
                  {activeTab === 'reminders' && 'Form Reminders & Auto-Action'}
                  {activeTab === 'bulk' && 'Bulk Multi-Site Runner'}
                  {activeTab === 'history' && 'Submitted forms'}
                </h1>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-navy-50 dark:bg-slate-800 text-navy-700 dark:text-slate-300 border border-navy-100 dark:border-slate-700">
                  Live
                </span>
              </div>
              <p className="text-[11px] sm:text-xs text-slate-500 dark:text-slate-400 font-medium mt-0.5 truncate max-w-[200px] sm:max-w-none">
                {activeTab === 'kb' && 'Your documents'}
                {activeTab === 'reminders' && 'Reminders'}
                {activeTab === 'bulk' && 'Several sites'}
                {activeTab === 'history' && 'Submitted answers'}
              </p>
            </div>
          </div>

          {/* Right: Clean Navbar - Mobile drawer toggle only; completely clean with no clickable buttons on desktop */}
          <div className="flex items-center shrink-0">
            <button
              onClick={() => setIsMobileNavOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-navy-800 dark:text-white shadow-2xs hover:bg-slate-50 dark:hover:bg-slate-700 transition shrink-0"
              aria-label="Open sidebar menu"
            >
              <Menu size={18} />
            </button>
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
                  <h2 className="text-xl font-bold text-navy-800 dark:text-white tracking-tight">Document Knowledge Base</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Documents used to fill forms.
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setShowAddDocModal(true)}
                    className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                  >
                    <Plus size={16} className="text-cyan-400 dark:text-white" />
                    <span>Upload Document</span>
                  </button>
                </div>
              </div>

              {/* Vector Ingestion Real-Time Notice */}
              {vectorIndexNotice && (
                <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs font-bold flex items-center gap-2 shadow-2xs">
                  <CheckCircle size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>{vectorIndexNotice}</span>
                </div>
              )}

              {/* AI Gap Suggestions Banner */}
              {gapRecommendations.length > 0 && (
                <div className="bg-gradient-to-r from-cyan-50/80 via-white to-white dark:from-slate-800/90 dark:via-slate-850 dark:to-slate-900 border border-cyan-200 dark:border-cyan-800 rounded-2xl p-5 shadow-xs">
                  <div className="flex items-start gap-3.5">
                    <div className="p-2 rounded-xl bg-cyan-500 text-white shadow-xs shrink-0 mt-0.5">
                      <Sparkles size={16} />
                    </div>
                    <div className="flex-1 space-y-1.5">
                      <div className="flex items-center gap-2">
                        <h3 className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider">AI Document Gap Recommender</h3>
                        <span className="text-[10px] bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 font-semibold px-2 py-0.5 rounded-full">Automated Insight</span>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                        {gapRecommendations[0]?.reason}
                      </p>
                      <div className="pt-1 flex flex-wrap items-center gap-2.5">
                        <span className="text-xs font-semibold text-navy-800 dark:text-cyan-300 bg-white dark:bg-slate-800 px-2.5 py-1 rounded-lg border border-cyan-200 dark:border-cyan-800 shadow-2xs">
                          Recommended: <strong>{gapRecommendations[0]?.missingDocumentName}</strong>
                        </span>
                        <span className="text-[11px] text-slate-500 dark:text-slate-400">
                          Targeted Fields: {gapRecommendations[0]?.targetedFields.join(', ')}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Search & Filter Bar */}
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-xl p-2.5 flex items-center gap-3 shadow-xs">
                <Search size={16} className="text-slate-400 ml-2" />
                <input
                  type="text"
                  placeholder="Search documents by name or semantic description..."
                  value={searchDocQuery}
                  onChange={(e) => setSearchDocQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs text-slate-800 dark:text-slate-100 outline-none placeholder:text-slate-400 dark:placeholder:text-slate-500"
                />
              </div>

              {/* Document List Cards */}
              <div className="space-y-3.5">
                {filteredDocs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center mx-auto shadow-2xs">
                      <FileText size={26} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-navy-800 dark:text-white">No documents in your Knowledge Base</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        {searchDocQuery 
                          ? `No documents matched "${searchDocQuery}". Try a different search query or clear the filter.` 
                          : 'Upload resumes, project sheets, or certifications. FormPilot references these grounded files to auto-fill web forms with verified citations.'
                        }
                      </p>
                    </div>
                    {!searchDocQuery && (
                      <button
                        onClick={() => setShowAddDocModal(true)}
                        className="btn-lightup inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
                      >
                        <Plus size={15} className="text-cyan-400 dark:text-white" />
                        <span>Upload Your First Document</span>
                      </button>
                    )}
                  </div>
                ) : (
                  filteredDocs.map((doc) => (
                    <div 
                      key={doc.id}
                      className={`bg-white dark:bg-slate-850 rounded-2xl border p-5 transition-all shadow-xs hover:shadow-sm ${
                        doc.isEnabled 
                          ? 'border-slate-200 dark:border-slate-800 hover:border-cyan-300 dark:hover:border-cyan-600' 
                          : 'border-slate-200/60 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-900/60 opacity-60'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-xl bg-navy-50 dark:bg-slate-800 text-navy-800 dark:text-cyan-400 border border-navy-100 dark:border-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                            <FileText size={20} className="text-navy-800 dark:text-cyan-400" />
                          </div>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-bold text-sm text-navy-800 dark:text-white">{doc.name}</h4>
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 uppercase font-mono">
                                {(doc.sizeBytes / 1024).toFixed(0)} KB
                              </span>
                              {doc.indexStatus === 'indexed' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                                  Vectorized · {doc.chunkCount || 0}
                                </span>
                              )}
                              {doc.s3Bucket && doc.s3Bucket !== 'local-disk' && (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                                  S3
                                </span>
                              )}
                              {doc.isEnabled ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                                  Active in Context
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400">
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
                                  className="w-full bg-white dark:bg-slate-800 border border-cyan-400 dark:border-cyan-500 rounded-xl p-2.5 text-xs text-slate-800 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900"
                                  rows={2}
                                  placeholder="Describe what data lives in this document to guide the AI..."
                                />
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => handleSaveDescription(doc.id)}
                                    className="bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs px-3 py-1.5 rounded-lg font-semibold transition"
                                  >
                                    Save Description
                                  </button>
                                  <button
                                    onClick={() => setEditingDocId(null)}
                                    className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 px-2 py-1 font-medium"
                                  >
                                    Cancel
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div 
                                onClick={() => { setEditingDocId(doc.id); setEditDescription(doc.description); }}
                                className="group flex items-start gap-1.5 text-xs text-slate-600 dark:text-slate-300 cursor-pointer pt-1"
                                title="Click to edit semantic description"
                              >
                                <span className="font-semibold text-navy-800 dark:text-white shrink-0">Semantic Summary:</span>
                                <p className="group-hover:text-cyan-700 dark:group-hover:text-cyan-400 transition leading-relaxed">
                                  {doc.description}
                                </p>
                                <Pencil size={12} className="text-slate-300 dark:text-slate-500 group-hover:text-cyan-600 dark:group-hover:text-cyan-400 shrink-0 mt-0.5 transition" />
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
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-cyan-500"></div>
                          </label>
                          <button
                            onClick={() => handleDeleteDoc(doc.id)}
                            className="text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                            title="Remove document from KB"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 2: REMINDERS & AUTONOMOUS ACTION */}
          {activeTab === 'reminders' && (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-bold text-navy-800 dark:text-white tracking-tight flex items-center gap-2">
                    Website Form Reminders & Autonomous Action
                    <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                      Auto-Action Engine
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Track deadline-driven forms. If you haven&apos;t reviewed before the deadline, our autonomous agent will auto-fill or auto-submit!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddReminderModal(true)}
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                >
                  <Plus size={16} className="text-cyan-400 dark:text-white" />
                  <span>Add Reminder</span>
                </button>
              </div>

              <div className="space-y-3.5">
                {reminders.length === 0 ? (
                  <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center mx-auto shadow-2xs">
                      <Clock size={26} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-navy-800 dark:text-white">No active form reminders scheduled</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Track upcoming application deadlines. If you haven&apos;t completed the form before the deadline, our background agent will auto-fill or auto-submit based on your policy.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowAddReminderModal(true)}
                      className="btn-lightup inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2.5 rounded-xl shadow-xs transition"
                    >
                      <Plus size={15} className="text-cyan-400 dark:text-white" />
                      <span>Schedule Your First Reminder</span>
                    </button>
                  </div>
                ) : (
                  reminders.map((rem) => (
                    <div key={rem.id} className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs hover:shadow-sm transition space-y-3">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 sm:gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-bold text-sm text-navy-800 dark:text-white">{rem.title}</h4>
                            <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                              rem.autoActionPolicy === 'auto_submit'
                                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
                                : 'bg-cyan-50 dark:bg-cyan-950/60 text-cyan-700 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800'
                            }`}>
                              Policy: {rem.autoActionPolicy.replace(/_/g, ' ')}
                            </span>
                          </div>
                          <a 
                            href={rem.websiteUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="text-xs text-cyan-700 dark:text-cyan-400 hover:text-cyan-900 dark:hover:text-cyan-300 font-medium hover:underline flex items-center gap-1"
                          >
                            {rem.websiteUrl} <ExternalLink size={11} />
                          </a>
                          {rem.executionLog && (
                            <p className="text-[11px] text-slate-500 dark:text-slate-400 pt-1">{rem.executionLog}</p>
                          )}
                        </div>

                        <div className="text-left sm:text-right">
                          <span className="text-[11px] text-slate-500 dark:text-slate-400 block">Target Deadline</span>
                          <strong suppressHydrationWarning className="text-xs text-navy-800 dark:text-white font-semibold">
                            {isMounted 
                              ? `${new Date(rem.deadlineTimestamp).toLocaleDateString()} at ${new Date(rem.deadlineTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                              : 'Scheduled Deadline'
                            }
                          </strong>
                        </div>
                      </div>

                      <div className="pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-3">
                          <span>Min Confidence Required: <strong className="text-navy-800 dark:text-white font-semibold">{Math.round(rem.minConfidenceThreshold * 100)}%</strong></span>
                          <span>•</span>
                          <span>Tone: <strong className="capitalize text-navy-800 dark:text-white font-semibold">{rem.tone}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`w-2 h-2 rounded-full ${
                            rem.status === 'failed' ? 'bg-rose-500' : rem.status === 'auto_completed' ? 'bg-emerald-500' : 'bg-cyan-500'
                          }`}></span>
                          <span className="text-cyan-800 dark:text-cyan-300 font-semibold text-xs capitalize">
                            {rem.status.replace(/_/g, ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 3: BULK MULTI-SITE RUNNER */}
          {activeTab === 'bulk' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-800 dark:text-white tracking-tight flex items-center gap-2">
                  Bulk Multi-Site Form Queue Runner
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-50 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
                    Fleet Dispatcher
                  </span>
                </h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Enter multiple website form links to dispatch autonomous agents to scan, reason, and fill all forms in parallel.
                </p>
              </div>

              {/* Bulk Form Ingestion Card */}
              <div className="bg-white dark:bg-slate-850 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 shadow-xs space-y-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider">
                      Paste Form URLs (One per line)
                    </label>
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">E.g., Greenhouse, Lever, Workday, Grant Portals</span>
                  </div>
                  <textarea
                    value={bulkUrlsText}
                    onChange={(e) => setBulkUrlsText(e.target.value)}
                    placeholder={"https://jobs.lever.co/company/role-1\nhttps://boards.greenhouse.io/startup/role-2\nhttps://ashbyhq.com/org/role-3"}
                    rows={4}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 font-medium cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={bulkAutoSubmit}
                        onChange={(e) => setBulkAutoSubmit(e.target.checked)}
                        className="rounded border-slate-300 dark:border-slate-700 text-cyan-600 focus:ring-cyan-500 dark:bg-slate-800"
                      />
                      <span>Auto-Submit if Confidence $\ge 90\%$</span>
                    </label>

                    <div className="text-xs text-slate-500 dark:text-slate-400">
                      Using active documents: <strong className="text-navy-800 dark:text-white">{activeDocsCount} files</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleStartBulkJob}
                    disabled={isBulkRunning || !bulkUrlsText.trim()}
                    className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition hover:shadow"
                  >
                    <Send size={15} className="text-cyan-400 dark:text-white" />
                    <span>{isBulkRunning ? 'Agents Running...' : 'Launch Fleet Runner'}</span>
                  </button>
                </div>
              </div>

              {/* Active / Past Bulk Batches */}
              <div className="space-y-3.5">
                <h3 className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider">Recent Batch Runs</h3>
                {bulkJobs.length === 0 ? (
                  <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-10 text-center space-y-3 shadow-2xs">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center mx-auto shadow-2xs">
                      <Layers size={22} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h4 className="text-sm font-bold text-navy-800 dark:text-white">No fleet batches dispatched yet</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Paste form links above and hit &quot;Launch Fleet Runner&quot; to execute multi-site background scans and parallel completions.
                      </p>
                    </div>
                  </div>
                ) : (
                  bulkJobs.map((job) => (
                    <div key={job.id} className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="p-2 rounded-xl bg-navy-50 dark:bg-slate-800 text-navy-800 dark:text-cyan-400">
                            <Layers size={18} />
                          </div>
                          <div>
                            <h4 className="font-bold text-sm text-navy-800 dark:text-white">{job.name}</h4>
                            <span className="text-xs text-slate-500 dark:text-slate-400">{job.urls.length} sites in execution queue</span>
                          </div>
                        </div>

                        <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 font-bold capitalize">
                          {job.status}
                        </span>
                      </div>

                      {/* Progress Items */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        {job.urls.map((item) => (
                          <div key={item.id} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-xs space-y-1.5">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-navy-800 dark:text-white truncate max-w-[150px]">{item.domain}</span>
                              <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded">
                                {item.status}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
                              <span>Filled: {item.filledFieldsCount}/{item.totalFieldsCount}</span>
                              <span>Conf: {Math.round((item.averageConfidence || 0.9) * 100)}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* TAB 4: FORM HISTORY & RECORDER */}
          {activeTab === 'history' && (
            <div className="space-y-6">
              <div>
                <h2 className="text-xl font-bold text-navy-800 dark:text-white tracking-tight">Submitted forms</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Only forms you submit are kept here. Open a submission to read the response that was sent, or set a reminder to check its status on the website.
                </p>
              </div>

              <div className="space-y-3">
                {history.length === 0 ? (
                  <div className="bg-white dark:bg-slate-850 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 p-12 text-center space-y-4 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl bg-cyan-50 dark:bg-cyan-950/60 text-cyan-600 dark:text-cyan-400 border border-cyan-100 dark:border-cyan-900 flex items-center justify-center mx-auto shadow-2xs">
                      <History size={26} />
                    </div>
                    <div className="max-w-md mx-auto space-y-1">
                      <h3 className="text-base font-bold text-navy-800 dark:text-white">No submitted forms yet</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Fill a form on a website, then submit it. The questions and answers from that submission show up in this list.
                      </p>
                    </div>
                  </div>
                ) : (
                  history.map((record) => (
                    <article key={record.id} className="bg-white dark:bg-slate-850 rounded-2xl border border-slate-200 dark:border-slate-800 p-5 shadow-xs flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 space-y-1">
                        <h4 className="font-bold text-sm text-navy-800 dark:text-white truncate">{record.formTitle}</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{record.domain}</p>
                        <p suppressHydrationWarning className="text-xs text-slate-500 dark:text-slate-400">
                          Submitted {isMounted ? new Date(record.submittedAt).toLocaleString() : 'recently'} · {record.filledFieldsCount} answers
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => openStatusReminder(record)}
                          className="text-xs font-semibold px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-navy-800 dark:text-slate-100 hover:border-cyan-400"
                        >
                          Check status later
                        </button>
                        <a
                          href={`/dashboard/history/${record.id}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-semibold px-3 py-2 rounded-xl bg-navy-800 dark:bg-cyan-600 text-white hover:bg-navy-900 dark:hover:bg-cyan-500 inline-flex items-center gap-1.5"
                        >
                          View response
                          <ExternalLink size={12} />
                        </a>
                      </div>
                    </article>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* MODAL: ADD DOCUMENT */}
      {showAddDocModal && (
        <div className="fixed inset-0 bg-navy-950/60 dark:bg-navy-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 sm:p-7 w-full max-w-lg space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-navy-800 dark:text-white flex items-center gap-2">
                  <Upload size={18} className="text-cyan-500" /> Upload &amp; Vector Index Reference Document
                </h3>
                <p className="text-2xs text-slate-500 dark:text-slate-400">
                  The file is stored in S3, a database record is created, and the text is vectorized
                </p>
              </div>
              <button onClick={() => setShowAddDocModal(false)} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddDocument} className="space-y-4">
              {/* Native File Selector */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  File (PDF, Word, PowerPoint, text, or image)
                </label>
                <div className="p-4 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl bg-slate-50/50 dark:bg-slate-800/40 text-center hover:border-cyan-500 transition">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.txt,.md,.json,.csv,.png,.jpg,.jpeg,.webp,.gif"
                    onChange={handleFileSelect}
                    className="block w-full text-xs text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-navy-800 file:text-white hover:file:bg-navy-900 cursor-pointer"
                  />
                  {uploadFile && (
                    <p className="text-2xs font-bold text-emerald-600 dark:text-emerald-400 mt-2">
                      ✓ Ready for vector ingestion: {uploadFile.name} ({(uploadFile.size / 1024).toFixed(1)} KB)
                    </p>
                  )}
                </div>
              </div>

              {/* Document Name */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Title</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex_Morgan_Resume_2026.pdf"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                />
              </div>

              {/* Document Category & Tags */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Document Category</label>
                  <select
                    value={docCategory}
                    onChange={(e) => setDocCategory(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                  >
                    <option value="resume">Resume / Curriculum Vitae</option>
                    <option value="identity">Government ID / Passport</option>
                    <option value="tax">Tax &amp; Financial (W2, 1099)</option>
                    <option value="education">Degree &amp; Certification</option>
                    <option value="employment">Employment &amp; Paystub</option>
                    <option value="cover_letter">Cover Letter / Statement</option>
                    <option value="general">General Reference</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Metadata Tags</label>
                  <input
                    type="text"
                    placeholder="experience, react, cloud"
                    value={docTags}
                    onChange={(e) => setDocTags(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                  />
                </div>
              </div>

              {/* Semantic Description */}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Semantic AI Description</label>
                <textarea
                  placeholder="Describe what information this document contains to guide RAG retrieval..."
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isUploadingDoc || !uploadFile}
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 disabled:opacity-50"
                >
                  {isUploadingDoc ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      <span>Ingesting into Vector DB...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={14} className="text-cyan-400 dark:text-white" />
                      <span>Save &amp; Index Vectors</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: ADD REMINDER */}
      {showAddReminderModal && (
        <div className="fixed inset-0 bg-navy-950/60 dark:bg-navy-950/80 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-navy-800 dark:text-white">
                {reminderIntent === 'status_check' ? 'Remind me to check this form' : 'Create Form Deadline Reminder'}
              </h3>
              <button onClick={() => { setShowAddReminderModal(false); setReminderIntent('deadline'); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddReminder} className="space-y-4">
              {reminderIntent === 'status_check' && (
                <p className="text-xs text-slate-500 dark:text-slate-300 leading-relaxed">
                  This reminder is for a form you already submitted. At the time you choose, FormPilot will remind you to open that website and check the application status.
                </p>
              )}
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Website Form URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://grants.gov/apply/form-101"
                  value={reminderUrl}
                  onChange={(e) => setReminderUrl(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Title / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Grant Application"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Target Deadline</label>
                  <input
                    type="datetime-local"
                    required
                    value={reminderDeadline}
                    onChange={(e) => setReminderDeadline(e.target.value)}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Remind this many minutes before</label>
                  <input
                    type="number"
                    min={0}
                    max={10080}
                    value={reminderWindowMinutes}
                    onChange={(e) => setReminderWindowMinutes(Number(e.target.value))}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                  />
                </div>
              </div>

              {reminderIntent !== 'status_check' && (
              <div className="space-y-1">
                <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Auto-Action Policy</label>
                <select
                  value={reminderPolicy}
                  onChange={(e) => setReminderPolicy(e.target.value as any)}
                  className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-2.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-200 dark:focus:ring-cyan-900 focus:border-cyan-500"
                >
                  <option value="auto_submit">Auto-Submit (if confidence meets threshold)</option>
                  <option value="auto_fill_draft">Auto-Fill Draft (save draft state)</option>
                  <option value="notify_only">Notify Only</option>
                </select>
              </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => { setShowAddReminderModal(false); setReminderIntent('deadline'); }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 px-3 py-2 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  {reminderIntent === 'status_check' ? 'Save status reminder' : 'Create Reminder'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {reminderNotice && (
        <div className="fixed bottom-5 right-5 z-40 w-full max-w-sm rounded-2xl border border-slate-200 dark:border-slate-700 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-xl p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-sm font-bold text-navy-800 dark:text-white">{reminderNotice.title}</p>
              <p className="text-xs text-slate-500 dark:text-slate-300 mt-1 leading-relaxed">{reminderNotice.body}</p>
            </div>
            <button type="button" onClick={() => setReminderNotice(null)} className="text-slate-400 hover:text-slate-700" aria-label="Dismiss notification">
              <X size={16} />
            </button>
          </div>
          {reminderNotice.href && (
            <a href={reminderNotice.href} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan-700 dark:text-cyan-300 hover:underline">
              Open form
            </a>
          )}
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
          const all = ['kb', 'reminders', 'bulk', 'history'];
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

      {/* Initial Signup Info Questionnaire Modal */}
      <InitialInfoModal
        isOpen={isInitialInfoOpen}
        userName={user?.name || 'Pilot'}
        initialProfile={userProfile}
        onSave={handleSaveInitialProfile}
        onSkip={() => {
          setIsInitialInfoOpen(false);
          try {
            localStorage.setItem('formpilot_initial_info_saved', 'true');
            localStorage.removeItem('formpilot_show_initial_info');
          } catch {}
        }}
      />

      {/* Settings, Profile, Model & Extension Modal */}
      <SettingsProfileModal
        isOpen={isSettingsModalOpen}
        onClose={() => setIsSettingsModalOpen(false)}
        initialTab={settingsInitialTab}
        user={user}
        currentTone={tone}
        onToneChange={(newTone) => {
          setTone(newTone);
          fetch('/api/persona', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ tone: newTone })
          }).catch(() => {});
        }}
        customPrompt={customPrompt}
        onPromptDirectivesChange={(directives) => {
          setCustomPrompt(directives);
          promptConfigStore.customPromptAddons = directives;
        }}
        userProfile={userProfile}
        onProfileUpdate={(updatedProfile) => {
          setUserProfile(updatedProfile);
          try {
            localStorage.setItem('formpilot_user_profile', JSON.stringify(updatedProfile));
            fetch('/api/profile', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                ...updatedProfile,
                name: user?.name,
                email: user?.email,
              }),
            }).catch(() => {});
          } catch {}
        }}
        isDarkMode={isDarkMode}
        onToggleTheme={handleToggleTheme}
      />
    </div>
  );
}
