# NexMonitor

NexMonitor is a high-performance, real-time multi-server monitoring dashboard designed for full-stack system and infrastructure telemetry. It provides live streaming metrics, automated alerting, and multi-platform node management across local machines, remote Linux servers (via SSH), and remote Windows servers (via WinRM).

---

## Features

- **Multi-Platform Server Monitoring**:
  - **Local Host**: Direct native OS telemetry via `psutil`.
  - **Linux Servers**: Remote agentless monitoring over SSH using Paramiko (password or SSH private key authentication).
  - **Windows Servers**: Remote agentless monitoring over WinRM using `pywinrm` (HTTP / HTTPS NTLM authentication).
- **Live Hardware Telemetry**:
  - **CPU**: Real-time core utilization percentage and physical/logical core counts.
  - **Memory (RAM)**: Total, used, free memory, and utilization percentages.
  - **Disk Storage**: Partition mounts, total capacity, free space, and usage percentages.
  - **Network I/O**: Real-time upload and download throughput rates (bytes/sec) and cumulative data transfer.
  - **GPU Acceleration**: NVIDIA GPU metrics (utilization percentage, VRAM usage, temperature) when available.
- **Process & Service Tracking**:
  - **Top Processes**: Live ranking of top resource-consuming processes by CPU and memory usage.
  - **PM2 Microservices**: Real-time status, process IDs, restart counts, uptime, and CPU/memory usage for PM2 managed applications.
- **Real-Time Dashboard**:
  - WebSocket-based bidirectional telemetry streaming (`/ws/metrics`) for 1-second refresh rates.
  - Historical metric charts powered by Recharts (CPU, RAM, and Network transfer history).
  - Dark-mode glassmorphic interface built with Next.js and Tailwind CSS.
- **Multi-Channel Alerting System**:
  - **CPU Spike Detection**: Configurable utilization threshold (e.g., > 60%) and alert cooldown periods.
  - **Browser Audio Siren**: Real-time synthesized speech alert and audio siren with a quick-mute toggle.
  - **SMTP Email Notifications**: Automated incident dispatch with responsive HTML email templates and connection testing.
- **Server CRUD Management**: Add, test, edit, and delete monitored server nodes directly from the UI.
- **Local Persistence**: Zero-configuration local storage using SQLite and SQLAlchemy.

---

## Tech Stack

### Backend
- **Language & Runtime**: Python 3.10+
- **Framework**: FastAPI (Asynchronous REST API & WebSockets)
- **ASGI Server**: Uvicorn
- **ORM & Database**: SQLAlchemy with SQLite
- **Remote Connectors**:
  - Paramiko (SSH & SFTP for Linux nodes)
  - pywinrm (Windows Remote Management)
  - psutil (Native host telemetry)
- **Validation**: Pydantic v2

### Frontend
- **Framework**: Next.js 14 (App Router)
- **UI Library**: React 18
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Charts & Visualizations**: Recharts
- **Icons**: Lucide React

---

## Architecture

```
┌────────────────────────────────────────────────────────┐
│                   Next.js Frontend                     │
│   (Dashboard, Charts, Alerts Modal, Web Audio Siren)   │
└───────────────┬────────────────────────▲───────────────┘
                │ REST (CRUD / Settings) │ WebSocket (/ws/metrics)
                ▼                        │
┌────────────────────────────────────────────────────────┐
│                   FastAPI Backend                      │
│   (Uvicorn ASGI Server, WebSocket Manager, Routers)    │
└───────────────┬────────────────────────────────────────┘
                │
        ┌───────┴───────────────┐
        ▼                       ▼
┌───────────────┐       ┌───────────────┐
│  SQLAlchemy   │       │ ServerManager │
│ SQLite Engine │       │  Event Loops  │
└───────────────┘       └───────┬───────┘
                                │
        ┌───────────────────────┼───────────────────────┐
        ▼                       ▼                       ▼
┌────────────────┐      ┌────────────────┐      ┌────────────────┐
│ LocalCollector │      │ LinuxCollector │      │WindowsCollector│
│    (psutil)    │      │  (SSH / Bash)  │      │(WinRM / CIM-PS)│
└────────────────┘      └────────────────┘      └────────────────┘
```

1. **Frontend**: Next.js client renders real-time telemetry charts and communicates with the backend via REST and WebSockets.
2. **Backend**: FastAPI routes handle server management and alert configuration.
3. **Engine**: `ServerManager` maintains dedicated background asyncio monitoring loops for each registered server node.
4. **Collectors**: Specialized collectors gather metrics every second and broadcast updates through WebSockets.

---

## Project Structure

```
NexMonitor/
├── backend/
│   ├── app/
│   │   ├── collector/
│   │   │   ├── base.py           # Abstract BaseCollector class
│   │   │   ├── linux.py          # SSH Linux telemetry collector
│   │   │   ├── local.py          # Native psutil collector
│   │   │   └── windows.py        # WinRM Windows telemetry collector
│   │   ├── routers/
│   │   │   ├── alerts.py         # Alert configuration & SMTP endpoints
│   │   │   └── servers.py        # Server CRUD & connection test endpoints
│   │   ├── database.py           # SQLite connection & session maker
│   │   ├── main.py               # FastAPI entrypoint, CORS & WebSocket handler
│   │   ├── manager.py            # ServerManager background loops & SMTP dispatcher
│   │   └── models.py             # SQLAlchemy models & Pydantic schemas
│   ├── requirements.txt          # Python dependencies
│   └── run.py                    # Backend server launcher
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css       # Global styles & theme definitions
│   │   │   ├── layout.tsx        # Root layout & page metadata
│   │   │   └── page.tsx          # Main telemetry dashboard
│   │   ├── components/
│   │   │   ├── AddServerModal.tsx
│   │   │   ├── AlertSettingsModal.tsx
│   │   │   ├── Header.tsx
│   │   │   ├── LoginPage.tsx
│   │   │   ├── ServerCard.tsx
│   │   │   ├── ServerDetailView.tsx
│   │   │   └── Sidebar.tsx
│   │   ├── hooks/
│   │   │   └── useNexMonitor.ts  # Real-time WebSocket hook & state management
│   │   ├── lib/
│   │   │   ├── api.ts            # REST API client
│   │   │   └── audioAlert.ts     # Web Audio API siren & voice synthesizer
│   │   └── types/
│   │       └── monitor.ts        # TypeScript data contracts
│   ├── next.config.js            # Next.js configuration & API proxy rewrite
│   ├── package.json              # Frontend dependencies and scripts
│   ├── tailwind.config.js        # Tailwind CSS styling tokens
│   └── tsconfig.json             # TypeScript configuration
├── .gitignore                    # Git ignore rules for DB, dependencies & secrets
└── README.md                     # Project documentation
```

---

## Prerequisites

- **Python**: 3.10 or higher
- **Node.js**: 18.0.0 or higher
- **npm**: 9.0.0 or higher

---

## Installation

### 1. Backend Setup

```bash
cd backend

# Create virtual environment
python -m venv venv

# Activate virtual environment
# Windows (PowerShell):
.\venv\Scripts\Activate.ps1
# Linux / macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

### 2. Frontend Setup

```bash
cd ../frontend

# Install dependencies
npm install
```

---

## Running NexMonitor

### 1. Start the Backend

In your backend terminal:

```bash
cd backend
python run.py
```

The FastAPI backend will start on **`http://localhost:8000`**. On first startup, the local SQLite database is automatically generated.

### 2. Start the Frontend

In your frontend terminal:

```bash
cd frontend
npm run dev
```

Open **`http://localhost:3000`** in your browser to access the NexMonitor dashboard.

---

## First Run & Default State

When launched for the first time on a clean installation:
1. NexMonitor automatically initializes the database tables.
2. A default **`Local Host`** server node (`127.0.0.1`) is seeded automatically to provide instant local system telemetry.
3. You can immediately add remote Linux or Windows servers by clicking **"Add Server"** in the top navigation bar.

---

## Remote Server Monitoring Setup

### Linux (SSH)
- **Port**: Default `22`
- **Authentication**:
  - **Password**: Standard SSH username and password.
  - **SSH Key**: Private key in PEM / OpenSSH format (RSA, Ed25519, ECDSA).

### Windows (WinRM)
- **Port**: `5985` (HTTP) or `5986` (HTTPS)
- **Authentication**: Windows Administrator credentials over NTLM.
- **Prerequisite**: WinRM must be enabled on the target Windows machine (`winrm quickconfig`).

---

## Alerts Configuration

Click the **Bell Icon** in the top navigation bar to open the **Alert Settings Modal**:
- **CPU Threshold**: Set the CPU percentage limit (default: `60%`) that triggers an alert.
- **Audio Siren**: Toggle browser voice and siren alerts.
- **SMTP Relay**: Configure your SMTP server host, port, username, password, sender address, and recipient address.
- **Connection Test**: Use the **"Send Test Email"** button to verify SMTP settings before saving.

---

## Database & Security

- **Local Persistence**: NexMonitor stores server configurations and alert preferences in a local SQLite file (`backend/nexmonitor.db`).
- **Zero Remote Exposure**: The SQLite database file is intentionally excluded via `.gitignore` to ensure credentials and private hostnames are never committed to version control.
- **Credential Storage**: Passwords and keys are stored strictly on your local machine for polling target servers.

---

## Disclaimer

NexMonitor is intended for monitoring systems and infrastructure that you own or have explicit authorization to access. Never connect to or monitor unauthorized networks, and keep all connection credentials confidential.
