import os
import sqlite3
from backend.app.config import settings

# Use a separate test db path
settings.DB_PATH = "test_pel_app.db"

from backend.app.database import init_db, get_db_connection

def test_database_initialization():
    if os.path.exists(settings.DB_PATH):
        os.remove(settings.DB_PATH)
    
    init_db()
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Verify tables exist
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='tickets'")
    assert cursor.fetchone() is not None
    
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='experts'")
    assert cursor.fetchone() is not None
    
    # Verify seeded experts
    cursor.execute("SELECT COUNT(*) FROM experts")
    assert cursor.fetchone()[0] == 3
    
    conn.close()
    os.remove(settings.DB_PATH)
