from pydantic_settings import BaseSettings, SettingsConfigDict
from pydantic import Field
import os

class Settings(BaseSettings):
    PROJECT_NAME: str = Field(..., env="PROJECT_NAME")
    
    # Database
    POSTGRES_USER: str = Field(..., env="POSTGRES_USER")
    POSTGRES_PASSWORD: str = Field(..., env="POSTGRES_PASSWORD")
    POSTGRES_SERVER: str = Field(..., env="POSTGRES_SERVER")
    POSTGRES_DB: str = Field(..., env="POSTGRES_DB")
    
    # MinIO
    MINIO_ENDPOINT: str = Field(..., env="MINIO_ENDPOINT")
    MINIO_ROOT_USER: str = Field(..., env="MINIO_ROOT_USER")
    MINIO_ROOT_PASSWORD: str = Field(..., env="MINIO_ROOT_PASSWORD")
    MINIO_BUCKET_NAME: str = Field(..., env="MINIO_BUCKET_NAME")

    # Look for .env in current dir, or parent dir (backend), or root dir
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env", "../../.env"], 
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
