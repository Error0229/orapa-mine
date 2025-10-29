"""
Supabase client initialization and utilities.
"""

from functools import lru_cache

from supabase import Client, create_client

from app.config import settings


@lru_cache()
def get_supabase_client() -> Client:
    """
    Create and cache Supabase client instance.

    Returns:
        Client: Initialized Supabase client with anon key.
    """
    if not settings.supabase_url or not settings.supabase_anon_key:
        raise ValueError(
            "Supabase configuration missing. "
            "Please set SUPABASE_URL and SUPABASE_ANON_KEY environment variables."
        )

    return create_client(settings.supabase_url, settings.supabase_anon_key)


@lru_cache()
def get_supabase_admin_client() -> Client:
    """
    Create and cache Supabase admin client with service role key.

    This client bypasses Row Level Security (RLS) policies.
    Use with caution and only for admin operations.

    Returns:
        Client: Initialized Supabase client with service role key.
    """
    if not settings.supabase_url or not settings.supabase_service_role_key:
        raise ValueError(
            "Supabase admin configuration missing. "
            "Please set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables."
        )

    return create_client(settings.supabase_url, settings.supabase_service_role_key)


# Convenience instances
supabase: Client = get_supabase_client()
supabase_admin: Client = get_supabase_admin_client()
