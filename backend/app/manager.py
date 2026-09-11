import asyncio
import logging
import json
import time
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, List, Set
from fastapi import WebSocket
from app.database import SessionLocal
from app.models import ServerModel, SystemMetrics, AlertSettingModel
from app.collector.base import BaseCollector
from app.collector.linux import LinuxCollector
from app.collector.windows import WindowsCollector
from app.collector.local import LocalCollector

logger = logging.getLogger("nexmonitor.manager")


def _send_email_in_thread(smtp_host: str, smtp_port: int, smtp_user: str, smtp_pass: str, from_addr: str, to_addr: str, server_name: str, cpu_percent: float, threshold: float):
    try:
        sender = from_addr or smtp_user
        recipients = [e.strip() for e in str(to_addr).replace(';', ',').replace('\n', ',').split(',') if e.strip()]
        if not recipients:
            return

        formatted_time = time.strftime('%d %b %Y, %I:%M:%S %p')
        rounded_cpu = f"{cpu_percent:.1f}"

        msg = MIMEMultipart("alternative")
        msg["From"] = f"NexMonitor Alerts <{sender}>"
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = f"🚨 [CRITICAL ALERT] High CPU Usage ({rounded_cpu}%) on {server_name}"

        # Plain text fallback
        plain_text = f"""CRITICAL SYSTEM ALERT - NexMonitor

Server: {server_name}
CPU Utilization: {rounded_cpu}% (Configured Threshold: {threshold:.1f}%)
Timestamp: {formatted_time}

Action Required:
CPU usage has exceeded your defined safety threshold. Please inspect high resource-consuming processes on your NexMonitor dashboard immediately.

-- 
NexMonitor Automated Telemetry Engine
"""

        # Professional Styled HTML Email
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexMonitor Alert</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070a12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #070a12; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);" cellspacing="0" cellpadding="0">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #ef4444 0%, #f97316 50%, #e11d48 100%); font-size: 0; line-height: 0;">&nbsp;</td>
          </tr>

          <!-- Header Section -->
          <tr>
            <td style="padding: 28px 32px 20px 32px; background: #0f172a;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td>
                    <!-- Brand Title -->
                    <div style="font-size: 13px; font-weight: 700; color: #38bdf8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 6px;">
                      ⚡ NexMonitor
                    </div>
                    <div style="font-size: 22px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      High CPU Utilization Alert
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <!-- Critical Badge -->
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 9999px; color: #f87171; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ● Critical Spike
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Divider -->
          <tr>
            <td style="padding: 0 32px;"><div style="height: 1px; background-color: #1e293b; font-size: 0;"></div></td>
          </tr>

          <!-- Alert Metric Cards Grid -->
          <tr>
            <td style="padding: 24px 32px 10px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0">
                <!-- Server Name Card -->
                <tr>
                  <td style="background-color: #1e293b; border-radius: 12px; padding: 16px 20px; border: 1px solid #334155;">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Server Name</div>
                          <div style="font-size: 18px; font-weight: 700; color: #ffffff; margin-top: 4px;">{server_name}</div>
                        </td>
                        <td align="right">
                          <span style="display: inline-block; font-size: 22px;">🖥️</span>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- Spacer -->
                <tr><td height="12"></td></tr>

                <!-- CPU Stat Box -->
                <tr>
                  <td style="background: linear-gradient(135deg, rgba(239, 68, 68, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(239, 68, 68, 0.35);">
                    <table width="100%" cellspacing="0" cellpadding="0">
                      <tr>
                        <td>
                          <div style="font-size: 11px; font-weight: 700; color: #f87171; text-transform: uppercase; letter-spacing: 0.5px;">Current CPU Usage</div>
                          <div style="font-size: 38px; font-weight: 900; color: #ef4444; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; line-height: 1.1; margin-top: 4px;">
                            {rounded_cpu}%
                          </div>
                        </td>
                        <td align="right" valign="top">
                          <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Configured Limit</div>
                          <div style="font-size: 15px; font-weight: 700; color: #cbd5e1; margin-top: 2px;">
                            &gt; {threshold:.1f}%
                          </div>
                        </td>
                      </tr>
                    </table>

                    <!-- Progress Bar Visual -->
                    <div style="margin-top: 14px; background-color: #334155; height: 8px; border-radius: 9999px; overflow: hidden;">
                      <div style="background: linear-gradient(90deg, #f97316 0%, #ef4444 100%); width: {min(float(cpu_percent), 100.0)}%; height: 8px; border-radius: 9999px;"></div>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Timestamp & Recommendations -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #0b1329; border-radius: 10px; border: 1px solid #1e293b; padding: 14px 16px;">
                <tr>
                  <td style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                    <div style="color: #cbd5e1; font-weight: 600; margin-bottom: 4px;">🕒 Detection Timestamp: <span style="color: #38bdf8; font-family: monospace;">{formatted_time}</span></div>
                    <div>⚠️ <strong style="color: #f1f5f9;">Action Recommended:</strong> Inspect active processes and PM2 microservices on your dashboard to identify the root cause.</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b1120; padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                This automated incident report was generated by <strong>NexMonitor</strong>.<br>
                Please do not reply directly to this automated notification.
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>"""

        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_content, "html"))

        server = smtplib.SMTP(smtp_host, smtp_port, timeout=10)
        server.starttls()
        server.login(smtp_user, smtp_pass)
        server.sendmail(sender, recipients, msg.as_string())
        server.quit()
        logger.info(f"Successfully dispatched styled HTML CPU alert to {len(recipients)} recipient(s) for server '{server_name}'")
    except Exception as e:
        logger.error(f"Failed to send CPU alert email: {str(e)}")


class ServerManager:
    def __init__(self):
        self.tasks: Dict[int, asyncio.Task] = {}
        self.collectors: Dict[int, BaseCollector] = {}
        self.latest_metrics: Dict[int, SystemMetrics] = {}
        self.active_websockets: Set[WebSocket] = set()
        self.last_alert_time: Dict[int, float] = {}

    def get_collector(self, server: ServerModel) -> BaseCollector:
        if server.id in self.collectors:
            # Update server metadata in existing collector
            self.collectors[server.id].server = server
            return self.collectors[server.id]

        if server.os_type == "local" or server.hostname in ["localhost", "127.0.0.1", "::1"]:
            c = LocalCollector(server)
        elif server.os_type == "windows":
            c = WindowsCollector(server)
        else:
            c = LinuxCollector(server)

        if server.id and server.id > 0:
            self.collectors[server.id] = c
        return c

    def start_server_loop(self, server: ServerModel):
        self.stop_server_loop(server.id)
        task = asyncio.create_task(self._server_monitoring_loop(server))
        self.tasks[server.id] = task
        logger.info(f"Started monitoring loop for server id={server.id} ({server.name})")

    def stop_server_loop(self, server_id: int):
        if server_id in self.tasks:
            task = self.tasks.pop(server_id)
            task.cancel()
            logger.info(f"Stopped monitoring loop for server id={server_id}")
        if server_id in self.collectors:
            c = self.collectors.pop(server_id)
            if hasattr(c, "_close_ssh"):
                c._close_ssh()

    def restart_server_loop(self, server: ServerModel):
        self.start_server_loop(server)

    async def _check_alert_conditions(self, metrics: SystemMetrics):
        if metrics.status != "online":
            return

        db = SessionLocal()
        try:
            settings = db.query(AlertSettingModel).first()
            if not settings or not settings.enabled or not settings.to_email or not settings.smtp_host:
                return

            threshold = settings.cpu_threshold_percent or 60.0
            if metrics.cpu_usage_percent >= threshold:
                server_id = metrics.server_id
                now = time.time()
                last_time = self.last_alert_time.get(server_id, 0)
                cooldown_sec = (settings.cooldown_minutes or 5) * 60

                if now - last_time >= cooldown_sec:
                    self.last_alert_time[server_id] = now
                    logger.warning(f"CPU threshold triggered ({metrics.cpu_usage_percent:.1f}% >= {threshold}%). Dispatching alert email...")
                    asyncio.create_task(
                        asyncio.to_thread(
                            _send_email_in_thread,
                            settings.smtp_host,
                            settings.smtp_port or 587,
                            settings.smtp_user or "",
                            settings.smtp_password or "",
                            settings.from_email or "",
                            settings.to_email,
                            metrics.server_name,
                            metrics.cpu_usage_percent,
                            threshold,
                        )
                    )
        except Exception as e:
            logger.error(f"Error checking alert conditions: {str(e)}")
        finally:
            db.close()

    async def _server_monitoring_loop(self, server: ServerModel):
        collector = self.get_collector(server)
        
        # Initial offline placeholder metrics
        self.latest_metrics[server.id] = SystemMetrics(
            server_id=server.id,
            server_name=server.name,
            status="connecting",
            timestamp=time.time()
        )

        while True:
            try:
                metrics = await collector.collect()
                self.latest_metrics[server.id] = metrics
                await self.broadcast_metrics(metrics)
                await self._check_alert_conditions(metrics)
                await asyncio.sleep(1.0)
            except asyncio.CancelledError:
                logger.info(f"Loop cancelled for server id={server.id}")
                break
            except Exception as e:
                logger.error(f"Error collecting metrics for server {server.id} ({server.name}): {str(e)}")
                offline_metrics = SystemMetrics(
                    server_id=server.id,
                    server_name=server.name,
                    status="offline",
                    error_message=str(e),
                    timestamp=time.time()
                )
                self.latest_metrics[server.id] = offline_metrics
                await self.broadcast_metrics(offline_metrics)
                # Wait 3 seconds before retrying offline server
                await asyncio.sleep(3.0)

    async def connect_ws(self, websocket: WebSocket):
        await websocket.accept()
        self.active_websockets.add(websocket)
        logger.info(f"WebSocket client connected. Total active: {len(self.active_websockets)}")
        
        # Send initial state snapshot of all servers to newly connected client
        for metrics in list(self.latest_metrics.values()):
            try:
                await websocket.send_text(metrics.model_dump_json())
            except Exception:
                pass

    def disconnect_ws(self, websocket: WebSocket):
        self.active_websockets.discard(websocket)
        logger.info(f"WebSocket client disconnected. Total active: {len(self.active_websockets)}")

    async def broadcast_metrics(self, metrics: SystemMetrics):
        if not self.active_websockets:
            return

        payload = metrics.model_dump_json()
        disconnected = set()
        
        for ws in self.active_websockets:
            try:
                await ws.send_text(payload)
            except Exception:
                disconnected.add(ws)

        for ws in disconnected:
            self.disconnect_ws(ws)


server_manager = ServerManager()
