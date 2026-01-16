from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy.orm import selectinload
from sqlalchemy import insert, delete
from app.database.database import get_db
from app.database.models import User, Role, user_roles
from app.core.auth import verify_admin
from app.core.security import hash_password
from pydantic import BaseModel
from typing import List, Optional

router = APIRouter(prefix="/admin/users", tags=["Admin - User Management"])

class CreateUserRequest(BaseModel):
    username: str
    password: str
    role_ids: List[int] = []  # Changed from role_names to role_ids

class UpdateUserRequest(BaseModel):
    username: Optional[str] = None
    is_active: Optional[bool] = None
    role_ids: Optional[List[int]] = None  # Changed from role_names to role_ids

class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    role_ids: List[int]  # Added role_ids
    role_names: List[str]

@router.post("/", response_model=dict, dependencies=[Depends(verify_admin)])
async def create_user(user_data: CreateUserRequest, db: AsyncSession = Depends(get_db)):
    # Check if user exists
    result = await db.execute(select(User).where(User.username == user_data.username))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username already exists")
    
    # Validate role_ids exist in database
    if user_data.role_ids:
        roles_result = await db.execute(
            select(Role.id, Role.name).where(Role.id.in_(user_data.role_ids))
        )
        existing_roles = roles_result.all()
        
        existing_role_ids = {role.id for role in existing_roles}
        invalid_ids = set(user_data.role_ids) - existing_role_ids
        
        if invalid_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Invalid role IDs: {list(invalid_ids)}"
            )
        
        # Store role names for response
        role_names = [role.name for role in existing_roles]
    
    # Create user
    user = User(
        username=user_data.username,
        password_hash=hash_password(user_data.password),
        is_active=True
    )
    db.add(user)
    await db.flush()  # Get user ID
    
    # Save role_ids to user_roles table
    if user_data.role_ids:
        # Insert each role_id into user_roles table
        values = [
            {"user_id": user.id, "role_id": role_id}
            for role_id in user_data.role_ids
        ]
        await db.execute(insert(user_roles), values)
    
    await db.commit()
    
    return {
        "message": "User created successfully", 
        "user_id": user.id,
        "role_ids": user_data.role_ids,  # IDs that were saved
        "role_names": role_names if user_data.role_ids else []  # Names for response
    }

@router.get("/", response_model=List[UserResponse], dependencies=[Depends(verify_admin)])
async def list_users(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).options(selectinload(User.roles)))
    users = result.scalars().all()
    
    user_responses = []
    for user in users:
        user_responses.append(
            UserResponse(
                id=user.id,
                username=user.username,
                is_active=user.is_active,
                role_ids=[role.id for role in user.roles],  # Include role_ids
                role_names=[role.name for role in user.roles]
            )
        )
    
    return user_responses

@router.put("/{user_id}", response_model=dict, dependencies=[Depends(verify_admin)])
async def update_user(user_id: int, user_data: UpdateUserRequest, db: AsyncSession = Depends(get_db)):
    # Get user with roles
    result = await db.execute(
        select(User).options(selectinload(User.roles)).where(User.id == user_id)
    )
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Update user fields
    if user_data.username is not None:
        user.username = user_data.username
    if user_data.is_active is not None:
        user.is_active = user_data.is_active
    
    # Update roles using role_ids
    if user_data.role_ids is not None:
        # Validate new role_ids
        if user_data.role_ids:  # If empty list, remove all roles
            roles_result = await db.execute(
                select(Role.id, Role.name).where(Role.id.in_(user_data.role_ids))
            )
            existing_roles = roles_result.all()
            
            existing_role_ids = {role.id for role in existing_roles}
            invalid_ids = set(user_data.role_ids) - existing_role_ids
            
            if invalid_ids:
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid role IDs: {list(invalid_ids)}"
                )
        
        # Clear existing roles
        await db.execute(
            delete(user_roles).where(user_roles.c.user_id == user_id)
        )
        
        # Add new roles
        if user_data.role_ids:
            values = [
                {"user_id": user_id, "role_id": role_id}
                for role_id in user_data.role_ids
            ]
            await db.execute(insert(user_roles), values)
    
    await db.commit()
    
    # Get updated role names for response
    roles_result = await db.execute(
        select(Role.name).where(Role.id.in_(user_data.role_ids if user_data.role_ids is not None else []))
    )
    role_names = roles_result.scalars().all()
    
    return {
        "message": "User updated successfully",
        "role_ids": user_data.role_ids if user_data.role_ids is not None else [],
        "role_names": role_names
    }

@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT, dependencies=[Depends(verify_admin)])
async def delete_user(user_id: int, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    await db.delete(user)
    await db.commit()

@router.get("/roles", response_model=List[dict], dependencies=[Depends(verify_admin)])
async def list_roles(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Role))
    roles = result.scalars().all()
    return [{"id": role.id, "name": role.name} for role in roles]

@router.post("/roles", response_model=dict, dependencies=[Depends(verify_admin)])
async def create_role(role_name: str, db: AsyncSession = Depends(get_db)):
    # Check if role exists
    result = await db.execute(select(Role).where(Role.name == role_name))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Role already exists")
    
    role = Role(name=role_name)
    db.add(role)
    await db.commit()
    return {"message": "Role created successfully", "role_id": role.id}