#!/usr/bin/env python3
"""
Set up environment variables for the web app
"""
import os
import sys
from pathlib import Path

# Get project root
project_root = Path(__file__).parent.parent

# Check if web .env exists
web_env_path = project_root / 'apps' / 'web' / '.env'
web_env_template = project_root / 'apps' / 'web' / 'env.template'

if web_env_path.exists():
    print("✅ Web .env file already exists")
    # Read and check for required variables
    with open(web_env_path, 'r') as f:
        content = f.read()
        if 'NEXT_PUBLIC_REVALIDATE_TOKEN' not in content:
            print("⚠️  NEXT_PUBLIC_REVALIDATE_TOKEN not found in .env")
            print("   Adding it now...")
            with open(web_env_path, 'a') as f:
                f.write('\n# Public version for frontend admin access\n')
                f.write('NEXT_PUBLIC_REVALIDATE_TOKEN=local-dev-token-change-me\n')
            print("✅ Added NEXT_PUBLIC_REVALIDATE_TOKEN to .env")
else:
    print("❌ Web .env file not found")
    if web_env_template.exists():
        print("📝 Creating from template...")
        import shutil
        shutil.copy(web_env_template, web_env_path)
        
        # Replace placeholder values
        with open(web_env_path, 'r') as f:
            content = f.read()
        
        content = content.replace('your-secure-revalidate-token', 'local-dev-token-change-me')
        content = content.replace('sk-proj-your-openai-key-here', 'sk-proj-your-actual-key-here')
        
        with open(web_env_path, 'w') as f:
            f.write(content)
        
        print("✅ Created web/.env from template")
        print("⚠️  Please update the following in apps/web/.env:")
        print("   - OPENAI_API_KEY (if using chat)")
        print("   - REVALIDATE_TOKEN (should match API .env)")
    else:
        print("❌ No template found. Please create apps/web/.env manually")
        sys.exit(1)

# Check API .env for matching token
api_env_path = project_root / 'apps' / 'api' / '.env'
if api_env_path.exists():
    with open(api_env_path, 'r') as f:
        api_content = f.read()
        # Extract REVALIDATE_TOKEN from API
        import re
        match = re.search(r'REVALIDATE_TOKEN=(.+)', api_content)
        if match:
            api_token = match.group(1).strip()
            print(f"\n📝 API REVALIDATE_TOKEN found: {api_token[:20]}...")
            print("⚠️  Make sure your web/.env has the same token!")

print("\n✅ Web environment setup complete!")
print("\n📝 Next steps:")
print("1. Ensure REVALIDATE_TOKEN matches between API and Web .env files")
print("2. Run 'npm run dev' in the web directory")
print("3. Access admin panel at http://localhost:3000/admin")
