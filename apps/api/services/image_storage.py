import asyncio
import os
import hashlib
import httpx
import boto3
from typing import Optional
from urllib.parse import urlparse
from apps.api.core.settings import settings

class ImageStorageService:
    """Service to download Notion images and store them permanently in DigitalOcean Spaces"""
    
    def __init__(self):
        # DigitalOcean Spaces configuration (compatible with S3 API)
        print(f"🔧 Initializing ImageStorageService...")
        print(f"   Region: {settings.spaces_region}")
        print(f"   Bucket: {settings.spaces_bucket}")
        print(f"   Key: {settings.spaces_key[:10]}...")
        
        try:
            self.spaces_client = boto3.client(
                's3',
                endpoint_url=f"https://{settings.spaces_region}.digitaloceanspaces.com",
                aws_access_key_id=settings.spaces_key,
                aws_secret_access_key=settings.spaces_secret,
                region_name=settings.spaces_region
            )
            self.bucket_name = settings.spaces_bucket
            self.cdn_endpoint = settings.spaces_cdn_endpoint
            print(f"✅ Successfully created boto3 client for {self.bucket_name}")
        except Exception as e:
            print(f"❌ Failed to create boto3 client: {e}")
            raise
    
    def _generate_image_key(self, page_id: str, block_id: str, original_url: str) -> str:
        """Generate a unique key for the image in Spaces"""
        # Extract file extension from URL if possible
        parsed_url = urlparse(original_url)
        path = parsed_url.path
        extension = os.path.splitext(path)[1] if path else '.jpg'
        
        # If no extension found, try to detect from URL patterns
        if not extension:
            if 'image' in original_url.lower():
                extension = '.jpg'  # Default for images
            else:
                extension = '.png'  # Default fallback
        
        # Create a hash of the original URL for uniqueness
        url_hash = hashlib.md5(original_url.encode()).hexdigest()[:8]
        
        return f"notion-images/{page_id}/{block_id}_{url_hash}{extension}"
    
    async def store_notion_image(self, page_id: str, block_id: str, notion_url: str) -> Optional[str]:
        """
        Download image from Notion and store in DigitalOcean Spaces
        Returns the permanent CDN URL or None if failed
        
        Uses immediate processing with retry logic for expired URLs
        """
        try:
            # Skip if not a Notion-hosted image
            if not self._is_notion_hosted_image(notion_url):
                return notion_url  # Return original URL for external images
            
            # Generate unique key for this image
            image_key = self._generate_image_key(page_id, block_id, notion_url)
            
            # Check if image already exists in Spaces
            try:
                self.spaces_client.head_object(Bucket=self.bucket_name, Key=image_key)
                # Image already exists, return CDN URL
                print(f"♻️  Image already cached: {image_key}")
                return self._get_cdn_url(image_key)
            except Exception as e:
                # Image doesn't exist (or any other error), need to download and upload
                print(f"🔍 Image not cached (expected): {str(e)[:100]}...")
                pass
            
            # Try to download image with fresh URL debugging
            max_retries = 2
            print(f"🔍 Analyzing fresh URL...")
            print(f"   Length: {len(notion_url)} characters")
            print(f"   Domain: {urlparse(notion_url).netloc}")
            print(f"   Path starts: {urlparse(notion_url).path[:50]}...")
            
            for attempt in range(max_retries + 1):
                try:
                    print(f"⬇️  Downloading image (attempt {attempt + 1}/{max_retries + 1}): {notion_url[:50]}...")
                    
                    async with httpx.AsyncClient(timeout=30.0) as client:
                        response = await client.get(notion_url)
                        response.raise_for_status()
                        image_data = response.content
                        
                    # If we get here, download was successful
                    print(f"✅ Download successful! Got {len(image_data)} bytes")
                    break
                    
                except httpx.HTTPStatusError as e:
                    if e.response.status_code == 404:
                        print(f"❌ 404 Error on fresh URL (attempt {attempt + 1})")
                        print(f"   URL: {notion_url[:100]}...")
                        print(f"   Response headers: {dict(e.response.headers)}")
                        if attempt < max_retries:
                            print(f"   Retrying in 2 seconds...")
                            await asyncio.sleep(2)
                            continue
                        else:
                            print(f"   All attempts failed - URL may be invalid")
                            return None
                    else:
                        print(f"❌ HTTP error {e.response.status_code}: {e}")
                        return None
                except Exception as e:
                    print(f"❌ Download error: {e}")
                    return None
            
            # Determine content type
            content_type = response.headers.get('content-type', 'image/jpeg')
            
            # Upload to DigitalOcean Spaces
            self.spaces_client.put_object(
                Bucket=self.bucket_name,
                Key=image_key,
                Body=image_data,
                ContentType=content_type,
                ACL='public-read',  # Make publicly accessible
                CacheControl='max-age=31536000'  # Cache for 1 year
            )
            
            # Return CDN URL
            cdn_url = self._get_cdn_url(image_key)
            print(f"✅ Stored image: {notion_url} -> {cdn_url}")
            return cdn_url
            
        except Exception as e:
            print(f"❌ Failed to store image {notion_url}: {str(e)}")
            return None  # Return None to indicate failure
    
    def _is_notion_hosted_image(self, url: str) -> bool:
        """Check if the URL is a Notion-hosted image that expires"""
        return ('secure.notion-static.com' in url or 
                'prod-files-secure' in url or
                's3.us-west-2.amazonaws.com' in url)
    
    def _get_cdn_url(self, image_key: str) -> str:
        """Get the CDN URL for an image in Spaces"""
        if self.cdn_endpoint:
            return f"{self.cdn_endpoint}/{image_key}"
        else:
            return f"https://{self.bucket_name}.{settings.spaces_region}.digitaloceanspaces.com/{image_key}"
    
    async def cleanup_old_images(self, page_id: str):
        """Remove old images for a page when it's updated"""
        try:
            # List all objects with the page prefix
            response = self.spaces_client.list_objects_v2(
                Bucket=self.bucket_name,
                Prefix=f"notion-images/{page_id}/"
            )
            
            if 'Contents' in response:
                # Delete all objects for this page
                objects_to_delete = [{'Key': obj['Key']} for obj in response['Contents']]
                if objects_to_delete:
                    self.spaces_client.delete_objects(
                        Bucket=self.bucket_name,
                        Delete={'Objects': objects_to_delete}
                    )
                    print(f"🗑️  Cleaned up {len(objects_to_delete)} old images for page {page_id}")
        except Exception as e:
            print(f"⚠️  Failed to cleanup old images for page {page_id}: {str(e)}")
