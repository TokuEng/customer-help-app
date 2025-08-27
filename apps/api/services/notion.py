from notion_client import AsyncClient
from typing import List, Dict, Optional, Tuple
import markdown
from bs4 import BeautifulSoup
from apps.api.core.settings import settings
import re
from datetime import datetime
from .image_storage import ImageStorageService

class NotionService:
    def __init__(self):
        self.client = AsyncClient(auth=settings.notion_token)
        # Initialize image storage service if Spaces are configured
        self.image_storage = None
        if all([settings.spaces_key, settings.spaces_secret, settings.spaces_bucket]):
            try:
                self.image_storage = ImageStorageService()
                print("✅ ImageStorageService initialized successfully")
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
        
        for block in blocks:
            block_type = block['type']
            
            # Update current heading when we encounter a heading block
            if block_type in ['heading_1', 'heading_2', 'heading_3']:
                heading_text = self._extract_text_from_block(block)
                if heading_text:
                    # Map to our categories
                    if 'Library' in heading_text:
                        current_heading = 'Library'
                    elif 'Token Payroll' in heading_text or 'Payroll' in heading_text:
                        current_heading = 'Token Payroll'
                    elif 'Benefits' in heading_text or 'Benefit' in heading_text:
                        current_heading = 'Benefits'
                    elif 'Policy' in heading_text or 'Policies' in heading_text:
                        current_heading = 'Policy'
                    else:
                        # Use the heading text as-is if it doesn't match predefined categories
                        current_heading = heading_text
            
            # Extract page links
            elif block_type == 'child_page':
                page_id = block['id']
                # Always add child pages, use default category if none set
                pages.append({
                    'page_id': page_id,
                    'category': current_heading or 'Library'
                })
            
            elif block_type == 'link_to_page':
                page_id = block['link_to_page'].get('page_id')
                if page_id:
                    pages.append({
                        'page_id': page_id,
                        'category': current_heading or 'Library'
                    })
            
            # Check for inline page mentions in text blocks
            elif block_type in ['paragraph', 'bulleted_list_item', 'numbered_list_item']:
                rich_text = block.get(block_type, {}).get('rich_text', [])
                for text_obj in rich_text:
                    if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                        page_id = text_obj['mention']['page']['id']
                        pages.append({
                            'page_id': page_id,
                            'category': current_heading or 'Library'
                        })
        
        return pages
    
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
            print(f"🔄 Getting fresh URL for block {block_id}...")
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
                        print(f"✅ Fresh URL expires: {expiry_time}")
                        return url, expiry_time
                    elif url:
                        print(f"✅ Fresh URL (no expiry field)")
                        return url, None
                
                # External URLs don't expire
                elif 'external' in image_block:
                    url = image_block['external'].get('url')
                    if url:
                        print(f"🔗 External URL (no expiry): {url[:50]}...")
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
                                print(f"✅ Stored image permanently: {permanent_url}")
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
        
        return '\n'.join(lines)
    
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
            
            # Handle links
            if text_obj.get('href'):
                text = f"[{text}]({text_obj['href']})"
            
            result.append(text)
        
        return ''.join(result)
