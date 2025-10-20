"""
Authentication API routes for admin panel
"""

from fastapi import APIRouter, Depends, Request, Response, HTTPException
from services.auth import (
    AuthService, LoginRequest, LoginResponse, UserCreate, 
    get_current_user, require_super_admin
)
from typing import Dict, Any, List

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/login", response_model=LoginResponse)
async def login(
    request: Request,
    credentials: LoginRequest,
    response: Response
):
    """Login with email and password"""
    auth_service = AuthService(request.app.state.db_pool())
    
    result = await auth_service.login(
        credentials.email, 
        credentials.password,
        request
    )
    
    # Set cookie for frontend middleware
    response.set_cookie(
        key="admin_token",
        value=result.token,
        httponly=True,
        secure=True,  # Use HTTPS in production
        samesite="lax",
        max_age=86400  # 24 hours
    )
    
    return result


@router.post("/logout")
async def logout(
    request: Request,
    response: Response,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Logout and invalidate session"""
    # Get token from header
    auth_header = request.headers.get("authorization", "")
    token = auth_header.replace("Bearer ", "")
    
    auth_service = AuthService(request.app.state.db_pool())
    success = await auth_service.logout(token)
    
    # Clear cookie
    response.delete_cookie("admin_token")
    
    return {"success": success}


@router.get("/me")
async def get_current_user_info(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get current user information"""
    return current_user


@router.post("/change-password")
async def change_password(
    request: Request,
    old_password: str,
    new_password: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Change current user's password"""
    if len(new_password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long"
        )
    
    auth_service = AuthService(request.app.state.db_pool())
    success = await auth_service.change_password(
        current_user['id'],
        old_password,
        new_password
    )
    
    return {"success": success}


# Admin user management (super admin only)

@router.post("/users", response_model=Dict[str, Any])
async def create_user(
    request: Request,
    user_data: UserCreate,
    _: Dict[str, Any] = Depends(require_super_admin)
):
    """Create new admin user (super admin only)"""
    if len(user_data.password) < 8:
        raise HTTPException(
            status_code=400, 
            detail="Password must be at least 8 characters long"
        )
    
    auth_service = AuthService(request.app.state.db_pool())
    user = await auth_service.create_user(user_data)
    
    return user


@router.get("/users", response_model=List[Dict[str, Any]])
async def list_users(
    request: Request,
    _: Dict[str, Any] = Depends(require_super_admin)
):
    """List all admin users (super admin only)"""
    async with request.app.state.db_pool().acquire() as conn:
        users = await conn.fetch("""
            SELECT 
                id, email, username, full_name, role, 
                is_active, created_at, last_login
            FROM admin_users
            ORDER BY created_at DESC
        """)
        
        return [dict(user) for user in users]


@router.put("/users/{user_id}/status")
async def toggle_user_status(
    request: Request,
    user_id: str,
    is_active: bool,
    current_user: Dict[str, Any] = Depends(require_super_admin)
):
    """Enable/disable user (super admin only)"""
    if user_id == current_user['id']:
        raise HTTPException(
            status_code=400, 
            detail="Cannot disable your own account"
        )
    
    async with request.app.state.db_pool().acquire() as conn:
        result = await conn.execute("""
            UPDATE admin_users 
            SET is_active = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2
        """, is_active, user_id)
        
        if result.split()[-1] == '0':
            raise HTTPException(status_code=404, detail="User not found")
        
        # If disabling, also delete their sessions
        if not is_active:
            await conn.execute("""
                DELETE FROM admin_sessions WHERE user_id = $1
            """, user_id)
    
    return {"success": True}


@router.get("/sessions")
async def get_active_sessions(
    request: Request,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get user's active sessions"""
    async with request.app.state.db_pool().acquire() as conn:
        sessions = await conn.fetch("""
            SELECT 
                id, ip_address, user_agent, 
                created_at, last_activity, expires_at
            FROM admin_sessions
            WHERE user_id = $1 AND expires_at > CURRENT_TIMESTAMP
            ORDER BY last_activity DESC
        """, current_user['id'])
        
        return [dict(session) for session in sessions]


@router.delete("/sessions/{session_id}")
async def revoke_session(
    request: Request,
    session_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Revoke a specific session"""
    async with request.app.state.db_pool().acquire() as conn:
        result = await conn.execute("""
            DELETE FROM admin_sessions 
            WHERE id = $1 AND user_id = $2
        """, session_id, current_user['id'])
        
        if result.split()[-1] == '0':
            raise HTTPException(status_code=404, detail="Session not found")
    
    return {"success": True}
