from sqlalchemy import Column, Integer, String, Float, ForeignKey, Text, JSON, Date, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.db.base import Base

class Place(Base):
    __tablename__ = "places"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    name = Column(String, nullable=False)
    address = Column(String, nullable=True)
    latitude = Column(Float, nullable=False)
    longitude = Column(Float, nullable=False)
    
    # Tags as JSON list ["tag1", "tag2"]
    tags = Column(JSON, nullable=True)
    
    # Hex color code e.g. "#FF5733"
    color = Column(String, default="#FF5733")
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", backref="places")
    memories = relationship("Memory", back_populates="place", cascade="all, delete-orphan")

class Memory(Base):
    __tablename__ = "memories"

    id = Column(Integer, primary_key=True, index=True)
    place_id = Column(Integer, ForeignKey("places.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    visit_date = Column(Date, nullable=False)
    description = Column(Text, nullable=True) # Note/Content
    
    # List of image URLs or filenames (Max 5 enforced by API)
    images = Column(JSON, default=[])
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    place = relationship("Place", back_populates="memories")
    user = relationship("User")
