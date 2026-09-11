from datetime import datetime
from typing import Optional, List
from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, Float
from pydantic import BaseModel, ConfigDict
from app.database import Base

class ServerModel(Base):
    __tablename__ = "servers"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    hostname = Column(String(255), nullable=False)
    os_type = Column(String(20), nullable=False, default="linux")  # linux, windows, local
    port = Column(Integer, nullable=False, default=22)
    auth_type = Column(String(20), nullable=False, default="password")  # password, ssh_key
    username = Column(String(100), nullable=True)
    password = Column(String(255), nullable=True)
    ssh_key = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AlertSettingModel(Base):
    __tablename__ = "alert_settings"

    id = Column(Integer, primary_key=True, index=True)
    enabled = Column(Boolean, default=True)
    sound_enabled = Column(Boolean, default=True)
    cpu_threshold_percent = Column(Float, default=60.0)
    smtp_host = Column(String(255), nullable=True, default="smtp.gmail.com")
    smtp_port = Column(Integer, default=587)
    smtp_user = Column(String(255), nullable=True)
    smtp_password = Column(String(255), nullable=True)
    from_email = Column(String(255), nullable=True)
    to_email = Column(String(255), nullable=True)
    cooldown_minutes = Column(Integer, default=5)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


# Alert Setting Pydantic Schema
class AlertSettingSchema(BaseModel):
    enabled: bool = True
    sound_enabled: bool = True
    cpu_threshold_percent: float = 60.0
    smtp_host: Optional[str] = "smtp.gmail.com"
    smtp_port: int = 587
    smtp_user: Optional[str] = ""
    smtp_password: Optional[str] = ""
    from_email: Optional[str] = ""
    to_email: Optional[str] = ""
    cooldown_minutes: int = 5

    model_config = ConfigDict(from_attributes=True)



# Pydantic Models
class ServerBase(BaseModel):
    name: str
    hostname: str
    os_type: str  # 'linux' | 'windows' | 'local'
    port: int = 22
    auth_type: str = "password"  # 'password' | 'ssh_key'
    username: Optional[str] = None
    password: Optional[str] = None
    ssh_key: Optional[str] = None

class ServerCreate(ServerBase):
    pass

class ServerUpdate(BaseModel):
    name: Optional[str] = None
    hostname: Optional[str] = None
    os_type: Optional[str] = None
    port: Optional[int] = None
    auth_type: Optional[str] = None
    username: Optional[str] = None
    password: Optional[str] = None
    ssh_key: Optional[str] = None

class ServerResponse(ServerBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


# Live Telemetry Metrics Schemas
class ProcessMetric(BaseModel):
    pid: int
    name: str
    cpu_percent: float
    memory_percent: float
    user: Optional[str] = None

class Pm2ProcessMetric(BaseModel):
    name: str
    pm_id: int
    pid: int
    status: str  # 'online' | 'stopped' | 'errored' | 'launching'
    cpu_percent: float = 0.0
    memory_mb: float = 0.0
    restart_count: int = 0
    uptime_seconds: int = 0
    uptime_str: Optional[str] = "0s"
    user: Optional[str] = None

class GpuMetric(BaseModel):
    name: str
    utilization_gpu: float  # Percentage 0-100
    memory_used_mb: float
    memory_total_mb: float
    memory_percent: float
    temperature_c: Optional[float] = None

class NetworkMetric(BaseModel):
    bytes_sent_per_sec: float
    bytes_recv_per_sec: float
    total_sent_mb: float
    total_recv_mb: float

class DiskUsageMetric(BaseModel):
    device: str
    mountpoint: str
    total_gb: float
    used_gb: float
    free_gb: float
    percent: float

class SystemMetrics(BaseModel):
    server_id: int
    server_name: str
    status: str  # 'online' | 'offline' | 'connecting'
    error_message: Optional[str] = None
    timestamp: float
    cpu_usage_percent: float = 0.0
    cpu_count: int = 1
    ram_total_gb: float = 0.0
    ram_used_gb: float = 0.0
    ram_usage_percent: float = 0.0
    disks: List[DiskUsageMetric] = []
    gpus: List[GpuMetric] = []
    network: NetworkMetric = NetworkMetric(
        bytes_sent_per_sec=0.0, bytes_recv_per_sec=0.0, total_sent_mb=0.0, total_recv_mb=0.0
    )
    top_processes: List[ProcessMetric] = []
    pm2_services: List[Pm2ProcessMetric] = []
