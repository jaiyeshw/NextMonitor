export interface ServerConfig {
  id: number;
  name: string;
  hostname: string;
  os_type: 'linux' | 'windows' | 'local';
  port: number;
  auth_type: 'password' | 'ssh_key';
  username?: string;
  password?: string;
  ssh_key?: string;
  created_at?: string;
  updated_at?: string;
}

export type ServerCreateInput = Omit<ServerConfig, 'id' | 'created_at' | 'updated_at'>;

export interface ProcessMetric {
  pid: number;
  name: string;
  cpu_percent: number;
  memory_percent: number;
  user?: string;
}

export interface Pm2ProcessMetric {
  name: string;
  pm_id: number;
  pid: number;
  status: 'online' | 'stopped' | 'errored' | 'launching' | string;
  cpu_percent: number;
  memory_mb: number;
  restart_count: number;
  uptime_seconds: number;
  uptime_str?: string;
  user?: string;
}

export interface GpuMetric {
  name: string;
  utilization_gpu: number;
  memory_used_mb: number;
  memory_total_mb: number;
  memory_percent: number;
  temperature_c?: number;
}

export interface NetworkMetric {
  bytes_sent_per_sec: number;
  bytes_recv_per_sec: number;
  total_sent_mb: number;
  total_recv_mb: number;
}

export interface DiskUsageMetric {
  device: string;
  mountpoint: string;
  total_gb: number;
  used_gb: number;
  free_gb: number;
  percent: number;
}

export interface SystemMetrics {
  server_id: number;
  server_name: string;
  status: 'online' | 'offline' | 'connecting';
  error_message?: string;
  timestamp: number;
  cpu_usage_percent: number;
  cpu_count: number;
  ram_total_gb: number;
  ram_used_gb: number;
  ram_usage_percent: number;
  disks: DiskUsageMetric[];
  gpus: GpuMetric[];
  network: NetworkMetric;
  top_processes: ProcessMetric[];
  pm2_services?: Pm2ProcessMetric[];
}

export interface AlertSetting {
  enabled: boolean;
  sound_enabled?: boolean;
  cpu_threshold_percent: number;
  smtp_host: string;
  smtp_port: number;
  smtp_user: string;
  smtp_password?: string;
  from_email: string;
  to_email: string;
  cooldown_minutes: number;
}

export interface HistoricalMetricPoint {
  time: string;
  cpu: number;
  ram: number;
  netSentKb: number;
  netRecvKb: number;
}
