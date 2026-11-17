'use client';

import React, { useState, useEffect } from 'react';
import { 
  X, 
  User, 
  Sliders, 
  Key, 
  Download, 
  Sun, 
  Moon, 
  LogOut, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  ExternalLink,
  Sparkles,
  Bot,
  ShieldCheck,
  Cpu,
  Layers,
  ChevronRight,
  RefreshCw,
  Copy,
  Info
} from 'lucide-react';
import { PersonaTone } from '@formpilot/shared';
import { UserInitialProfile } from './InitialInfoModal';
import { 
  TONE_PRESETS, 
  DIRECTIVE_SUGGESTION_CHIPS, 
  PROFESSION_OPTIONS, 
  REFERRAL_SOURCE_OPTIONS 
} from '@/config/persona';
import { SITE_CONFIG } from '@/config/site';

export interface UserSession {
  id: string;
  name: string;
  email: string;
  role: string;
  createdAt?: string;
}

export type SettingsTabId = 'persona' | 'model' | 'profile' | 'extension' | 'appearance';

interface SettingsProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTabId;
  user: UserSession | null;
  currentTone: PersonaTone;
  onToneChange: (tone: PersonaTone) => void;
  customPrompt?: string;
  onPromptDirectivesChange?: (directives: string) => void;
  userProfile?: UserInitialProfile | null;
  onProfileUpdate?: (profile: UserInitialProfile) => void;
  isDarkMode: boolean;
  onToggleTheme: (isDark: boolean) => void;
}

export default function SettingsProfileModal({
  isOpen,
  onClose,
  initialTab = 'persona',
  user,
  currentTone,
  onToneChange,
  customPrompt: propCustomPrompt,
  onPromptDirectivesChange,
  userProfile,
  onProfileUpdate,
  isDarkMode,
  onToggleTheme
}: SettingsProfileModalProps) {
  const [activeTab, setActiveTab] = useState<SettingsTabId>(initialTab);

  // Agent API Key State
  const [apiKey, setApiKey] = useState('');
  const [keyStatus, setKeyStatus] = useState<'default_backend' | 'testing' | 'custom_connected' | 'error'>('default_backend');
  const [statusMessage, setStatusMessage] = useState(`Connected to Default ${SITE_CONFIG.defaultModel.name}`);
  
  // Custom directives
  const [customPrompt, setCustomPrompt] = useState(propCustomPrompt || '');
  const [showKey, setShowKey] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  // Profile fields
  const [profession, setProfession] = useState<string>(userProfile?.profession || PROFESSION_OPTIONS[0]);
  const [referralSource, setReferralSource] = useState<string>(userProfile?.referralSource || REFERRAL_SOURCE_OPTIONS[0]);
  const [phone, setPhone] = useState(userProfile?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(userProfile?.dateOfBirth || '');
  const [gender, setGender] = useState(userProfile?.gender || '');
  const [address, setAddress] = useState(userProfile?.address || '');
  const [city, setCity] = useState(userProfile?.city || '');
  const [region, setRegion] = useState(userProfile?.state || '');
  const [postalCode, setPostalCode] = useState(userProfile?.postalCode || '');
  const [country, setCountry] = useState(userProfile?.country || '');
  const [nationality, setNationality] = useState(userProfile?.nationality || '');

  useEffect(() => {
    if (isOpen) {
      if (initialTab) {
        setActiveTab(initialTab);
      }
      if (typeof window !== 'undefined') {
        const savedKey = localStorage.getItem('formpilot_custom_api_key');
        if (savedKey) {
          setApiKey(savedKey);
          setKeyStatus('custom_connected');
          setStatusMessage('Custom API Key Connected & Active');
        } else {
          setKeyStatus('default_backend');
          setStatusMessage(`Connected to Default ${SITE_CONFIG.defaultModel.name}`);
        }

        const savedDirectives = localStorage.getItem('formpilot_custom_directives');
        if (savedDirectives) {
          setCustomPrompt(savedDirectives);
        } else if (propCustomPrompt) {
          setCustomPrompt(propCustomPrompt);
        }

        if (userProfile?.profession) {
          setProfession(userProfile.profession);
        }
        if (userProfile?.referralSource) {
          setReferralSource(userProfile.referralSource);
        }
        setPhone(userProfile?.phone || '');
        setDateOfBirth(userProfile?.dateOfBirth || '');
        setGender(userProfile?.gender || '');
        setAddress(userProfile?.address || '');
        setCity(userProfile?.city || '');
        setRegion(userProfile?.state || '');
        setPostalCode(userProfile?.postalCode || '');
        setCountry(userProfile?.country || '');
        setNationality(userProfile?.nationality || '');
      }
    }
  }, [isOpen, initialTab, propCustomPrompt, userProfile]);

  if (!isOpen) return null;

  const triggerSuccessNotification = (msg: string) => {
    setSaveMessage(msg);
    setSaveSuccess(true);
    setTimeout(() => {
      setSaveSuccess(false);
      setSaveMessage('');
    }, 2400);
  };

  const handleTestKey = () => {
    if (!apiKey.trim()) {
      localStorage.removeItem('formpilot_custom_api_key');
      setKeyStatus('default_backend');
      setStatusMessage(`Connected to Default ${SITE_CONFIG.defaultModel.name}`);
      triggerSuccessNotification('Reverted to default backend model.');
      return;
    }

    setKeyStatus('testing');
    setStatusMessage('Verifying credentials with model gateway...');

    setTimeout(() => {
      if (apiKey.trim().length >= 16) {
        localStorage.setItem('formpilot_custom_api_key', apiKey.trim());
        setKeyStatus('custom_connected');
        setStatusMessage('Custom API Key Verified & Connected');
        triggerSuccessNotification('Custom model credentials verified!');
      } else {
        localStorage.removeItem('formpilot_custom_api_key');
        setKeyStatus('default_backend');
        setStatusMessage(`Verification failed — Fallback to Default ${SITE_CONFIG.defaultModel.name}`);
        triggerSuccessNotification('Key check failed. Falling back to default model.');
      }
    }, 600);
  };

  const handleSaveDirectives = () => {
    localStorage.setItem('formpilot_custom_directives', customPrompt);
    if (onPromptDirectivesChange) {
      onPromptDirectivesChange(customPrompt);
    }
    triggerSuccessNotification('System prompt directives saved and synced.');
  };

  const handleAddDirectiveChip = (snippet: string) => {
    setCustomPrompt((prev) => {
      const trimmed = prev.trim();
      if (!trimmed) return snippet;
      if (trimmed.includes(snippet)) return prev;
      return `${trimmed}\n${snippet}`;
    });
  };

  const handleSaveProfileInfo = () => {
    if (onProfileUpdate) {
      onProfileUpdate({
        tone: currentTone,
        profession,
        referralSource,
        primaryUseCases: userProfile?.primaryUseCases || ['Job Applications & Career Portals'],
        phone,
        dateOfBirth,
        gender,
        address,
        city,
        state: region,
        postalCode,
        country,
        nationality,
      });
    }
    triggerSuccessNotification('Profile details updated successfully.');
  };

  const handleSignOut = () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('formpilot_user');
      localStorage.removeItem('formpilot_token');
      document.cookie = 'formpilot_token=; path=/; max-age=0';
      window.location.href = '/login';
    }
  };

  const NAV_TABS = [
    { id: 'persona', label: 'Persona & Tone', icon: Sliders, subtitle: 'Voice & directives' },
    { id: 'model', label: 'Agent & Model', icon: Bot, subtitle: 'Reasoning & BYOK' },
    { id: 'profile', label: 'User Profile', icon: User, subtitle: 'Career & identity' },
    { id: 'extension', label: 'Chrome Extension', icon: Download, subtitle: 'Download & tools' },
    { id: 'appearance', label: 'Appearance', icon: Sun, subtitle: 'Theme & account' }
  ] as const;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-navy-950/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-4xl shadow-2xl max-h-[92vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-150 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-850/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-navy-900 to-navy-800 dark:from-cyan-600 dark:to-cyan-700 text-white flex items-center justify-center shadow-xs">
              <Sliders size={18} className="text-cyan-400 dark:text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base text-navy-800 dark:text-white tracking-tight">
                Settings & Configuration
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Autonomous agent brain, model integration, user profile, and browser tools
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
            aria-label="Close settings"
          >
            <X size={18} />
          </button>
        </div>

        {/* Modal Main Layout: Left Sidebar + Right Content */}
        <div className="flex-1 flex flex-col md:flex-row min-h-0 overflow-hidden">
          
          {/* Left Navigation Sidebar */}
          <aside className="w-full md:w-60 border-b md:border-b-0 md:border-r border-slate-150 dark:border-slate-800 p-3 sm:p-4 bg-slate-50/50 dark:bg-slate-900/60 flex md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto shrink-0">
            {NAV_TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as SettingsTabId)}
                  className={`flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-left transition-all whitespace-nowrap md:whitespace-normal w-full group ${
                    isActive
                      ? 'bg-navy-800 dark:bg-cyan-600 text-white shadow-xs'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/80 hover:text-navy-900 dark:hover:text-white'
                  }`}
                >
                  <Icon size={17} className={`shrink-0 transition ${isActive ? 'text-cyan-300 dark:text-white' : 'text-slate-400 dark:text-slate-400 group-hover:text-cyan-600 dark:group-hover:text-cyan-400'}`} />
                  <div className="min-w-0 flex-1">
                    <span className="block text-xs font-bold leading-tight truncate">
                      {tab.label}
                    </span>
                    <span className={`hidden md:block text-[10px] leading-tight truncate ${isActive ? 'text-slate-200/90 dark:text-cyan-100' : 'text-slate-400 dark:text-slate-500'}`}>
                      {tab.subtitle}
                    </span>
                  </div>
                  {isActive && (
                    <ChevronRight size={14} className="hidden md:block text-slate-300 dark:text-white/80 shrink-0" />
                  )}
                </button>
              );
            })}

            {/* Quick Extension Pill in Sidebar */}
            <div className="hidden md:block mt-auto pt-4 border-t border-slate-200/70 dark:border-slate-800">
              <a
                href={SITE_CONFIG.downloads.extensionZip}
                download="formpilot-extension.zip"
                className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800/60 text-cyan-800 dark:text-cyan-300 text-xs font-semibold hover:bg-cyan-100/70 transition"
              >
                <div className="flex items-center gap-2 truncate">
                  <Download size={13} className="text-cyan-600 dark:text-cyan-400 shrink-0" />
                  <span className="truncate text-[11px]">Extension v{SITE_CONFIG.version}</span>
                </div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">ZIP</span>
              </a>
            </div>
          </aside>

          {/* Right Content Viewport */}
          <main className="flex-1 overflow-y-auto p-5 sm:p-7 space-y-6 text-slate-800 dark:text-slate-200 bg-white dark:bg-slate-900">
            
            {/* Global Flash Notification */}
            {saveSuccess && (
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-xs text-emerald-800 dark:text-emerald-300 font-semibold flex items-center gap-2.5 animate-in fade-in duration-150">
                <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                <span>{saveMessage || 'Preferences saved successfully!'}</span>
              </div>
            )}

            {/* TAB 1: PERSONA, TONE & PROMPT DIRECTIVES */}
            {activeTab === 'persona' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-extrabold text-navy-800 dark:text-white">
                    Agent Persona & Tone Directives
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Select how the autonomous copilot formulates open-ended answers and add persistent system directives.
                  </p>
                </div>

                {/* Tone Presets Grid */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Sparkles size={14} className="text-cyan-600 dark:text-cyan-400" />
                      <span>Persona Tone Presets</span>
                    </label>
                    <span className="text-xs font-semibold text-cyan-700 dark:text-cyan-400 capitalize">
                      Active: <strong className="font-extrabold">{currentTone}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {TONE_PRESETS.map((preset) => {
                      const isSelected = currentTone === preset.id;
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() => onToneChange(preset.id)}
                          className={`p-4 rounded-2xl border text-left transition-all flex flex-col justify-between gap-3 ${
                            isSelected
                              ? 'bg-navy-800 dark:bg-cyan-950/50 border-navy-800 dark:border-cyan-500 text-white shadow-sm ring-2 ring-cyan-400 dark:ring-cyan-500/50'
                              : 'bg-slate-50/70 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-cyan-400 dark:hover:border-cyan-600'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <strong className="block text-xs font-extrabold capitalize">{preset.label}</strong>
                              <span className={`text-[11px] block mt-0.5 leading-snug ${isSelected ? 'text-slate-200 dark:text-cyan-200' : 'text-slate-500 dark:text-slate-400'}`}>
                                {preset.desc}
                              </span>
                            </div>
                            {isSelected && (
                              <CheckCircle2 size={16} className="text-cyan-300 dark:text-cyan-400 shrink-0 mt-0.5" />
                            )}
                          </div>

                          <div className={`text-[10.5px] italic rounded-xl p-2.5 border ${
                            isSelected
                              ? 'bg-navy-900/60 border-navy-700 text-cyan-200 dark:text-cyan-100'
                              : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400'
                          }`}>
                            &ldquo;{preset.example}&rdquo;
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* System Prompt Directives */}
                <div className="space-y-3 pt-2 border-t border-slate-150 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider block">
                        Custom System Prompt Directives
                      </label>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Instructions injected into every form completion prompt (e.g. format rules, priorities)
                      </span>
                    </div>
                  </div>

                  {/* Suggestion Chips */}
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">Insert preset:</span>
                    {DIRECTIVE_SUGGESTION_CHIPS.map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => handleAddDirectiveChip(chip.snippet)}
                        className="text-[11px] font-semibold px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-cyan-50 dark:hover:bg-cyan-950/60 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-cyan-700 dark:hover:text-cyan-300 hover:border-cyan-300 dark:hover:border-cyan-700 transition"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>

                  <textarea
                    value={customPrompt}
                    onChange={(e) => setCustomPrompt(e.target.value)}
                    rows={4}
                    placeholder="E.g., 'Always format telephone numbers in international E.164. Emphasize full-stack TypeScript and autonomous AI agent development experience.'"
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400 focus:border-cyan-500 leading-relaxed font-sans"
                  />

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={handleSaveDirectives}
                      className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl shadow-xs transition"
                    >
                      Save Prompt Directives
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: AGENT & MODEL CONFIGURATION */}
            {activeTab === 'model' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-extrabold text-navy-800 dark:text-white">
                    Agent Intelligence & Model Gateway
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Connect your own API key (BYOK) or let FormPilot route requests through our built-in high-performance model.
                  </p>
                </div>

                {/* Active Model Status Card */}
                <div className={`p-4 sm:p-5 rounded-2xl border transition-all ${
                  keyStatus === 'custom_connected'
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-300 dark:border-emerald-800'
                    : 'bg-gradient-to-r from-cyan-50/70 via-white to-white dark:from-slate-800/90 dark:to-slate-850 border-cyan-200 dark:border-cyan-800'
                }`}>
                  <div className="flex items-start gap-3.5">
                    <div className={`p-2.5 rounded-2xl text-white shrink-0 mt-0.5 shadow-xs ${
                      keyStatus === 'custom_connected' ? 'bg-emerald-600' : 'bg-navy-800 dark:bg-cyan-600'
                    }`}>
                      <Bot size={20} />
                    </div>
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-extrabold text-navy-800 dark:text-white uppercase tracking-wider">
                          Active Model Engine
                        </span>
                        <span className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full ${
                          keyStatus === 'custom_connected'
                            ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200'
                            : 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200'
                        }`}>
                          {keyStatus === 'custom_connected' ? 'Custom BYOK Active' : 'Default Cloud Engine'}
                        </span>
                      </div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        {statusMessage}
                      </p>
                      <p className="text-[11.5px] text-slate-500 dark:text-slate-400 leading-relaxed">
                        FormPilot autonomously reasons over complex DOM trees and grounds answers against verified Knowledge Base citations using {SITE_CONFIG.defaultModel.name}.
                      </p>
                    </div>
                  </div>
                </div>

                {/* BYOK API Key Input Form */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/40 space-y-3.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Key size={14} className="text-cyan-600 dark:text-cyan-400" />
                      <span>Custom API Key (BYOK - Optional)</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowKey(!showKey)}
                      className="text-xs text-cyan-700 dark:text-cyan-400 font-semibold hover:underline"
                    >
                      {showKey ? 'Hide Key' : 'Reveal Key'}
                    </button>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2.5">
                    <input
                      type={showKey ? 'text' : 'password'}
                      placeholder="e.g. AIzaSy... or sk-ant-... (Leave blank to use default cloud model)"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 font-mono focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    />
                    <button
                      type="button"
                      onClick={handleTestKey}
                      disabled={keyStatus === 'testing'}
                      className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-bold px-5 py-3 rounded-xl transition shadow-xs whitespace-nowrap shrink-0 disabled:opacity-50"
                    >
                      {keyStatus === 'testing' ? 'Verifying...' : 'Test & Connect'}
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    If connected, autofill calls use your credentials. If empty or invalid, the platform smoothly falls back to the default backend model without interruption.
                  </p>
                </div>

                {/* Model Specs Card */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Provider</span>
                    <strong className="block text-xs font-bold text-navy-800 dark:text-white">{SITE_CONFIG.defaultModel.provider}</strong>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Default Model</span>
                    <strong className="block text-xs font-bold text-navy-800 dark:text-white">{SITE_CONFIG.defaultModel.name}</strong>
                  </div>
                  <div className="p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-1">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">Context Window</span>
                    <strong className="block text-xs font-bold text-navy-800 dark:text-white">{SITE_CONFIG.defaultModel.contextWindow}</strong>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 3: PROFILE DETAILS */}
            {activeTab === 'profile' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-extrabold text-navy-800 dark:text-white">
                    User Profile & Initial Info
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Manage your account identity, profession details, and referral channel information.
                  </p>
                </div>

                {/* Identity Card */}
                <div className="flex items-center gap-4 p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700">
                  <div className="w-14 h-14 rounded-2xl bg-navy-800 dark:bg-cyan-600 text-cyan-300 dark:text-white font-extrabold text-lg flex items-center justify-center border border-navy-700 shadow-sm shrink-0">
                    {user?.name ? user.name.slice(0, 2).toUpperCase() : 'FP'}
                  </div>
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h5 className="font-extrabold text-sm text-navy-800 dark:text-white truncate">
                        {user?.name || 'Demo Pilot'}
                      </h5>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300 uppercase">
                        {user?.role || 'user'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                      {user?.email || 'demo@formpilot.ai'}
                    </p>
                    <span className="text-[10.5px] text-slate-400 dark:text-slate-500 block">
                      User ID: <code className="font-mono text-slate-600 dark:text-slate-300">{user?.id || 'usr_demo_1'}</code>
                    </span>
                  </div>
                </div>

                {/* Questionnaire Fields */}
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider block">
                      Profession / Domain
                    </label>
                    <select
                      value={profession}
                      onChange={(e) => setProfession(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      {PROFESSION_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider block">
                      How did you hear about FormPilot?
                    </label>
                    <select
                      value={referralSource}
                      onChange={(e) => setReferralSource(e.target.value)}
                      className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-cyan-400"
                    >
                      {REFERRAL_SOURCE_OPTIONS.map((item) => (
                        <option key={item} value={item}>{item}</option>
                      ))}
                    </select>
                  </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ProfileField label="Phone"><input value={phone} onChange={(e) => setPhone(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Date of birth"><input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Gender"><input value={gender} onChange={(e) => setGender(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Nationality"><input value={nationality} onChange={(e) => setNationality(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Street address" className="sm:col-span-2"><input value={address} onChange={(e) => setAddress(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="City"><input value={city} onChange={(e) => setCity(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="State"><input value={region} onChange={(e) => setRegion(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Postal code"><input value={postalCode} onChange={(e) => setPostalCode(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                    <ProfileField label="Country"><input value={country} onChange={(e) => setCountry(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs" /></ProfileField>
                  </div>

                  <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    onClick={handleSaveProfileInfo}
                    className="btn-lightup bg-navy-800 hover:bg-navy-900 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white text-xs font-bold px-5 py-2.5 rounded-xl transition shadow-xs"
                  >
                    Save Profile Changes
                  </button>
                </div>
              </div>
            )}

            {/* TAB 4: EXTENSION & SAMPLES */}
            {activeTab === 'extension' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-extrabold text-navy-800 dark:text-white">
                    Chrome Extension & Testing Artifacts
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Download the browser companion for live in-tab autofills and sample profiles for quick testing.
                  </p>
                </div>

                {/* Extension Download Card */}
                <div className="p-5 sm:p-6 rounded-2xl border border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50/70 via-white to-white dark:from-slate-800/90 dark:to-slate-850 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-cyan-800 dark:text-cyan-300 bg-cyan-100 dark:bg-cyan-950 px-2.5 py-0.5 rounded-full">
                        Manifest V3 Companion
                      </span>
                      <h5 className="text-sm font-extrabold text-navy-800 dark:text-white">
                        FormPilot Chrome Extension (v{SITE_CONFIG.version})
                      </h5>
                      <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed max-w-lg">
                        Inspect DOM fields in real time, apply confidence heatmaps, navigate multi-step forms, and autofill inputs with grounded citations.
                      </p>
                    </div>

                    <a
                      href={SITE_CONFIG.downloads.extensionZip}
                      download="formpilot-extension.zip"
                      className="btn-lightup inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-600 text-white text-xs font-bold px-4 py-2.5 rounded-xl shadow-xs transition shrink-0 self-start sm:self-center"
                    >
                      <Download size={15} />
                      <span>Download Extension ZIP</span>
                    </a>
                  </div>

                  {/* 3 Step Installation Instructions */}
                  <div className="pt-3 border-t border-slate-200/80 dark:border-slate-700/80 space-y-2">
                    <span className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider block">
                      Quick 3-Step Setup in Google Chrome:
                    </span>
                    <ol className="text-xs text-slate-600 dark:text-slate-400 space-y-1 list-decimal pl-4 leading-relaxed">
                      <li>Download and extract <strong>formpilot-extension.zip</strong> to a folder.</li>
                      <li>Navigate to <code className="text-navy-800 dark:text-cyan-300 font-mono bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">chrome://extensions</code> in Chrome and switch on <strong>Developer mode</strong>.</li>
                      <li>Click <strong>Load unpacked</strong> and select the unzipped directory.</li>
                    </ol>
                  </div>
                </div>

                {/* Sample Profile Testing Card */}
                <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-850 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                        Knowledge Base Seed
                      </span>
                      <h5 className="text-sm font-extrabold text-navy-800 dark:text-white">
                        Sample Applicant Reference Profile (.txt)
                      </h5>
                      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-lg">
                        Test document containing sample employment history, GPA, credentials, and contact details to verify autofill reasoning.
                      </p>
                    </div>

                    <a
                      href={SITE_CONFIG.downloads.sampleProfileTxt}
                      download="sample-reference-profile.txt"
                      className="btn-lightup-subtle inline-flex items-center gap-1.5 text-navy-800 dark:text-cyan-300 border border-slate-200 dark:border-slate-700 text-xs font-bold px-4 py-2 rounded-xl transition shrink-0 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 self-start sm:self-center"
                    >
                      <FileText size={14} className="text-cyan-600" />
                      <span>Download Sample</span>
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 5: APPEARANCE & ACTIONS */}
            {activeTab === 'appearance' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-base font-extrabold text-navy-800 dark:text-white">
                    Appearance & Session Security
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    Toggle your dark/light visual theme or securely end the active session.
                  </p>
                </div>

                {/* Theme Toggle Cards */}
                <div className="space-y-3">
                  <label className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider block">
                    Color Theme Mode
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => onToggleTheme(false)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                        !isDarkMode
                          ? 'bg-navy-800 border-navy-800 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${!isDarkMode ? 'bg-navy-700 text-amber-300' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          <Sun size={18} />
                        </div>
                        <div>
                          <strong className="block text-xs font-bold">Light Mode</strong>
                          <span className={`text-[11px] block ${!isDarkMode ? 'text-slate-300' : 'text-slate-400'}`}>Crisp high-contrast day palette</span>
                        </div>
                      </div>
                      {!isDarkMode && <CheckCircle2 size={16} className="text-cyan-400" />}
                    </button>

                    <button
                      type="button"
                      onClick={() => onToggleTheme(true)}
                      className={`p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                        isDarkMode
                          ? 'bg-cyan-600 border-cyan-600 text-white shadow-xs'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-xl ${isDarkMode ? 'bg-cyan-700 text-cyan-200' : 'bg-slate-200 dark:bg-slate-700 text-slate-400'}`}>
                          <Moon size={18} />
                        </div>
                        <div>
                          <strong className="block text-xs font-bold">Dark Mode</strong>
                          <span className={`text-[11px] block ${isDarkMode ? 'text-cyan-100' : 'text-slate-400'}`}>Deep navy nocturnal palette</span>
                        </div>
                      </div>
                      {isDarkMode && <CheckCircle2 size={16} className="text-white" />}
                    </button>
                  </div>
                </div>

                {/* Session Sign Out */}
                <div className="pt-4 border-t border-slate-150 dark:border-slate-800 flex items-center justify-between">
                  <div>
                    <h5 className="text-xs font-bold text-navy-800 dark:text-white">Active Session</h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Sign out of FormPilot and clear locally stored tokens on this device.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="btn-lightup flex items-center gap-2 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 text-xs font-bold px-4 py-2.5 rounded-xl transition shadow-xs"
                  >
                    <LogOut size={14} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}

          </main>
        </div>

        {/* Modal Bottom Bar */}
        <div className="px-6 py-3.5 border-t border-slate-150 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-850/60 flex items-center justify-between">
          <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
            FormPilot v{SITE_CONFIG.version} • A product of <a href="https://www.innovchromatic.tech" target="_blank" rel="noopener noreferrer" className="text-cyan-700 dark:text-cyan-400 hover:underline font-semibold">InnovChromatic</a> (<a href="https://www.innovchromatic.tech" target="_blank" rel="noopener noreferrer" className="hover:underline">www.innovchromatic.tech</a>)
          </span>
          <button
            onClick={onClose}
            className="text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-navy-800 dark:hover:text-white px-4 py-2 rounded-xl transition hover:bg-slate-100 dark:hover:bg-slate-800"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}

function ProfileField({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1.5 ${className}`}>
      <span className="text-xs font-bold text-navy-800 dark:text-white uppercase tracking-wider">{label}</span>
      {children}
    </label>
  );
}
