"""
Authentication service for admin users
Handles login, session management, and token validation
"""

from datetime import datetime, timedelta, timezone
from typing import Optional, Dict, Any
import secrets
import hashlib
import bcrypt
import asyncpg
from fastapi import HTTPException, Request, Depends, Header
from pydantic import BaseModel, EmailStr

# Try both import paths
try:
    from core.settings import settings
except ImportError:
    from apps.api.core.settings import settings


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class LoginResponse(BaseModel):
    token: str
    user: Dict[str, Any]
    expires_at: datetime


class UserCreate(BaseModel):
    email: EmailStr
    username: str
    password: str
    full_name: Optional[str] = None
    role: str = "admin"


class AuthService:
    """Handles admin authentication and session management"""
    
    def __init__(self, db_pool: asyncpg.Pool):
        self.db_pool = db_pool
        self.session_duration = timedelta(hours=24)  # Sessions last 24 hours
        self.max_login_attempts = 5
        self.lockout_duration = timedelta(minutes=15)
    
    async def login(self, email: str, password: str, request: Request) -> LoginResponse:
        """Authenticate user and create session"""
        
        # Check rate limiting
        await self._check_rate_limit(email, request.client.host)
        
        async with self.db_pool.acquire() as conn:
            # Get user
            user = await conn.fetchrow("""
                SELECT id, email, username, password_hash, full_name, role, is_active
                FROM admin_users
                WHERE email = $1
            """, email)
            
            if not user:
                # Log failed attempt
                await self._log_login_attempt(email, request.client.host, False)
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            if not user['is_active']:
                raise HTTPException(status_code=403, detail="Account is disabled")
            
            # Verify password
            if not self._verify_password(password, user['password_hash']):
                # Log failed attempt
                await self._log_login_attempt(email, request.client.host, False)
                raise HTTPException(status_code=401, detail="Invalid credentials")
            
            # Log successful attempt
            await self._log_login_attempt(email, request.client.host, True)
            
            # Update last login
            await conn.execute("""
                UPDATE admin_users 
                SET last_login = CURRENT_TIMESTAMP 
                WHERE id = $1
            """, user['id'])
            
            # Create session
            token = secrets.token_urlsafe(32)
            token_hash = self._hash_token(token)
            expires_at = datetime.now(timezone.utc) + self.session_duration
            
            await conn.execute("""
                INSERT INTO admin_sessions 
                (user_id, token_hash, expires_at, ip_address, user_agent)
                VALUES ($1, $2, $3, $4, $5)
            """, user['id'], token_hash, expires_at, 
                request.client.host, request.headers.get('user-agent', ''))
            
            return LoginResponse(
                token=token,
                user={
                    'id': str(user['id']),
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'role': user['role']
                },
                expires_at=expires_at
            )
    
    async def logout(self, token: str) -> bool:
        """Invalidate session token"""
        token_hash = self._hash_token(token)
        
        async with self.db_pool.acquire() as conn:
            result = await conn.execute("""
                DELETE FROM admin_sessions 
                WHERE token_hash = $1
            """, token_hash)
            
            return result.split()[-1] != '0'
    
    async def validate_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate session token and return user info"""
        token_hash = self._hash_token(token)
        
        async with self.db_pool.acquire() as conn:
            # Get session and user info
            session = await conn.fetchrow("""
                SELECT s.*, u.email, u.username, u.full_name, u.role, u.is_active
                FROM admin_sessions s
                JOIN admin_users u ON s.user_id = u.id
                WHERE s.token_hash = $1 AND s.expires_at > CURRENT_TIMESTAMP
            """, token_hash)
            
            if not session:
                return None
            
            if not session['is_active']:
                # Delete session if user is deactivated
                await conn.execute("""
                    DELETE FROM admin_sessions WHERE token_hash = $1
                """, token_hash)
                return None
            
            # Update last activity
            await conn.execute("""
                UPDATE admin_sessions 
                SET last_activity = CURRENT_TIMESTAMP 
                WHERE token_hash = $1
            """, token_hash)
            
            return {
                'id': str(session['user_id']),
                'email': session['email'],
                'username': session['username'],
                'full_name': session['full_name'],
                'role': session['role']
            }
    
    async def create_user(self, user_data: UserCreate) -> Dict[str, Any]:
        """Create new admin user"""
        password_hash = self._hash_password(user_data.password)
        
        async with self.db_pool.acquire() as conn:
            try:
                user = await conn.fetchrow("""
                    INSERT INTO admin_users 
                    (email, username, password_hash, full_name, role)
                    VALUES ($1, $2, $3, $4, $5)
                    RETURNING id, email, username, full_name, role, created_at
                """, user_data.email, user_data.username, password_hash, 
                    user_data.full_name, user_data.role)
                
                return {
                    'id': str(user['id']),
                    'email': user['email'],
                    'username': user['username'],
                    'full_name': user['full_name'],
                    'role': user['role'],
                    'created_at': user['created_at']
                }
            except asyncpg.UniqueViolationError:
                raise HTTPException(
                    status_code=409, 
                    detail="User with this email or username already exists"
                )
    
    async def change_password(self, user_id: str, old_password: str, new_password: str) -> bool:
        """Change user password"""
        async with self.db_pool.acquire() as conn:
            user = await conn.fetchrow("""
                SELECT password_hash FROM admin_users WHERE id = $1
            """, user_id)
            
            if not user:
                raise HTTPException(status_code=404, detail="User not found")
            
            if not self._verify_password(old_password, user['password_hash']):
                raise HTTPException(status_code=401, detail="Invalid current password")
            
            new_hash = self._hash_password(new_password)
            await conn.execute("""
                UPDATE admin_users 
                SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
                WHERE id = $2
            """, new_hash, user_id)
            
            # Invalidate all sessions for this user
            await conn.execute("""
                DELETE FROM admin_sessions WHERE user_id = $1
            """, user_id)
            
            return True
    
    async def cleanup_expired_sessions(self):
        """Remove expired sessions (run periodically)"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                DELETE FROM admin_sessions 
                WHERE expires_at < CURRENT_TIMESTAMP
            """)
    
    # Private methods
    
    def _hash_password(self, password: str) -> str:
        """Hash password using bcrypt"""
        return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt(12)).decode('utf-8')
    
    def _verify_password(self, password: str, password_hash: str) -> bool:
        """Verify password against hash"""
        return bcrypt.checkpw(password.encode('utf-8'), password_hash.encode('utf-8'))
    
    def _hash_token(self, token: str) -> str:
        """Hash session token for storage"""
        return hashlib.sha256(token.encode('utf-8')).hexdigest()
    
    async def _check_rate_limit(self, email: str, ip_address: str):
        """Check if login attempts are rate limited"""
        async with self.db_pool.acquire() as conn:
            # Count recent failed attempts
            cutoff_time = datetime.now(timezone.utc) - self.lockout_duration
            
            attempts = await conn.fetchval("""
                SELECT COUNT(*) FROM login_attempts
                WHERE (email = $1 OR ip_address = $2)
                AND attempted_at > $3
                AND success = false
            """, email, ip_address, cutoff_time)
            
            if attempts >= self.max_login_attempts:
                raise HTTPException(
                    status_code=429, 
                    detail=f"Too many login attempts. Please try again after {self.lockout_duration.seconds // 60} minutes"
                )
    
    async def _log_login_attempt(self, email: str, ip_address: str, success: bool):
        """Log login attempt"""
        async with self.db_pool.acquire() as conn:
            await conn.execute("""
                INSERT INTO login_attempts (email, ip_address, success)
                VALUES ($1, $2, $3)
            """, email, ip_address, success)


# Dependency for FastAPI routes
async def get_current_user(
    authorization: str = Header(..., description="Bearer token"),
    request: Request = None
) -> Dict[str, Any]:
    """FastAPI dependency to get current authenticated user"""
    
    if not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Invalid authorization header")
    
    token = authorization.replace("Bearer ", "")
    
    # Get auth service from app state
    auth_service = AuthService(request.app.state.db_pool())
    user = await auth_service.validate_token(token)
    
    if not user:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    
    return user


async def require_super_admin(
    current_user: Dict[str, Any] = Depends(get_current_user)
) -> Dict[str, Any]:
    """Require super admin role"""
    if current_user['role'] != 'super_admin':
        raise HTTPException(status_code=403, detail="Super admin access required")
    return current_user
