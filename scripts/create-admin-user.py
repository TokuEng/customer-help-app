#!/usr/bin/env python3
"""
Create a default admin user for testing
"""

import asyncio
import asyncpg
import sys
import os
from pathlib import Path
from dotenv import load_dotenv

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.append(str(project_root))

# Load environment variables from the api .env file
env_path = project_root / "apps" / "api" / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    print(f"Warning: {env_path} not found. Make sure environment variables are set.")

from apps.api.core.settings import settings
from apps.api.services.auth import AuthService, UserCreate

async def create_admin_user():
    """Create a default admin user"""
    
    print("Creating default admin user...")
    
    # Create database pool
    pool = await asyncpg.create_pool(settings.database_url)
    auth_service = AuthService(pool)
    
    try:
        # Check if user already exists
        async with pool.acquire() as conn:
            existing_user = await conn.fetchrow("""
                SELECT id, email FROM admin_users WHERE email = $1
            """, "admin@toku.com")
            
            if existing_user:
                print("✅ Admin user already exists!")
                print(f"   Email: {existing_user['email']}")
                print(f"   User ID: {existing_user['id']}")
                return
        
        # Create admin user
        user_data = UserCreate(
            email="admin@toku.com",
            username="admin",
            password="TokuAdmin2025",  # Change this in production!
            full_name="Admin User",
            role="superadmin"  # Using superadmin role
        )
        
        user = await auth_service.create_user(user_data)
        
        print(f"✅ Created admin user:")
        print(f"   Email: admin@toku.com")
        print(f"   Username: admin")
        print(f"   Password: TokuAdmin2025")
        print(f"   User ID: {user['id']}")
        print("\n⚠️  IMPORTANT: Change the password in production!")
        
    except Exception as e:
        print(f"❌ Error creating admin user: {e}")
        import traceback
        traceback.print_exc()
    finally:
        await pool.close()

if __name__ == "__main__":
    asyncio.run(create_admin_user())
