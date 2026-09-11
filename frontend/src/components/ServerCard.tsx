'use client';

import React from 'react';
import { Cpu, HardDrive, Server, Trash2, ArrowUpRight, Monitor, Terminal, Layers } from 'lucide-react';
import { ServerConfig, SystemMetrics } from '../types/monitor';

interface ServerCardProps {
  server: ServerConfig;
  metrics?: SystemMetrics;
  onSelect: () => void;
  onDelete: (id: number) => void;
}

export function ServerCard({ server, metrics, onSelect, onDelete }: ServerCardProps) {
  const status = metrics?.status || 'connecting';
  const cpuPercent = Math.round(metrics?.cpu_usage_percent || 0);
  const ramPercent = Math.round(metrics?.ram_usage_percent || 0);
  const ramUsed = (metrics?.ram_used_gb || 0).toFixed(1);
  const ramTotal = (metrics?.ram_total_gb || 0).toFixed(1);

  const mainDisk = metrics?.disks && metrics.disks.length > 0 ? metrics.disks[0] : null;
  const diskPercent = Math.round(mainDisk?.percent || 0);

  const netRecv = Math.round((metrics?.network?.bytes_recv_per_sec || 0) / 1024);
  const netSent = Math.round((metrics?.network?.bytes_sent_per_sec || 0) / 1024);

  return (
    <div
      onClick={onSelect}
      className="group relative bg-surface-card hover:bg-slate-800/90 border border-slate-800 hover:border-slate-700 rounded-xl p-5 cursor-pointer transition-all duration-200 shadow-lg hover:shadow-2xl hover:shadow-blue-900/10 flex flex-col justify-between"
    >
      {/* Top Header Row */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-blue-400 group-hover:text-blue-300 transition-colors">
            {server.os_type === 'windows' ? (
              <Monitor className="h-5 w-5" />
            ) : server.os_type === 'local' ? (
              <Layers className="h-5 w-5" />
            ) : (
              <Terminal className="h-5 w-5" />
            )}
          </div>
          <div>
            <h3 className="font-bold text-slate-100 group-hover:text-blue-400 transition-colors flex items-center gap-2">
              {server.name}
            </h3>
            <div className="text-xs text-slate-400 font-mono">
              {server.hostname}:{server.port}
            </div>
          </div>
        </div>

        {/* Status Pill & Delete button */}
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${
              status === 'online'
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                : status === 'offline'
                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30 animate-pulse'
            }`}
          >
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                status === 'online'
                  ? 'bg-emerald-400 animate-ping'
                  : status === 'offline'
                  ? 'bg-rose-400'
                  : 'bg-amber-400'
              }`}
            />
            {status.toUpperCase()}
          </span>

          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirm(`Remove server "${server.name}"?`)) {
                onDelete(server.id);
              }
            }}
            title="Delete server"
            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg bg-slate-900/80 text-slate-400 hover:text-rose-400 hover:bg-rose-950/40 transition-all border border-slate-800"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Metrics Summary Section */}
      {status === 'offline' ? (
        <div className="bg-rose-950/20 border border-rose-900/30 rounded-lg p-3 my-2 text-xs text-rose-400">
          <p className="font-semibold">Node Unreachable</p>
          <p className="text-[11px] text-rose-300/80 truncate mt-0.5">
            {metrics?.error_message || 'SSH/WinRM connection failed'}
          </p>
        </div>
      ) : (
        <div className="space-y-3 my-2">
          {/* CPU Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-400 flex items-center gap-1">
                <Cpu className="h-3.5 w-3.5 text-blue-400" /> CPU Usage
              </span>
              <span className={cpuPercent > 85 ? 'text-rose-400 font-bold' : 'text-slate-200 font-mono'}>
                {cpuPercent}%
              </span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  cpuPercent > 85
                    ? 'bg-rose-500'
                    : cpuPercent > 65
                    ? 'bg-amber-400'
                    : 'bg-gradient-to-r from-blue-500 to-indigo-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, cpuPercent))}%` }}
              />
            </div>
          </div>

          {/* RAM Progress Bar */}
          <div>
            <div className="flex justify-between text-xs mb-1 font-medium">
              <span className="text-slate-400 flex items-center gap-1">
                <Server className="h-3.5 w-3.5 text-indigo-400" /> Memory (RAM)
              </span>
              <span className="text-slate-200 font-mono">
                {ramUsed} / {ramTotal} GB ({ramPercent}%)
              </span>
            </div>
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
              <div
                className={`h-full transition-all duration-500 rounded-full ${
                  ramPercent > 90 ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'
                }`}
                style={{ width: `${Math.min(100, Math.max(0, ramPercent))}%` }}
              />
            </div>
          </div>

          {/* Disk Progress Bar */}
          {mainDisk && (
            <div>
              <div className="flex justify-between text-xs mb-1 font-medium">
                <span className="text-slate-400 flex items-center gap-1">
                  <HardDrive className="h-3.5 w-3.5 text-cyan-400" /> Disk ({mainDisk.mountpoint})
                </span>
                <span className="text-slate-200 font-mono">{diskPercent}%</span>
              </div>
              <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                <div
                  className="h-full bg-gradient-to-r from-cyan-500 to-teal-500 transition-all duration-500 rounded-full"
                  style={{ width: `${Math.min(100, Math.max(0, diskPercent))}%` }}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Footer Network Traffic & Open details action */}
      <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
        <div className="text-slate-400 font-mono flex items-center gap-3">
          <span>↓ {netRecv} KB/s</span>
          <span>↑ {netSent} KB/s</span>
        </div>
        <span className="text-blue-400 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5 font-medium">
          Inspect <ArrowUpRight className="h-3.5 w-3.5" />
        </span>
      </div>
    </div>
  );
}
