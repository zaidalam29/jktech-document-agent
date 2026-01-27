# app/crud/user.py
from typing import List, Optional, Dict, Any
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, and_, or_
from datetime import datetime
from app.models.user import User, Role
from app.core.security import get_password_hash, verify_password
from app.core.logger import logger

class CRUDUser:
    """CRUD operations for User model - NO EMAIL"""
    
    def get_with_roles(self, db: Session, user_id: int) -> Optional[User]:
        """Get user with roles (eager loading)"""
        return db.query(User).options(
            joinedload(User.roles)
        ).filter(User.id == user_id).first()
    
    def get_by_username(self, db: Session, username: str) -> Optional[User]:
        """Get user by username"""
        return db.query(User).options(
            joinedload(User.roles)
        ).filter(func.lower(User.username) == username.lower()).first()
    
    def get_all_with_roles(
        self, 
        db: Session, 
        skip: int = 0, 
        limit: int = 100
    ) -> List[User]:
        """Get all users with their roles"""
        return db.query(User).options(
            joinedload(User.roles)
        ).order_by(User.created_at.desc()).offset(skip).limit(limit).all()
    
    def get_users_by_role(self, db: Session, role_name: str) -> List[User]:
        """Get users with specific role using join"""
        return db.query(User).join(
            User.roles
        ).filter(
            Role.name == role_name
        ).options(
            joinedload(User.roles)
        ).all()
    
    def has_role(self, db: Session, user_id: int, role_name: str) -> bool:
        """Check if user has specific role"""
        user = db.query(User).join(
            User.roles
        ).filter(
            and_(
                User.id == user_id,
                Role.name == role_name
            )
        ).first()
        
        return user is not None
    
    def get_user_role_names(self, db: Session, user_id: int) -> List[str]:
        """Get role names for a user"""
        user = self.get_with_roles(db, user_id)
        if not user:
            return []
        return [role.name for role in user.roles]
    
    def create(self, db: Session, user_in: dict) -> User:
        """Create a new user"""
        # Hash password
        hashed_password = get_password_hash(user_in['password'])
        
        # Create user
        user = User(
            username=user_in['username'].lower(),
            password_hash=hashed_password,
            is_active=user_in.get('is_active', True)
        )
        
        # Get default 'user' role
        user_role = db.query(Role).filter(Role.name == 'user').first()
        if user_role:
            user.roles.append(user_role)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User created: {user.username} (ID: {user.id})")
        return user
    
    def update(
        self, 
        db: Session, 
        user: User, 
        update_data: dict
    ) -> User:
        """Update a user"""
        # Handle password update
        if 'password' in update_data:
            update_data['password_hash'] = get_password_hash(update_data.pop('password'))
        
        # Handle username case
        if 'username' in update_data:
            update_data['username'] = update_data['username'].lower()
        
        for field, value in update_data.items():
            if field == 'password_hash':
                setattr(user, 'password_hash', value)
            else:
                setattr(user, field, value)
        
        db.add(user)
        db.commit()
        db.refresh(user)
        
        logger.info(f"User updated: {user.username} (ID: {user.id})")
        return user
    
    def assign_role(self, db: Session, user_id: int, role_name: str) -> bool:
        """Assign role to user via user_roles table"""
        try:
            # Get user and role
            user = db.query(User).filter(User.id == user_id).first()
            role = db.query(Role).filter(Role.name == role_name).first()
            
            if not user or not role:
                logger.warning(f"User {user_id} or role {role_name} not found")
                return False
            
            # Check if already has role
            if role not in user.roles:
                user.roles.append(role)
                db.add(user)
                db.commit()
                logger.info(f"Role '{role_name}' assigned to user {user.username}")
                return True
            
            logger.info(f"User {user.username} already has role {role_name}")
            return False
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error assigning role: {str(e)}")
            return False
    
    def remove_role(self, db: Session, user_id: int, role_name: str) -> bool:
        """Remove role from user via user_roles table"""
        try:
            # Get user and role
            user = db.query(User).filter(User.id == user_id).first()
            role = db.query(Role).filter(Role.name == role_name).first()
            
            if not user or not role:
                logger.warning(f"User {user_id} or role {role_name} not found")
                return False
            
            # Check if has role
            if role in user.roles:
                user.roles.remove(role)
                db.add(user)
                db.commit()
                logger.info(f"Role '{role_name}' removed from user {user.username}")
                return True
            
            logger.info(f"User {user.username} doesn't have role {role_name}")
            return False
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error removing role: {str(e)}")
            return False
    
    def set_user_roles(self, db: Session, user_id: int, role_names: List[str]) -> bool:
        """Set user roles (replace existing)"""
        try:
            user = db.query(User).filter(User.id == user_id).first()
            if not user:
                logger.warning(f"User {user_id} not found")
                return False
            
            # Clear existing roles
            user.roles = []
            
            # Add new roles
            added_roles = []
            for role_name in role_names:
                role = db.query(Role).filter(Role.name == role_name).first()
                if role:
                    user.roles.append(role)
                    added_roles.append(role_name)
                else:
                    logger.warning(f"Role {role_name} not found, skipping")
            
            db.add(user)
            db.commit()
            logger.info(f"Roles set for user {user.username}: {added_roles}")
            return True
            
        except Exception as e:
            db.rollback()
            logger.error(f"Error setting roles: {str(e)}")
            return False
    
    def get_user_details(self, db: Session, user_id: int) -> Optional[Dict[str, Any]]:
        """Get user details with role names"""
        user = self.get_with_roles(db, user_id)
        if not user:
            return None
        
        role_names = [role.name for role in user.roles]
        
        return {
            "id": user.id,
            "username": user.username,
            "is_active": user.is_active,
            "created_at": user.created_at,
            "role_names": role_names,
            "is_admin": "admin" in role_names,
            "is_moderator": "moderator" in role_names
        }
    
    def authenticate(self, db: Session, username: str, password: str) -> Optional[User]:
        """Authenticate user by username only"""
        user = self.get_by_username(db, username)
        
        if not user:
            return None
        if not verify_password(password, user.password_hash):
            return None
        if not user.is_active:
            return None
        
        return user
    
    def count_users(self, db: Session) -> int:
        """Count total users"""
        return db.query(User).count()
    
    def count_users_by_role(self, db: Session, role_name: str) -> int:
        """Count users with specific role"""
        return db.query(User).join(
            User.roles
        ).filter(
            Role.name == role_name,
            User.is_active == True
        ).count()

# Create instance
user_crud = CRUDUser()

class CRUDRole:
    """CRUD operations for Role model"""
    
    def get(self, db: Session, role_id: int) -> Optional[Role]:
        return db.query(Role).filter(Role.id == role_id).first()
    
    def get_by_name(self, db: Session, name: str) -> Optional[Role]:
        return db.query(Role).filter(Role.name == name).first()
    
    def get_all(self, db: Session, skip: int = 0, limit: int = 100) -> List[Role]:
        return db.query(Role).order_by(Role.name).offset(skip).limit(limit).all()
    
    def create(self, db: Session, name: str) -> Role:
        """Create a new role (admin only)"""
        role = Role(name=name)
        db.add(role)
        db.commit()
        db.refresh(role)
        return role
    
    def delete(self, db: Session, role_id: int) -> bool:
        """Delete a role (cannot delete system roles)"""
        role = db.query(Role).filter(Role.id == role_id).first()
        if role and role.name not in ['admin', 'user', 'moderator']:
            db.delete(role)
            db.commit()
            return True
        return False
    
    def count_roles(self, db: Session) -> int:
        """Count total roles"""
        return db.query(Role).count()

# Create instance
role_crud = CRUDRole()