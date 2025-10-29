"""
Piccolo configuration file.
"""

import os

from dotenv import load_dotenv
from piccolo.conf.apps import AppRegistry
from piccolo.engine.postgres import PostgresEngine

# Load environment variables
load_dotenv()

# Check if Supabase connection should be used
postgres_url = os.getenv("POSTGRES_URL_NON_POOLING") or os.getenv("POSTGRES_URL")

if postgres_url:
    # Use Supabase connection URL
    DB = PostgresEngine(config={"dsn": postgres_url})
else:
    # Fallback to local PostgreSQL
    DB = PostgresEngine(
        config={
            "host": os.getenv("DATABASE_HOST", "localhost"),
            "port": int(os.getenv("DATABASE_PORT", 5432)),
            "user": os.getenv("DATABASE_USER", "orapa_user"),
            "password": os.getenv("DATABASE_PASSWORD", "orapa_pass"),
            "database": os.getenv("DATABASE_NAME", "orapa_mine"),
        }
    )

# A list of Piccolo apps
APP_REGISTRY = AppRegistry(
    apps=[
        "app.piccolo_app",
    ]
)
