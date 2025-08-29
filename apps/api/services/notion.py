from notion_client import AsyncClient
from typing import List, Dict, Optional, Tuple
import markdown
from bs4 import BeautifulSoup
import re
from datetime import datetime
from .image_storage import ImageStorageService

# Try both import paths to work in different contexts
try:
    from core.settings import settings  # When running from apps/api directory
except ImportError:
    from apps.api.core.settings import settings  # When running from project root

class NotionService:
    def __init__(self):
        self.client = AsyncClient(auth=settings.notion_token)
        # Initialize image storage service if Spaces are configured
        self.image_storage = None
        if all([settings.spaces_key, settings.spaces_secret, settings.spaces_bucket]):
            try:
                self.image_storage = ImageStorageService()
                # print("✅ ImageStorageService initialized successfully")
            except Exception as e:
                print(f"❌ Failed to initialize ImageStorageService: {e}")
                self.image_storage = None
        else:
            missing = []
            if not settings.spaces_key: missing.append('SPACES_KEY')
            if not settings.spaces_secret: missing.append('SPACES_SECRET') 
            if not settings.spaces_bucket: missing.append('SPACES_BUCKET')
            print(f"⚠️  ImageStorageService not initialized. Missing: {missing}")
    
    async def fetch_index_blocks(self, index_page_id: str) -> List[Dict]:
        """Fetch all blocks from the index page with pagination"""
        blocks = []
        has_more = True
        start_cursor = None
        
        while has_more:
            response = await self.client.blocks.children.list(
                block_id=index_page_id,
                start_cursor=start_cursor,
                page_size=100
            )
            blocks.extend(response['results'])
            has_more = response['has_more']
            start_cursor = response.get('next_cursor')
        
        return blocks
    
    async def walk_index(self, index_page_id: str) -> List[Dict[str, str]]:
        """Walk the index page and extract page links with their categories"""
        blocks = await self.fetch_index_blocks(index_page_id)
        pages = []
        current_heading = None
        
        print(f"🔍 Processing {len(blocks)} blocks from index page...")
        
        for i, block in enumerate(blocks):
            block_type = block['type']
            
            # Update current heading when we encounter a heading block
            if block_type in ['heading_1', 'heading_2', 'heading_3']:
                heading_text = self._extract_text_from_block(block)
                print(f"📋 Found heading: '{heading_text}'")
                if heading_text:
                    # Map to our categories (case-insensitive and more flexible)
                    heading_lower = heading_text.lower()
                    if 'library' in heading_lower:
                        current_heading = 'Library'
                    elif 'token payroll' in heading_lower or 'payroll' in heading_lower:
                        current_heading = 'Token Payroll'
                    elif 'benefit' in heading_lower:  # More flexible - catches "Benefits", "Benefit", etc.
                        current_heading = 'Benefits'
                        # print(f"✅ Benefits section detected!")
                    elif 'polic' in heading_lower:  # Catches "Policy", "Policies"
                        current_heading = 'Policy'
                    else:
                        # Use the heading text as-is if it doesn't match predefined categories
                        current_heading = heading_text
                    print(f"📂 Category set to: {current_heading}")
            # sections found
            
            # Extract page links
            elif block_type == 'child_page':
                page_id = block['id']
                category = current_heading or 'Library'
                pages.append({
                    'page_id': page_id,
                    'category': category
                })
                print(f"📄 Found child page (Category: {category})")
            
            elif block_type == 'link_to_page':
                page_id = block['link_to_page'].get('page_id')
                if page_id:
                    category = current_heading or 'Library'
                    pages.append({
                        'page_id': page_id,
                        'category': category
                    })
                    print(f"🔗 Found linked page (Category: {category})")
            
            # Check for inline page mentions in text blocks
            elif block_type in ['paragraph', 'bulleted_list_item', 'numbered_list_item']:
                rich_text = block.get(block_type, {}).get('rich_text', [])
                for text_obj in rich_text:
                    if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                        page_id = text_obj['mention']['page']['id']
                        category = current_heading or 'Library'
                        pages.append({
                            'page_id': page_id,
                            'category': category
                        })
                        print(f"📎 Found inline page mention (Category: {category})")
        
        # Summary of categorization
        category_counts = {}
        for page in pages:
            cat = page['category']
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        print(f"\n📊 Final categorization summary:")
        for category, count in sorted(category_counts.items()):
            print(f"   {category}: {count} pages")
            if category == 'Benefits':
                print(f"   ✅ Benefits pages will be processed!")
        
        # Get nested pages for ALL pages (not just Benefits)
        print("\n🔍 Checking for nested pages in all sections...")
        all_page_ids = {p['page_id'] for p in pages}  # Track to avoid duplicates
        nested_pages_to_add = []
        
        for page in pages:
            print(f"\n📂 Exploring nested pages in: {page['page_id']} (Category: {page['category']})")
            try:
                # Get child pages from this page
                nested_pages = await self._get_nested_pages(page['page_id'], page['category'], all_page_ids)
                nested_pages_to_add.extend(nested_pages)
                print(f"   ✅ Found {len(nested_pages)} new nested pages")
            except Exception as e:
                print(f"   ⚠️  Error getting nested pages: {e}")
        
        pages.extend(nested_pages_to_add)
        print(f"\n📊 Total pages to process: {len(pages)} (including {len(nested_pages_to_add)} nested pages)")
        
        return pages
    
    async def _get_nested_pages(self, parent_page_id: str, category: str, seen_ids: set = None) -> List[Dict[str, str]]:
        """Recursively get all nested child pages from a parent page"""
        if seen_ids is None:
            seen_ids = set()
            
        nested_pages = []
        
        try:
            # Get all blocks from this page
            blocks = await self.fetch_index_blocks(parent_page_id)
            
            for block in blocks:
                if block['type'] == 'child_page':
                    page_id = block['id']
                    
                    # Skip if we've already seen this page
                    if page_id in seen_ids:
                        continue
                        
                    seen_ids.add(page_id)
                    
                    # Add this page
                    nested_pages.append({
                        'page_id': page_id,
                        'category': category
                    })
                    
                    # Get the title for logging
                    title = block.get('child_page', {}).get('title', 'Untitled')
                    print(f"      📄 Found nested page: {title}")
                    
                # Also check for link_to_page blocks
                elif block['type'] == 'link_to_page':
                    page_id = block['link_to_page'].get('page_id')
                    if page_id and page_id not in seen_ids:
                        seen_ids.add(page_id)
                        nested_pages.append({
                            'page_id': page_id,
                            'category': category
                        })
                        print(f"      🔗 Found linked page")
                        
                # Check for page mentions in rich text
                elif block['type'] in ['paragraph', 'bulleted_list_item', 'numbered_list_item']:
                    rich_text = block.get(block['type'], {}).get('rich_text', [])
                    for text_obj in rich_text:
                        if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                            page_id = text_obj['mention']['page']['id']
                            if page_id not in seen_ids:
                                seen_ids.add(page_id)
                                nested_pages.append({
                                    'page_id': page_id,
                                    'category': category
                                })
                                print(f"      📎 Found page mention: {text_obj.get('plain_text', 'Link')}")
                
        except Exception as e:
            print(f"      ❌ Error fetching nested pages: {e}")
        
        return nested_pages
    
    async def fetch_page_detail(self, page_id: str) -> Dict:
        """Fetch page metadata and content with immediate image processing"""
        import time
        start_time = time.time()
        
        # Get page properties
        page = await self.client.pages.retrieve(page_id=page_id)
        
        # Extract title
        title = self._extract_page_title(page)
        
        # Get last edited time
        last_edited_time = datetime.fromisoformat(page['last_edited_time'].replace('Z', '+00:00'))
        
        # Clean up old images for this page if image storage is available
        if self.image_storage:
            try:
                await self.image_storage.cleanup_old_images(page_id)
            except Exception as e:
                print(f"⚠️  Failed to cleanup old images for page {page_id}: {e}")
        
        # Get all blocks (fresh to avoid expired URLs)
        fetch_start = time.time()
        blocks = await self._fetch_all_blocks(page_id)
        fetch_time = time.time() - fetch_start
        print(f"⏱️  Fetched {len(blocks)} blocks in {fetch_time:.2f}s")
        
        # Convert blocks to markdown (with immediate image processing)
        markdown_start = time.time()
        markdown_content = await self._blocks_to_markdown(blocks, page_id)
        markdown_time = time.time() - markdown_start
        print(f"⏱️  Processed blocks to markdown in {markdown_time:.2f}s")
        
        # Convert markdown to HTML
        html_content = markdown.markdown(
            markdown_content,
            extensions=['extra', 'codehilite', 'toc']
        )
        
        total_time = time.time() - start_time
        print(f"⏱️  Total page processing: {total_time:.2f}s")
        
        # Check if we successfully stored any images
        spaces_urls = markdown_content.count('digitaloceanspaces.com')
        notion_urls = markdown_content.count('prod-files-secure') + markdown_content.count('secure.notion-static.com')
        print(f"🖼️  Images: {spaces_urls} stored in Spaces, {notion_urls} still using Notion URLs")
        
        return {
            'page_id': page_id,
            'title': title,
            'content_md': markdown_content,
            'content_html': html_content,
            'last_edited_time': last_edited_time
        }
    
    async def _fetch_all_blocks(self, page_id: str) -> List[Dict]:
        """Recursively fetch all blocks including nested ones - always fresh to avoid expired URLs"""
        print(f"🔄 Fetching fresh blocks for page {page_id}...")
        blocks = []
        
        async def fetch_children(block_id: str, level: int = 0):
            has_more = True
            start_cursor = None
            
            while has_more:
                response = await self.client.blocks.children.list(
                    block_id=block_id,
                    start_cursor=start_cursor
                )
                
                for block in response['results']:
                    block['_level'] = level
                    blocks.append(block)
                    
                    # Recursively fetch children if block has them
                    if block.get('has_children'):
                        await fetch_children(block['id'], level + 1)
                
                has_more = response['has_more']
                start_cursor = response.get('next_cursor')
        
        await fetch_children(page_id)
        return blocks
    
    def _extract_text_from_block(self, block: Dict) -> str:
        """Extract plain text from a block"""
        block_type = block['type']
        if block_type not in block:
            return ""
        
        rich_text = block[block_type].get('rich_text', [])
        return ''.join(text['plain_text'] for text in rich_text)
    
    def _extract_page_title(self, page: Dict) -> str:
        """Extract title from page properties"""
        # Try different property names
        for prop_name in ['title', 'Title', 'Name', 'name']:
            if prop_name in page['properties']:
                prop = page['properties'][prop_name]
                if prop['type'] == 'title' and prop['title']:
                    return prop['title'][0]['plain_text']
        
        # Fallback to page ID
        return f"Page {page['id']}"
    
    def _get_caption_from_block(self, block: Dict) -> str:
        """Extract caption from image block if available"""
        image_data = block.get('image', {})
        caption_array = image_data.get('caption', [])
        if caption_array:
            return ''.join(text.get('plain_text', '') for text in caption_array)
        return ""
    
    async def _get_fresh_file_url(self, block_id: str) -> tuple[str, str]:
        """
        Get fresh file URL and expiry time for a specific block
        Returns (url, expiry_time) or (None, None) if failed
        """
        try:
            # Getting fresh URL for block
            # Fetch the specific block to get fresh file URL
            block = await self.client.blocks.retrieve(block_id=block_id)
            
            if block.get('type') == 'image':
                image_block = block.get('image', {})
                
                # Check for file type (Notion-hosted)
                if 'file' in image_block:
                    file_info = image_block['file']
                    url = file_info.get('url')
                    expiry_time = file_info.get('expiry_time')
                    
                    if url and expiry_time:
                        # print(f"✅ Fresh URL expires: {expiry_time}")
                        return url, expiry_time
                    elif url:
                        # print(f"✅ Fresh URL (no expiry field)")
                        return url, None
                
                # External URLs don't expire
                elif 'external' in image_block:
                    url = image_block['external'].get('url')
                    if url:
                        # print(f"🔗 External URL (no expiry): {url[:50]}...")
                        return url, None
                        
        except Exception as e:
            print(f"❌ Failed to get fresh file URL for {block_id}: {e}")
            
        return None, None
    
    async def _blocks_to_markdown(self, blocks: List[Dict], page_id: str) -> str:
        """Convert Notion blocks to markdown"""
        lines = []
        
        for block in blocks:
            block_type = block['type']
            level = block.get('_level', 0)
            indent = '  ' * level
            
            if block_type == 'paragraph':
                text = self._rich_text_to_markdown(block['paragraph']['rich_text'])
                if text:
                    lines.append(f"{indent}{text}\n")
            
            elif block_type == 'heading_1':
                text = self._rich_text_to_markdown(block['heading_1']['rich_text'])
                lines.append(f"{indent}# {text}\n")
            
            elif block_type == 'heading_2':
                text = self._rich_text_to_markdown(block['heading_2']['rich_text'])
                lines.append(f"{indent}## {text}\n")
            
            elif block_type == 'heading_3':
                text = self._rich_text_to_markdown(block['heading_3']['rich_text'])
                lines.append(f"{indent}### {text}\n")
            
            elif block_type == 'bulleted_list_item':
                text = self._rich_text_to_markdown(block['bulleted_list_item']['rich_text'])
                lines.append(f"{indent}- {text}")
            
            elif block_type == 'numbered_list_item':
                text = self._rich_text_to_markdown(block['numbered_list_item']['rich_text'])
                lines.append(f"{indent}1. {text}")
            
            elif block_type == 'code':
                code = self._rich_text_to_markdown(block['code']['rich_text'])
                language = block['code'].get('language', '')
                lines.append(f"{indent}```{language}\n{code}\n{indent}```\n")
            
            elif block_type == 'quote':
                text = self._rich_text_to_markdown(block['quote']['rich_text'])
                lines.append(f"{indent}> {text}\n")
            
            elif block_type == 'divider':
                lines.append(f"{indent}---\n")
            
            elif block_type == 'table':
                # Handle table blocks
                table_rows = []
                
                # Get table rows from children
                table_children = await self._fetch_block_children(block['id'])
                
                for row_block in table_children:
                    if row_block['type'] == 'table_row':
                        cells = row_block['table_row']['cells']
                        row_texts = []
                        for cell in cells:
                            cell_text = self._rich_text_to_markdown(cell)
                            row_texts.append(cell_text.strip() or ' ')
                        table_rows.append(row_texts)
                
                if table_rows:
                    # Create markdown table
                    lines.append(f"{indent}\n")  # Add spacing before table
                    
                    # Table header
                    if len(table_rows) > 0:
                        header = table_rows[0]
                        lines.append(f"{indent}| " + " | ".join(header) + " |")
                        # Header separator
                        lines.append(f"{indent}| " + " | ".join(["-" * max(3, len(cell)) for cell in header]) + " |")
                        
                        # Table body
                        for row in table_rows[1:]:
                            lines.append(f"{indent}| " + " | ".join(row) + " |")
                    
                    lines.append(f"{indent}\n")  # Add spacing after table
            
            elif block_type == 'callout':
                # Handle callout blocks (often used for formatted content like steps)
                emoji = block['callout'].get('icon', {}).get('emoji', '💡')
                text = self._rich_text_to_markdown(block['callout']['rich_text'])
                lines.append(f"{indent}> {emoji} {text}\n")
            
            elif block_type == 'toggle':
                # Handle toggle blocks
                text = self._rich_text_to_markdown(block['toggle']['rich_text'])
                lines.append(f"{indent}<details>\n{indent}<summary>{text}</summary>\n")
                
                # Process children if any
                if block.get('has_children'):
                    children = await self._fetch_block_children(block['id'])
                    child_markdown = await self._blocks_to_markdown(children, page_id)
                    if child_markdown.strip():
                        lines.append(f"{indent}\n{child_markdown}\n")
                
                lines.append(f"{indent}</details>\n")
            
            elif block_type == 'to_do':
                # Handle to-do blocks
                checked = block['to_do'].get('checked', False)
                text = self._rich_text_to_markdown(block['to_do']['rich_text'])
                checkbox = "[x]" if checked else "[ ]"
                lines.append(f"{indent}- {checkbox} {text}")
            
            elif block_type == 'image':
                block_id = block['id']
                caption = self._get_caption_from_block(block)
                
                # Get fresh URL for this specific image block
                fresh_url, expiry_time = await self._get_fresh_file_url(block_id)
                
                if fresh_url:
                    url = fresh_url
                    
                    # Try to store the image permanently if storage service is available
                    if self.image_storage:
                        try:
                            permanent_url = await self.image_storage.store_notion_image(
                                page_id, block_id, url
                            )
                            if permanent_url:
                                url = permanent_url
                                alt_text = caption or "Image"
                                lines.append(f"{indent}![{alt_text}]({url})\n")
                                # Show only the Spaces URL, not the long Notion URL
                                # print(f"✅ Stored image permanently: {permanent_url}")
                            else:
                                # Storage failed, use fresh URL with expiry info
                                alt_text = caption or "Screenshot or diagram"
                                lines.append(f"{indent}![{alt_text}]({url})\n")
                                if expiry_time:
                                    lines.append(f"{indent}*Note: This image expires at {expiry_time}*\n")
                                else:
                                    lines.append(f"{indent}*Note: This image is hosted on Notion and may expire*\n")
                        except Exception as e:
                            print(f"⚠️  Image storage failed for {url}: {e}")
                            # Fall back to fresh URL
                            alt_text = caption or "Screenshot or diagram"
                            lines.append(f"{indent}![{alt_text}]({url})\n")
                            if expiry_time:
                                lines.append(f"{indent}*Note: This image expires at {expiry_time}*\n")
                            else:
                                lines.append(f"{indent}*Note: This image is hosted on Notion and may expire*\n")
                    else:
                        # No storage service configured, use fresh URL
                        alt_text = caption or "Screenshot or diagram"
                        lines.append(f"{indent}![{alt_text}]({url})\n")
                        if expiry_time:
                            lines.append(f"{indent}*Note: This image expires at {expiry_time}*\n")
                        else:
                            lines.append(f"{indent}*Note: This image is hosted on Notion and may expire*\n")
                else:
                    print(f"❌ Could not get fresh URL for image block {block_id}")
            
            elif block_type == 'child_page':
                # Handle child page blocks (like in Benefits page)
                title = block.get('child_page', {}).get('title', 'Untitled Page')
                page_id = block['id']
                
                # Convert to a help center slug (simplified for now)
                # In production, you'd want to look up the actual slug from the database
                potential_slug = self._title_to_slug(title)
                
                # Create a link to the nested page
                lines.append(f"{indent}- [{title}](/a/{potential_slug})")
            
            else:
                # Log unsupported block types for debugging
                print(f"⚠️  Unsupported block type: {block_type}")
        
        return '\n'.join(lines)
    
    def _title_to_slug(self, title: str) -> str:
        """Convert a title to a URL-friendly slug"""
        # Remove special characters and convert to lowercase
        slug = re.sub(r'[^\w\s-]', '', title.lower())
        # Replace spaces with hyphens
        slug = re.sub(r'[\s_]+', '-', slug)
        # Remove leading/trailing hyphens
        slug = slug.strip('-')
        # Prefix with 'toku-' for consistency
        return f"toku-{slug}" if slug else "untitled"
    
    async def _fetch_block_children(self, block_id: str) -> List[Dict]:
        """Fetch immediate children of a block"""
        children = []
        has_more = True
        start_cursor = None
        
        while has_more:
            response = await self.client.blocks.children.list(
                block_id=block_id,
                start_cursor=start_cursor,
                page_size=100
            )
            children.extend(response['results'])
            has_more = response['has_more']
            start_cursor = response.get('next_cursor')
        
        return children
    
    def _rich_text_to_markdown(self, rich_text: List[Dict]) -> str:
        """Convert Notion rich text to markdown"""
        result = []
        
        for text_obj in rich_text:
            text = text_obj['plain_text']
            annotations = text_obj.get('annotations', {})
            
            # Apply formatting
            if annotations.get('bold'):
                text = f"**{text}**"
            if annotations.get('italic'):
                text = f"*{text}*"
            if annotations.get('code'):
                text = f"`{text}`"
            if annotations.get('strikethrough'):
                text = f"~~{text}~~"
            
            # Handle different types of links
            if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                # This is a link to another Notion page
                page_id = text_obj['mention']['page']['id']
                # Convert to help center slug
                slug = self._title_to_slug(text)
                text = f"[{text}](/a/{slug})"
            elif text_obj.get('href'):
                # Regular external link
                href = text_obj['href']
                # Check if it's a Notion page link
                if '/notion.so/' in href or href.startswith('/'):
                    # Convert Notion links to help center links
                    slug = self._title_to_slug(text)
                    text = f"[{text}](/a/{slug})"
                else:
                    text = f"[{text}]({href})"
            
            result.append(text)
        
        return ''.join(result)
