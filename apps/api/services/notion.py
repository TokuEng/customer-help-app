from notion_client import AsyncClient
from typing import List, Dict, Optional, Tuple
import markdown
from bs4 import BeautifulSoup
from core.settings import settings
import re
from datetime import datetime

class NotionService:
    def __init__(self):
        self.client = AsyncClient(auth=settings.notion_token)
    
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
            if block_type in ['heading_2', 'heading_3']:
                heading_text = self._extract_text_from_block(block)
                if heading_text:
                    # Map to our categories
                    if 'Library' in heading_text:
                        current_heading = 'Library'
                    elif 'Token Payroll' in heading_text:
                        current_heading = 'Token Payroll'
                    elif 'Benefits' in heading_text:
                        current_heading = 'Benefits'
                    elif 'Policy' in heading_text:
                        current_heading = 'Policy'
            
            # Extract page links
            elif block_type == 'child_page':
                page_id = block['id']
                if current_heading:
                    pages.append({
                        'page_id': page_id,
                        'category': current_heading
                    })
            
            elif block_type == 'link_to_page':
                page_id = block['link_to_page'].get('page_id')
                if page_id and current_heading:
                    pages.append({
                        'page_id': page_id,
                        'category': current_heading
                    })
            
            # Check for inline page mentions in text blocks
            elif block_type in ['paragraph', 'bulleted_list_item', 'numbered_list_item']:
                rich_text = block.get(block_type, {}).get('rich_text', [])
                for text_obj in rich_text:
                    if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                        page_id = text_obj['mention']['page']['id']
                        if current_heading:
                            pages.append({
                                'page_id': page_id,
                                'category': current_heading
                            })
        
        return pages
    
    async def fetch_page_detail(self, page_id: str) -> Dict:
        """Fetch page metadata and content"""
        # Get page properties
        page = await self.client.pages.retrieve(page_id=page_id)
        
        # Extract title
        title = self._extract_page_title(page)
        
        # Get last edited time
        last_edited_time = datetime.fromisoformat(page['last_edited_time'].replace('Z', '+00:00'))
        
        # Get all blocks
        blocks = await self._fetch_all_blocks(page_id)
        
        # Convert blocks to markdown
        markdown_content = self._blocks_to_markdown(blocks)
        
        # Convert markdown to HTML
        html_content = markdown.markdown(
            markdown_content,
            extensions=['extra', 'codehilite', 'toc']
        )
        
        return {
            'page_id': page_id,
            'title': title,
            'content_md': markdown_content,
            'content_html': html_content,
            'last_edited_time': last_edited_time
        }
    
    async def _fetch_all_blocks(self, page_id: str) -> List[Dict]:
        """Recursively fetch all blocks including nested ones"""
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
    
    def _blocks_to_markdown(self, blocks: List[Dict]) -> str:
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
                url = block['image'].get('file', {}).get('url', '')
                if url:
                    lines.append(f"{indent}![Image]({url})\n")
        
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
