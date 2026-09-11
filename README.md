# NexMonitor

> **Real-Time Multi-Server Infrastructure Monitoring Dashboard**

NexMonitor is a full-stack, real-time infrastructure monitoring platform designed to provide centralized visibility into system and server telemetry.

It supports monitoring of the local machine, remote Linux servers through SSH, and remote Windows servers through WinRM. NexMonitor continuously collects system metrics, streams live telemetry to the dashboard, visualizes historical data, and provides configurable CPU-based audio and email alerts.

---

## ✨ Features

### 🖥️ Multi-Platform Monitoring

NexMonitor supports multiple server environments from a single dashboard.

- **Local Host**
  - Native system monitoring using `psutil`
  - No remote credentials required
  - Automatically configured on first startup

- **Linux Servers**
  - Agentless monitoring through SSH
  - Password authentication
  - SSH private-key authentication
  - Powered by Paramiko

- **Windows Servers**
  - Agentless monitoring through WinRM
  - HTTP / HTTPS support
  - NTLM authentication
  - Powered by `pywinrm`

---

### 📊 Real-Time System Telemetry

NexMonitor provides continuous visibility into system resources, including:

- CPU utilization
- Physical and logical CPU cores
- RAM utilization
- Total, used, and available memory
- Disk partitions and storage utilization
- Network upload/download throughput
- Cumulative network traffic
- NVIDIA GPU utilization
- GPU memory usage
- GPU temperature
- Top CPU-consuming processes
- Top memory-consuming processes
- PM2-managed application status
- PM2 process IDs
- PM2 restart counts
- PM2 uptime
- PM2 CPU and memory usage

Metrics are collected continuously and delivered to the dashboard in real time.

---

### ⚡ Real-Time Dashboard

The frontend provides a live monitoring interface with:

- Real-time server status
- Live metric cards
- Historical CPU charts
- Historical RAM charts
- Network traffic charts
- Server detail views
- Multi-server navigation
- Automatic WebSocket reconnection
- Responsive dark-themed interface
- Glassmorphic UI components

Telemetry is streamed through WebSockets to provide near real-time updates.

---

### 🚨 Multi-Channel Alerting

NexMonitor includes configurable alert mechanisms for CPU utilization.

#### CPU Threshold Alerts

Configure a CPU utilization threshold, for example:

```text
60%
```

When CPU usage exceeds the configured threshold, NexMonitor can trigger an alert.

#### 🔊 Browser Audio Alerts

The frontend includes a browser-based alert system with:

- Audio siren
- Voice notification
- Quick mute control

#### 📧 SMTP Email Alerts

NexMonitor can send email notifications through an SMTP server.

Configurable SMTP parameters include:

- SMTP host
- SMTP port
- SMTP username
- SMTP password
- Sender address
- Recipient address
- Alert cooldown period

A built-in SMTP connection test is also available from the dashboard.

---

### 🖧 Server Management

Servers can be managed directly from the dashboard.

Supported operations include:

- Add server
- Test server connection
- Edit server
- Delete server
- View server telemetry
- Monitor multiple nodes simultaneously

---

### 💾 Local Persistence

NexMonitor uses SQLite with SQLAlchemy for local persistence.

The application automatically creates its database when started without an existing database file.

This provides a zero-configuration experience without requiring PostgreSQL, MySQL, Redis, or another external database service.

---

# 🏗️ Architecture

```text
                         ┌─────────────────────────────┐
                         │       NexMonitor UI         │
                         │    Next.js + React + TS      │
                         │                             │
                         │  Dashboard / Charts / UI    │
                         └──────────────┬──────────────┘
                                        │
                         REST API + WebSocket
                                        │
                                        ▼
                         ┌─────────────────────────────┐
                         │       FastAPI Backend        │
                         │                             │
                         │   REST Routers + WebSocket  │
                         │      + Server Manager       │
                         └──────────────┬──────────────┘
                                        │
                         ┌──────────────┴──────────────┐
                         │                             │
                         ▼                             ▼
                ┌─────────────────┐          ┌─────────────────┐
                │ SQLite Database │          │ ServerManager   │
                │   + SQLAlchemy  │          │ Background Loops│
                └─────────────────┘          └────────┬────────┘
                                                      │
                          ┌───────────────────────────┼──────────────────────────┐
                          │                           │                          │
                          ▼                           ▼                          ▼
                 ┌────────────────┐         ┌────────────────┐         ┌─────────────────┐
                 │ LocalCollector │         │ LinuxCollector │         │ WindowsCollector│
                 │    (psutil)    │         │ SSH / Paramiko │         │ WinRM / pywinrm │
                 └────────────────┘         └────────────────┘         └─────────────────┘
```

### Data Flow

1. The **Next.js frontend** provides the monitoring dashboard.
2. The frontend communicates with the FastAPI backend through REST APIs.
3. Live telemetry is delivered through a WebSocket connection.
4. The **ServerManager** maintains monitoring loops for registered servers.
5. Specialized collectors gather telemetry according to the target operating system.
6. SQLAlchemy manages persistent server and alert configuration data in SQLite.
7. The backend evaluates CPU thresholds and dispatches configured alerts.

---

# 🛠️ Technology Stack

## Frontend

| Technology | Purpose |
|---|---|
| **Next.js 14** | React framework and application routing |
| **React 18** | User interface |
| **TypeScript** | Type-safe frontend development |
| **Tailwind CSS** | UI styling |
| **Recharts** | Telemetry visualization and charts |
| **Lucide React** | Interface icons |
| **WebSocket API** | Real-time telemetry streaming |
| **Web Audio API** | Browser audio alerts |

## Backend

| Technology | Purpose |
|---|---|
| **Python 3.10+** | Backend runtime |
| **FastAPI** | REST API and WebSocket backend |
| **Uvicorn** | ASGI server |
| **SQLAlchemy 2** | ORM and database management |
| **SQLite** | Local persistence |
| **Pydantic 2** | Data validation |
| **Paramiko** | SSH-based Linux monitoring |
| **pywinrm** | Windows WinRM monitoring |
| **psutil** | Local system telemetry |
| **WebSockets** | Real-time metric streaming |

---

# 📁 Project Structure

```text
NexMonitor/
│
├── backend/
│   ├── app/
│   │   ├── collector/
│   │   │   ├── __init__.py
│   │   │   ├── base.py
│   │   │   ├── linux.py
│   │   │   ├── local.py
│   │   │   └── windows.py
│   │   │
│   │   ├── routers/
│   │   │   ├── alerts.py
│   │   │   └── servers.py
│   │   │
│   │   ├── __init__.py
│   │   ├── database.py
│   │   ├── main.py
│   │   ├── manager.py
│   │   └── models.py
│   │
│   ├── requirements.txt
│   └── run.py
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css
│   │   │   ├── layout.tsx
│   │   │   ├── not-found.tsx
│   │   │   └── page.tsx
│   │   │
│   │   ├── components/
│   │   │   ├── AddServerModal.tsx
│   │   │   ├── AlertSettingsModal.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ServerCard.tsx
│   │   │   ├── ServerDetailView.tsx
│   │   │   └── Sidebar.tsx
│   │   │
│   │   ├── hooks/
│   │   │   └── useNexMonitor.ts
│   │   │
│   │   ├── lib/
│   │   │   ├── api.ts
│   │   │   └── audioAlert.ts
│   │   │
│   │   └── types/
│   │       └── monitor.ts
│   │
│   ├── next.config.js
│   ├── package.json
│   ├── package-lock.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   └── tsconfig.json
│
├── .gitignore
└── README.md
```

---

# 🚀 Getting Started

## Prerequisites

Make sure the following are installed:

- **Python 3.10 or newer**
- **Node.js 18 or newer**
- **npm 9 or newer**

Verify your installations:

```bash
python --version
node --version
npm --version
```

---

# ⚙️ Installation

## 1. Clone the Repository

```bash
git clone https://github.com/jaiyeshw/NextMonitor.git
cd NextMonitor
```

---

## 2. Backend Setup

Navigate to the backend:

```bash
cd backend
```

Create a Python virtual environment.

### Windows PowerShell

```powershell
python -m venv venv
.\venv\Scripts\Activate.ps1
```

### Linux / macOS

```bash
python3 -m venv venv
source venv/bin/activate
```

Install the backend dependencies:

```bash
pip install -r requirements.txt
```

---

## 3. Frontend Setup

Open a second terminal and navigate to the frontend:

```bash
cd frontend
```

Install dependencies:

```bash
npm install
```

---

# ▶️ Running NexMonitor

NexMonitor requires both the backend and frontend development servers.

## Start the Backend

From the project root:

```bash
cd backend
python run.py
```

The FastAPI backend will be available at:

```text
http://localhost:8000
```

The backend automatically creates the local SQLite database on first startup.

---

## Start the Frontend

In a separate terminal:

```bash
cd frontend
npm run dev
```

The dashboard will be available at:

```text
http://localhost:3000
```

Open the URL in your browser.

---

# 🔐 Demo Login

NexMonitor currently uses a client-side demonstration login for the dashboard.

### Demo Credentials

| Field | Value |
|---|---|
| **Username** | `admin` |
| **Password** | `admin123` |

> **Important:** These credentials are intended only for the built-in demo experience. They are not production-grade authentication credentials and should not be used as a security mechanism for a deployed production monitoring platform.

---

# 🖥️ First Run

On a fresh installation:

1. Start the backend.
2. NexMonitor automatically creates the SQLite database.
3. Required database tables are created automatically.
4. A safe **Local Host** monitoring node is created.
5. Local system telemetry begins collecting automatically.
6. Start the frontend.
7. Log in using the demo credentials.
8. The dashboard displays live local telemetry.
9. Remote Linux or Windows servers can then be added through the dashboard.

No database file needs to be downloaded or manually created.

---

# 🌐 Adding Remote Servers

## Linux

NexMonitor connects to Linux servers through SSH.

Typical configuration:

```text
Operating System: Linux
Protocol: SSH
Port: 22

Authentication:
    - Username + Password
    - SSH Private Key
```

The target Linux system must allow the configured SSH connection.

---

## Windows

NexMonitor connects to Windows systems through WinRM.

Typical configuration:

```text
Operating System: Windows
Protocol: WinRM

HTTP Port: 5985
HTTPS Port: 5986

Authentication: NTLM
```

WinRM must be enabled and configured on the target Windows machine.

For example:

```powershell
winrm quickconfig
```

> Only connect NexMonitor to systems you own or are explicitly authorized to monitor.

---

# 🚨 Alert Configuration

Alert configuration is available through the dashboard's alert settings interface.

## CPU Threshold

Configure the CPU utilization threshold that triggers an alert.

Example:

```text
CPU Threshold: 60%
```

## Audio Alerts

The browser-based alert system can provide:

- Voice notification
- Audio siren
- Quick mute control

## Email Alerts

SMTP configuration supports:

```text
SMTP Host
SMTP Port
SMTP Username
SMTP Password
From Email
To Email
Cooldown Period
```

A test email feature is available to verify SMTP configuration.

### Security Recommendation

Never commit SMTP credentials or other secrets to Git.

All user-specific server credentials and alert configuration are stored in the local database, which is intentionally excluded from version control.

---

# 💾 Database

NexMonitor uses a local SQLite database:

```text
backend/nexmonitor.db
```

The database is generated automatically when the backend starts.

The database stores application-specific configuration such as:

- Monitored server configuration
- Server authentication information
- Alert settings
- SMTP configuration

### Git Security

Database files are intentionally excluded from the repository through `.gitignore`.

```text
*.db
*.sqlite
*.sqlite3
```

This prevents local server credentials and infrastructure configuration from being accidentally published.

**Never commit your local NexMonitor database to a public repository.**

---

# 🔄 Real-Time Monitoring

NexMonitor uses WebSockets for continuous telemetry delivery.

The monitoring flow is approximately:

```text
Target Server
     │
     ▼
Collector
     │
     ▼
ServerManager
     │
     ▼
FastAPI WebSocket
     │
     ▼
Next.js Frontend
     │
     ▼
Live Dashboard
```

The frontend maintains a WebSocket connection and includes automatic reconnection behavior when the connection is interrupted.

---

# 📈 Monitoring Components

### LocalCollector

Uses `psutil` and native system capabilities to collect telemetry from the machine running NexMonitor.

### LinuxCollector

Uses SSH and remote shell commands to collect telemetry from Linux systems.

### WindowsCollector

Uses WinRM and PowerShell/CIM-based commands to collect Windows telemetry.

### ServerManager

Maintains background monitoring loops for configured servers and coordinates telemetry collection and alert processing.

---

# 🔒 Security Considerations

NexMonitor is designed for authorized infrastructure monitoring.

Users are responsible for protecting:

- SSH passwords
- SSH private keys
- Windows credentials
- SMTP passwords
- Server addresses
- Local database files

### Recommended Practices

- Never commit `*.db` files.
- Never commit `.env` files containing secrets.
- Never commit SSH private keys.
- Use strong credentials for monitored systems.
- Use HTTPS/secure transport where appropriate.
- Restrict WinRM/SSH access using appropriate firewall rules.
- Monitor only systems you are authorized to access.

---

# 🧪 Build & Validation

Frontend production builds can be generated with:

```bash
cd frontend
npm run build
```

The project has been validated with:

- Fresh SQLite database initialization
- Automatic Local Host provisioning
- Backend lifecycle startup/shutdown
- Frontend TypeScript validation
- Next.js production build
- REST API configuration
- WebSocket configuration
- Secret and infrastructure-data scanning

---

# 🗺️ Roadmap

Potential future improvements include:

- Role-based authentication
- Secure credential management
- Encrypted credential storage
- User management
- Historical metric persistence
- Advanced alert rules
- Additional notification channels
- Container monitoring
- Cloud infrastructure monitoring
- Service health checks
- Monitoring dashboards and reports

---

# 🤝 Contributing

Contributions and improvements are welcome.

A typical workflow is:

```bash
git clone https://github.com/jaiyeshw/NextMonitor.git
cd NextMonitor
```

Create a feature branch:

```bash
git checkout -b feature/your-feature
```

Make your changes, test them, and submit a pull request.

Please ensure that no credentials, private keys, database files, or other sensitive information are included in commits.

---

# ⚠️ Disclaimer

NexMonitor is intended for monitoring systems and infrastructure that you own or have explicit authorization to access.

Do not use NexMonitor to access, monitor, or collect information from unauthorized systems.

You are responsible for complying with applicable security policies, laws, regulations, and authorization requirements.

---

## 📄 License

NexMonitor is licensed under the **MIT License**.

```text
MIT License

Copyright (c) 2026 Jaiyesh Wadhwa

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
  Built with FastAPI, Next.js, React, TypeScript, SQLAlchemy, and Python.
</p>
