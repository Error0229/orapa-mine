"""
Piccolo configuration file.
"""
from piccolo.conf.apps import AppRegistry
from piccolo.engine.postgres import PostgresEngine
from dotenv import load_dotenv
import os

# Load environment variables
load_dotenv()

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
