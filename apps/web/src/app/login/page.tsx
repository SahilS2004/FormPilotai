'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Mail, 
  Lock, 
  User, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  Eye, 
  EyeOff, 
  Sparkles,
  ArrowLeft
} from 'lucide-react';
import { validateEmail, validatePassword } from '@/lib/auth';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Real-time email validation
  const handleEmailChange = (val: string) => {
    setEmail(val);
    setServerError(null);

    if (!val) {
      setEmailError(null);
      return;
    }

    if (val.includes('+')) {
      setEmailError('Email aliases containing "+" are not allowed. Please enter your primary email.');
      return;
    }

    const check = validateEmail(val);
    if (!check.isValid) {
      setEmailError(check.error || 'Invalid email address');
    } else {
      setEmailError(null);
    }
  };

  const handlePasswordChange = (val: string) => {
    setPassword(val);
    setPasswordError(null);
    setServerError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setServerError(null);

    // Final validation
    const emailCheck = validateEmail(email);
    if (!emailCheck.isValid) {
      setEmailError(emailCheck.error || 'Invalid email');
      return;
    }

    const passwordCheck = validatePassword(password);
    if (!passwordCheck.isValid) {
      setPasswordError(passwordCheck.error || 'Invalid password');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: mode,
          email,
          password,
          name: mode === 'signup' ? name : undefined
        })
      });

      const data = await res.json();

      if (!res.ok) {
        setServerError(data.error || 'Authentication failed');
        setIsLoading(false);
        return;
      }

      // Store authenticated session
      if (typeof window !== 'undefined') {
        localStorage.setItem('formpilot_user', JSON.stringify(data.user));
        localStorage.setItem('formpilot_token', data.token);
      }

      router.push('/dashboard');
    } catch (err: any) {
      setServerError(err.message || 'Network error occurred');
      setIsLoading(false);
    }
  };

  const handleDemoSignIn = () => {
    setEmail('sahilsarawgi1239@gmail.com');
    setPassword('DemoPassword123!');
    setEmailError(null);
    setPasswordError(null);
    setServerError(null);

    // Auto submit demo
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        localStorage.setItem('formpilot_user', JSON.stringify({
          id: 'usr_demo_1',
          name: 'Sahil Sarawgi',
          email: 'sahilsarawgi1239@gmail.com',
          role: 'user'
        }));
        localStorage.setItem('formpilot_token', 'fpt_demo_session_active');
      }
      router.push('/dashboard');
    }, 400);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-8 sm:py-12 px-4 sm:px-6 lg:px-8">
      {/* Back to Home Link */}
      <div className="w-full max-w-md mx-auto mb-4 sm:mb-6 flex justify-start">
        <Link 
          href="/" 
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-600 hover:text-navy-800 bg-white px-3.5 py-2 rounded-xl border border-slate-200 shadow-2xs hover:shadow-xs transition"
        >
          <ArrowLeft size={14} className="text-cyan-600" />
          <span>Back to Landing Page</span>
        </Link>
      </div>

      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Brand Logo */}
        <div className="flex justify-center">
          <Link href="/">
            <img 
              src="/brand/logo-full.png" 
              alt="FormPilot AI" 
              className="h-11 sm:h-14 md:h-15 w-auto object-contain cursor-pointer transition hover:opacity-95"
            />
          </Link>
        </div>

        <h2 className="mt-5 text-center text-xl font-extrabold text-navy-800 tracking-tight">
          {mode === 'signin' ? 'Sign in to your FormPilot workspace' : 'Create your FormPilot account'}
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Context-grounded autofill powered by your verified documents
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-3xl sm:px-10 space-y-6">
          {/* Mode Switcher Tabs */}
          <div className="flex rounded-xl bg-slate-100 p-1 border border-slate-200/80">
            <button
              type="button"
              onClick={() => { setMode('signin'); setServerError(null); }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signin' 
                  ? 'bg-white text-navy-800 shadow-xs' 
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => { setMode('signup'); setServerError(null); }}
              className={`w-1/2 py-2 text-xs font-bold rounded-lg transition-all ${
                mode === 'signup' 
                  ? 'bg-white text-navy-800 shadow-xs' 
                  : 'text-slate-600 hover:text-navy-800'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Server Error Alert */}
          {serverError && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle size={16} className="text-rose-600 shrink-0 mt-0.5" />
              <span>{serverError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div className="space-y-1">
                <label className="text-xs font-bold text-navy-800 uppercase tracking-wider block">
                  Full Name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                    <User size={16} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Sahil Sarawgi"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-cyan-200 focus:border-cyan-500"
                  />
                </div>
              </div>
            )}

            {/* Email Field with Strict No-Plus Validation */}
            <div className="space-y-1">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-navy-800 uppercase tracking-wider block">
                  Email Address
                </label>
                <span className="text-[10px] text-slate-400 font-medium">Standard email only (no &apos;+&apos; aliases)</span>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail size={16} />
                </div>
                <input
                  type="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => handleEmailChange(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-10 pr-3 text-xs text-slate-900 focus:outline-none focus:ring-2 transition ${
                    emailError 
                      ? 'border-rose-400 focus:ring-rose-100 focus:border-rose-500 bg-rose-50/20' 
                      : 'border-slate-300 focus:ring-cyan-200 focus:border-cyan-500'
                  }`}
                />
              </div>

              {/* Inline Strict Email Warning */}
              {emailError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium pt-1">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-navy-800 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock size={16} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="••••••••••••"
                  value={password}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  className={`w-full bg-slate-50 border rounded-xl py-2.5 pl-10 pr-10 text-xs text-slate-900 focus:outline-none focus:ring-2 transition ${
                    passwordError 
                      ? 'border-rose-400 focus:ring-rose-100 focus:border-rose-500' 
                      : 'border-slate-300 focus:ring-cyan-200 focus:border-cyan-500'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>

              {passwordError && (
                <div className="flex items-center gap-1.5 text-[11px] text-rose-600 font-medium pt-1">
                  <AlertCircle size={13} className="shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            {mode === 'signin' && (
              <div className="flex items-center justify-between pt-1">
                <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="rounded border-slate-300 text-cyan-600 focus:ring-cyan-500"
                  />
                  <span>Remember this device</span>
                </label>
                <button
                  type="button"
                  onClick={() => alert('Password reset link will be sent to verified standard emails.')}
                  className="text-xs font-semibold text-cyan-700 hover:text-cyan-800"
                >
                  Forgot password?
                </button>
              </div>
            )}

            {/* Primary Submit Button with Lightup Effect */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || Boolean(emailError)}
                className="btn-lightup w-full bg-navy-800 hover:bg-navy-900 disabled:opacity-50 text-white text-xs font-bold py-3 px-4 rounded-xl shadow-sm hover:shadow flex items-center justify-center gap-2"
              >
                <span>{isLoading ? 'Authenticating...' : mode === 'signin' ? 'Sign In to Workspace' : 'Create Free Account'}</span>
                <ArrowRight size={15} className="text-cyan-400" />
              </button>
            </div>
          </form>

          {/* Demo Quick-Login Helper */}
          <div className="pt-2 border-t border-slate-100 space-y-2">
            <span className="text-[11px] text-slate-500 block text-center font-medium">
              Want to test instantly without creating an account?
            </span>
            <button
              type="button"
              onClick={handleDemoSignIn}
              className="btn-lightup-subtle w-full bg-cyan-50 hover:bg-cyan-100 text-cyan-900 border border-cyan-200 text-xs font-bold py-2.5 px-4 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-cyan-600" />
              <span>Instant 1-Click Demo Login</span>
            </button>
          </div>
        </div>

        {/* Security badge footer */}
        <div className="mt-6 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
          <ShieldCheck size={15} className="text-emerald-600" />
          <span>Client-Side PII Encryption • Zero Document Sale Policy</span>
        </div>
      </div>
    </div>
  );
}
