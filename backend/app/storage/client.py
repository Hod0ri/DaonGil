from minio import Minio
from app.core.config import settings
import io
import uuid

minio_client = Minio(
    settings.MINIO_ENDPOINT,
    access_key=settings.MINIO_ROOT_USER,
    secret_key=settings.MINIO_ROOT_PASSWORD,
    secure=False
)

def ensure_bucket_exists():
    try:
        if not minio_client.bucket_exists(settings.MINIO_BUCKET_NAME):
            minio_client.make_bucket(settings.MINIO_BUCKET_NAME)
        
        # Always set public read policy for the bucket to ensure access
        policy = {
            "Version": "2012-10-17",
            "Statement": [
                {
                    "Effect": "Allow",
                    "Principal": {"AWS": ["*"]},
                    "Action": ["s3:GetObject"],
                    "Resource": [f"arn:aws:s3:::{settings.MINIO_BUCKET_NAME}/*"]
                }
            ]
        }
        import json
        minio_client.set_bucket_policy(settings.MINIO_BUCKET_NAME, json.dumps(policy))
            
    except Exception as e:
        print(f"Failed to check/create bucket: {e}")

async def upload_file(file_data: bytes, filename: str, content_type: str) -> str:
    ensure_bucket_exists()
    
    ext = filename.split('.')[-1] if '.' in filename else 'jpg'
    object_name = f"{uuid.uuid4()}.{ext}"
    
    minio_client.put_object(
        settings.MINIO_BUCKET_NAME,
        object_name,
        io.BytesIO(file_data),
        len(file_data),
        content_type=content_type
    )
    
    # Return URL (relative or absolute depending on client needs)
    # Ideally, we return the object name, and client constructs URL, or we return full URL.
    # For simplicity, let's return the relative path (object name).
    # The frontend can construct the URL: http://localhost:9000/bucket-name/object-name
    # Or we can return the full public URL if we know the public endpoint.
    return object_name

def delete_files(object_names: list[str]):
    if not object_names:
        return
        
    try:
        from minio.deleteobjects import DeleteObject
        
        objects_to_delete = [DeleteObject(name) for name in object_names]
        errors = minio_client.remove_objects(settings.MINIO_BUCKET_NAME, objects_to_delete)
        
        # remove_objects returns an iterator that must be iterated to process the deletion
        for error in errors:
            print(f"Error occurred when deleting object: {error}")
            
    except Exception as e:
        print(f"Failed to delete files: {e}")
