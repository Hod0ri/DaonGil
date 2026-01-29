from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from google.oauth2 import id_token
from google.auth.transport import requests
from app.db.session import get_db
from app.models.user import User
from app.core.config import settings
from app.core.security import create_access_token
from typing import Any

router = APIRouter()

class GoogleLogin(BaseModel):
    credential: str

@router.post("/login/google")
async def login_google(
    login_data: GoogleLogin,
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

    access_token = create_access_token(subject=user.id)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "user": {
            "email": user.email,
            "name": user.full_name
        }
    }
