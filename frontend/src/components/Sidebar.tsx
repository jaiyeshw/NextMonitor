'use client';

import React from 'react';
import { Activity, Server, Plus, HardDrive, Cpu, ShieldCheck } from 'lucide-react';
import { ServerConfig, SystemMetrics } from '../types/monitor';

interface SidebarProps {
  servers: ServerConfig[];
  metricsMap: Record<number, SystemMetrics>;
  activeServerId: number | null;
  onSelectServer: (id: number | null) => void;
  onOpenAddModal: () => void;
}

export function Sidebar({
  servers,
  metricsMap,
  activeServerId,
  onSelectServer,
  onOpenAddModal,
}: SidebarProps) {
  const onlineCount = Object.values(metricsMap).filter((m) => m.status === 'online').length;
  const offlineCount = servers.length - onlineCount;

  return (
    <aside className="w-64 bg-surface border-r border-slate-800/80 flex flex-col h-screen sticky top-0">
      {/* Brand Header */}
      <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-cyan-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Activity className="h-6 w-6 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-bold text-lg text-slate-100 tracking-tight">NexMonitor</h1>
            <p className="text-xs text-slate-400 font-medium">Multi-Server Telemetry</p>
          </div>
        </div>
      </div>

      {/* Overview Button */}
      <div className="p-4 border-b border-slate-800/60">
        <button
          onClick={() => onSelectServer(null)}
          className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-lg text-sm font-medium transition-all ${
            activeServerId === null
              ? 'bg-blue-600/15 text-blue-400 border border-blue-500/30'
              : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
          }`}
        >
          <div className="flex items-center gap-2.5">
            <Cpu className="h-4 w-4" />
            <span>Dashboard Overview</span>
          </div>
          <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
            {servers.length}
          </span>
        </button>
      </div>

      {/* Quick Summary Stats */}
      <div className="p-4 grid grid-cols-2 gap-2 text-xs border-b border-slate-800/60">
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50">
          <div className="text-slate-400 font-medium">Online</div>
          <div className="text-base font-bold text-emerald-400 flex items-center gap-1.5 mt-0.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-ping inline-block" />
            {onlineCount}
          </div>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/50">
          <div className="text-slate-400 font-medium">Offline</div>
          <div className="text-base font-bold text-rose-400 mt-0.5">
            {Math.max(0, offlineCount)}
          </div>
        </div>
      </div>

      {/* Server List Navigation */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        <div className="px-2 pb-2 text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center justify-between">
          <span>Active Nodes</span>
          <button
            onClick={onOpenAddModal}
            className="text-blue-400 hover:text-blue-300 flex items-center gap-1 text-xs lowercase font-normal"
          >
            <Plus className="h-3.5 w-3.5" /> add
          </button>
        </div>

        {servers.length === 0 ? (
          <div className="text-center py-6 text-slate-500 text-xs">No servers registered.</div>
        ) : (
          servers.map((srv) => {
            const status = metricsMap[srv.id]?.status || 'connecting';
            const isSelected = activeServerId === srv.id;

            return (
              <button
                key={srv.id}
                onClick={() => onSelectServer(srv.id)}
                className={`w-full flex items-center justify-between p-2.5 rounded-lg text-xs font-medium text-left transition-all ${
                  isSelected
                    ? 'bg-indigo-600/20 border border-indigo-500/40 text-indigo-300'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate">
                  <Server className="h-4 w-4 text-slate-400 shrink-0" />
                  <div className="truncate">
                    <div className="truncate font-medium">{srv.name}</div>
                    <div className="text-[10px] text-slate-500 font-mono truncate">{srv.hostname}</div>
                  </div>
                </div>
                <span
                  className={`h-2 w-2 rounded-full shrink-0 ${
                    status === 'online'
                      ? 'bg-emerald-400 shadow-sm shadow-emerald-500/50'
                      : status === 'offline'
                      ? 'bg-rose-500'
                      : 'bg-amber-400 animate-pulse'
                  }`}
                />
              </button>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-900/30 text-xs text-slate-500 flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="h-4 w-4 text-slate-400" />
          <span>Real-time WS</span>
        </div>
        <span className="font-mono text-[10px] text-slate-400">v1.0.0</span>
      </div>
    </aside>
  );
}
