from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.db.base import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    google_id = Column(String, unique=True, index=True, nullable=True)
    full_name = Column(String, nullable=True)
    nickname = Column(String, nullable=True)
    profile_image = Column(String, nullable=True)
    
    # Profile fields
    birthdate = Column(Date, nullable=True)
    gender = Column(String, nullable=True)  # 'M' or 'F' or 'O'
    
    # Couple Logic
    personal_code = Column(String, unique=True, index=True, nullable=True)
    partner_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)

    partner = relationship("User", remote_side=[id], backref="partner_reverse", uselist=False)
