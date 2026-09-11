import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base, SessionLocal
from app.models import ServerModel
from app.routers import servers, alerts
from app.manager import server_manager

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("nexmonitor")

# Create DB tables
Base.metadata.create_all(bind=engine)

@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("Initializing NexMonitor backend...")
    db = SessionLocal()
    try:
        existing_servers = db.query(ServerModel).all()
        if not existing_servers:
            # Auto-seed LocalHost server for instant demo
            default_server = ServerModel(
                name="Local Host",
                hostname="127.0.0.1",
                os_type="local",
                port=0,
                auth_type="password",
                username="local",
                password=""
            )
            db.add(default_server)
            db.commit()
            db.refresh(default_server)
            existing_servers = [default_server]
            logger.info("Added default Local Host server to DB.")

        for server in existing_servers:
            server_manager.start_server_loop(server)
    finally:
        db.close()

    yield

    logger.info("Shutting down NexMonitor backend...")
    for server_id in list(server_manager.tasks.keys()):
        server_manager.stop_server_loop(server_id)

app = FastAPI(title="NexMonitor API", version="1.0.0", lifespan=lifespan)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(servers.router)
app.include_router(alerts.router)

@app.websocket("/ws/metrics")
async def websocket_endpoint(websocket: WebSocket):
    await server_manager.connect_ws(websocket)
    try:
        while True:
            # Keep websocket open and listen for client messages (e.g. ping/heartbeat)
            data = await websocket.receive_text()
    except WebSocketDisconnect:
        server_manager.disconnect_ws(websocket)
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
        server_manager.disconnect_ws(websocket)

@app.get("/")
def read_root():
    return {"name": "NexMonitor API", "status": "running", "ws_endpoint": "/ws/metrics"}
