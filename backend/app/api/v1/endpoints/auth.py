from datetime import datetime, timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import verify_password, get_password_hash, create_access_token
from app.core.config import settings
from app.models.user import User, Role
from app.models.auth_token import AuthToken
from app.schemas.user import UserCreate, UserLogin, Token, UserResponse, User as UserSchema
from app.api.deps import get_current_user

router = APIRouter()

import re
from fastapi import HTTPException, status

@router.post("/signup", response_model=Token, status_code=status.HTTP_201_CREATED)
def signup(user_data: UserCreate, db: Session = Depends(get_db)):
    """Register a new user"""
    
    # Username validation - no spaces or special characters
    username = user_data.username.strip()
    
    # Check if username contains spaces
    if " " in username:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username should not contain spaces"
        )
    
    # Check if username contains special characters (allow only letters, numbers, underscore)
    if not re.match("^[a-zA-Z0-9_]+$", username):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username can only contain letters, numbers and underscores"
        )
    
    # Optional: Check minimum length
    if len(username) < 3:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must be at least 3 characters long"
        )
    
    # Optional: Check maximum length
    if len(username) > 30:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username must not exceed 30 characters"
        )
    
    # Check if username already exists
    existing_user = db.query(User).filter(User.username == username).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Hash password
    hashed_password = get_password_hash(user_data.password)
    
    # Create user with validated username
    new_user = User(
        username=username,
        password_hash=hashed_password,
        is_active=True
    )
    
    # Assign default 'user' role
    user_role = db.query(Role).filter(Role.name == "user").first()
    if user_role:
        new_user.roles.append(user_role)
    
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": new_user.username, "user_id": new_user.id},
        expires_delta=access_token_expires
    )
    
    # Save token to database
    expires_at = datetime.utcnow() + access_token_expires
    auth_token = AuthToken(
        user_id=new_user.id,
        token=access_token,
        expires_at=expires_at
    )
    db.add(auth_token)
    db.commit()
    
    # Prepare user response
    user_response = UserResponse(
        id=new_user.id,
        username=new_user.username,
        is_active=new_user.is_active,
        roles=[role.name for role in new_user.roles]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/login", response_model=Token)
def login(user_credentials: UserLogin, db: Session = Depends(get_db)):
    """Login user and return JWT token"""
    
    # Find user
    user = db.query(User).filter(User.username == user_credentials.username).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Verify password
    if not verify_password(user_credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username, "user_id": user.id},
        expires_delta=access_token_expires
    )
    
    # Save token to database
    expires_at = datetime.utcnow() + access_token_expires
    auth_token = AuthToken(
        user_id=user.id,
        token=access_token,
        expires_at=expires_at
    )
    db.add(auth_token)
    db.commit()
    
    # Prepare user response
    user_response = UserResponse(
        id=user.id,
        username=user.username,
        is_active=user.is_active,
        roles=[role.name for role in user.roles]
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@router.post("/logout")
def logout(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Logout user by revoking the current token"""
    
    # Get the token from the request (this is a simplified version)
    # In a real application, you'd extract the token from the Authorization header
    # For now, we'll revoke all active tokens for the user
    
    active_tokens = db.query(AuthToken).filter(
        AuthToken.user_id == current_user.id,
        AuthToken.is_revoked == False
    ).all()
    
    for token in active_tokens:
        token.is_revoked = True
    
    db.commit()
    
    return {"message": "Successfully logged out"}

@router.get("/me", response_model=UserSchema)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information"""
    return current_user

@router.get("/users/details", response_model=UserSchema)
def get_user_details(current_user: User = Depends(get_current_user)):
    """Get detailed information about the logged-in user"""
    return current_user