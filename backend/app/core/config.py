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

    # Google OAuth
    GOOGLE_CLIENT_ID: str = Field(..., env="GOOGLE_CLIENT_ID")
    GOOGLE_CLIENT_SECRET: str = Field(..., env="GOOGLE_CLIENT_SECRET")
    
    # Security
    SECRET_KEY: str = Field(..., env="SECRET_KEY")
    API_KEY: str = Field(..., env="API_KEY")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7
    
    # Environment
    ENVIRONMENT: str = Field("local", env="ENVIRONMENT")
    DOMAIN: str = Field("http://localhost", env="DOMAIN")
    BACKEND_CORS_ORIGINS: list[str] = Field(
        default=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost",
            "http://127.0.0.1"
        ],
        env="BACKEND_CORS_ORIGINS"
    )

    # Redis
    REDIS_HOST: str = Field("redis", env="REDIS_HOST")
    REDIS_PORT: int = Field(6379, env="REDIS_PORT")

    # Look for .env in current dir, or parent dir (backend), or root dir
    model_config = SettingsConfigDict(
        env_file=[".env", "../.env", "../../.env"], 
        env_file_encoding='utf-8',
        extra='ignore'
    )

settings = Settings()
