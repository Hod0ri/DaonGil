from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from pydantic import BaseModel
from typing import Optional
from datetime import date
import random
import string
from app.db.session import get_db
from app.models.user import User
from app.core.security import create_access_token
from fastapi.security import OAuth2PasswordBearer
import jwt
from app.core.config import settings

router = APIRouter()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Could not validate credentials")
    except jwt.PyJWTError:
        raise HTTPException(status_code=401, detail="Could not validate credentials")
        
    result = await db.execute(select(User).filter(User.id == int(user_id)))
    user = result.scalars().first()
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

def generate_personal_code(length=8):
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=length))

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_image: Optional[str] = None
    birthdate: Optional[date] = None
    gender: Optional[str] = None
    partner_code: Optional[str] = None

class PartnerResponse(BaseModel):
    nickname: Optional[str]
    birthdate: Optional[date]
    gender: Optional[str]
    profile_image: Optional[str]

class UserResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str]
    profile_image: Optional[str]
    birthdate: Optional[date]
    gender: Optional[str]
    personal_code: Optional[str]
    partner: Optional[PartnerResponse] = None

    class Config:
        from_attributes = True

@router.get("/me", response_model=UserResponse)
async def read_users_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    # Ensure personal_code exists
    if not current_user.personal_code:
        while True:
            code = generate_personal_code()
            # Check uniqueness
            result = await db.execute(select(User).filter(User.personal_code == code))
            if not result.scalars().first():
                current_user.personal_code = code
                db.add(current_user)
                await db.commit()
                await db.refresh(current_user)
                break
    
    # Fetch partner info if connected
    partner_data = None
    if current_user.partner_id:
        result = await db.execute(select(User).filter(User.id == current_user.partner_id))
        partner_user = result.scalars().first()
        if partner_user:
            partner_data = PartnerResponse(
                nickname=partner_user.nickname,
                birthdate=partner_user.birthdate,
                gender=partner_user.gender,
                profile_image=partner_user.profile_image
            )

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        nickname=current_user.nickname,
        profile_image=current_user.profile_image,
        birthdate=current_user.birthdate,
        gender=current_user.gender,
        personal_code=current_user.personal_code,
        partner=partner_data
    )

@router.post("/disconnect")
async def disconnect_partner(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.partner_id:
        raise HTTPException(status_code=400, detail="No partner connected")

    # Find partner
    result = await db.execute(select(User).filter(User.id == current_user.partner_id))
    partner = result.scalars().first()

    # Disconnect both sides
    current_user.partner_id = None
    if partner:
        partner.partner_id = None
        db.add(partner)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return {"message": "Disconnected successfully"}

@router.patch("/me")
async def update_user_me(
    user_update: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if user_update.nickname is not None:
        current_user.nickname = user_update.nickname
    if user_update.profile_image is not None:
        current_user.profile_image = user_update.profile_image
    if user_update.birthdate is not None:
        current_user.birthdate = user_update.birthdate
    if user_update.gender is not None:
        current_user.gender = user_update.gender
        
    # Handle Partner Connection
    if user_update.partner_code:
        if current_user.partner_id:
             raise HTTPException(status_code=400, detail="Already connected to a partner")
        
        # Find partner by code
        result = await db.execute(select(User).filter(User.personal_code == user_update.partner_code))
        partner = result.scalars().first()
        
        if not partner:
            raise HTTPException(status_code=404, detail="Invalid partner code")
            
        if partner.id == current_user.id:
            raise HTTPException(status_code=400, detail="Cannot connect to yourself")
            
        if partner.partner_id:
             raise HTTPException(status_code=400, detail="Partner already connected")
             
        # Link both users
        current_user.partner_id = partner.id
        partner.partner_id = current_user.id
        
        db.add(partner)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    return current_user
