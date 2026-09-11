'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { ServerConfig, SystemMetrics, HistoricalMetricPoint } from '../types/monitor';
import { fetchServers } from '../lib/api';

const HISTORY_MAX_SAMPLES = 30;

export function useNexMonitor() {
  const [servers, setServers] = useState<ServerConfig[]>([]);
  const [metricsMap, setMetricsMap] = useState<Record<number, SystemMetrics>>({});
  const [historyMap, setHistoryMap] = useState<Record<number, HistoricalMetricPoint[]>>({});
  const [isWsConnected, setIsWsConnected] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const wsRef = useRef<WebSocket | null>(null);

  // Load server definitions from REST API
  const loadServers = useCallback(async () => {
    try {
      setLoading(true);
      const data = await fetchServers();
      setServers(data);
    } catch (err) {
      console.error('Failed to load server configurations:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadServers();
  }, [loadServers]);

  // Connect to WebSocket stream
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;

    const connectWebSocket = () => {
      const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost';
      const wsUrl = `ws://${host}:8000/ws/metrics`;

      console.log('Connecting WebSocket to:', wsUrl);
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected successfully');
        setIsWsConnected(true);
      };

      ws.onmessage = (event) => {
        try {
          const metric: SystemMetrics = JSON.parse(event.data);
          const serverId = metric.server_id;
          const timeStr = new Date(metric.timestamp * 1000).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          });

          // Update current metrics
          setMetricsMap((prev) => ({
            ...prev,
            [serverId]: metric,
          }));

          // Append to history buffer if online
          if (metric.status === 'online') {
            const netSentKb = Math.round((metric.network?.bytes_sent_per_sec || 0) / 1024);
            const netRecvKb = Math.round((metric.network?.bytes_recv_per_sec || 0) / 1024);

            const newPoint: HistoricalMetricPoint = {
              time: timeStr,
              cpu: Math.round(metric.cpu_usage_percent || 0),
              ram: Math.round(metric.ram_usage_percent || 0),
              netSentKb,
              netRecvKb,
            };

            setHistoryMap((prev) => {
              const currentHistory = prev[serverId] || [];
              const updatedHistory = [...currentHistory, newPoint].slice(-HISTORY_MAX_SAMPLES);
              return {
                ...prev,
                [serverId]: updatedHistory,
              };
            });
          }
        } catch (e) {
          console.error('Error parsing WebSocket metric message:', e);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsWsConnected(false);
      };

      ws.onclose = () => {
        console.warn('WebSocket closed. Retrying in 3 seconds...');
        setIsWsConnected(false);
        reconnectTimeout = setTimeout(connectWebSocket, 3000);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
      clearTimeout(reconnectTimeout);
    };
  }, []);

  return {
    servers,
    metricsMap,
    historyMap,
    isWsConnected,
    loading,
    refreshServers: loadServers,
  };
}
