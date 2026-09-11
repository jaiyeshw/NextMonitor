import time
import json
import subprocess
import psutil
from app.collector.base import BaseCollector
from app.models import ServerModel, SystemMetrics, DiskUsageMetric, GpuMetric, NetworkMetric, ProcessMetric, Pm2ProcessMetric

class LocalCollector(BaseCollector):
    def __init__(self, server: ServerModel):
        super().__init__(server)
        self.last_net_io = psutil.net_io_counters()
        self.last_net_time = time.time()

    async def test_connection(self) -> tuple[bool, str]:
        try:
            psutil.cpu_percent(interval=None)
            return True, "Successfully connected to local machine."
        except Exception as e:
            return False, f"Failed to access local metrics: {str(e)}"

    async def collect(self) -> SystemMetrics:
        now = time.time()
        
        # CPU (Physical Cores)
        cpu_percent = psutil.cpu_percent(interval=None)
        cpu_count = psutil.cpu_count(logical=False) or psutil.cpu_count(logical=True) or 1

        # Memory
        mem = psutil.virtual_memory()
        ram_total_gb = round(mem.total / (1024**3), 2)
        ram_used_gb = round(mem.used / (1024**3), 2)
        ram_percent = mem.percent

        # Disk
        disks = []
        for part in psutil.disk_partitions(all=False):
            if 'cdrom' in part.opts or part.fstype == '':
                continue
            try:
                usage = psutil.disk_usage(part.mountpoint)
                disks.append(DiskUsageMetric(
                    device=part.device,
                    mountpoint=part.mountpoint,
                    total_gb=round(usage.total / (1024**3), 2),
                    used_gb=round(usage.used / (1024**3), 2),
                    free_gb=round(usage.free / (1024**3), 2),
                    percent=usage.percent
                ))
            except (PermissionError, FileNotFoundError):
                continue

        # Network IO rate calculation
        net_io = psutil.net_io_counters()
        time_delta = max(now - self.last_net_time, 0.001)
        bytes_sent_per_sec = round((net_io.bytes_sent - self.last_net_io.bytes_sent) / time_delta, 2)
        bytes_recv_per_sec = round((net_io.bytes_recv - self.last_net_io.bytes_recv) / time_delta, 2)
        
        self.last_net_io = net_io
        self.last_net_time = now

        network = NetworkMetric(
            bytes_sent_per_sec=max(bytes_sent_per_sec, 0.0),
            bytes_recv_per_sec=max(bytes_recv_per_sec, 0.0),
            total_sent_mb=round(net_io.bytes_sent / (1024**2), 2),
            total_recv_mb=round(net_io.bytes_recv / (1024**2), 2)
        )

        # GPU metrics if available via pynvml or nvidia-smi
        gpus = []
        try:
            import pynvml
            pynvml.nvmlInit()
            device_count = pynvml.nvmlDeviceGetCount()
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(name, bytes):
                    name = name.decode('utf-8')
                util = pynvml.nvmlDeviceGetUtilizationRates(handle)
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                try:
                    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                except Exception:
                    temp = None

                mem_used_mb = round(mem_info.used / (1024**2), 1)
                mem_total_mb = round(mem_info.total / (1024**2), 1)
                mem_percent = round((mem_used_mb / mem_total_mb) * 100, 1) if mem_total_mb > 0 else 0.0

                gpus.append(GpuMetric(
                    name=name,
                    utilization_gpu=float(util.gpu),
                    memory_used_mb=mem_used_mb,
                    memory_total_mb=mem_total_mb,
                    memory_percent=mem_percent,
                    temperature_c=float(temp) if temp is not None else None
                ))
            pynvml.nvmlShutdown()
        except Exception:
            pass  # GPU not present or driver not available

        # Top processes by CPU usage
        procs = []
        for p in psutil.process_iter(['pid', 'name', 'cpu_percent', 'memory_percent', 'username']):
            try:
                info = p.info
                procs.append(ProcessMetric(
                    pid=info['pid'],
                    name=info['name'] or 'unknown',
                    cpu_percent=round(info['cpu_percent'] or 0.0, 1),
                    memory_percent=round(info['memory_percent'] or 0.0, 1),
                    user=info.get('username') or 'N/A'
                ))
            except (psutil.NoSuchProcess, psutil.AccessDenied):
                continue

        top_processes = sorted(procs, key=lambda x: x.cpu_percent, reverse=True)[:10]

        # PM2 Services on local machine
        pm2_services = []
        try:
            res = subprocess.run(["pm2", "jlist"], capture_output=True, text=True, timeout=2, shell=True)
            if res.returncode == 0 and res.stdout.strip():
                pm2_raw = res.stdout.strip()
                start_idx = pm2_raw.find('[')
                end_idx = pm2_raw.rfind(']')
                if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                    pm2_list = json.loads(pm2_raw[start_idx:end_idx + 1])
                    for item in pm2_list:
                        pm2_env = item.get('pm2_env') or {}
                        monit = item.get('monit') or {}

                        uptime_ms = pm2_env.get('pm_uptime', 0) or 0
                        uptime_sec = 0
                        uptime_str = "0s"
                        if uptime_ms and uptime_ms > 0:
                            uptime_sec = int(max(0, (now * 1000 - uptime_ms) / 1000))
                            days, rem = divmod(uptime_sec, 86400)
                            hours, rem = divmod(rem, 3600)
                            minutes, seconds = divmod(rem, 60)
                            if days > 0:
                                uptime_str = f"{days}d {hours}h"
                            elif hours > 0:
                                uptime_str = f"{hours}h {minutes}m"
                            elif minutes > 0:
                                uptime_str = f"{minutes}m {seconds}s"
                            else:
                                uptime_str = f"{seconds}s"

                        mem_bytes = monit.get('memory', 0) or 0
                        mem_mb = round(mem_bytes / (1024 * 1024), 1)
                        cpu_p = round(float(monit.get('cpu', 0.0) or 0.0), 1)

                        pm2_services.append(Pm2ProcessMetric(
                            name=str(item.get('name', 'unknown')),
                            pm_id=int(item.get('pm_id', 0) if item.get('pm_id') is not None else 0),
                            pid=int(item.get('pid', 0) or 0),
                            status=str(pm2_env.get('status', 'stopped')),
                            cpu_percent=cpu_p,
                            memory_mb=mem_mb,
                            restart_count=int(pm2_env.get('restart_time', 0) or 0),
                            uptime_seconds=uptime_sec,
                            uptime_str=uptime_str,
                            user=str(pm2_env.get('username') or '')
                        ))
        except Exception:
            pass

        return SystemMetrics(
            server_id=self.server.id,
            server_name=self.server.name,
            status="online",
            timestamp=now,
            cpu_usage_percent=cpu_percent,
            cpu_count=cpu_count,
            ram_total_gb=ram_total_gb,
            ram_used_gb=ram_used_gb,
            ram_usage_percent=ram_percent,
            disks=disks,
            gpus=gpus,
            network=network,
            top_processes=top_processes,
            pm2_services=pm2_services
        )
