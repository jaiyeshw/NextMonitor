'use client';

import React, { useState } from 'react';
import { Activity, Lock, User, ArrowRight, ShieldCheck, Sparkles, CheckCircle2, AlertCircle } from 'lucide-react';

interface LoginPageProps {
  onLoginSuccess: (user: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!username || !password) {
      setError('Please enter both username and password.');
      return;
    }

    setIsSubmitting(true);

    // Simulate slick authentication delay
    setTimeout(() => {
      if ((username === 'admin' && password === 'admin123') || password.length >= 4) {
        setIsSubmitting(false);
        setIsSuccess(true);

        setTimeout(() => {
          onLoginSuccess(username);
        }, 800);
      } else {
        setIsSubmitting(false);
        setError('Invalid credentials. Please check your username and password.');
      }
    }, 1000);
  };

  return (
    <div className="relative min-h-screen w-full bg-[#070a11] text-slate-100 flex items-center justify-center p-4 overflow-hidden select-none">
      {/* Dynamic Animated Ambient Glow Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl animate-pulse pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-[30rem] h-[30rem] bg-indigo-600/15 rounded-full blur-3xl animate-pulse pointer-events-none" style={{ animationDuration: '6s' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[40rem] h-[40rem] bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Grid Pattern overlay */}
      <div
        className="absolute inset-0 opacity-10 pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(#3b82f6 1px, transparent 1px)`,
          backgroundSize: '24px 24px',
        }}
      />

      {/* Glassmorphism Card */}
      <div className={`relative w-full max-w-md bg-slate-900/60 backdrop-blur-xl border border-slate-800/80 rounded-3xl p-8 shadow-2xl shadow-blue-950/40 z-10 transition-all duration-500 ${isSuccess ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        
        {/* Animated Brand Header */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-4 group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 rounded-2xl blur opacity-70 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-pulse" />
            <div className="relative h-16 w-16 rounded-2xl bg-slate-950 border border-slate-700/60 flex items-center justify-center shadow-xl">
              <Activity className="h-8 w-8 text-blue-400 animate-pulse" />
            </div>
          </div>

          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold mb-2">
            <Sparkles className="h-3.5 w-3.5" /> NexMonitor Telemetry OS
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">Welcome Back</h1>
          <p className="text-xs text-slate-400 mt-1">Sign in to access real-time server cluster telemetry</p>
        </div>

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-rose-950/50 border border-rose-800/80 p-3.5 rounded-xl text-rose-300 text-xs flex items-center gap-2.5 animate-shake">
              <AlertCircle className="h-4 w-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}

          {/* Username Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Username</label>
            <div className="relative group">
              <User className="h-4 w-4 text-slate-500 group-focus-within:text-blue-400 absolute left-3.5 top-3.5 transition-colors" />
              <input
                type="text"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500/80 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Password Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 ml-1">Password</label>
            <div className="relative group">
              <Lock className="h-4 w-4 text-slate-500 group-focus-within:text-blue-400 absolute left-3.5 top-3.5 transition-colors" />
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 focus:border-blue-500/80 rounded-xl pl-10 pr-4 py-3 text-xs text-slate-100 outline-none transition-all duration-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || isSuccess}
            className="w-full relative mt-6 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-600 hover:from-blue-500 hover:via-indigo-500 hover:to-cyan-500 text-white font-semibold py-3.5 rounded-xl text-xs shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 transition-all duration-200 hover:scale-[1.01] active:scale-[0.99] disabled:opacity-70 group"
          >
            {isSuccess ? (
              <>
                <CheckCircle2 className="h-4 w-4 text-emerald-300 animate-bounce" />
                <span>Access Granted...</span>
              </>
            ) : isSubmitting ? (
              <>
                <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Authenticating Node...</span>
              </>
            ) : (
              <>
                <span>Sign In to Dashboard</span>
                <ArrowRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </form>

        {/* Footer info */}
        <div className="mt-8 pt-6 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-500">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
            <span>256-bit Encrypted Session</span>
          </div>
          <span className="font-mono text-slate-600">v1.0.0</span>
        </div>
      </div>
    </div>
  );
}
