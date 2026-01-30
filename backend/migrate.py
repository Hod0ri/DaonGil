import asyncio
import sys
import os
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine

# Add the parent directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from app.core.config import settings
from app.db.base import Base

async def run_migrations():
    print("Starting database migration...")
    
    # Try to connect using settings (likely 'db' host if in docker)
    # If running from host, we might need 'localhost'.
    
    db_url = f"postgresql+asyncpg://{settings.POSTGRES_USER}:{settings.POSTGRES_PASSWORD}@{settings.POSTGRES_SERVER}/{settings.POSTGRES_DB}"
    
    # Fallback mechanism: if settings say 'db' but we are on host without /etc/hosts entry, 
    # we might want to try localhost if the first one fails.
    # But for simplicity, let's just try the configured one first.
    
    try:
        await execute_migration(db_url)
    except Exception as e:
        print(f"Connection to {settings.POSTGRES_SERVER} failed: {e}")
        if settings.POSTGRES_SERVER != 'localhost':
            print("Retrying with localhost...")
            local_url = db_url.replace(f"@{settings.POSTGRES_SERVER}/", "@localhost/")
            try:
                await execute_migration(local_url)
            except Exception as e2:
                print(f"Migration failed on localhost too: {e2}")
                sys.exit(1)
        else:
            sys.exit(1)

async def execute_migration(url):
    engine = create_async_engine(url, echo=True)
    async with engine.begin() as conn:
        print(f"Connected to database at {url.split('@')[1]}")
        
        # 1. Create tables if they don't exist (e.g. places, memories)
        print("Creating missing tables...")
        await conn.run_sync(Base.metadata.create_all)
        
        # 2. Add columns to users table if missing (ALTER TABLE)
        print("Checking/Updating users table schema...")
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS emoji VARCHAR"))
        await conn.execute(text("ALTER TABLE users ADD COLUMN IF NOT EXISTS first_meeting_date DATE"))
        
        print("Checking/Updating places table schema...")
        await conn.execute(text("ALTER TABLE places ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))

        print("Checking/Updating memories table schema...")
        await conn.execute(text("ALTER TABLE memories ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()"))
        await conn.execute(text("ALTER TABLE memories ADD COLUMN IF NOT EXISTS images JSON DEFAULT '[]'"))

        print("Checking/Updating notifications table schema...")
        await conn.execute(text("ALTER TABLE notifications ADD COLUMN IF NOT EXISTS related_id INTEGER"))
        
        # 3. Clean up old columns from places if they exist (visit_dates, note) - Optional but good for hygiene
        # We won't drop them strictly to avoid data loss during dev, but we are moving to 'memories' table.
        # Actually, for this task, let's just make sure 'memories' table is created. create_all does that.

        
    print("Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(run_migrations())
