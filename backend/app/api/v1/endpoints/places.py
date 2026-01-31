from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import or_, desc
from sqlalchemy.orm import selectinload
from pydantic import BaseModel
from typing import List, Optional
from datetime import date, datetime
from app.db.session import get_db
from app.models.place import Place, Memory
from app.models.user import User
from app.api.v1.endpoints.users import get_current_user
from app.storage.client import upload_file
from app.core.socket import manager
from app.api.v1.endpoints.notifications import create_notification

router = APIRouter()

# --- Pydantic Schemas ---

class MemoryCreate(BaseModel):
    visit_date: date
    description: Optional[str] = None

class MemoryResponse(BaseModel):
    id: int
    place_id: int
    user_id: int
    visit_date: date
    description: Optional[str]
    images: List[str] = []
    created_at: Optional[datetime]

    class Config:
        from_attributes = True

class PlaceCreate(BaseModel):
    name: str
    address: Optional[str] = None
    latitude: float
    longitude: float
    tags: Optional[List[str]] = []
    color: Optional[str] = "#FF5733"

class PlaceUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    tags: Optional[List[str]] = None
    color: Optional[str] = None

class PlaceResponse(BaseModel):
    id: int
    user_id: int
    name: str
    address: Optional[str]
    latitude: float
    longitude: float
    tags: Optional[List[str]]
    color: str
    memories: List[MemoryResponse] = []

    class Config:
        from_attributes = True

# --- Endpoints ---

@router.get("/", response_model=List[PlaceResponse])
async def read_places(
    q: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get all places for the current user and their partner, including memories.
    Optionally filter by name or address with 'q'.
    """
    query = select(Place).options(selectinload(Place.memories))
    
    if current_user.partner_id:
        query = query.filter(
            or_(
                Place.user_id == current_user.id,
                Place.user_id == current_user.partner_id
            )
        )
    else:
        query = query.filter(Place.user_id == current_user.id)
    
    if q:
        search_term = f"%{q}%"
        query = query.filter(
            or_(
                Place.name.ilike(search_term),
                Place.address.ilike(search_term)
            )
        )

    result = await db.execute(query)
    places = result.scalars().all()
    return places

@router.post("/", response_model=PlaceResponse)
async def create_place(
    place_in: PlaceCreate,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new place (without memories initially).
    """
    new_place = Place(
        user_id=current_user.id,
        name=place_in.name,
        address=place_in.address,
        latitude=place_in.latitude,
        longitude=place_in.longitude,
        tags=place_in.tags,
        color=place_in.color
    )
    db.add(new_place)
    await db.commit()
    await db.refresh(new_place)
    # Eager load memories (empty) for schema consistency
    result = await db.execute(select(Place).options(selectinload(Place.memories)).filter(Place.id == new_place.id))
    
    # Notify partner
    if current_user.partner_id:
        try:
            await create_notification(
                db=db,
                user_id=current_user.partner_id,
                type="place_create",
                title="새로운 장소!",
                message=f"{current_user.nickname or '짝꿍'}님이 '{new_place.name}' 장소를 추가했어요.",
                related_id=new_place.id
            )
        except Exception as e:
            print(f"Failed to send notification: {e}")

    return result.scalars().first()

@router.post("/{place_id}/memories", response_model=MemoryResponse)
async def create_memory(
    place_id: int,
    visit_date: str = Form(...),
    description: Optional[str] = Form(None),
    images: List[UploadFile] = File(default=[]),
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Add a memory to a place with optional photos (max 5).
    """
    # Check permissions
    query = select(Place).filter(Place.id == place_id)
    result = await db.execute(query)
    place = result.scalars().first()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
        
    is_owner = place.user_id == current_user.id
    is_partner = current_user.partner_id and place.user_id == current_user.partner_id
    
    if not (is_owner or is_partner):
        raise HTTPException(status_code=403, detail="Not authorized")

    if len(images) > 5:
        raise HTTPException(status_code=400, detail="Maximum 5 images allowed per memory")

    # Upload images
    image_urls = []
    for image in images:
        try:
            content = await image.read()
            url = await upload_file(content, image.filename, image.content_type)
            image_urls.append(url)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        except Exception as e:
            print(f"Upload failed: {e}")
            raise HTTPException(status_code=500, detail="Image upload failed")

    # Convert visit_date string to date object
    try:
        visit_date_obj = date.fromisoformat(visit_date)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid date format. Use YYYY-MM-DD")

    new_memory = Memory(
        place_id=place_id,
        user_id=current_user.id,
        visit_date=visit_date_obj,
        description=description,
        images=image_urls
    )
    db.add(new_memory)
    await db.commit()
    await db.refresh(new_memory)

    # Notify partner
    if current_user.partner_id:
        try:
            await create_notification(
                db=db,
                user_id=current_user.partner_id,
                type="memory_create",
                title="새로운 추억!",
                message=f"{current_user.nickname or '짝꿍'}님이 추억을 남겼어요.",
                related_id=place_id
            )
        except Exception as e:
            print(f"Failed to send notification: {e}")

    return new_memory

@router.delete("/{place_id}")
async def delete_place(
    place_id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a place.
    """
    query = select(Place).filter(Place.id == place_id)
    result = await db.execute(query)
    place = result.scalars().first()
    
    if not place:
        raise HTTPException(status_code=404, detail="Place not found")
        
    is_owner = place.user_id == current_user.id
    if not is_owner:
        raise HTTPException(status_code=403, detail="Only the creator can delete this place")
        
    await db.delete(place)
    await db.commit()
    return {"status": "success"}
