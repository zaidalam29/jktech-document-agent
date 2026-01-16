# app/routes/auth.py
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from app.database.database import get_db
from app.database.models import User, Role, AuthToken
from app.core.security import hash_password, verify_password, create_access_token
from pydantic import BaseModel
import os
from typing import Optional
from datetime import datetime
from app.core.auth import get_current_user


router = APIRouter(prefix="/auth", tags=["Auth"])

class SignupRequest(BaseModel):
    username: str
    password: str

async def create_user_with_role(
    db: AsyncSession,
    username: str,
    password: str,
    role_id: int  # 1 for admin, 2 for user
) -> dict:
    """Create user with specified role_id"""
    
    # Check existing
    existing = await db.execute(select(User).where(User.username == username))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Username exists")
    
    # Create user
    user = User(
        username=username,
        password_hash=hash_password(password)
    )
    db.add(user)
    await db.flush()
    
    # Insert into user_roles
    from app.database.models import user_roles
    await db.execute(
        user_roles.insert().values(
            user_id=user.id,
            role_id=role_id
        )
    )
    
    await db.commit()
    
    return {
        "user_id": user.id,
        "role_id": role_id,
        "role_name": "admin" if role_id == 1 else "user"
    }


@router.post("/signup")
async def signup(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Create regular user (role_id=2)"""
    result = await create_user_with_role(db, data.username, data.password, 2)
    return {"message": "User created", **result}


@router.post("/create-admin")
async def create_admin(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    """Create admin user (role_id=1)"""
    result = await create_user_with_role(db, data.username, data.password, 1)
    return {"message": "Admin created", **result}



@router.post("/login")
async def login(data: SignupRequest, db: AsyncSession = Depends(get_db)):
    try:
        result = await db.execute(
            select(User).options(selectinload(User.roles)).where(User.username == data.username)
        )
        user = result.scalar_one_or_none()

        if not user or not verify_password(data.password, user.password_hash):
            raise HTTPException(status_code=401, detail="Invalid credentials")

        # Get roles
        role_names = [role.name for role in user.roles] if user.roles else ["user"]
        
        # Create access token
        token = create_access_token({
            "sub": user.username,
            "roles": role_names,
            "user_id": user.id
        })

        # ✅ Save token to auth_tokens table
        auth_token = AuthToken(
            user_id=user.id,
            token=token,
            is_revoked=False,
            created_at=datetime.utcnow()
        )
        
        db.add(auth_token)
        await db.commit()
        
        # Refresh to get the ID
        await db.refresh(auth_token)

        return {
            "access_token": token,
            "token_type": "bearer",
            "username": user.username,
            "role": role_names[0],
            "user_id": user.id,
            "token_id": auth_token.id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        await db.rollback()
        if os.getenv("DEBUG", "false").lower() == "true":
            raise HTTPException(status_code=500, detail=f"Login error: {str(e)}")
        else:
            raise HTTPException(status_code=500, detail="Login error")

@router.post("/logout")
async def logout(
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Logout by revoking the current token"""
    
    # Get token from Authorization header
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="No token provided")
    
    token = auth_header.split(" ")[1]
    
    # Find and revoke the token
    result = await db.execute(
        select(AuthToken).where(
            AuthToken.token == token,
            AuthToken.user_id == current_user.id,
            AuthToken.is_revoked == False
        )
    )
    auth_token = result.scalar_one_or_none()
    
    if auth_token:
        # Mark as revoked
        auth_token.is_revoked = True
        await db.commit()
        return {
            "message": "Logged out successfully",
            "token_id": auth_token.id,
            "user_id": current_user.id
        }
    else:
        # Token already revoked or not found
        return {
            "message": "Token already revoked or not found",
            "user_id": current_user.id
        }

# Optional: Logout from all devices
@router.post("/logout-all")
async def logout_all(
    db: AsyncSession = Depends(get_db),
    current_user = Depends(get_current_user)
):
    """Logout from all devices"""
    
    result = await db.execute(
        select(AuthToken).where(
            AuthToken.user_id == current_user.id,
            AuthToken.is_revoked == False
        )
    )
    tokens = result.scalars().all()
    
    for token in tokens:
        token.is_revoked = True
    
    await db.commit()
    
    return {
        "message": "Logged out from all devices",
        "tokens_revoked": len(tokens),
        "user_id": current_user.id
    }