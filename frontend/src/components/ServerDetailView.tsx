'use client';

import React, { useState } from 'react';
import {
  Cpu,
  Server,
  HardDrive,
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Search,
  Zap,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Layers,
  RotateCcw,
  Clock,
  PlayCircle,
  StopCircle,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { ServerConfig, SystemMetrics, HistoricalMetricPoint, Pm2ProcessMetric } from '../types/monitor';

interface ServerDetailViewProps {
  server: ServerConfig;
  metrics?: SystemMetrics;
  history: HistoricalMetricPoint[];
  onBack: () => void;
}

export function ServerDetailView({ server, metrics, history, onBack }: ServerDetailViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'cpu' | 'ram'>('cpu');
  const [pm2Search, setPm2Search] = useState('');
  const [activeTab, setActiveTab] = useState<'pm2' | 'system'>('pm2');

  const status = metrics?.status || 'connecting';
  const cpuPercent = Math.round(metrics?.cpu_usage_percent || 0);
  const ramPercent = Math.round(metrics?.ram_usage_percent || 0);
  const ramUsed = (metrics?.ram_used_gb || 0).toFixed(1);
  const ramTotal = (metrics?.ram_total_gb || 0).toFixed(1);

  const netRecv = Math.round((metrics?.network?.bytes_recv_per_sec || 0) / 1024);
  const netSent = Math.round((metrics?.network?.bytes_sent_per_sec || 0) / 1024);
  const totalSent = (metrics?.network?.total_sent_mb || 0).toFixed(1);
  const totalRecv = (metrics?.network?.total_recv_mb || 0).toFixed(1);

  const pm2Services = (metrics?.pm2_services || []).filter(
    (p) =>
      p.name.toLowerCase().includes(pm2Search.toLowerCase()) ||
      p.pm_id.toString().includes(pm2Search) ||
      p.pid.toString().includes(pm2Search)
  );

  const pm2OnlineCount = (metrics?.pm2_services || []).filter((p) => p.status === 'online').length;
  const pm2TotalMem = (metrics?.pm2_services || [])
    .reduce((acc, p) => acc + (p.memory_mb || 0), 0)
    .toFixed(1);

  const processes = (metrics?.top_processes || [])
    .filter(
      (p) =>
        p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.pid.toString().includes(searchTerm)
    )
    .sort((a, b) => (sortBy === 'cpu' ? b.cpu_percent - a.cpu_percent : b.memory_percent - a.memory_percent));

  return (
    <div className="space-y-6">
      {/* Header Info Banner */}
      <div className="bg-surface-card border border-slate-800 rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <button
            onClick={onBack}
            className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 transition-colors text-xs font-semibold"
          >
            ← Back
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-100">{server.name}</h2>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold ${
                  status === 'online'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                {status.toUpperCase()}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-mono mt-1">
              Host: {server.hostname}:{server.port} | OS: {server.os_type} | Cores: {metrics?.cpu_count || 1}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6 text-xs text-slate-400 font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Network RX/TX</span>
            <span className="text-slate-200 font-bold">
              ↓ {netRecv} KB/s | ↑ {netSent} KB/s
            </span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-sans">Total Data</span>
            <span className="text-slate-200 font-bold">
              ↓ {totalRecv} MB | ↑ {totalSent} MB
            </span>
          </div>
        </div>
      </div>

      {/* Primary Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* CPU Card */}
        <div className="bg-surface-card border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
              <Cpu className="h-4 w-4 text-blue-400" /> CPU Usage
            </span>
            <span className="text-xs font-mono">{metrics?.cpu_count || 1} Cores</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono">{cpuPercent}%</div>
          <div className="h-2 w-full bg-slate-900 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                cpuPercent > 85 ? 'bg-rose-500' : 'bg-blue-500'
              }`}
              style={{ width: `${cpuPercent}%` }}
            />
          </div>
        </div>

        {/* RAM Card */}
        <div className="bg-surface-card border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
              <Server className="h-4 w-4 text-indigo-400" /> System Memory
            </span>
            <span className="text-xs font-mono">{ramUsed} / {ramTotal} GB</span>
          </div>
          <div className="text-3xl font-extrabold text-slate-100 font-mono">{ramPercent}%</div>
          <div className="h-2 w-full bg-slate-900 rounded-full mt-3 overflow-hidden border border-slate-800">
            <div
              className={`h-full transition-all duration-500 ${
                ramPercent > 85 ? 'bg-amber-400' : 'bg-indigo-500'
              }`}
              style={{ width: `${ramPercent}%` }}
            />
          </div>
        </div>

        {/* Network Speed Card */}
        <div className="bg-surface-card border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
              <Activity className="h-4 w-4 text-emerald-400" /> Live Bandwidth
            </span>
            <span className="text-xs font-mono text-emerald-400">Live WS</span>
          </div>
          <div className="text-xl font-bold text-slate-100 font-mono flex items-center justify-between">
            <span className="flex items-center gap-1 text-emerald-400">
              <ArrowDownLeft className="h-4 w-4" /> {netRecv} <span className="text-xs font-normal text-slate-400">KB/s</span>
            </span>
            <span className="flex items-center gap-1 text-blue-400">
              <ArrowUpRight className="h-4 w-4" /> {netSent} <span className="text-xs font-normal text-slate-400">KB/s</span>
            </span>
          </div>
          <p className="text-[11px] text-slate-500 mt-3 font-mono">
            Total Transfer: ↓{totalRecv} MB | ↑{totalSent} MB
          </p>
        </div>

        {/* GPU Metric Card (If available) */}
        {metrics?.gpus && metrics.gpus.length > 0 ? (
          <div className="bg-surface-card border border-slate-800 rounded-xl p-5 relative overflow-hidden">
            <div className="flex items-center justify-between text-slate-400 mb-2">
              <span className="text-xs font-semibold uppercase flex items-center gap-1.5">
                <Flame className="h-4 w-4 text-orange-400" /> GPU: {metrics.gpus[0].name}
              </span>
              <span className="text-xs font-mono">{metrics.gpus[0].temperature_c || 'N/A'}°C</span>
            </div>
            <div className="text-3xl font-extrabold text-slate-100 font-mono">
              {Math.round(metrics.gpus[0].utilization_gpu)}%
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full mt-3 overflow-hidden border border-slate-800">
              <div
                className="h-full bg-orange-500 transition-all duration-500"
                style={{ width: `${metrics.gpus[0].utilization_gpu}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="bg-surface-card border border-slate-800 rounded-xl p-5 flex flex-col justify-center">
            <span className="text-xs font-semibold uppercase text-slate-500 flex items-center gap-1.5">
              <Zap className="h-4 w-4" /> GPU Hardware
            </span>
            <div className="text-sm font-medium text-slate-400 mt-2">
              No Discrete GPU Detected
            </div>
          </div>
        )}
      </div>

      {/* Disks Usage Section */}
      {metrics?.disks && metrics.disks.length > 0 && (
        <div className="bg-surface-card border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider mb-4 flex items-center gap-2">
            <HardDrive className="h-4 w-4 text-cyan-400" /> Storage Disks & Mountpoints
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {metrics.disks.map((d, i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs">
                <div className="flex justify-between items-center font-semibold text-slate-200 mb-1">
                  <span>{d.mountpoint} ({d.device})</span>
                  <span className="font-mono text-cyan-400">{d.percent}%</span>
                </div>
                <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden my-2">
                  <div
                    className="h-full bg-cyan-400 transition-all duration-500"
                    style={{ width: `${d.percent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[11px] text-slate-400 font-mono">
                  <span>Used: {d.used_gb} GB</span>
                  <span>Free: {d.free_gb} GB / {d.total_gb} GB</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recharts Time-Series Graphs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* CPU & RAM Chart */}
        <div className="bg-surface-card border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-blue-400" /> Real-time CPU & RAM (%)
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400" /> CPU
              </span>
              <span className="flex items-center gap-1.5 text-indigo-400">
                <span className="h-2 w-2 rounded-full bg-indigo-400" /> RAM
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="cpuGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.0} />
                  </linearGradient>
                  <linearGradient id="ramGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis domain={[0, 100]} stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="cpu" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#cpuGrad)" />
                <Area type="monotone" dataKey="ram" stroke="#6366f1" strokeWidth={2} fillOpacity={1} fill="url(#ramGrad)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Network Traffic Chart */}
        <div className="bg-surface-card border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-200 uppercase tracking-wider flex items-center gap-2">
              <Activity className="h-4 w-4 text-emerald-400" /> Network Speed (KB/s)
            </h3>
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1.5 text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400" /> RX (Down)
              </span>
              <span className="flex items-center gap-1.5 text-blue-400">
                <span className="h-2 w-2 rounded-full bg-blue-400" /> TX (Up)
              </span>
            </div>
          </div>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={history}>
                <defs>
                  <linearGradient id="rxGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="time" stroke="#64748b" tick={{ fontSize: 10 }} />
                <YAxis stroke="#64748b" tick={{ fontSize: 10 }} />
                <Tooltip
                  contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '8px' }}
                />
                <Area type="monotone" dataKey="netRecvKb" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#rxGrad)" />
                <Area type="monotone" dataKey="netSentKb" stroke="#3b82f6" strokeWidth={2} fillOpacity={0} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Task Manager & PM2 Services Section */}
      <div className="bg-surface-card border border-slate-800 rounded-2xl p-6">
        {/* Navigation Tabs & Controls */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-5 border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('pm2')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'pm2'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Layers className="h-4 w-4" />
              <span>PM2 Microservices</span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  activeTab === 'pm2' ? 'bg-blue-800/80 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {metrics?.pm2_services ? metrics.pm2_services.length : 0}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('system')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'system'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                  : 'bg-slate-900 border border-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Activity className="h-4 w-4" />
              <span>OS Task Manager (Top CPU/RAM)</span>
            </button>
          </div>

          {/* Search & Sorting Controls */}
          {activeTab === 'pm2' ? (
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search PM2 name, ID or PID..."
                value={pm2Search}
                onChange={(e) => setPm2Search(e.target.value)}
                className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 outline-none w-56 font-mono"
              />
            </div>
          ) : (
            <div className="flex items-center gap-3">
              <div className="relative">
                <Search className="h-4 w-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Search PID or name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="bg-slate-900 border border-slate-800 focus:border-blue-500 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 outline-none w-48"
                />
              </div>

              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-lg text-xs">
                <button
                  onClick={() => setSortBy('cpu')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    sortBy === 'cpu' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sort CPU
                </button>
                <button
                  onClick={() => setSortBy('ram')}
                  className={`px-2.5 py-1 rounded font-medium transition-all ${
                    sortBy === 'ram' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Sort RAM
                </button>
              </div>
            </div>
          )}
        </div>

        {/* TAB 1: PM2 Services */}
        {activeTab === 'pm2' && (
          <div className="space-y-4">
            {/* PM2 Summary Mini Stats Bar */}
            {metrics?.pm2_services && metrics.pm2_services.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Total PM2 Apps</div>
                    <div className="text-xl font-bold font-mono text-slate-100 mt-0.5">
                      {metrics.pm2_services.length}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-blue-600/10 text-blue-400 border border-blue-500/20">
                    <Layers className="h-4 w-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Online & Healthy</div>
                    <div className="text-xl font-bold font-mono text-emerald-400 mt-0.5">
                      {pm2OnlineCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Stopped / Errored</div>
                    <div className="text-xl font-bold font-mono text-rose-400 mt-0.5">
                      {metrics.pm2_services.length - pm2OnlineCount}
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-rose-600/10 text-rose-400 border border-rose-500/20">
                    <AlertOctagon className="h-4 w-4" />
                  </div>
                </div>

                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] font-semibold uppercase text-slate-400">Total PM2 Memory</div>
                    <div className="text-xl font-bold font-mono text-cyan-400 mt-0.5">
                      {pm2TotalMem} <span className="text-xs font-normal text-slate-400">MB</span>
                    </div>
                  </div>
                  <div className="p-2 rounded-lg bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                    <Server className="h-4 w-4" />
                  </div>
                </div>
              </div>
            )}

            {/* PM2 Services Table */}
            {!metrics?.pm2_services || metrics.pm2_services.length === 0 ? (
              <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-10 text-center">
                <div className="h-12 w-12 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-3 border border-blue-500/20">
                  <Layers className="h-6 w-6" />
                </div>
                <h4 className="font-bold text-slate-200 text-sm">No Active PM2 Processes Found</h4>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Either PM2 is not installed on this host or no PM2 applications are currently running.
                </p>
                <div className="inline-block bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 mt-3 text-[11px] font-mono text-slate-300">
                  Tip: Run <span className="text-blue-400">pm2 start app.js</span> on the server to register services.
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                      <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                      <th className="py-2.5 px-3">PM2 ID</th>
                      <th className="py-2.5 px-3">App Name</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">PID</th>
                      <th className="py-2.5 px-3">CPU Usage</th>
                      <th className="py-2.5 px-3">RAM (Memory)</th>
                      <th className="py-2.5 px-3">Restarts</th>
                      <th className="py-2.5 px-3">Uptime</th>
                      <th className="py-2.5 px-3">User</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 font-mono">
                    {pm2Services.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="text-center py-6 text-slate-500 font-sans">
                          No PM2 services matched your search query "{pm2Search}".
                        </td>
                      </tr>
                    ) : (
                      pm2Services.map((service, index) => {
                        const isOnline = service.status === 'online';
                        const isErrored = service.status === 'errored';
                        return (
                          <tr
                            key={`${service.pm_id}-${index}`}
                            className="hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Serial Number */}
                            <td className="py-2.5 px-3 text-center text-slate-500 font-semibold">
                              {index + 1}
                            </td>

                            {/* PM2 ID */}
                            <td className="py-2.5 px-3">
                              <span className="px-2 py-0.5 rounded bg-slate-800 border border-slate-700 text-slate-300 font-bold">
                                #{service.pm_id}
                              </span>
                            </td>

                            {/* Service Name */}
                            <td className="py-2.5 px-3 font-sans font-semibold text-slate-100 flex items-center gap-2">
                              <span className="text-blue-400 font-mono">▸</span>
                              <span>{service.name}</span>
                            </td>

                            {/* Status */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  isOnline
                                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                    : isErrored
                                    ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30 animate-pulse'
                                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                }`}
                              >
                                <span
                                  className={`h-1.5 w-1.5 rounded-full ${
                                    isOnline
                                      ? 'bg-emerald-400 animate-ping'
                                      : isErrored
                                      ? 'bg-rose-400'
                                      : 'bg-amber-400'
                                  }`}
                                />
                                {service.status}
                              </span>
                            </td>

                            {/* PID */}
                            <td className="py-2.5 px-3 text-slate-400">{service.pid || '-'}</td>

                            {/* CPU % */}
                            <td className="py-2.5 px-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`font-semibold ${
                                    service.cpu_percent > 50
                                      ? 'text-rose-400'
                                      : service.cpu_percent > 15
                                      ? 'text-amber-400'
                                      : 'text-slate-200'
                                  }`}
                                >
                                  {service.cpu_percent.toFixed(1)}%
                                </span>
                                <div className="h-1.5 w-12 bg-slate-800 rounded-full overflow-hidden hidden sm:block">
                                  <div
                                    className={`h-full ${
                                      service.cpu_percent > 50
                                        ? 'bg-rose-500'
                                        : service.cpu_percent > 15
                                        ? 'bg-amber-400'
                                        : 'bg-cyan-400'
                                    }`}
                                    style={{ width: `${Math.min(service.cpu_percent, 100)}%` }}
                                  />
                                </div>
                              </div>
                            </td>

                            {/* Memory */}
                            <td className="py-2.5 px-3 text-cyan-300 font-semibold">
                              {service.memory_mb.toFixed(1)} MB
                            </td>

                            {/* Restarts */}
                            <td className="py-2.5 px-3">
                              <span
                                className={`flex items-center gap-1 ${
                                  service.restart_count > 5
                                    ? 'text-rose-400 font-bold'
                                    : 'text-slate-400'
                                }`}
                              >
                                <RotateCcw className="h-3 w-3" />
                                <span>{service.restart_count}</span>
                              </span>
                            </td>

                            {/* Uptime */}
                            <td className="py-2.5 px-3 text-slate-300">
                              <span className="flex items-center gap-1 text-[11px]">
                                <Clock className="h-3 w-3 text-slate-500" />
                                <span>{service.uptime_str || '0s'}</span>
                              </span>
                            </td>

                            {/* User */}
                            <td className="py-2.5 px-3 text-slate-400 text-[11px]">
                              {service.user || 'root'}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: OS System Processes Table */}
        {activeTab === 'system' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase text-[10px]">
                  <th className="py-2.5 px-3 w-12 text-center">S.No</th>
                  <th className="py-2.5 px-3">PID</th>
                  <th className="py-2.5 px-3">Process Name</th>
                  <th className="py-2.5 px-3">User</th>
                  <th className="py-2.5 px-3">CPU Usage (%)</th>
                  <th className="py-2.5 px-3">RAM Usage (%)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono">
                {processes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-6 text-slate-500 font-sans">
                      No active processes reported.
                    </td>
                  </tr>
                ) : (
                  processes.map((proc, index) => (
                    <tr key={`${proc.pid}-${index}`} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-2 px-3 text-center text-slate-500 font-semibold">
                        {index + 1}
                      </td>
                      <td className="py-2 px-3 text-slate-400">{proc.pid}</td>
                      <td className="py-2 px-3 font-sans font-medium text-slate-100">{proc.name}</td>
                      <td className="py-2 px-3 text-slate-400">{proc.user || 'system'}</td>
                      <td className="py-2 px-3">
                        <span
                          className={`font-semibold ${
                            proc.cpu_percent > 50
                              ? 'text-rose-400'
                              : proc.cpu_percent > 20
                              ? 'text-amber-400'
                              : 'text-slate-300'
                          }`}
                        >
                          {proc.cpu_percent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-300">{proc.memory_percent.toFixed(1)}%</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
