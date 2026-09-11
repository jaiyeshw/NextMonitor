import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "nexmonitor.db")
SQLALCHEMY_DATABASE_URL = f"sqlite:///{DB_PATH}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def auto_migrate_db():
    import sqlite3
    try:
        if os.path.exists(DB_PATH):
            conn = sqlite3.connect(DB_PATH)
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(alert_settings)")
            columns = [row[1] for row in cursor.fetchall()]
            if columns and "sound_enabled" not in columns:
                cursor.execute("ALTER TABLE alert_settings ADD COLUMN sound_enabled BOOLEAN DEFAULT 1")
                conn.commit()
            conn.close()
    except Exception:
        pass

# Run auto migration on import
auto_migrate_db()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
