"""
Test script to verify Supabase integration.
"""

import asyncio

from app.config import settings
from app.supabase_client import get_supabase_client
from piccolo_conf import DB


async def test_database_connection() -> None:
    """Test the Piccolo database connection to Supabase."""
    print("Testing Piccolo database connection...")
    try:
        await DB.start_connection_pool()
        # Run a simple query
        async with DB.pool.acquire() as conn:
            result = await conn.fetchrow("SELECT version()")
            version = result["version"]
        print("[OK] Database connected successfully")
        print(f"  PostgreSQL version: {version[:50]}...")
        await DB.close_connection_pool()
    except Exception as e:
        print(f"[ERROR] Database connection failed: {e}")
        raise


def test_supabase_client() -> None:
    """Test the Supabase client initialization."""
    print("\nTesting Supabase client...")
    try:
        client = get_supabase_client()
        print("[OK] Supabase client initialized successfully")
        print(f"  URL: {client.supabase_url}")
        print(f"  Has auth: {hasattr(client, 'auth')}")
        print(f"  Has storage: {hasattr(client, 'storage')}")
    except Exception as e:
        print(f"[ERROR] Supabase client initialization failed: {e}")
        raise


def test_config() -> None:
    """Test configuration loading."""
    print("\nTesting configuration...")
    print(f"[OK] App name: {settings.app_name}")
    print(f"[OK] Supabase URL: {settings.supabase_url}")
    print(f"[OK] Supabase anon key: {'*' * 20}...{settings.supabase_anon_key[-10:]}")
    print(f"[OK] Database URL configured: {'Yes' if settings.postgres_url else 'No'}")


async def main() -> None:
    """Run all tests."""
    print("=" * 60)
    print("Supabase Integration Test")
    print("=" * 60)

    test_config()
    test_supabase_client()
    await test_database_connection()

    print("\n" + "=" * 60)
    print("All tests passed!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(main())
