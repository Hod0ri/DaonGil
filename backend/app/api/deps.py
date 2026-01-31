from fastapi import Security, HTTPException, status
from fastapi.security import APIKeyHeader, APIKeyQuery
from app.core.config import settings

api_key_header = APIKeyHeader(name="x-api-key", auto_error=False)
api_key_query = APIKeyQuery(name="api_key", auto_error=False)

async def verify_api_key(
    header_key: str = Security(api_key_header),
    query_key: str = Security(api_key_query)
):
    if header_key == settings.API_KEY:
        return header_key
    if query_key == settings.API_KEY:
        return query_key
        
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Could not validate API KEY"
    )
