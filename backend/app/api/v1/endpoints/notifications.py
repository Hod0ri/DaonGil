from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, Depends, HTTPException
from app.core.socket import manager
from app.core.config import settings
import jwt
from app.db.session import get_db
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.user import User
from app.models.notification import Notification
from app.api.v1.endpoints.users import get_current_user
from sqlalchemy.future import select
from sqlalchemy import desc
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

router = APIRouter()

# --- Schemas ---
class NotificationResponse(BaseModel):
    id: int
    type: str
    title: str
    message: str
    related_id: Optional[int] = None
    is_read: bool
    created_at: datetime

    class Config:
        from_attributes = True

# --- Helper Function ---
async def create_notification(
    db: AsyncSession,
    user_id: int,
    type: str,
    title: str,
    message: str,
    related_id: Optional[int] = None
):
    """
    Creates a notification in DB and sends it via WebSocket.
    """
    # 1. Save to DB
    new_noti = Notification(
        user_id=user_id,
        type=type,
        title=title,
        message=message,
        related_id=related_id,
        is_read=False
    )
    db.add(new_noti)
    await db.commit()
    await db.refresh(new_noti)

    # 2. Send via WebSocket
    # Note: We send the DB ID so frontend can mark it as read later
    payload = {
        "id": new_noti.id,
        "type": type,
        "title": title,
        "message": message,
        "related_id": related_id,
        "created_at": new_noti.created_at.isoformat(),
        "is_read": False
    }
    
    await manager.send_personal_message({
        "type": "NOTIFICATION",
        "payload": payload
    }, user_id)
    
    return new_noti

# --- REST Endpoints ---

@router.get("/", response_model=List[NotificationResponse])
async def get_notifications(
    skip: int = 0,
    limit: int = 50,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    query = select(Notification).filter(
        Notification.user_id == current_user.id
    ).order_by(desc(Notification.created_at)).offset(skip).limit(limit)
    result = await db.execute(query)
    return result.scalars().all()

@router.patch("/{id}/read", response_model=NotificationResponse)
async def mark_notification_read(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Notification).filter(Notification.id == id, Notification.user_id == current_user.id))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    notification.is_read = True
    await db.commit()
    await db.refresh(notification)
    return notification

@router.delete("/{id}")
async def delete_notification(
    id: int,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(select(Notification).filter(Notification.id == id, Notification.user_id == current_user.id))
    notification = result.scalars().first()
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    await db.delete(notification)
    await db.commit()
    return {"message": "Notification deleted"}

# --- WebSocket Endpoint ---

async def get_user_from_token(token: str, db: AsyncSession):
    try:
        # Note: In production, verify exp/iat claims strictly
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            return None
        
        result = await db.execute(select(User).filter(User.id == int(user_id)))
        user = result.scalars().first()
        return user
    except Exception as e:
        print(f"WS Auth Error: {e}")
        return None

@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket, 
    token: str = Query(...),
    db: AsyncSession = Depends(get_db)
):
    user = await get_user_from_token(token, db)
    if user is None:
        await websocket.close(code=4003)
        return

    await manager.connect(websocket, user.id)
    try:
        while True:
            # Keep the connection open and listen for client messages (e.g. ping)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        manager.disconnect(websocket, user.id)
    except Exception as e:
        print(f"WS Error: {e}")
        manager.disconnect(websocket, user.id)
