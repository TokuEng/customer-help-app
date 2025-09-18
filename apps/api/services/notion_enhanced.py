"""
Enhanced Notion Service with robust page categorization and content extraction
"""
from notion_client import AsyncClient
from typing import List, Dict, Optional, Set, Tuple
import asyncio
import re
from datetime import datetime
import logging

# Configure logging
logger = logging.getLogger(__name__)

# Try both import paths to work in different contexts
try:
    from core.settings import settings  # When running from apps/api directory
    from services.image_storage import ImageStorageService
    from services.notion import NotionService as BaseNotionService
except ImportError:
    from apps.api.core.settings import settings  # When running from project root
    from apps.api.services.image_storage import ImageStorageService
    from apps.api.services.notion import NotionService as BaseNotionService

class EnhancedNotionService(BaseNotionService):
    """Enhanced Notion service with better categorization and content extraction"""
    
    def __init__(self):
        super().__init__()
        self.category_mappings = {
            # More comprehensive category detection patterns
            'Benefits': [
                'benefit', 'benefits', 'insurance', 'health', 'healthcare',
                'pension', 'retirement', '401k', 'medical', 'dental', 'vision',
                'life insurance', 'disability', 'wellness', 'supplemental',
                'workco international', 'workco global', 'eor', 'remote health',
                'employee benefits', 'employer-sponsored'
            ],
            'Token Payroll': [
                'token', 'payroll', 'stablecoin', 'payment', 'contractor',
                'mesh', 'anchorage', 'wallet', 'crypto', 'usdc', 'invoice',
                'contractor onboarding', 'contractor payment', 'activate'
            ],
            'Library': [
                'library', 'how to', 'guide', 'tutorial', 'process',
                'submit', 'create', 'view', 'add', 'review', 'approve',
                'expense', 'reimbursement', 'report', 'hris', 'timesheet'
            ],
            'Policy': [
                'policy', 'policies', 'compliance', 'regulation', 'rules',
                'governance', 'guidelines', 'standards', 'procedures',
                'overpayment', 'approval', 'pre-funding', 'expectations'
            ],
            'Integration Guides': [
                'integration', 'api', 'webhook', 'rippling', 'bamboohr',
                'workday', 'adp', 'sync', 'connect', 'setup integration'
            ]
        }
        self.detected_categories = {}  # Cache for page-to-category mapping
        
    async def walk_index_enhanced(self, index_page_id: str) -> List[Dict[str, str]]:
        """Enhanced index walking with better category detection"""
        print("🚀 Starting enhanced Notion index walk...")
        
        # First, analyze the entire page structure
        page_structure = await self._analyze_page_structure(index_page_id)
        print(f"📊 Page structure analysis complete. Found {len(page_structure)} sections")
        
        # Get all pages using multiple strategies
        all_pages = []
        
        # Strategy 1: Traditional block-based extraction with enhanced categorization
        blocks = await self.fetch_index_blocks(index_page_id)
        traditional_pages = await self._extract_pages_from_blocks(blocks, page_structure)
        all_pages.extend(traditional_pages)
        
        # Strategy 2: Database query to find all child pages
        database_pages = await self._find_all_child_pages(index_page_id)
        all_pages.extend(database_pages)
        
        # Strategy 3: Recursive exploration of nested pages
        nested_pages = await self._explore_nested_pages_recursive(index_page_id)
        all_pages.extend(nested_pages)
        
        # Deduplicate pages by page_id
        unique_pages = {}
        for page in all_pages:
            page_id = page['page_id']
            if page_id not in unique_pages:
                unique_pages[page_id] = page
            else:
                # If we have multiple categorizations, use the most specific one
                existing_cat = unique_pages[page_id]['category']
                new_cat = page['category']
                if new_cat != 'Library' and existing_cat == 'Library':
                    unique_pages[page_id]['category'] = new_cat
        
        # Final categorization pass using content analysis
        final_pages = []
        for page_info in unique_pages.values():
            # Try to get page title for better categorization
            try:
                page = await self.client.pages.retrieve(page_id=page_info['page_id'])
                title = self._extract_page_title(page)
                
                # Enhanced category detection based on title
                detected_category = self._detect_category_from_text(title, page_info.get('category', 'Library'))
                
                final_pages.append({
                    'page_id': page_info['page_id'],
                    'category': detected_category,
                    'title': title  # Store title for logging
                })
                
                print(f"📄 Page: {title[:50]}... -> Category: {detected_category}")
                
            except Exception as e:
                print(f"⚠️ Could not retrieve page {page_info['page_id']}: {e}")
                final_pages.append(page_info)
        
        # Print category summary
        self._print_category_summary(final_pages)
        
        return final_pages
    
    async def _analyze_page_structure(self, page_id: str) -> Dict[str, str]:
        """Analyze the page structure to understand sections and categories"""
        structure = {}
        blocks = await self.fetch_index_blocks(page_id)
        
        current_heading = None
        current_heading_id = None
        
        for block in blocks:
            block_type = block['type']
            
            # Track headings
            if block_type in ['heading_1', 'heading_2', 'heading_3']:
                heading_text = self._extract_text_from_block(block)
                if heading_text:
                    current_heading = heading_text
                    current_heading_id = block['id']
                    structure[current_heading_id] = {
                        'text': heading_text,
                        'category': self._detect_category_from_text(heading_text, 'Library'),
                        'child_blocks': []
                    }
            
            # Track content under headings
            elif current_heading_id and block_type in ['child_page', 'link_to_page']:
                structure[current_heading_id]['child_blocks'].append(block['id'])
        
        return structure
    
    async def _extract_pages_from_blocks(self, blocks: List[Dict], structure: Dict) -> List[Dict[str, str]]:
        """Extract pages from blocks with enhanced categorization"""
        pages = []
        current_category = 'Library'
        current_heading = None
        
        for block in blocks:
            block_type = block['type']
            
            # Update current category based on heading
            if block_type in ['heading_1', 'heading_2', 'heading_3']:
                heading_text = self._extract_text_from_block(block)
                if heading_text:
                    current_heading = heading_text
                    current_category = self._detect_category_from_text(heading_text, current_category)
                    print(f"📂 Section: {heading_text} -> Category: {current_category}")
            
            # Extract child pages
            elif block_type == 'child_page':
                page_id = block['id']
                title = block.get('child_page', {}).get('title', 'Untitled')
                
                # Enhanced category detection using title
                category = self._detect_category_from_text(title, current_category)
                
                pages.append({
                    'page_id': page_id,
                    'category': category,
                    'title': title
                })
            
            # Extract linked pages
            elif block_type == 'link_to_page':
                page_id = block['link_to_page'].get('page_id')
                if page_id:
                    pages.append({
                        'page_id': page_id,
                        'category': current_category
                    })
            
            # Check for inline page mentions
            elif block_type in ['paragraph', 'bulleted_list_item', 'numbered_list_item']:
                rich_text = block.get(block_type, {}).get('rich_text', [])
                for text_obj in rich_text:
                    if text_obj.get('type') == 'mention' and text_obj['mention'].get('type') == 'page':
                        page_id = text_obj['mention']['page']['id']
                        pages.append({
                            'page_id': page_id,
                            'category': current_category
                        })
        
        return pages
    
    async def _find_all_child_pages(self, parent_id: str) -> List[Dict[str, str]]:
        """Find all child pages using Notion's search functionality"""
        pages = []
        try:
            # Use Notion's search to find pages
            response = await self.client.search(
                filter={
                    "value": "page",
                    "property": "object"
                },
                page_size=100
            )
            
            # Process search results
            for result in response.get('results', []):
                if result['object'] == 'page':
                    page_id = result['id']
                    title = self._extract_page_title(result)
                    category = self._detect_category_from_text(title, 'Library')
                    
                    pages.append({
                        'page_id': page_id,
                        'category': category,
                        'title': title
                    })
            
        except Exception as e:
            print(f"⚠️ Error searching for pages: {e}")
        
        return pages
    
    async def _explore_nested_pages_recursive(self, page_id: str, category: str = 'Library', depth: int = 0, visited: Set[str] = None) -> List[Dict[str, str]]:
        """Recursively explore nested pages"""
        if visited is None:
            visited = set()
        
        if depth > 5 or page_id in visited:  # Limit recursion depth
            return []
        
        visited.add(page_id)
        pages = []
        
        try:
            blocks = await self.fetch_index_blocks(page_id)
            
            for block in blocks:
                if block['type'] == 'child_page':
                    child_id = block['id']
                    title = block.get('child_page', {}).get('title', 'Untitled')
                    
                    # Detect category from title
                    child_category = self._detect_category_from_text(title, category)
                    
                    pages.append({
                        'page_id': child_id,
                        'category': child_category,
                        'title': title
                    })
                    
                    # Recursively explore this child page
                    nested = await self._explore_nested_pages_recursive(child_id, child_category, depth + 1, visited)
                    pages.extend(nested)
                    
                elif block['type'] == 'link_to_page':
                    linked_id = block['link_to_page'].get('page_id')
                    if linked_id and linked_id not in visited:
                        pages.append({
                            'page_id': linked_id,
                            'category': category
                        })
        
        except Exception as e:
            if depth > 0:  # Only log errors for nested pages
                logger.debug(f"Could not explore nested page {page_id}: {e}")
        
        return pages
    
    def _detect_category_from_text(self, text: str, default_category: str = 'Library') -> str:
        """Detect category from text using enhanced pattern matching"""
        if not text:
            return default_category
        
        text_lower = text.lower()
        
        # Check each category's patterns
        best_match = None
        best_score = 0
        
        for category, patterns in self.category_mappings.items():
            score = 0
            for pattern in patterns:
                if pattern in text_lower:
                    # Give higher score for exact matches or longer patterns
                    pattern_score = len(pattern) / len(text_lower) if len(text_lower) > 0 else 1
                    score += pattern_score
            
            if score > best_score:
                best_score = score
                best_match = category
        
        # Use detected category if confidence is high enough
        if best_match and best_score > 0.1:  # Threshold for confidence
            return best_match
        
        # Special case: If text contains country names, it's likely Benefits
        country_patterns = [
            'usa', 'us', 'united states', 'canada', 'uk', 'united kingdom',
            'france', 'australia', 'india', 'uae', 'israel', 'poland',
            'netherlands', 'switzerland', 'ireland', 'czech', 'remote'
        ]
        if any(country in text_lower for country in country_patterns):
            return 'Benefits'
        
        return default_category
    
    def _extract_page_title(self, page: Dict) -> str:
        """Extract title from a Notion page object"""
        try:
            # Try to get title from properties
            if 'properties' in page:
                for prop in page['properties'].values():
                    if prop['type'] == 'title' and prop.get('title'):
                        title_parts = []
                        for text_obj in prop['title']:
                            if text_obj['type'] == 'text':
                                title_parts.append(text_obj['text']['content'])
                        if title_parts:
                            return ' '.join(title_parts)
            
            # Fallback to child_page title if available
            if 'child_page' in page:
                return page['child_page'].get('title', 'Untitled')
            
            return 'Untitled'
        except Exception as e:
            logger.debug(f"Could not extract title: {e}")
            return 'Untitled'
    
    def _print_category_summary(self, pages: List[Dict[str, str]]):
        """Print a summary of categorization results"""
        category_counts = {}
        for page in pages:
            cat = page.get('category', 'Unknown')
            category_counts[cat] = category_counts.get(cat, 0) + 1
        
        print("\n" + "=" * 60)
        print("📊 CATEGORIZATION SUMMARY")
        print("=" * 60)
        
        for category, count in sorted(category_counts.items()):
            status = "✅" if count > 0 else "❌"
            print(f"{status} {category}: {count} articles")
            
            # Show sample titles for Benefits category
            if category == 'Benefits' and count > 0:
                benefit_pages = [p for p in pages if p.get('category') == 'Benefits'][:5]
                print("   Sample Benefits articles:")
                for page in benefit_pages:
                    if 'title' in page:
                        print(f"     - {page['title'][:60]}...")
        
        print("=" * 60)
        print(f"📋 Total pages to process: {len(pages)}")
        print("=" * 60 + "\n")
    
    async def walk_index(self, index_page_id: str) -> List[Dict[str, str]]:
        """Override the base walk_index to use enhanced version"""
        return await self.walk_index_enhanced(index_page_id)
