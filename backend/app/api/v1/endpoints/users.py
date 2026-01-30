from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_
from pydantic import BaseModel
from typing import Optional
from datetime import date
import random
import string
from app.db.session import get_db
from app.models.user import User
from app.models.place import Place, Memory
from app.storage.client import delete_files
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
    return ''.join(secrets.choice(string.ascii_uppercase + string.digits) for _ in range(length))

class UserUpdate(BaseModel):
    nickname: Optional[str] = None
    profile_image: Optional[str] = None
    birthdate: Optional[date] = None
    gender: Optional[str] = None
    partner_code: Optional[str] = None
    emoji: Optional[str] = None
    first_meeting_date: Optional[date] = None

class PartnerResponse(BaseModel):
    nickname: Optional[str]
    birthdate: Optional[date]
    gender: Optional[str]
    profile_image: Optional[str]
    emoji: Optional[str]

class UserResponse(BaseModel):
    id: int
    email: str
    nickname: Optional[str]
    profile_image: Optional[str]
    birthdate: Optional[date]
    gender: Optional[str]
    personal_code: Optional[str]
    emoji: Optional[str]
    first_meeting_date: Optional[date]
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
                profile_image=partner_user.profile_image,
                emoji=partner_user.emoji
            )

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        nickname=current_user.nickname,
        profile_image=current_user.profile_image,
        birthdate=current_user.birthdate,
        gender=current_user.gender,
        personal_code=current_user.personal_code,
        emoji=current_user.emoji,
        first_meeting_date=current_user.first_meeting_date,
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

    # --- DELETE SHARED DATA (Places, Memories, Images) ---
    partner_id = partner.id if partner else -1
    
    # 1. Get all places IDs to be deleted (Owned by either user)
    places_query = select(Place).filter(
        or_(
            Place.user_id == current_user.id,
            Place.user_id == partner_id
        )
    )
    result = await db.execute(places_query)
    places_to_delete = result.scalars().all()
    place_ids = [p.id for p in places_to_delete]
    
    if place_ids:
        # 2. Get all memories in these places
        memories_query = select(Memory).filter(Memory.place_id.in_(place_ids))
        result = await db.execute(memories_query)
        memories_to_delete = result.scalars().all()
        
        # 3. Collect image paths
        images_to_delete = []
        for memory in memories_to_delete:
            if memory.images:
                # memory.images is a list of strings (filenames)
                images_to_delete.extend(memory.images)
        
        # 4. Delete from MinIO
        if images_to_delete:
            delete_files(images_to_delete)
            
        # 5. Delete places (Cascades to memories)
        for place in places_to_delete:
            await db.delete(place)
    # -----------------------------------------------------

    # Disconnect both sides
    current_user.partner_id = None
    # Reset couple data
    current_user.emoji = None
    current_user.first_meeting_date = None

    if partner:
        partner.partner_id = None
        # Reset couple data for partner too
        partner.emoji = None
        partner.first_meeting_date = None
        db.add(partner)
    
    db.add(current_user)
    await db.commit()
    await db.refresh(current_user)
    
    return {"message": "Disconnected successfully"}

@router.delete("/me", status_code=204)
async def delete_user_me(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete current user account.
    Only allowed if not connected to a partner.
    Deletes all related data (places, memories, notifications).
    """
    if current_user.partner_id is not None:
        raise HTTPException(
            status_code=400, 
            detail="Cannot delete account while connected to a partner. Please disconnect first."
        )

    # 1. Delete Notifications (recipient is user)
    # We need to import Notification model
    from app.models.notification import Notification
    await db.execute(
        select(Notification).filter(Notification.recipient_id == current_user.id).execution_options(synchronize_session=False)
    )
    # Actually delete statement
    from sqlalchemy import delete
    await db.execute(delete(Notification).where(Notification.recipient_id == current_user.id))

    # 2. Delete Memories created by user
    # Note: Memories are cascaded from Place if place is deleted?
    # But if user created memory in partner's place (if shared logic exists), we should delete them too.
    # Currently Place has user_id, Memory has user_id.
    await db.execute(delete(Memory).where(Memory.user_id == current_user.id))

    # 3. Delete Places created by user
    # This will cascade delete memories attached to these places due to relationship cascade
    # (assuming Place.memories has cascade="all, delete-orphan")
    await db.execute(delete(Place).where(Place.user_id == current_user.id))

    # 4. Delete User
    await db.delete(current_user)
    await db.commit()
    
    return None

@router.patch("/me", response_model=UserResponse)
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
    if user_update.emoji is not None:
        current_user.emoji = user_update.emoji
    if user_update.first_meeting_date is not None:
        current_user.first_meeting_date = user_update.first_meeting_date
        # Sync with partner if connected
        if current_user.partner_id:
            result = await db.execute(select(User).filter(User.id == current_user.partner_id))
            partner = result.scalars().first()
            if partner:
                partner.first_meeting_date = user_update.first_meeting_date
                db.add(partner)
        
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
    
    # Prepare response
    partner_data = None
    if current_user.partner_id:
        result = await db.execute(select(User).filter(User.id == current_user.partner_id))
        partner_user = result.scalars().first()
        if partner_user:
            partner_data = PartnerResponse(
                nickname=partner_user.nickname,
                birthdate=partner_user.birthdate,
                gender=partner_user.gender,
                profile_image=partner_user.profile_image,
                emoji=partner_user.emoji
            )

    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        nickname=current_user.nickname,
        profile_image=current_user.profile_image,
        birthdate=current_user.birthdate,
        gender=current_user.gender,
        personal_code=current_user.personal_code,
        emoji=current_user.emoji,
        first_meeting_date=current_user.first_meeting_date,
        partner=partner_data
    )

@router.get("/couple-stats")
async def get_couple_stats(
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    if not current_user.partner_id:
        return {"places": 0, "memories": 0, "images": 0}
        
    partner_id = current_user.partner_id
    
    # 1. Count Places (Owned by either user)
    places_query = select(Place).filter(
        or_(
            Place.user_id == current_user.id,
            Place.user_id == partner_id
        )
    )
    result = await db.execute(places_query)
    places = result.scalars().all()
    place_count = len(places)
    place_ids = [p.id for p in places]
    
    memory_count = 0
    image_count = 0
    
    if place_ids:
        # 2. Count Memories
        memories_query = select(Memory).filter(Memory.place_id.in_(place_ids))
        result = await db.execute(memories_query)
        memories = result.scalars().all()
        memory_count = len(memories)
        
        # 3. Count Images
        for memory in memories:
            if memory.images:
                image_count += len(memory.images)
                
    return {
        "places": place_count,
        "memories": memory_count,
        "images": image_count
    }
