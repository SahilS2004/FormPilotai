'use client';

import React, { useState } from 'react';
import { 
  FileText, 
  Clock, 
  Layers, 
  History, 
  Sliders, 
  Plus, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  ExternalLink, 
  Trash2, 
  ShieldCheck, 
  Bot, 
  ArrowRight,
  Flame,
  FileCheck
} from 'lucide-react';
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
  const [activeTab, setActiveTab] = useState<'kb' | 'reminders' | 'bulk' | 'history' | 'settings'>('kb');
  
  // State for KB documents
  const [docs, setDocs] = useState<KBDocument[]>(documentsStore);
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
      description: newDocDesc || 'User uploaded document containing personal profile data.',
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
        let domain = 'web-form';
        try { domain = new URL(u).hostname; } catch {}
        return {
          id: `item_${Date.now()}_${i}`,
          url: u,
          domain,
          status: 'scanning',
          formTitle: `${domain} Form Application`,
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

  return (
    <div className="flex-1 flex flex-col bg-slate-950 text-slate-100">
      {/* Top Navbar */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20">
              FP
            </div>
            <div>
              <h1 className="font-bold text-lg leading-tight flex items-center gap-2">
                FormPilot AI
                <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  v0.1 Engine
                </span>
              </h1>
              <p className="text-xs text-slate-400">Context-Aware AI Form Filler & Autonomous Operations</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-xs bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700/60 text-slate-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              Active KB Docs: <strong className="text-white">{activeDocsCount} of {docs.length}</strong>
            </div>
            <a 
              href="https://github.com/SahilS2004/FormPilotai" 
              target="_blank" 
              rel="noreferrer"
              className="text-xs text-slate-400 hover:text-white transition flex items-center gap-1.5"
            >
              GitHub <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-6 py-8 flex-1 w-full flex flex-col md:flex-row gap-8">
        {/* Sidebar Navigation */}
        <nav className="w-full md:w-64 flex flex-row md:flex-col gap-2 shrink-0">
          <button
            onClick={() => setActiveTab('kb')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'kb' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <FileText size={18} />
            <span>Knowledge Base</span>
          </button>

          <button
            onClick={() => setActiveTab('reminders')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'reminders' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Clock size={18} />
            <span>Reminders & Auto-Action</span>
          </button>

          <button
            onClick={() => setActiveTab('bulk')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'bulk' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Layers size={18} />
            <span>Bulk Multi-Site Runner</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'history' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <History size={18} />
            <span>Form Fill History</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition text-left ${
              activeTab === 'settings' 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-900 hover:text-slate-200'
            }`}
          >
            <Sliders size={18} />
            <span>Tone & System Prompt</span>
          </button>
        </nav>

        {/* Content Area */}
        <main className="flex-1 space-y-6">
          {/* TAB 1: KNOWLEDGE BASE */}
          {activeTab === 'kb' && (
            <div className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold">Document Knowledge Base</h2>
                  <p className="text-sm text-slate-400">
                    Manage reference documents. Add semantic descriptions and toggle scope on/off for form filling.
                  </p>
                </div>
                <button
                  onClick={() => setShowAddDocModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition"
                >
                  <Plus size={16} />
                  <span>Upload Document</span>
                </button>
              </div>

              {/* AI Gap Suggestions Banner */}
              <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border border-amber-500/20 rounded-2xl p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 shrink-0 mt-0.5">
                    <Sparkles size={18} />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-sm font-semibold text-amber-200">AI Document Gap Recommendation</h3>
                    <p className="text-xs text-slate-300 mt-1">
                      {gapRecommendationsStore[0]?.reason}
                    </p>
                    <div className="mt-2.5 flex items-center gap-2">
                      <span className="text-xs font-semibold text-white bg-amber-500/20 px-2.5 py-1 rounded-lg border border-amber-500/30">
                        Recommended: {gapRecommendationsStore[0]?.missingDocumentName}
                      </span>
                      <span className="text-xs text-slate-400">
                        Helps automate: {gapRecommendationsStore[0]?.targetedFields.join(', ')}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Document Cards List */}
              <div className="grid grid-cols-1 gap-4">
                {docs.map((doc) => (
                  <div 
                    key={doc.id}
                    className={`p-5 rounded-2xl border transition ${
                      doc.isEnabled 
                        ? 'bg-slate-900/80 border-slate-800' 
                        : 'bg-slate-900/30 border-slate-800/40 opacity-70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3.5">
                        <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 shrink-0 mt-1">
                          <FileText size={20} />
                        </div>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h4 className="font-semibold text-base text-white">{doc.name}</h4>
                            <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-400 uppercase font-mono">
                              {(doc.sizeBytes / 1024).toFixed(0)} KB
                            </span>
                          </div>
                          
                          {/* Semantic Description */}
                          {editingDocId === doc.id ? (
                            <div className="mt-2 space-y-2">
                              <textarea
                                value={editDescription}
                                onChange={(e) => setEditDescription(e.target.value)}
                                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                                rows={2}
                                placeholder="Describe what data lives in this document to guide the AI..."
                              />
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleSaveDescription(doc.id)}
                                  className="bg-blue-600 text-white text-xs px-3 py-1.5 rounded-lg font-medium"
                                >
                                  Save Description
                                </button>
                                <button
                                  onClick={() => setEditingDocId(null)}
                                  className="text-xs text-slate-400 hover:text-white px-2 py-1"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p 
                              onClick={() => { setEditingDocId(doc.id); setEditDescription(doc.description); }}
                              className="text-xs text-slate-300 cursor-pointer hover:text-blue-400 transition"
                              title="Click to edit semantic description"
                            >
                              💡 <span className="font-medium text-slate-400">Semantic Description:</span> {doc.description}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Toggle & Delete */}
                      <div className="flex items-center gap-3 shrink-0">
                        <button
                          onClick={() => handleToggleDoc(doc.id)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                            doc.isEnabled ? 'bg-blue-600' : 'bg-slate-700'
                          }`}
                          title={doc.isEnabled ? 'Active in form filling' : 'Disabled from context'}
                        >
                          <span
                            className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                              doc.isEnabled ? 'translate-x-6' : 'translate-x-1'
                            }`}
                          />
                        </button>
                        <button
                          onClick={() => handleDeleteDoc(doc.id)}
                          className="text-slate-500 hover:text-red-400 transition p-1.5 rounded-lg hover:bg-slate-800"
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
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-bold flex items-center gap-2">
                    Website Form Reminders & Autonomous Action
                    <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                      Auto-Action Engine
                    </span>
                  </h2>
                  <p className="text-sm text-slate-400">
                    Track deadline-driven forms. If not reviewed before the deadline, autonomous agents can auto-fill or auto-submit!
                  </p>
                </div>
                <button
                  onClick={() => setShowAddReminderModal(true)}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-blue-600/20 transition"
                >
                  <Plus size={16} />
                  <span>Add Reminder</span>
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {reminders.map((rem) => (
                  <div key={rem.id} className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{rem.title}</h4>
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full ${
                            rem.autoActionPolicy === 'auto_submit'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                          }`}>
                            Policy: {rem.autoActionPolicy.replace('_', ' ')}
                          </span>
                        </div>
                        <a 
                          href={rem.websiteUrl} 
                          target="_blank" 
                          rel="noreferrer" 
                          className="text-xs text-blue-400 hover:underline flex items-center gap-1"
                        >
                          {rem.websiteUrl} <ExternalLink size={10} />
                        </a>
                      </div>

                      <div className="text-right">
                        <span className="text-xs text-slate-400 block">Target Deadline</span>
                        <strong className="text-xs text-white">
                          {new Date(rem.deadlineTimestamp).toLocaleDateString()} at {new Date(rem.deadlineTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                      <div className="flex items-center gap-3">
                        <span>Min Safety Confidence: <strong>{Math.round(rem.minConfidenceThreshold * 100)}%</strong></span>
                        <span>•</span>
                        <span>Tone: <strong className="capitalize">{rem.tone}</strong></span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                        <span className="text-blue-300 font-medium">Monitoring (Agent ready)</span>
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
                <h2 className="text-xl font-bold flex items-center gap-2">
                  Bulk Multi-Site Form Queue Runner
                  <span className="text-xs px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                    Fleet Automation
                  </span>
                </h2>
                <p className="text-sm text-slate-400">
                  Enter multiple website form links to dispatch autonomous agents to scan, reason, and fill all forms in parallel.
                </p>
              </div>

              {/* Bulk Form Ingestion Card */}
              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Paste Form URLs (One per line)
                  </label>
                  <textarea
                    value={bulkUrlsText}
                    onChange={(e) => setBulkUrlsText(e.target.value)}
                    placeholder={"https://jobs.lever.co/company/role-1\nhttps://boards.greenhouse.io/startup/role-2\nhttps://ashbyhq.com/org/role-3"}
                    rows={4}
                    className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={bulkAutoSubmit}
                        onChange={(e) => setBulkAutoSubmit(e.target.checked)}
                        className="rounded border-slate-700 bg-slate-950 text-blue-600 focus:ring-0"
                      />
                      <span>Auto-Submit if Confidence $\ge 90\%$</span>
                    </label>

                    <div className="text-xs text-slate-400">
                      Using active documents: <strong>{activeDocsCount} files</strong>
                    </div>
                  </div>

                  <button
                    onClick={handleStartBulkJob}
                    disabled={isBulkRunning || !bulkUrlsText.trim()}
                    className="bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition"
                  >
                    <Bot size={16} />
                    <span>{isBulkRunning ? 'Agents Running...' : 'Launch Fleet Runner'}</span>
                  </button>
                </div>
              </div>

              {/* Active / Past Bulk Batches */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-300">Recent Batch Runs</h3>
                {bulkJobs.map((job) => (
                  <div key={job.id} className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                          <Layers size={18} />
                        </div>
                        <div>
                          <h4 className="font-semibold text-white text-sm">{job.name}</h4>
                          <span className="text-xs text-slate-400">{job.urls.length} sites in queue</span>
                        </div>
                      </div>

                      <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium capitalize">
                        {job.status}
                      </span>
                    </div>

                    {/* Progress Items */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {job.urls.map((item) => (
                        <div key={item.id} className="bg-slate-950/60 border border-slate-800/80 rounded-xl p-3 text-xs space-y-1.5">
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-white truncate max-w-[150px]">{item.domain}</span>
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              {item.status}
                            </span>
                          </div>
                          <div className="text-[11px] text-slate-400 flex items-center justify-between">
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
                <h2 className="text-xl font-bold">Form Fill History & Audit Log</h2>
                <p className="text-sm text-slate-400">
                  Inspect recorded web form submissions, questions asked, generated answers, and confidence indicators.
                </p>
              </div>

              <div className="space-y-4">
                {historyStore.map((record) => (
                  <div key={record.id} className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
                    <div className="flex items-start justify-between">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-white">{record.formTitle}</h4>
                          <span className="text-xs text-slate-400">({record.domain})</span>
                        </div>
                        <p className="text-xs text-slate-400">
                          Submitted on {new Date(record.submittedAt).toLocaleDateString()} • Tone: <strong className="capitalize text-slate-200">{record.tone}</strong>
                        </p>
                      </div>

                      <span className="text-xs px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 font-medium">
                        {record.filledFieldsCount} Fields Logged
                      </span>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-slate-800/80">
                      {record.fields.map((f, i) => (
                        <div key={i} className="flex items-start justify-between text-xs py-1.5 border-b border-slate-800/40 last:border-0">
                          <div className="space-y-0.5 max-w-md">
                            <span className="text-slate-400 block font-medium">{f.question}</span>
                            <span className="text-slate-100 block">{f.answer}</span>
                          </div>
                          <div className="text-right shrink-0">
                            <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                              ⚡ {Math.round(f.confidence * 100)}%
                            </span>
                            {f.wasEditedByUser && (
                              <span className="block text-[10px] text-amber-400 mt-0.5">User Edited</span>
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
                <h2 className="text-xl font-bold">Persona, Tone & System Directives</h2>
                <p className="text-sm text-slate-400">
                  Tune the voice of the FormPilot agent and supply custom user prompt add-ons.
                </p>
              </div>

              <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 space-y-6">
                {/* Tone Presets */}
                <div className="space-y-3">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
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
                        className={`p-3.5 rounded-xl border text-left transition ${
                          tone === item.id
                            ? 'bg-blue-600/10 border-blue-500 text-white shadow-sm'
                            : 'bg-slate-950/60 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <strong className="block text-sm font-semibold capitalize">{item.label}</strong>
                        <span className="text-[11px] text-slate-400 block mt-0.5">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* System Prompt Addons */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                    Custom System Prompt Directives (Appended to agent brain)
                  </label>
                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    placeholder="E.g., 'Always format phone numbers with international code +91. Prioritize remote work preference. Emphasize full-stack React and autonomous AI experience.'"
                    className="w-full bg-slate-950 border border-slate-700 rounded-xl p-3 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                  />
                  <p className="text-[11px] text-slate-400">
                    These rules persist across all autofill actions in both the web app batch runner and browser extension.
                  </p>
                </div>

                {saveSuccessMessage && (
                  <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-xs text-emerald-400 flex items-center gap-2">
                    <CheckCircle2 size={16} />
                    <span>Persona settings saved successfully!</span>
                  </div>
                )}

                <div className="pt-2">
                  <button
                    onClick={handleSaveSettings}
                    className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/20 transition"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Upload Reference Document</h3>
            <form onSubmit={handleAddDocument} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Document Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Master_Degree_Transcript.pdf"
                  value={newDocName}
                  onChange={(e) => setNewDocName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Semantic Description (To guide the AI)</label>
                <textarea
                  placeholder="Describe what information this document contains..."
                  value={newDocDesc}
                  onChange={(e) => setNewDocDesc(e.target.value)}
                  rows={3}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="text-xs text-slate-400 hover:text-white px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 w-full max-w-md space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white">Create Form Deadline Reminder</h3>
            <form onSubmit={handleAddReminder} className="space-y-4">
              <div className="space-y-1">
                <label className="text-xs text-slate-400">Website Form URL</label>
                <input
                  type="url"
                  required
                  placeholder="https://grants.gov/apply/form-101"
                  value={reminderUrl}
                  onChange={(e) => setReminderUrl(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Title / Purpose</label>
                <input
                  type="text"
                  placeholder="e.g. Q4 Grant Application"
                  value={reminderTitle}
                  onChange={(e) => setReminderTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Target Deadline</label>
                <input
                  type="datetime-local"
                  value={reminderDeadline}
                  onChange={(e) => setReminderDeadline(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-slate-400">Auto-Action Policy</label>
                <select
                  value={reminderPolicy}
                  onChange={(e) => setReminderPolicy(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-blue-500"
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
                  className="text-xs text-slate-400 hover:text-white px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold px-4 py-2 rounded-xl"
                >
                  Create Reminder
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
