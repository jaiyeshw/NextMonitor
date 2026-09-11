'use client';

import React, { useState } from 'react';
import { X, Server, Key, Lock, Terminal, Monitor, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { ServerCreateInput } from '../types/monitor';
import { createServer, testConnection } from '../lib/api';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddServerModal({ isOpen, onClose, onSuccess }: AddServerModalProps) {
  const [formData, setFormData] = useState<ServerCreateInput>({
    name: '',
    hostname: '',
    os_type: 'linux',
    port: 22,
    auth_type: 'password',
    username: 'root',
    password: '',
    ssh_key: '',
  });

  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleOsChange = (os: 'linux' | 'windows' | 'local') => {
    setFormData((prev) => ({
      ...prev,
      os_type: os,
      port: os === 'windows' ? 5985 : os === 'local' ? 0 : 22,
      username: os === 'windows' ? 'Administrator' : os === 'local' ? 'local' : 'root',
    }));
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testConnection(formData);
      setTestResult(res);
    } catch (err: any) {
      setTestResult({ success: false, message: err.message || 'Connection test failed' });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name || !formData.hostname) {
      setError('Please provide server name and hostname.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createServer(formData);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to add server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-surface border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900/60">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-blue-600/20 text-blue-400">
              <Server className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-100 text-base">Add New Monitored Server</h3>
              <p className="text-xs text-slate-400">Configure remote Linux (SSH) or Windows (WinRM) server node</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="bg-rose-950/40 border border-rose-800/60 p-3 rounded-lg text-rose-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Server Name & Hostname */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Server Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Production Web-01"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Hostname / IP *</label>
              <input
                type="text"
                required
                placeholder="192.168.1.100 or host.com"
                value={formData.hostname}
                onChange={(e) => setFormData({ ...formData, hostname: e.target.value })}
                className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
              />
            </div>
          </div>

          {/* OS Type selector */}
          <div>
            <label className="block text-slate-300 font-semibold mb-1.5">Operating System</label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => handleOsChange('linux')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-all ${
                  formData.os_type === 'linux'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Terminal className="h-4 w-4" /> Linux (SSH)
              </button>
              <button
                type="button"
                onClick={() => handleOsChange('windows')}
                className={`flex items-center justify-center gap-2 p-2.5 rounded-lg border font-medium transition-all ${
                  formData.os_type === 'windows'
                    ? 'bg-blue-600/20 border-blue-500 text-blue-400'
                    : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <Monitor className="h-4 w-4" /> Windows (WinRM)
              </button>
            </div>
          </div>

          {/* Port & Auth Type */}
          {formData.os_type !== 'local' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Port</label>
                  <input
                    type="number"
                    value={formData.port}
                    onChange={(e) => setFormData({ ...formData, port: parseInt(e.target.value) || 22 })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Auth Type</label>
                  <select
                    value={formData.auth_type}
                    onChange={(e) => setFormData({ ...formData, auth_type: e.target.value as any })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  >
                    <option value="password">Password</option>
                    <option value="ssh_key">SSH Private Key</option>
                  </select>
                </div>
              </div>

              {/* Username & Credentials */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Username</label>
                  <input
                    type="text"
                    value={formData.username || ''}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                  />
                </div>
                {formData.auth_type === 'password' && (
                  <div>
                    <label className="block text-slate-300 font-semibold mb-1">Password</label>
                    <input
                      type="password"
                      placeholder="••••••••"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 outline-none"
                    />
                  </div>
                )}
              </div>

              {formData.auth_type === 'ssh_key' && (
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">SSH Private Key Content</label>
                  <textarea
                    rows={3}
                    placeholder="-----BEGIN OPENSSH PRIVATE KEY-----..."
                    value={formData.ssh_key || ''}
                    onChange={(e) => setFormData({ ...formData, ssh_key: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg px-3 py-2 text-slate-100 font-mono text-[11px] outline-none"
                  />
                </div>
              )}
            </>
          )}

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

          {/* Action Buttons */}
          <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleTestConnection}
              disabled={testing || !formData.hostname}
              className="px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold disabled:opacity-50 flex items-center gap-2 transition-colors"
            >
              {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Lock className="h-3.5 w-3.5" />}
              Test Connection
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
                disabled={submitting}
                className="px-5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-semibold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Server
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
