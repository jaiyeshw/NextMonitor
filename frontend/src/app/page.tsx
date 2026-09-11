'use client';

import React, { useState, useEffect } from 'react';
import { useNexMonitor } from '../hooks/useNexMonitor';
import { Sidebar } from '../components/Sidebar';
import { Header } from '../components/Header';
import { ServerCard } from '../components/ServerCard';
import { AddServerModal } from '../components/AddServerModal';
import { ServerDetailView } from '../components/ServerDetailView';
import { LoginPage } from '../components/LoginPage';
import { AlertSettingsModal } from '../components/AlertSettingsModal';
import { audioAlert } from '../lib/audioAlert';
import { deleteServer, fetchAlertSettings } from '../lib/api';
import { Cpu, Server as ServerIcon, Activity, Plus, Loader2, Volume2, VolumeX, ShieldAlert, BellOff } from 'lucide-react';

export default function DashboardPage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null);
  const [authInitialized, setAuthInitialized] = useState<boolean>(false);

  const {
    servers,
    metricsMap,
    historyMap,
    isWsConnected,
    loading,
    refreshServers,
  } = useNexMonitor();

  const [activeServerId, setActiveServerId] = useState<number | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [isAlertModalOpen, setIsAlertModalOpen] = useState<boolean>(false);
  const [isAlarmActive, setIsAlarmActive] = useState<boolean>(false);
  const [highCpuServer, setHighCpuServer] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Load auth state from localStorage and fetch Alert Settings
  useEffect(() => {
    const savedUser = localStorage.getItem('nexmonitor_user');
    if (savedUser) {
      setCurrentUser(savedUser);
    }
    setAuthInitialized(true);

    fetchAlertSettings()
      .then((settings) => {
        const isSound = settings.sound_enabled ?? true;
        setSoundEnabled(isSound);
        audioAlert.setSoundEnabled(isSound);
      })
      .catch(() => {});
  }, []);

  // Monitor CPU usages for threshold sound alert (plays 10 seconds if not silent)
  useEffect(() => {
    if (!metricsMap) return;

    for (const metric of Object.values(metricsMap)) {
      if (metric.status === 'online' && metric.cpu_usage_percent >= 60.0) {
        const highNode = `${metric.server_name} (${Math.round(metric.cpu_usage_percent)}%)`;
        setHighCpuServer(highNode);
        audioAlert.triggerAlarm(metric.server_name, metric.cpu_usage_percent, 10, 20);
        setIsAlarmActive(true);
        break;
      }
    }
  }, [metricsMap]);

  // Sync alarm status state
  useEffect(() => {
    const interval = setInterval(() => {
      setIsAlarmActive(audioAlert.isAlarmActive());
    }, 500);
    return () => clearInterval(interval);
  }, []);

  const handleMuteAlarm = () => {
    audioAlert.stopAlarm();
    setIsAlarmActive(false);
  };

  const handleLoginSuccess = (username: string) => {
    localStorage.setItem('nexmonitor_user', username);
    setCurrentUser(username);
  };

  const handleLogout = () => {
    localStorage.removeItem('nexmonitor_user');
    setCurrentUser(null);
  };

  const handleDeleteServer = async (id: number) => {
    try {
      await deleteServer(id);
      if (activeServerId === id) {
        setActiveServerId(null);
      }
      refreshServers();
    } catch (err) {
      console.error('Failed to delete server:', err);
    }
  };

  const selectedServer = servers.find((s) => s.id === activeServerId);

  // Compute summary stats across all servers
  const onlineCount = Object.values(metricsMap).filter((m) => m.status === 'online').length;
  const offlineCount = servers.length - onlineCount;

  let avgCpu = 0;
  let avgRam = 0;
  const onlineMetrics = Object.values(metricsMap).filter((m) => m.status === 'online');
  if (onlineMetrics.length > 0) {
    avgCpu = Math.round(
      onlineMetrics.reduce((acc, m) => acc + (m.cpu_usage_percent || 0), 0) / onlineMetrics.length
    );
    avgRam = Math.round(
      onlineMetrics.reduce((acc, m) => acc + (m.ram_usage_percent || 0), 0) / onlineMetrics.length
    );
  }

  if (!authInitialized) {
    return (
      <div className="min-h-screen bg-[#070a11] flex items-center justify-center text-slate-400">
        <Loader2 className="h-8 w-8 animate-spin text-blue-400" />
      </div>
    );
  }

  // Show Animated Login Page if user is not authenticated
  if (!currentUser) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Sidebar */}
      <Sidebar
        servers={servers}
        metricsMap={metricsMap}
        activeServerId={activeServerId}
        onSelectServer={setActiveServerId}
        onOpenAddModal={() => setIsAddModalOpen(true)}
      />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        <Header
          servers={servers}
          selectedServerId={activeServerId}
          isWsConnected={isWsConnected}
          isAlarmPlaying={isAlarmActive}
          user={currentUser}
          onLogout={handleLogout}
          onOpenAddModal={() => setIsAddModalOpen(true)}
          onOpenAlertModal={() => setIsAlertModalOpen(true)}
          onMuteAlarm={handleMuteAlarm}
          onRefresh={refreshServers}
        />

        {/* 10-Second CPU High Alert Audio Banner */}
        {isAlarmActive && (
          <div className="bg-rose-600/90 text-white px-6 py-2.5 flex items-center justify-between shadow-lg animate-pulse border-b border-rose-500">
            <div className="flex items-center gap-2 text-xs font-bold">
              <Volume2 className="h-4 w-4 animate-bounce" />
              <span>🚨 AUDIO SIREN ALERT (10s): High CPU Spike Detected on {highCpuServer}!</span>
            </div>
            <button
              onClick={handleMuteAlarm}
              className="bg-white/20 hover:bg-white/30 text-white px-3 py-1 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
            >
              <VolumeX className="h-3.5 w-3.5" /> Mute Alarm
            </button>
          </div>
        )}

        <main className="p-6 space-y-6 flex-1">
          {loading ? (
            <div className="flex items-center justify-center h-64 text-slate-400 gap-3">
              <Loader2 className="h-6 w-6 animate-spin text-blue-400" />
              <span>Loading monitoring nodes...</span>
            </div>
          ) : activeServerId !== null && selectedServer ? (
            /* Detailed Server View */
            <ServerDetailView
              server={selectedServer}
              metrics={metricsMap[selectedServer.id]}
              history={historyMap[selectedServer.id] || []}
              onBack={() => setActiveServerId(null)}
            />
          ) : (
            /* Dashboard Overview Grid */
            <div className="space-y-6">
              {/* Summary Stats Header Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-surface-card border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Total Registered</div>
                    <div className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
                      {servers.length} <span className="text-xs text-slate-500 font-normal">Nodes</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-600/10 text-blue-400 border border-blue-500/20">
                    <ServerIcon className="h-6 w-6" />
                  </div>
                </div>

                <div className="bg-surface-card border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Healthy & Online</div>
                    <div className="text-2xl font-extrabold text-emerald-400 font-mono mt-1">
                      {onlineCount} <span className="text-xs text-slate-500 font-normal">/ {servers.length}</span>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20">
                    <Activity className="h-6 w-6 animate-pulse" />
                  </div>
                </div>

                <div className="bg-surface-card border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Avg CPU Load</div>
                    <div className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
                      {avgCpu}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20">
                    <Cpu className="h-6 w-6" />
                  </div>
                </div>

                <div className="bg-surface-card border border-slate-800 rounded-xl p-5 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold uppercase text-slate-400">Avg RAM Usage</div>
                    <div className="text-2xl font-extrabold text-slate-100 font-mono mt-1">
                      {avgRam}%
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-cyan-600/10 text-cyan-400 border border-cyan-500/20">
                    <ServerIcon className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* Server Grid Header */}
              <div className="flex items-center justify-between pt-2">
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <span>Server Nodes Grid</span>
                  <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                    {servers.length}
                  </span>
                </h3>

                <button
                  onClick={() => setIsAlertModalOpen(true)}
                  className="flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 border border-rose-800/40 px-3 py-1.5 rounded-lg font-medium transition-colors"
                >
                  <ShieldAlert className="h-3.5 w-3.5" />
                  <span>SMTP & Alert Settings</span>
                </button>
              </div>

              {/* Cards Grid */}
              {servers.length === 0 ? (
                <div className="bg-surface-card border border-slate-800 rounded-2xl p-12 text-center max-w-md mx-auto my-12">
                  <div className="h-16 w-16 bg-blue-600/10 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 border border-blue-500/20">
                    <ServerIcon className="h-8 w-8" />
                  </div>
                  <h4 className="font-bold text-slate-100 text-lg">No Servers Monitored Yet</h4>
                  <p className="text-xs text-slate-400 mt-1 mb-6">
                    Add your first Linux, Windows, or Local server node to start streaming live telemetry metrics.
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-lg text-xs font-semibold transition-all shadow-lg shadow-blue-500/20"
                  >
                    <Plus className="h-4 w-4" /> Add Server Node
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                  {servers.map((srv) => (
                    <ServerCard
                      key={srv.id}
                      server={srv}
                      metrics={metricsMap[srv.id]}
                      onSelect={() => setActiveServerId(srv.id)}
                      onDelete={handleDeleteServer}
                    />
                  ))}
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      {/* Add Server Modal */}
      <AddServerModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={refreshServers}
      />

      {/* Alert & SMTP Settings Modal */}
      <AlertSettingsModal
        isOpen={isAlertModalOpen}
        onClose={() => setIsAlertModalOpen(false)}
        onSettingsUpdated={(settings) => setSoundEnabled(settings.sound_enabled ?? true)}
      />
    </div>
  );
}
