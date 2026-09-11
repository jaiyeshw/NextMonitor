import smtplib
import logging
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import AlertSettingModel, AlertSettingSchema

router = APIRouter(prefix="/api/alerts", tags=["alerts"])
logger = logging.getLogger("nexmonitor.alerts")


def get_or_create_alert_settings(db: Session) -> AlertSettingModel:
    settings = db.query(AlertSettingModel).first()
    if not settings:
        settings = AlertSettingModel(
            enabled=True,
            cpu_threshold_percent=60.0,
            smtp_host="smtp.gmail.com",
            smtp_port=587,
            smtp_user="",
            smtp_password="",
            from_email="",
            to_email="",
            cooldown_minutes=5,
        )
        db.add(settings)
        db.commit()
        db.refresh(settings)
    return settings


@router.get("/settings", response_model=AlertSettingSchema)
def get_alert_settings(db: Session = Depends(get_db)):
    return get_or_create_alert_settings(db)


@router.put("/settings", response_model=AlertSettingSchema)
def update_alert_settings(payload: AlertSettingSchema, db: Session = Depends(get_db)):
    settings = get_or_create_alert_settings(db)
    
    settings.enabled = payload.enabled
    settings.sound_enabled = payload.sound_enabled
    settings.cpu_threshold_percent = payload.cpu_threshold_percent
    settings.smtp_host = payload.smtp_host
    settings.smtp_port = payload.smtp_port
    settings.smtp_user = payload.smtp_user
    settings.smtp_password = payload.smtp_password
    settings.from_email = payload.from_email
    settings.to_email = payload.to_email
    settings.cooldown_minutes = payload.cooldown_minutes

    db.commit()
    db.refresh(settings)
    return settings


@router.post("/test")
def send_test_email(payload: AlertSettingSchema):
    recipients = [e.strip() for e in str(payload.to_email or "").replace(';', ',').replace('\n', ',').split(',') if e.strip()]
    if not recipients:
        raise HTTPException(status_code=400, detail="At least one recipient email address is required for testing.")
    if not payload.smtp_host or not payload.smtp_user or not payload.smtp_password:
        raise HTTPException(status_code=400, detail="SMTP Host, User, and Password are required.")

    try:
        formatted_time = time.strftime('%d %b %Y, %I:%M:%S %p')
        sender = payload.from_email or payload.smtp_user

        msg = MIMEMultipart("alternative")
        msg["From"] = f"NexMonitor <{sender}>"
        msg["To"] = ", ".join(recipients)
        msg["Subject"] = "✅ [NexMonitor] SMTP Alert Configuration Verified"

        # Plain text fallback
        plain_text = f"""NexMonitor - SMTP Test Notification
Status: Verified & Operational

SMTP Host: {payload.smtp_host}:{payload.smtp_port}
CPU Threshold: {payload.cpu_threshold_percent}%
Timestamp: {formatted_time}

Your SMTP configuration is active and ready to deliver real-time server telemetry alerts.

--
NexMonitor Telemetry System
"""

        # Professional Styled HTML Test Email
        html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NexMonitor SMTP Test</title>
</head>
<body style="margin: 0; padding: 0; background-color: #070a12; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #070a12; padding: 30px 10px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 580px; background: #0f172a; border: 1px solid #1e293b; border-radius: 16px; overflow: hidden; box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7);" cellspacing="0" cellpadding="0">
          
          <!-- Top Gradient Accent Bar -->
          <tr>
            <td height="4" style="background: linear-gradient(90deg, #10b981 0%, #06b6d4 50%, #3b82f6 100%); font-size: 0; line-height: 0;">&nbsp;</td>
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
                      SMTP Alert Verification
                    </div>
                  </td>
                  <td align="right" valign="top">
                    <!-- Healthy Badge -->
                    <span style="display: inline-block; padding: 6px 14px; background-color: rgba(16, 185, 129, 0.15); border: 1px solid rgba(16, 185, 129, 0.4); border-radius: 9999px; color: #34d399; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px;">
                      ● Connected & Active
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

          <!-- Verification Box -->
          <tr>
            <td style="padding: 24px 32px 10px 32px;">
              <div style="background: linear-gradient(135deg, rgba(16, 185, 129, 0.12) 0%, rgba(15, 23, 42, 0.9) 100%); border-radius: 12px; padding: 20px; border: 1px solid rgba(16, 185, 129, 0.35);">
                <div style="font-size: 15px; font-weight: 700; color: #34d399; margin-bottom: 6px;">
                  🎉 Success! Email Alert Engine is Operational
                </div>
                <div style="font-size: 12px; color: #94a3b8; line-height: 1.6;">
                  Your SMTP credentials have been successfully authenticated. Real-time CPU spike notifications and critical telemetry alerts will be delivered seamlessly.
                </div>
              </div>
            </td>
          </tr>

          <!-- Configuration Details Grid -->
          <tr>
            <td style="padding: 10px 32px 24px 32px;">
              <table width="100%" cellspacing="0" cellpadding="0" style="background-color: #1e293b; border-radius: 12px; padding: 16px 20px; border: 1px solid #334155;">
                <tr>
                  <td>
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">SMTP Relay Server</div>
                    <div style="font-size: 14px; font-weight: 700; color: #ffffff; font-family: monospace; margin-top: 2px;">{payload.smtp_host}:{payload.smtp_port}</div>
                  </td>
                  <td align="right">
                    <div style="font-size: 11px; font-weight: 600; color: #94a3b8; text-transform: uppercase;">Configured Trigger Limit</div>
                    <div style="font-size: 14px; font-weight: 700; color: #f59e0b; font-family: monospace; margin-top: 2px;">&gt; {payload.cpu_threshold_percent}% CPU</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #0b1120; padding: 20px 32px; border-top: 1px solid #1e293b; text-align: center;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.5;">
                This test verification was initiated from your <strong>NexMonitor Dashboard</strong> at {formatted_time}.<br>
                Please do not reply directly to this automated email.
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

        server = smtplib.SMTP(payload.smtp_host, payload.smtp_port, timeout=10)
        server.starttls()
        server.login(payload.smtp_user, payload.smtp_password)
        server.sendmail(sender, recipients, msg.as_string())
        server.quit()

        return {"success": True, "message": f"Test email sent successfully to {len(recipients)} recipient(s)!"}
    except Exception as e:
        logger.error(f"Failed to send test email: {str(e)}")
        raise HTTPException(status_code=500, detail=f"SMTP Error: {str(e)}")
