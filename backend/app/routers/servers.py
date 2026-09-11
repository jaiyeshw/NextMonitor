from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.database import get_db
from app.models import ServerModel, ServerCreate, ServerUpdate, ServerResponse, SystemMetrics
from app.manager import server_manager

router = APIRouter(prefix="/api/servers", tags=["servers"])

@router.get("", response_model=List[ServerResponse])
def get_servers(db: Session = Depends(get_db)):
    return db.query(ServerModel).all()

@router.post("", response_model=ServerResponse, status_code=status.HTTP_201_CREATED)
async def create_server(server_in: ServerCreate, db: Session = Depends(get_db)):
    db_server = ServerModel(**server_in.model_dump())
    db.add(db_server)
    db.commit()
    db.refresh(db_server)
    
    # Start background monitoring loop for new server
    server_manager.start_server_loop(db_server)
    return db_server

@router.get("/{server_id}", response_model=ServerResponse)
def get_server(server_id: int, db: Session = Depends(get_db)):
    db_server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")
    return db_server

@router.put("/{server_id}", response_model=ServerResponse)
async def update_server(server_id: int, server_in: ServerUpdate, db: Session = Depends(get_db)):
    db_server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    update_data = server_in.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_server, field, value)

    db.commit()
    db.refresh(db_server)

    # Restart monitoring loop with updated details
    server_manager.restart_server_loop(db_server)
    return db_server

@router.delete("/{server_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_server(server_id: int, db: Session = Depends(get_db)):
    db_server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    server_manager.stop_server_loop(server_id)
    server_manager.latest_metrics.pop(server_id, None)

    db.delete(db_server)
    db.commit()
    return None

@router.post("/test")
async def test_server_connection(server_in: ServerCreate):
    temp_server = ServerModel(**server_in.model_dump(), id=0)
    collector = server_manager.get_collector(temp_server)
    success, message = await collector.test_connection()
    return {"success": success, "message": message}

@router.post("/{server_id}/test")
async def test_existing_server_connection(server_id: int, db: Session = Depends(get_db)):
    db_server = db.query(ServerModel).filter(ServerModel.id == server_id).first()
    if not db_server:
        raise HTTPException(status_code=404, detail="Server not found")

    collector = server_manager.get_collector(db_server)
    success, message = await collector.test_connection()
    return {"success": success, "message": message}

@router.get("/{server_id}/metrics", response_model=SystemMetrics)
def get_latest_metrics(server_id: int):
    metrics = server_manager.latest_metrics.get(server_id)
    if not metrics:
        raise HTTPException(status_code=404, detail="Metrics not available yet")
    return metrics
