import time
import json
import winrm
from app.collector.base import BaseCollector
from app.models import ServerModel, SystemMetrics, DiskUsageMetric, GpuMetric, NetworkMetric, ProcessMetric

class WindowsCollector(BaseCollector):
    def __init__(self, server: ServerModel):
        super().__init__(server)
        self.last_net_bytes = (0, 0)
        self.last_net_time = time.time()

    def _get_session(self) -> winrm.Session:
        protocol = "https" if self.server.port == 5986 else "http"
        url = f"{protocol}://{self.server.hostname}:{self.server.port or 5985}/wsman"
        session = winrm.Session(
            url,
            auth=(self.server.username or "Administrator", self.server.password or ""),
            transport='ntlm',
            server_cert_validation='ignore'
        )
        return session

    async def test_connection(self) -> tuple[bool, str]:
        try:
            s = self._get_session()
            r = s.run_ps("Get-CimInstance Win32_OperatingSystem | Select-Object -ExpandProperty Caption")
            if r.status_code == 0:
                os_caption = r.std_out.decode('utf-8').strip()
                return True, f"Successfully connected to Windows host: {os_caption}"
            else:
                err = r.std_err.decode('utf-8').strip()
                return False, f"WinRM connection error: {err}"
        except Exception as e:
            return False, f"Failed to connect via WinRM: {str(e)}"

    async def collect(self) -> SystemMetrics:
        now = time.time()
        s = self._get_session()

        # PowerShell script to collect telemetry as JSON
        ps_script = r"""
$ErrorActionPreference = 'SilentlyContinue'

$cpu = (Get-CimInstance Win32_Processor | Measure-Object -Property LoadPercentage -Average).Average
$cpuCount = (Get-CimInstance Win32_Processor | Measure-Object -Property NumberOfCores -Sum).Sum

$os = Get-CimInstance Win32_OperatingSystem
$memTotal = [math]::Round($os.TotalVisibleMemorySize / 1MB, 2)
$memFree = [math]::Round($os.FreePhysicalMemory / 1MB, 2)
$memUsed = [math]::Round($memTotal - $memFree, 2)
$memPercent = [math]::Round(($memUsed / $memTotal) * 100, 1)

$disks = Get-CimInstance Win32_LogicalDisk -Filter "DriveType=3" | ForEach-Object {
    [PSCustomObject]@{
        device = $_.DeviceID
        mountpoint = $_.DeviceID
        total_gb = [math]::Round($_.Size / 1GB, 2)
        used_gb = [math]::Round(($_.Size - $_.FreeSpace) / 1GB, 2)
        free_gb = [math]::Round($_.FreeSpace / 1GB, 2)
        percent = [math]::Round((($_.Size - $_.FreeSpace) / $_.Size) * 100, 1)
    }
}

$net = Get-CimInstance Win32_PerfRawData_Tcpip_NetworkInterface | ForEach-Object {
    [PSCustomObject]@{
        BytesReceivedPerSec = $_.BytesReceivedPerSec
        BytesSentPerSec = $_.BytesSentPerSec
    }
} | Measure-Object -Property BytesReceivedPerSec, BytesSentPerSec -Sum

$topProcs = Get-Process | Sort-Object CPU -Descending | Select-Object -First 10 | ForEach-Object {
    [PSCustomObject]@{
        pid = $_.Id
        name = $_.ProcessName
        cpu_percent = [math]::Round(($_.CPU / 10), 1)
        memory_percent = [math]::Round(($_.WorkingSet64 / 1MB), 1)
        user = $_.Company
    }
}

[PSCustomObject]@{
    cpu_percent = $cpu
    cpu_count = $cpuCount
    ram_total_gb = $memTotal
    ram_used_gb = $memUsed
    ram_percent = $memPercent
    disks = $disks
    net_bytes_sent = ($net | Where-Object Property -eq 'BytesSentPerSec').Sum
    net_bytes_recv = ($net | Where-Object Property -eq 'BytesReceivedPerSec').Sum
    top_processes = $topProcs
} | ConvertTo-Json -Depth 3
"""
        r = s.run_ps(ps_script)
        if r.status_code != 0:
            raise Exception(f"WinRM command failed: {r.std_err.decode('utf-8').strip()}")

        data = json.loads(r.std_out.decode('utf-8'))

        cpu_percent = float(data.get('cpu_percent') or 0.0)
        cpu_count = int(data.get('cpu_count') or 1)
        ram_total_gb = float(data.get('ram_total_gb') or 0.0)
        ram_used_gb = float(data.get('ram_used_gb') or 0.0)
        ram_percent = float(data.get('ram_percent') or 0.0)

        disks = []
        raw_disks = data.get('disks') or []
        if isinstance(raw_disks, dict):
            raw_disks = [raw_disks]
        for d in raw_disks:
            disks.append(DiskUsageMetric(
                device=d.get('device', 'C:'),
                mountpoint=d.get('mountpoint', 'C:'),
                total_gb=float(d.get('total_gb', 0.0)),
                used_gb=float(d.get('used_gb', 0.0)),
                free_gb=float(d.get('free_gb', 0.0)),
                percent=float(d.get('percent', 0.0))
            ))

        net_sent = float(data.get('net_bytes_sent') or 0.0)
        net_recv = float(data.get('net_bytes_recv') or 0.0)
        time_delta = max(now - self.last_net_time, 0.001)

        bytes_sent_per_sec = 0.0
        bytes_recv_per_sec = 0.0
        if self.last_net_bytes[0] > 0:
            bytes_recv_per_sec = round((net_recv - self.last_net_bytes[0]) / time_delta, 2)
            bytes_sent_per_sec = round((net_sent - self.last_net_bytes[1]) / time_delta, 2)

        self.last_net_bytes = (net_recv, net_sent)
        self.last_net_time = now

        network = NetworkMetric(
            bytes_sent_per_sec=max(bytes_sent_per_sec, 0.0),
            bytes_recv_per_sec=max(bytes_recv_per_sec, 0.0),
            total_sent_mb=round(net_sent / (1024**2), 2),
            total_recv_mb=round(net_recv / (1024**2), 2)
        )

        top_processes = []
        raw_procs = data.get('top_processes') or []
        if isinstance(raw_procs, dict):
            raw_procs = [raw_procs]
        for p in raw_procs:
            top_processes.append(ProcessMetric(
                pid=int(p.get('pid', 0)),
                name=str(p.get('name', 'unknown')),
                cpu_percent=float(p.get('cpu_percent', 0.0)),
                memory_percent=float(p.get('memory_percent', 0.0)),
                user=str(p.get('user', 'N/A'))
            ))

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
            gpus=[],
            network=network,
            top_processes=top_processes
        )
