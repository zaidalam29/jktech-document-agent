# app/api/v1/endpoints/admin.py में
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from app.core.database import get_db
from app.api.deps import get_current_user, require_admin, require_moderator
from app.models.user import User, Role
from app.schemas.user import UserRoleUpdate
from app.core.logger import logger
from app.models.auth_token import AuthToken

router = APIRouter()

# Use require_admin directly
@router.get("/users")
def get_all_users(
    skip: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=1000),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin) 
):
    """Get all users - ADMIN ONLY"""
    try:
        # Users with roles eager loaded
        users = db.query(User).options(
            joinedload(User.roles)
        ).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
        
        response = []
        for user in users:
            role_names = [role.name for role in user.roles]
            response.append({
                "id": user.id,
                "username": user.username,
                "is_active": user.is_active,
                "created_at": user.created_at,
                "roles": role_names,
                "is_admin": "admin" in role_names,
                "is_moderator": "moderator" in role_names
            })
        
        return response
        
    except Exception as e:
        logger.error(f"Admin error: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to fetch users"
        )

@router.put("/users/{user_id}/roles")
def update_user_roles(
    user_id: int,
    role_update: UserRoleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ADMIN ONLY
):
    """Update user roles - ADMIN ONLY"""
    # Cannot modify own roles
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot modify your own roles"
        )
    
    try:
        # Get user
        user = db.query(User).filter(User.id == user_id).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Get roles from database
        roles_to_assign = []
        for role_name in role_update.role_names:
            role = db.query(Role).filter(Role.name == role_name).first()
            if role:
                roles_to_assign.append(role)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid role: {role_name}"
                )
        
        # Update user roles
        user.roles = roles_to_assign
        db.add(user)
        db.commit()
        
        # Refresh to get updated data
        db.refresh(user)
        
        # Eager load roles for response
        user_with_roles = db.query(User).options(
            joinedload(User.roles)
        ).filter(User.id == user_id).first()
        
        role_names = [role.name for role in user_with_roles.roles]
        
        logger.info(f"Admin {current_user.username} updated roles for user {user.username}")
        
        return {
            "message": "Roles updated successfully",
            "user": {
                "id": user.id,
                "username": user.username,
                "roles": role_names
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating roles: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update roles"
        )

@router.put("/users/{user_id}/toggle-active")
def toggle_user_active_status(
    user_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin)  # ADMIN ONLY
):
    """
    Toggle user active status - ADMIN ONLY
    True -> False, False -> True
    """
    # Check if user exists
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Check if trying to toggle self
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot toggle your own active status"
        )
    
    # Check if user is admin (role-based check)
    # Aapke system mein roles list hai, isliye check karna hoga
    user_roles = [role.name for role in user.roles]
    if "admin" in user_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot toggle another admin's status"
        )
    
    # Toggle the active status
    user.is_active = not user.is_active
    
    # If deactivating, also delete all active tokens
    if not user.is_active:
        db.query(AuthToken).filter(AuthToken.user_id == user_id).delete()
    
    db.commit()
    db.refresh(user)
    
    return user