import time
import io
import re
import json
import paramiko
from app.collector.base import BaseCollector
from app.models import ServerModel, SystemMetrics, DiskUsageMetric, GpuMetric, NetworkMetric, ProcessMetric, Pm2ProcessMetric

class LinuxCollector(BaseCollector):
    def __init__(self, server: ServerModel):
        super().__init__(server)
        self.last_net_bytes = (0, 0)
        self.last_net_time = time.time()
        self.last_cpu_stat = (0, 0)  # (total, idle)
        self.ssh_client: paramiko.SSHClient | None = None

    def _get_ssh_client(self) -> paramiko.SSHClient:
        if self.ssh_client and self.ssh_client.get_transport() and self.ssh_client.get_transport().is_active():
            return self.ssh_client

        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        connect_kwargs = {
            "hostname": self.server.hostname,
            "port": self.server.port or 22,
            "username": self.server.username or "root",
            "timeout": 5,
            "banner_timeout": 5,
        }

        if self.server.auth_type == "ssh_key" and self.server.ssh_key:
            pkey = None
            key_content = self.server.ssh_key.strip()
            
            # Try auto-parsing key formats: RSA, Ed25519, ECDSA, DSS
            for key_cls in [paramiko.RSAKey, paramiko.Ed25519Key, paramiko.ECDSAKey, paramiko.DSSKey]:
                try:
                    key_file = io.StringIO(key_content)
                    pkey = key_cls.from_private_key(key_file)
                    break
                except Exception:
                    continue

            if not pkey:
                raise ValueError("Could not parse SSH private key. Ensure it is a valid RSA, Ed25519, or ECDSA key.")
            
            connect_kwargs["pkey"] = pkey
        elif self.server.password:
            connect_kwargs["password"] = self.server.password

        ssh.connect(**connect_kwargs)
        self.ssh_client = ssh
        return ssh

    def _close_ssh(self):
        if self.ssh_client:
            try:
                self.ssh_client.close()
            except Exception:
                pass
            self.ssh_client = None

    async def test_connection(self) -> tuple[bool, str]:
        try:
            ssh = self._get_ssh_client()
            stdin, stdout, stderr = ssh.exec_command("uname -a", timeout=5)
            output = stdout.read().decode('utf-8').strip()
            return True, f"Successfully connected to Linux host: {output}"
        except Exception as e:
            self._close_ssh()
            return False, f"SSH connection failed: {str(e)}"

    async def collect(self) -> SystemMetrics:
        now = time.time()
        try:
            ssh = self._get_ssh_client()
        except Exception as e:
            self._close_ssh()
            raise e

        # Combined bash script to fetch metrics in one single roundtrip
        script = r"""
echo '===CPU_MEM==='
cat /proc/stat | head -n 1
cat /proc/meminfo | grep -E 'MemTotal|MemAvailable|MemFree|Buffers|Cached'
lscpu -p=Core,Socket 2>/dev/null | grep -v '^#' | sort -u | wc -l || nproc

echo '===DISK==='
df -PB1

echo '===NET==='
cat /proc/net/dev

echo '===GPU==='
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,utilization.gpu,memory.used,memory.total,temperature.gpu --format=csv,noheader,nounits 2>/dev/null || true
fi

echo '===PROC==='
ps -eo pid,user,%cpu,%mem,comm --sort=-%cpu | head -n 11

echo '===PM2==='
if command -v pm2 &> /dev/null; then
    pm2 jlist 2>/dev/null || true
elif [ -f ~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin/pm2 ]; then
    ~/.nvm/versions/node/$(ls ~/.nvm/versions/node 2>/dev/null | tail -n 1)/bin/pm2 jlist 2>/dev/null || true
elif [ -f /usr/local/bin/pm2 ]; then
    /usr/local/bin/pm2 jlist 2>/dev/null || true
elif [ -f /usr/bin/pm2 ]; then
    /usr/bin/pm2 jlist 2>/dev/null || true
fi
"""
        try:
            stdin, stdout, stderr = ssh.exec_command(script, timeout=6)
            raw_output = stdout.read().decode('utf-8', errors='ignore')
        except Exception as e:
            self._close_ssh()
            raise e

        sections = {}
        current_section = None
        for line in raw_output.splitlines():
            if line.startswith('==='):
                current_section = line.strip('=')
                sections[current_section] = []
            elif current_section:
                sections[current_section].append(line)

        # Parse CPU & Memory
        cpu_percent = 0.0
        cpu_count = 1
        ram_total_gb = 0.0
        ram_used_gb = 0.0
        ram_percent = 0.0

        if 'CPU_MEM' in sections:
            lines = sections['CPU_MEM']
            mem_dict = {}
            for line in lines:
                if line.startswith('cpu '):
                    parts = list(map(int, line.split()[1:]))
                    idle = parts[3] + (parts[4] if len(parts) > 4 else 0)
                    total = sum(parts)
                    if self.last_cpu_stat[0] > 0:
                        total_diff = total - self.last_cpu_stat[0]
                        idle_diff = idle - self.last_cpu_stat[1]
                        if total_diff > 0:
                            cpu_percent = round(100.0 * (total_diff - idle_diff) / total_diff, 1)
                    self.last_cpu_stat = (total, idle)
                elif ':' in line:
                    k, v = line.split(':', 1)
                    v_num = re.findall(r'\d+', v)
                    if v_num:
                        mem_dict[k.strip()] = int(v_num[0])  # in kB
                elif line.isdigit():
                    cpu_count = int(line)

            if 'MemTotal' in mem_dict:
                total_kb = mem_dict['MemTotal']
                avail_kb = mem_dict.get('MemAvailable', mem_dict.get('MemFree', 0) + mem_dict.get('Buffers', 0) + mem_dict.get('Cached', 0))
                used_kb = total_kb - avail_kb
                ram_total_gb = round(total_kb / (1024**2), 2)
                ram_used_gb = round(used_kb / (1024**2), 2)
                ram_percent = round((used_kb / total_kb) * 100, 1) if total_kb > 0 else 0.0

        # Parse Disk
        disks = []
        if 'DISK' in sections:
            for line in sections['DISK'][1:]:  # skip header
                parts = line.split()
                if len(parts) >= 6 and parts[0].startswith('/dev/'):
                    try:
                        total_b = int(parts[1])
                        used_b = int(parts[2])
                        avail_b = int(parts[3])
                        pct_str = parts[4].rstrip('%')
                        pct = float(pct_str) if pct_str.isdigit() else 0.0
                        disks.append(DiskUsageMetric(
                            device=parts[0],
                            mountpoint=parts[5],
                            total_gb=round(total_b / (1024**3), 2),
                            used_gb=round(used_b / (1024**3), 2),
                            free_gb=round(avail_b / (1024**3), 2),
                            percent=pct
                        ))
                    except ValueError:
                        continue

        # Parse Network
        rx_bytes_total, tx_bytes_total = 0, 0
        if 'NET' in sections:
            for line in sections['NET'][2:]:
                if ':' in line:
                    iface, stats = line.split(':', 1)
                    parts = stats.split()
                    if len(parts) >= 9 and iface.strip() != 'lo':
                        rx_bytes_total += int(parts[0])
                        tx_bytes_total += int(parts[8])

        time_delta = max(now - self.last_net_time, 0.001)
        bytes_sent_per_sec = 0.0
        bytes_recv_per_sec = 0.0
        if self.last_net_bytes[0] > 0:
            bytes_recv_per_sec = round((rx_bytes_total - self.last_net_bytes[0]) / time_delta, 2)
            bytes_sent_per_sec = round((tx_bytes_total - self.last_net_bytes[1]) / time_delta, 2)

        self.last_net_bytes = (rx_bytes_total, tx_bytes_total)
        self.last_net_time = now

        network = NetworkMetric(
            bytes_sent_per_sec=max(bytes_sent_per_sec, 0.0),
            bytes_recv_per_sec=max(bytes_recv_per_sec, 0.0),
            total_sent_mb=round(tx_bytes_total / (1024**2), 2),
            total_recv_mb=round(rx_bytes_total / (1024**2), 2)
        )

        # Parse GPU
        gpus = []
        if 'GPU' in sections:
            for line in sections['GPU']:
                parts = [p.strip() for p in line.split(',')]
                if len(parts) >= 5:
                    try:
                        g_name = parts[0]
                        g_util = float(parts[1])
                        g_used_mb = float(parts[2])
                        g_total_mb = float(parts[3])
                        g_temp = float(parts[4])
                        g_pct = round((g_used_mb / g_total_mb) * 100, 1) if g_total_mb > 0 else 0.0
                        gpus.append(GpuMetric(
                            name=g_name,
                            utilization_gpu=g_util,
                            memory_used_mb=g_used_mb,
                            memory_total_mb=g_total_mb,
                            memory_percent=g_pct,
                            temperature_c=g_temp
                        ))
                    except ValueError:
                        continue

        # Parse Top Processes
        top_processes = []
        if 'PROC' in sections:
            for line in sections['PROC'][1:]:  # skip header
                parts = line.split(maxsplit=4)
                if len(parts) >= 5:
                    try:
                        pid = int(parts[0])
                        user = parts[1]
                        cpu_p = float(parts[2])
                        mem_p = float(parts[3])
                        p_name = parts[4]
                        top_processes.append(ProcessMetric(
                            pid=pid,
                            name=p_name,
                            cpu_percent=cpu_p,
                            memory_percent=mem_p,
                            user=user
                        ))
                    except ValueError:
                        continue

        # Parse PM2 Services
        pm2_services = []
        if 'PM2' in sections:
            pm2_raw = "\n".join(sections['PM2']).strip()
            # In case there are warning lines before JSON, find substring starting with [ and ending with ]
            start_idx = pm2_raw.find('[')
            end_idx = pm2_raw.rfind(']')
            if start_idx != -1 and end_idx != -1 and end_idx > start_idx:
                try:
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
