# Supabase Integration Guide

This document describes how Supabase has been integrated into the Orapa Mine backend project.

## What Was Done

### 1. Dependencies Added
- **supabase-py** (v2.22.3): Official Python client for Supabase
  - Includes auth, storage, realtime, and PostgreSQL support
  - Automatically handles JWT tokens and API requests

### 2. Configuration Updates

**File: [app/config.py](app/config.py)**
Added Supabase-specific configuration fields:
- `supabase_url`: Your Supabase project URL
- `supabase_anon_key`: Public anonymous key for client-side operations
- `supabase_service_role_key`: Admin key that bypasses RLS (use with caution)
- `supabase_jwt_secret`: For JWT token verification
- `postgres_url`: Connection string for pooled connections
- `postgres_prisma_url`: Alternative pooled connection string
- `postgres_url_non_pooling`: Direct connection string (for migrations)

All values are automatically loaded from your `.env` file.

### 3. Supabase Client Module

**File: [app/supabase_client.py](app/supabase_client.py)**
Provides two client instances:

```python
from app.supabase_client import supabase, supabase_admin

# Regular client (respects Row Level Security policies)
response = supabase.table('users').select('*').execute()

# Admin client (bypasses RLS - use carefully!)
response = supabase_admin.table('users').select('*').execute()
```

**Key Features:**
- Lazy initialization with `@lru_cache()` for performance
- Two client types: regular (anon key) and admin (service role key)
- Proper error handling if credentials are missing

### 4. Database Connection

**File: [piccolo_conf.py](piccolo_conf.py)**
Updated to support Supabase PostgreSQL:
- Automatically uses `POSTGRES_URL_NON_POOLING` or `POSTGRES_URL` if available
- Falls back to local PostgreSQL if Supabase env vars not set
- Works seamlessly with existing Piccolo ORM models and migrations

## How to Use

### Using the Supabase Client

```python
from app.supabase_client import supabase

# Query data
response = supabase.table('games').select('*').execute()
games = response.data

# Insert data
response = supabase.table('games').insert({
    'name': 'My Game',
    'status': 'active'
}).execute()

# Authentication
response = supabase.auth.sign_in_with_password({
    'email': 'user@example.com',
    'password': 'password123'
})

# Storage
response = supabase.storage.from_('avatars').upload('user-1.png', file_bytes)
```

### Using the Database with Piccolo ORM

Your existing Piccolo models continue to work unchanged:

```python
from app.models import User, Game

# All your existing code works the same
users = await User.select().where(User.is_active == True)
```

## Environment Variables

Ensure these are set in your `.env` file (already configured):

```env
# Supabase URLs and Keys
SUPABASE_URL=https://yyqrcbzunuwglnlxnnxg.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_JWT_SECRET=/BQpYRZ/RY/dYIlHpXRb09n8p21jDZaPm7N1RYFDNcfo...

# Database Connection Strings
POSTGRES_URL=postgres://postgres.yyqrcbzunuwglnlxnnxg:password@aws...
POSTGRES_URL_NON_POOLING=postgres://postgres.yyqrcbzunuwglnlxnnxg:password@aws...
```

## Testing

Run the integration test to verify everything works:

```bash
uv run python test_supabase.py
```

This will test:
- Configuration loading
- Supabase client initialization
- Database connection to Supabase PostgreSQL

## Next Steps

### 1. Authentication Integration
You can now implement user authentication using Supabase Auth:
- Sign up / Sign in
- Password reset
- OAuth providers (Google, GitHub, etc.)
- JWT token verification

### 2. Real-time Features
Use Supabase Realtime for live updates:
```python
supabase.channel('game-updates').on('postgres_changes', callback).subscribe()
```

### 3. File Storage
Store game assets, user avatars, etc. using Supabase Storage:
```python
supabase.storage.from_('game-assets').upload('map.png', file_data)
```

### 4. Row Level Security (RLS)
Set up RLS policies in your Supabase dashboard to control data access at the database level.

## Architecture Notes

- **Dual Connection Support**: The project now supports both local PostgreSQL (for development) and Supabase PostgreSQL (for production)
- **Piccolo ORM**: Continues to work as your primary ORM for database operations
- **Supabase Client**: Use for Supabase-specific features (auth, storage, realtime)
- **Backward Compatible**: All existing code continues to work without changes

## Resources

- [Supabase Python Docs](https://supabase.com/docs/reference/python/introduction)
- [Supabase Dashboard](https://supabase.com/dashboard)
- [Piccolo ORM Docs](https://piccolo-orm.readthedocs.io/)
