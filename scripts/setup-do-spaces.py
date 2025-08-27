#!/usr/bin/env python3
"""
Set up DigitalOcean Spaces for permanent image storage
"""
import boto3
import os
from dotenv import load_dotenv

def setup_spaces():
    print("🚀 Setting up DigitalOcean Spaces for Image Storage")
    print("=" * 60)
    
    # Load environment variables from the API .env file
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    env_path = os.path.join(project_root, 'apps', 'api', '.env')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        print(f"📁 Loading environment from: {env_path}")
    else:
        print(f"⚠️  No .env file found at: {env_path}")
        load_dotenv()  # Try current directory as fallback
    
    # Check if Spaces credentials are provided
    spaces_key = os.getenv('SPACES_KEY')
    spaces_secret = os.getenv('SPACES_SECRET')
    spaces_bucket = os.getenv('SPACES_BUCKET')
    spaces_region = os.getenv('SPACES_REGION', 'sfo3')
    
    if not all([spaces_key, spaces_secret, spaces_bucket]):
        print("\n❌ Missing DigitalOcean Spaces configuration!")
        print("\nTo set up Spaces:")
        print("1. Go to: https://cloud.digitalocean.com/spaces")
        print("2. Click 'Create a Space'")
        print("3. Choose region (recommend: sfo3)")
        print("4. Choose a unique bucket name (e.g., customer-help-images)")
        print("5. Create API keys at: https://cloud.digitalocean.com/account/api/spaces")
        print("\n📝 Then add to your apps/api/.env file:")
        print("SPACES_KEY=your_spaces_key")
        print("SPACES_SECRET=your_spaces_secret")
        print("SPACES_BUCKET=your_bucket_name")
        print("SPACES_REGION=sfo3")
        print("SPACES_CDN_ENDPOINT=https://your_bucket_name.sfo3.cdn.digitaloceanspaces.com")
        return False
    
    try:
        # Create Spaces client
        client = boto3.client(
            's3',
            endpoint_url=f"https://{spaces_region}.digitaloceanspaces.com",
            aws_access_key_id=spaces_key,
            aws_secret_access_key=spaces_secret,
            region_name=spaces_region
        )
        
        # Check if bucket exists
        try:
            client.head_bucket(Bucket=spaces_bucket)
            print(f"✅ Bucket '{spaces_bucket}' already exists")
        except client.exceptions.NoSuchBucket:
            # Create bucket
            client.create_bucket(Bucket=spaces_bucket)
            print(f"✅ Created bucket '{spaces_bucket}'")
        
        # Set CORS policy to allow web access
        cors_configuration = {
            'CORSRules': [{
                'AllowedHeaders': ['*'],
                'AllowedMethods': ['GET', 'HEAD'],
                'AllowedOrigins': ['*'],
                'ExposeHeaders': ['ETag'],
                'MaxAgeSeconds': 3000
            }]
        }
        
        try:
            client.put_bucket_cors(Bucket=spaces_bucket, CORSConfiguration=cors_configuration)
            print("✅ Set CORS policy for web access")
        except Exception as cors_error:
            print(f"⚠️  Could not set CORS policy: {cors_error}")
            print("💡 This is usually fine - you can set CORS manually in the DigitalOcean console:")
            print("   1. Go to your Spaces bucket settings")
            print("   2. Click 'Settings' tab")
            print("   3. Add CORS rule: Origin: *, Methods: GET,HEAD")
        
        # Test upload
        test_key = "test/setup-test.txt"
        client.put_object(
            Bucket=spaces_bucket,
            Key=test_key,
            Body=b"This is a test file to verify Spaces setup",
            ContentType="text/plain",
            ACL='public-read'
        )
        print("✅ Test upload successful")
        
        # Get the URL
        test_url = f"https://{spaces_bucket}.{spaces_region}.digitaloceanspaces.com/{test_key}"
        print(f"✅ Test file URL: {test_url}")
        
        # Clean up test file
        client.delete_object(Bucket=spaces_bucket, Key=test_key)
        print("✅ Cleaned up test file")
        
        print(f"\n🎉 DigitalOcean Spaces setup complete!")
        print(f"📦 Bucket: {spaces_bucket}")
        print(f"🌎 Region: {spaces_region}")
        print(f"🔗 Base URL: https://{spaces_bucket}.{spaces_region}.digitaloceanspaces.com")
        
        # Recommend CDN setup
        print(f"\n💡 Optional: Enable CDN for faster loading:")
        print(f"1. Go to your Spaces bucket settings")
        print(f"2. Enable CDN")
        print(f"3. Add to apps/api/.env: SPACES_CDN_ENDPOINT=https://{spaces_bucket}.{spaces_region}.cdn.digitaloceanspaces.com")
        
        return True
        
    except Exception as e:
        print(f"❌ Error setting up Spaces: {e}")
        return False

if __name__ == "__main__":
    success = setup_spaces()
    if not success:
        exit(1)
