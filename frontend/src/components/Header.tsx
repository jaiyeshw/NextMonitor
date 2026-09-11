'use client';

import React from 'react';
import { Plus, RefreshCw, Server, LogOut, User, BellRing, VolumeX } from 'lucide-react';
import { ServerConfig } from '../types/monitor';

interface HeaderProps {
  servers: ServerConfig[];
  selectedServerId: number | null;
  isWsConnected: boolean;
  isAlarmPlaying?: boolean;
  user: string | null;
  onLogout: () => void;
  onOpenAddModal: () => void;
  onOpenAlertModal: () => void;
  onMuteAlarm?: () => void;
  onRefresh: () => void;
}

export function Header({
  servers,
  selectedServerId,
  isWsConnected,
  isAlarmPlaying,
  user,
  onLogout,
  onOpenAddModal,
  onOpenAlertModal,
  onMuteAlarm,
  onRefresh,
}: HeaderProps) {
  const currentServer = servers.find((s) => s.id === selectedServerId);

  return (
    <header className="h-16 border-b border-slate-800/80 bg-surface/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <Server className="h-5 w-5 text-blue-400" />
          <h2 className="font-bold text-slate-100 text-lg">
            {selectedServerId === null ? 'All Monitored Servers' : currentServer?.name || 'Server Telemetry'}
          </h2>
        </div>
        {currentServer && (
          <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono border border-slate-700/60">
            {currentServer.hostname}:{currentServer.port} ({currentServer.os_type})
          </span>
        )}
      </div>

      <div className="flex items-center gap-3">
        {/* Active Alarm Siren Mute Button */}
        {isAlarmPlaying && onMuteAlarm && (
          <button
            onClick={onMuteAlarm}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-rose-600/30 text-rose-300 border border-rose-500/50 text-xs font-semibold animate-pulse hover:bg-rose-600/50"
          >
            <VolumeX className="h-4 w-4 text-rose-400" />
            <span>Mute 10s Siren Alert</span>
          </button>
        )}

        {/* SMTP Alert Settings Button */}
        <button
          onClick={onOpenAlertModal}
          title="SMTP & CPU Alert Settings"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-rose-400 hover:text-rose-300 transition-colors border border-slate-700/50 flex items-center gap-1 text-xs"
        >
          <BellRing className="h-4 w-4" />
        </button>

        {/* Refresh Servers list */}
        <button
          onClick={onRefresh}
          title="Refresh server metadata"
          className="p-2 rounded-lg bg-slate-800/80 hover:bg-slate-700/80 text-slate-300 transition-colors border border-slate-700/50"
        >
          <RefreshCw className="h-4 w-4" />
        </button>

        {/* User profile & Logout */}
        {user && (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-800">
            <span className="text-xs text-slate-300 font-semibold flex items-center gap-1.5 bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-800">
              <User className="h-3.5 w-3.5 text-blue-400" />
              {user}
            </span>
            <button
              onClick={onLogout}
              title="Sign out"
              className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-950/40 text-slate-400 hover:text-rose-400 transition-colors border border-slate-700/50"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Add Server Button */}
        <button
          onClick={onOpenAddModal}
          className="flex items-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.02] active:scale-[0.98]"
        >
          <Plus className="h-4 w-4" />
          <span>Add Server</span>
        </button>
      </div>
    </header>
  );
}
