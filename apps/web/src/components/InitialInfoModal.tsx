'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Briefcase, CheckCircle2, Sparkles } from 'lucide-react';
import { PersonaTone } from '@formpilot/shared';
import {
  PRIMARY_USE_CASES,
  PROFESSION_OPTIONS,
  REFERRAL_SOURCE_OPTIONS,
  TONE_PRESETS,
} from '@/config/persona';

export interface UserInitialProfile {
  tone: PersonaTone;
  profession: string;
  referralSource: string;
  primaryUseCases: string[];
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  nationality?: string;
}

interface InitialInfoModalProps {
  isOpen: boolean;
  userName?: string;
  initialProfile?: UserInitialProfile | null;
  onSave: (profile: UserInitialProfile) => void;
  onSkip?: () => void;
}

const STEPS = [
  'Your role',
  'What you will use it for',
  'Basic information',
  'Agent tone',
  'One last detail',
] as const;

const GENDERS = ['Female', 'Male', 'Non-binary', 'Prefer not to say'] as const;

export default function InitialInfoModal({
  isOpen,
  initialProfile,
  onSave,
  onSkip,
}: InitialInfoModalProps) {
  const [step, setStep] = useState(0);
  const [profession, setProfession] = useState(initialProfile?.profession || '');
  const [useCase, setUseCase] = useState(initialProfile?.primaryUseCases?.[0] || '');
  const [tone, setTone] = useState<PersonaTone | ''>(initialProfile?.tone || '');
  const [referralSource, setReferralSource] = useState(initialProfile?.referralSource || '');
  const [phone, setPhone] = useState(initialProfile?.phone || '');
  const [dateOfBirth, setDateOfBirth] = useState(initialProfile?.dateOfBirth || '');
  const [gender, setGender] = useState(initialProfile?.gender || '');
  const [address, setAddress] = useState(initialProfile?.address || '');
  const [city, setCity] = useState(initialProfile?.city || '');
  const [region, setRegion] = useState(initialProfile?.state || '');
  const [postalCode, setPostalCode] = useState(initialProfile?.postalCode || '');
  const [country, setCountry] = useState(initialProfile?.country || '');
  const [nationality, setNationality] = useState(initialProfile?.nationality || '');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!initialProfile) return;
    setProfession(initialProfile.profession || '');
    setUseCase(initialProfile.primaryUseCases?.[0] || '');
    setTone(initialProfile.tone || '');
    setReferralSource(initialProfile.referralSource || '');
    setPhone(initialProfile.phone || '');
    setDateOfBirth(initialProfile.dateOfBirth || '');
    setGender(initialProfile.gender || '');
    setAddress(initialProfile.address || '');
    setCity(initialProfile.city || '');
    setRegion(initialProfile.state || '');
    setPostalCode(initialProfile.postalCode || '');
    setCountry(initialProfile.country || '');
    setNationality(initialProfile.nationality || '');
    if (isOpen && initialProfile.profession && (!initialProfile.dateOfBirth || !initialProfile.address)) {
      setStep(2);
    }
  }, [initialProfile, isOpen]);

  if (!isOpen) return null;

  const basicsReady = phone.replace(/\D/g, '').length >= 8
    && /^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)
    && address.trim().length > 3
    && city.trim().length > 1
    && region.trim().length > 1
    && postalCode.trim().length > 2
    && country.trim().length > 1;

  const canContinue = [
    profession.length > 0,
    useCase.length > 0,
    basicsReady,
    tone.length > 0,
    referralSource.length > 0,
  ][step];

  const finish = () => {
    if (!profession || !useCase || !tone || !referralSource || !basicsReady) return;
    setIsSubmitting(true);
    onSave({
      tone,
      profession,
      referralSource,
      primaryUseCases: [useCase],
      phone: phone.trim(),
      dateOfBirth,
      gender,
      address: address.trim(),
      city: city.trim(),
      state: region.trim(),
      postalCode: postalCode.trim(),
      country: country.trim(),
      nationality: nationality.trim(),
    });
    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-white/30 dark:bg-slate-950/45 backdrop-blur-xl">
      <div
        key={step}
        className="w-full max-w-lg bg-white/95 dark:bg-slate-900/95 border border-white/70 dark:border-slate-700 rounded-3xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="px-6 sm:px-8 pt-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] font-extrabold uppercase tracking-wider px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-950 text-cyan-800 dark:text-cyan-300">
              Welcome setup
            </span>
            <span className="text-xs text-slate-400 font-medium">
              {step + 1} of {STEPS.length}
            </span>
          </div>
          <h2 className="text-xl font-extrabold text-navy-800 dark:text-white tracking-tight mt-3">
            {STEPS[step]}
          </h2>
        </div>

        <div className="px-6 sm:px-8 py-5 max-h-[60vh] overflow-y-auto">
          {step === 0 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">What is your profession or primary role?</p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {PROFESSION_OPTIONS.map((option) => (
                  <ChoiceButton key={option} selected={profession === option} onClick={() => setProfession(option)}>
                    <Briefcase size={14} />
                    <span>{option}</span>
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">What are you going to use FormPilot for?</p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {PRIMARY_USE_CASES.map((option) => (
                  <ChoiceButton key={option} selected={useCase === option} onClick={() => setUseCase(option)}>
                    <span>{option}</span>
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <p className="text-sm text-slate-600 dark:text-slate-300">
                These details are saved as <span className="font-semibold">user_basic_info</span> in your knowledge base and used when a form asks for them.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Phone" className="sm:col-span-2">
                  <input value={phone} onChange={(event) => setPhone(event.target.value)} placeholder="+91 95328 53027" className={inputClass} />
                </Field>
                <Field label="Date of birth">
                  <input type="date" value={dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Gender">
                  <select value={gender} onChange={(event) => setGender(event.target.value)} className={inputClass}>
                    <option value="">Select</option>
                    {GENDERS.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                </Field>
                <Field label="Street address" className="sm:col-span-2">
                  <input value={address} onChange={(event) => setAddress(event.target.value)} placeholder="House, street, area" className={inputClass} />
                </Field>
                <Field label="City">
                  <input value={city} onChange={(event) => setCity(event.target.value)} className={inputClass} />
                </Field>
                <Field label="State">
                  <input value={region} onChange={(event) => setRegion(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Postal code">
                  <input value={postalCode} onChange={(event) => setPostalCode(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Country">
                  <input value={country} onChange={(event) => setCountry(event.target.value)} className={inputClass} />
                </Field>
                <Field label="Nationality" className="sm:col-span-2">
                  <input value={nationality} onChange={(event) => setNationality(event.target.value)} placeholder="Optional" className={inputClass} />
                </Field>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">Preferred agent tone</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                {TONE_PRESETS.map((option) => (
                  <button
                    type="button"
                    key={option.id}
                    onClick={() => setTone(option.id)}
                    className={`p-3.5 rounded-2xl border text-left transition ${
                      tone === option.id
                        ? 'bg-navy-800 border-navy-800 dark:bg-cyan-600 dark:border-cyan-600 text-white'
                        : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-400'
                    }`}
                  >
                    <span className="flex items-center justify-between gap-2 font-bold text-xs">
                      <span className="inline-flex items-center gap-1.5"><Sparkles size={13} />{option.label}</span>
                      {tone === option.id && <CheckCircle2 size={14} />}
                    </span>
                    <span className={`block text-[11px] mt-1 ${tone === option.id ? 'text-slate-200' : 'text-slate-500 dark:text-slate-400'}`}>
                      {option.desc}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-2">
              <p className="text-sm text-slate-600 dark:text-slate-300">How did you hear about FormPilot?</p>
              <div className="grid grid-cols-1 gap-2 pt-1">
                {REFERRAL_SOURCE_OPTIONS.map((option) => (
                  <ChoiceButton key={option} selected={referralSource === option} onClick={() => setReferralSource(option)}>
                    <span>{option}</span>
                  </ChoiceButton>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 sm:px-8 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {step > 0 ? (
              <button
                type="button"
                onClick={() => setStep((current) => current - 1)}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-navy-800 dark:hover:text-white"
              >
                <ArrowLeft size={14} />
                Back
              </button>
            ) : onSkip ? (
              <button type="button" onClick={onSkip} className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                Skip for now
              </button>
            ) : <span />}
          </div>

          {step < STEPS.length - 1 ? (
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => setStep((current) => current + 1)}
              className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-900 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
            >
              Continue
              <ArrowRight size={14} />
            </button>
          ) : (
            <button
              type="button"
              disabled={!canContinue || isSubmitting}
              onClick={finish}
              className="inline-flex items-center gap-2 bg-navy-800 hover:bg-navy-900 disabled:opacity-40 text-white text-xs font-bold px-4 py-2.5 rounded-xl"
            >
              {isSubmitting ? 'Saving...' : 'Save and continue'}
              <ArrowRight size={14} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  className = '',
  children,
}: {
  label: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label className={`block space-y-1 ${className}`}>
      <span className="text-[11px] font-bold uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</span>
      {children}
    </label>
  );
}

const inputClass = 'w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 px-3 py-2.5 text-xs text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-cyan-400';

function ChoiceButton({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-3 px-3.5 py-3 rounded-2xl border text-left text-xs font-semibold transition ${
        selected
          ? 'bg-navy-800 border-navy-800 text-white dark:bg-cyan-600 dark:border-cyan-600'
          : 'bg-slate-50 dark:bg-slate-800/70 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200 hover:border-cyan-400'
      }`}
    >
      <span className="inline-flex items-center gap-2">{children}</span>
      {selected && <CheckCircle2 size={15} />}
    </button>
  );
}
