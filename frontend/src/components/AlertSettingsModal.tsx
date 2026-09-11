'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  BellRing,
  ShieldAlert,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Send,
  Volume2,
  VolumeX,
  Plus,
  Trash2,
  Users,
  Info,
} from 'lucide-react';
import { AlertSetting } from '../types/monitor';
import { fetchAlertSettings, updateAlertSettings, testAlertEmail } from '../lib/api';
import { audioAlert } from '../lib/audioAlert';

interface AlertSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSettingsUpdated?: (settings: AlertSetting) => void;
}

export function AlertSettingsModal({ isOpen, onClose, onSettingsUpdated }: AlertSettingsModalProps) {
  const [formData, setFormData] = useState<AlertSetting>({
    enabled: true,
    sound_enabled: true,
    cpu_threshold_percent: 60.0,
    smtp_host: 'smtp.gmail.com',
    smtp_port: 587,
    smtp_user: '',
    smtp_password: '',
    from_email: '',
    to_email: '',
    cooldown_minutes: 5,
  });

  const [emailInput, setEmailInput] = useState('');
  const [emailList, setEmailList] = useState<string[]>([]);
  const [emailError, setEmailError] = useState<string | null>(null);

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      setError(null);
      setTestResult(null);
      setEmailError(null);
      setEmailInput('');

      fetchAlertSettings()
        .then((data) => {
          const soundEnabled = data.sound_enabled ?? true;
          setFormData({
            enabled: data.enabled ?? true,
            sound_enabled: soundEnabled,
            cpu_threshold_percent: data.cpu_threshold_percent ?? 60.0,
            smtp_host: data.smtp_host || 'smtp.gmail.com',
            smtp_port: data.smtp_port || 587,
            smtp_user: data.smtp_user || '',
            smtp_password: data.smtp_password || '',
            from_email: data.from_email || '',
            to_email: data.to_email || '',
            cooldown_minutes: data.cooldown_minutes || 5,
          });

          // Parse comma/semicolon/newline-separated emails into list
          const parsed = (data.to_email || '')
            .replace(/;/g, ',')
            .split(',')
            .map((e: string) => e.trim())
            .filter((e: string) => e.length > 0);
          setEmailList(parsed);

          // Sync audioAlert engine state
          audioAlert.setSoundEnabled(soundEnabled);
        })
        .catch((err) => console.error('Failed to load alert settings:', err))
        .finally(() => setLoading(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleAddEmail = () => {
    setEmailError(null);
    const trimmed = emailInput.trim();
    if (!trimmed) return;

    // Allow adding multiple comma-separated emails at once
    const candidates = trimmed
      .replace(/;/g, ',')
      .split(',')
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const invalidEmails = candidates.filter((e) => !emailRegex.test(e));
    if (invalidEmails.length > 0) {
      setEmailError(`Invalid email format: ${invalidEmails.join(', ')}`);
      return;
    }

    const updated = [...emailList];
    candidates.forEach((cand) => {
      if (!updated.includes(cand)) {
        updated.push(cand);
      }
    });

    setEmailList(updated);
    setFormData((prev) => ({ ...prev, to_email: updated.join(', ') }));
    setEmailInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      handleAddEmail();
    }
  };

  const handleRemoveEmail = (emailToRemove: string) => {
    const updated = emailList.filter((e) => e !== emailToRemove);
    setEmailList(updated);
    setFormData((prev) => ({ ...prev, to_email: updated.join(', ') }));
  };

  const handleTestEmail = async () => {
    if (emailList.length === 0) {
      setEmailError('Please add at least one recipient email before sending a test.');
      return;
    }
    setTesting(true);
    setTestResult(null);
    try {
      const payload = {
        ...formData,
        to_email: emailList.join(', '),
      };
      const res = await testAlertEmail(payload);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Failed to send test email' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const payload: AlertSetting = {
        ...formData,
        to_email: emailList.join(', '),
      };
      await updateAlertSettings(payload);
      audioAlert.setSoundEnabled(payload.sound_enabled ?? true);
      if (onSettingsUpdated) {
        onSettingsUpdated(payload);
      }
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save alert settings');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-slate-800 rounded-2xl w-full max-w-xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-rose-600/20 text-rose-400">
              <BellRing className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Alert & Notification Settings</h3>
              <p className="text-xs text-slate-400">
                Multi-Recipient Email Dispatch, Silent Mode & CPU Thresholds
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Modal Body */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-blue-400" />
            <span className="text-xs">Loading alert settings...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs overflow-y-auto">
            {error && (
              <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg text-rose-300 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Threshold & Master Toggles Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* 1. CPU Alerting Master Toggle */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4 text-rose-400" />
                    <span className="font-semibold text-slate-200">CPU Alerts</span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.enabled}
                      onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-rose-600"></div>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Threshold (%)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="100"
                      value={formData.cpu_threshold_percent}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cpu_threshold_percent: parseFloat(e.target.value) || 60,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                      Cooldown (Min)
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="60"
                      value={formData.cooldown_minutes}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          cooldown_minutes: parseInt(e.target.value) || 5,
                        })
                      }
                      className="w-full bg-slate-950 border border-slate-800 focus:border-rose-500 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* 2. Silent Mode / Sound Alarm Toggle */}
              <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 flex flex-col justify-between space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {formData.sound_enabled ? (
                      <Volume2 className="h-4 w-4 text-emerald-400" />
                    ) : (
                      <VolumeX className="h-4 w-4 text-slate-400" />
                    )}
                    <span className="font-semibold text-slate-200">
                      {formData.sound_enabled ? 'Sound Alarm Active' : 'Silent Alarm Mode'}
                    </span>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.sound_enabled ?? true}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setFormData({ ...formData, sound_enabled: val });
                        audioAlert.setSoundEnabled(val);
                      }}
                      className="sr-only peer"
                    />
                    <div className="w-9 h-5 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
                  </label>
                </div>

                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {formData.sound_enabled
                    ? '🔊 10-second voice speech & loud siren beeps will play on high CPU spikes.'
                    : '🔇 Silent Mode: Voice & audio siren are muted. Email and visual alerts remain active.'}
                </p>
              </div>
            </div>

            {/* Multiple Recipients Management */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <div className="flex items-center justify-between">
                <label className="text-slate-200 font-bold flex items-center gap-2">
                  <Users className="h-4 w-4 text-blue-400" />
                  <span>Alert Email Recipients</span>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-blue-400 font-mono font-bold">
                    {emailList.length} configured
                  </span>
                </label>
                <span className="text-[10px] text-slate-400">All added emails will receive alert notifications</span>
              </div>

              {/* Add Email Input Bar */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Mail className="h-4 w-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="email"
                    placeholder="Enter email address (e.g. devops@example.com)..."
                    value={emailInput}
                    onChange={(e) => {
                      setEmailInput(e.target.value);
                      setEmailError(null);
                    }}
                    onKeyDown={handleKeyDown}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-2 text-slate-100 text-xs outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleAddEmail}
                  className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-1.5 transition-colors shrink-0"
                >
                  <Plus className="h-3.5 w-3.5" /> Add
                </button>
              </div>

              {emailError && (
                <div className="text-[11px] text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>{emailError}</span>
                </div>
              )}

              {/* Recipients Tag/Chips List with Delete */}
              <div className="space-y-1.5 pt-1">
                {emailList.length === 0 ? (
                  <div className="p-4 rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-center text-slate-500 text-xs">
                    No recipients added yet. Add email addresses above to receive threshold alerts.
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                    {emailList.map((email, idx) => (
                      <div
                        key={idx}
                        className="group flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-200 text-xs font-mono transition-all shadow-sm"
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
                        <span className="truncate max-w-[260px]">{email}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveEmail(email)}
                          title={`Delete ${email} (No alerts will be sent to this email)`}
                          className="text-slate-500 hover:text-rose-400 p-0.5 rounded hover:bg-rose-950/40 transition-colors ml-1"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {emailList.length > 0 && (
                  <p className="text-[10px] text-slate-500 flex items-center gap-1 pt-1 font-mono">
                    <Info className="h-3 w-3 text-slate-500" />
                    <span>Click the trash icon to delete any recipient. Deleted emails will not receive future alerts.</span>
                  </p>
                )}
              </div>
            </div>

            {/* SMTP Server Settings */}
            <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
              <h4 className="font-semibold text-slate-200 text-xs flex items-center gap-2">
                <span>SMTP Mail Server Configuration</span>
              </h4>

              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="block text-slate-400 mb-1">SMTP Host</label>
                  <input
                    type="text"
                    placeholder="smtp.gmail.com"
                    value={formData.smtp_host}
                    onChange={(e) => setFormData({ ...formData, smtp_host: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.smtp_port}
                    onChange={(e) =>
                      setFormData({ ...formData, smtp_port: parseInt(e.target.value) || 587 })
                    }
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 font-mono outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">SMTP Username / Sender Email</label>
                  <input
                    type="text"
                    placeholder="your-email@gmail.com"
                    value={formData.smtp_user}
                    onChange={(e) => setFormData({ ...formData, smtp_user: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">SMTP App Password</label>
                  <input
                    type="password"
                    placeholder="••••••••••••"
                    value={formData.smtp_password || ''}
                    onChange={(e) => setFormData({ ...formData, smtp_password: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
              </div>
            </div>

            {/* Test Result Message */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                ) : (
                  <AlertCircle className="h-4 w-4 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            {/* Modal Footer Action Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-between sticky bottom-0 bg-surface/90 backdrop-blur-sm">
              <button
                type="button"
                onClick={handleTestEmail}
                disabled={testing || emailList.length === 0 || !formData.smtp_user}
                className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-50 flex items-center gap-2 transition-colors"
                title={emailList.length === 0 ? 'Add at least one recipient email' : 'Send test email to all recipients'}
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                Send Test Email to ({emailList.length})
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-slate-400 hover:text-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-5 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold flex items-center gap-2 transition-colors disabled:opacity-50 shadow-lg shadow-rose-600/20"
                >
                  {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                  Save Alert Settings
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
