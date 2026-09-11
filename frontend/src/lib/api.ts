import { ServerConfig, ServerCreateInput } from '../types/monitor';

const API_BASE = typeof window !== 'undefined' ? '/api' : 'http://localhost:8000/api';

export async function fetchServers(): Promise<ServerConfig[]> {
  const res = await fetch(`${API_BASE}/servers`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to fetch servers');
  }
  return res.json();
}

export async function createServer(data: ServerCreateInput): Promise<ServerConfig> {
  const res = await fetch(`${API_BASE}/servers`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to create server');
  }
  return res.json();
}

export async function updateServer(id: number, data: Partial<ServerCreateInput>): Promise<ServerConfig> {
  const res = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to update server');
  }
  return res.json();
}

export async function deleteServer(id: number): Promise<void> {
  const res = await fetch(`${API_BASE}/servers/${id}`, {
    method: 'DELETE',
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Failed to delete server');
  }
}

export async function testConnection(data: ServerCreateInput): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/servers/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || 'Connection test failed');
  }
  return res.json();
}

export async function fetchAlertSettings(): Promise<any> {
  const res = await fetch(`${API_BASE}/alerts/settings`);
  if (!res.ok) throw new Error('Failed to fetch alert settings');
  return res.json();
}

export async function updateAlertSettings(data: any): Promise<any> {
  const res = await fetch(`${API_BASE}/alerts/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update alert settings');
  return res.json();
}

export async function testAlertEmail(data: any): Promise<{ success: boolean; message: string }> {
  const res = await fetch(`${API_BASE}/alerts/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({}));
    throw new Error(errData.detail || 'Failed to send test email');
  }
  return res.json();
}

