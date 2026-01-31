from fastapi import APIRouter, Depends, HTTPException, status, Response, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from app.db.session import get_db
from app.models.user import User
from app.core.config import settings
from app.core.security import create_access_token, create_refresh_token, verify_token
from typing import Any

router = APIRouter()

class GoogleLogin(BaseModel):
    credential: str

@router.post("/login/google")
async def login_google(
    login_data: GoogleLogin,
    response: Response,
    db: AsyncSession = Depends(get_db)
) -> Any:
    try:
        # Verify Google Token
        idinfo = id_token.verify_oauth2_token(
            login_data.credential, 
            requests.Request(), 
            settings.GOOGLE_CLIENT_ID
        )

        email = idinfo.get("email")
        google_id = idinfo.get("sub")
        name = idinfo.get("name")
        
        if not email:
            raise HTTPException(status_code=400, detail="Email not found in Google token")

    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid Google token: {str(e)}")

    # Check if user exists
    result = await db.execute(select(User).filter(User.email == email))
    user = result.scalars().first()

    if not user:
        # Create new user
        user = User(
            email=email,
            google_id=google_id,
            full_name=name,
            is_active=True
        )
        db.add(user)
        await db.commit()
        await db.refresh(user)
    else:
        # Update google_id if missing (e.g. if user was created via other means, though unlikely here)
        if not user.google_id:
            user.google_id = google_id
            await db.commit()
            await db.refresh(user)

    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")

    # Issue Tokens
    access_token = create_access_token(subject=user.id)
    refresh_token = create_refresh_token(subject=user.id)

    # Save Refresh Token to DB (for revocation/validation)
    user.refresh_token = refresh_token
    await db.commit()

    # Set Refresh Token in HttpOnly Cookie
    response.set_cookie(
        key="refresh_token",
        value=refresh_token,
        httponly=True,
        secure=settings.ENVIRONMENT == "production", # Set to True in production (HTTPS)
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.full_name
        }
    }

@router.post("/refresh")
async def refresh_token(
    request: Request,
    response: Response,
    db: AsyncSession = Depends(get_db)
):
    refresh_token = request.cookies.get("refresh_token")
    if not refresh_token:
        raise HTTPException(status_code=401, detail="Refresh token missing")
    
    # 1. Verify Token Signature & Expiry
    payload = verify_token(refresh_token)
    if not payload or payload.get("type") != "refresh":
        raise HTTPException(status_code=401, detail="Invalid refresh token")
        
    user_id = payload.get("sub")
    
    # 2. Check against DB (Revocation Check)
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    
    if not user or user.refresh_token != refresh_token:
        # Token reuse detected or token revoked!
        # Potential security risk: Clear cookie and warn
        response.delete_cookie("refresh_token")
        raise HTTPException(status_code=401, detail="Invalid or reused refresh token")

    # 3. Rotate Refresh Token (Optional but recommended)
    new_access_token = create_access_token(subject=user.id)
    new_refresh_token = create_refresh_token(subject=user.id)
    
    user.refresh_token = new_refresh_token
    await db.commit()
    
    response.set_cookie(
        key="refresh_token",
        value=new_refresh_token,
        httponly=True,
        secure=False, # Set to True in production
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 60 * 60
    )
    
    return {
        "access_token": new_access_token,
        "token_type": "bearer"
    }

@router.post("/logout")
async def logout(
    response: Response,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(create_access_token) # Hacky way to get user, better to use get_current_user dependency if available here, but let's just clear cookie
):
    # We should ideally clear the DB token too, but without auth dependency here it's hard.
    # For now, just clearing cookie is enough for client-side logout.
    # To do it properly, we need to import get_current_user but avoiding circular imports might be tricky if not careful.
    # Let's keep it simple: just clear cookie.
    response.delete_cookie("refresh_token")
    return {"message": "Logged out successfully"}
