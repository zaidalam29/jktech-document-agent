from pydantic import BaseModel, Field, validator
from typing import List, Optional
from datetime import datetime
from enum import Enum



# Role Schemas
class RoleEnum(str, Enum):
    ADMIN = "admin"
    MODERATOR = "moderator"
    USER = "user"

# Role Schemas
class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass

class RoleResponse(RoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class RoleSimple(RoleBase):
    id: int
    
    class Config:
        from_attributes = True


class Role(RoleBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
        
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    is_active: bool = True
    is_verified: bool = False

class UserCreate(UserBase):
    password: str = Field(..., min_length=6)
    
    @validator('username')
    def validate_username(cls, v):
        # Username should be alphanumeric with underscores
        if not v.replace('_', '').isalnum():
            raise ValueError('Username can only contain letters, numbers and underscores')
        return v.lower()

class UserUpdate(BaseModel):
    username: Optional[str] = Field(None, min_length=3, max_length=50)
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    password: Optional[str] = Field(None, min_length=6)

class UserInDBBase(UserBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime]
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

class User(UserInDBBase):
    """User response schema"""
    pass

class UserWithRoles(User):
    """User with roles information"""
    roles: List['Role'] = []
    role_names: List[str] = []

class RoleBase(BaseModel):
    name: str = Field(..., min_length=2, max_length=50)
    description: Optional[str] = None

class RoleCreate(RoleBase):
    pass



class RoleWithUsers(Role):
    """Role with users information"""
    users: List[User] = []
    user_count: int = 0

class PermissionBase(BaseModel):
    name: str = Field(..., min_length=3, max_length=100)
    description: Optional[str] = None

class Permission(PermissionBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

class UserRoleUpdate(BaseModel):
    """Schema for updating user roles"""
    role_names: List[str] = Field(..., min_items=1)
    
    @validator('role_names')
    def validate_role_names(cls, v):
        valid_roles = {'admin', 'moderator', 'user'}
        for role in v:
            if role not in valid_roles:
                raise ValueError(f'Invalid role: {role}. Valid roles are: {", ".join(valid_roles)}')
        return v

class UserStats(BaseModel):
    """User statistics"""
    total_users: int
    active_users: int
    verified_users: int
    admin_users: int
    moderator_users: int
    new_users_today: int
    new_users_this_week: int

class UserSearchParams(BaseModel):
    """Parameters for user search"""
    username: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
    role: Optional[str] = None
    skip: int = 0
    limit: int = 100

# User Schemas
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=100)

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def validate_password(cls, v):
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        return v

class UserLogin(BaseModel):
    username: str
    password: str

class User(UserBase):
    id: int
    is_active: bool
    created_at: datetime
    roles: List[Role] = []
    
    class Config:
        from_attributes = True

class UserResponse(BaseModel):
    id: int
    username: str
    is_active: bool
    roles: List[str]
    
    class Config:
        from_attributes = True

# Token Schemas
class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    username: Optional[str] = None
    user_id: Optional[int] = None
    roles: List[str] = []