import re
from typing import List, Dict
from bs4 import BeautifulSoup
import tiktoken

class ChunkingService:
    def __init__(self, max_tokens: int = 900):
        self.max_tokens = max_tokens
        self.encoding = tiktoken.get_encoding("cl100k_base")
    
    def to_chunks(self, markdown_content: str) -> List[Dict[str, str]]:
        """Split markdown content into semantic chunks"""
        chunks = []
        
        # Split by headers
        header_pattern = r'^(#{1,6})\s+(.+)$'
        lines = markdown_content.split('\n')
        
        current_chunk = []
        current_heading_path = []
        current_tokens = 0
        
        for line in lines:
            # Check if line is a header
            header_match = re.match(header_pattern, line, re.MULTILINE)
            
            if header_match:
                # Save current chunk if it has content
                if current_chunk:
                    chunk_text = '\n'.join(current_chunk).strip()
                    if chunk_text:
                        chunks.append({
                            'heading_path': ' > '.join(current_heading_path),
                            'text': chunk_text
                        })
                
                # Update heading hierarchy
                level = len(header_match.group(1))
                heading_text = header_match.group(2).strip()
                
                # Update heading path based on level
                current_heading_path = current_heading_path[:level-1] + [heading_text]
                
                # Start new chunk
                current_chunk = [line]
                current_tokens = len(self.encoding.encode(line))
            
            else:
                # Add line to current chunk
                line_tokens = len(self.encoding.encode(line))
                
                # Check if adding this line would exceed token limit
                if current_tokens + line_tokens > self.max_tokens and current_chunk:
                    # Save current chunk
                    chunk_text = '\n'.join(current_chunk).strip()
                    if chunk_text:
                        chunks.append({
                            'heading_path': ' > '.join(current_heading_path),
                            'text': chunk_text
                        })
                    
                    # Start new chunk with current line
                    current_chunk = [line]
                    current_tokens = line_tokens
                else:
                    current_chunk.append(line)
                    current_tokens += line_tokens
        
        # Save final chunk
        if current_chunk:
            chunk_text = '\n'.join(current_chunk).strip()
            if chunk_text:
                chunks.append({
                    'heading_path': ' > '.join(current_heading_path),
                    'text': chunk_text
                })
        
        # Post-process chunks to ensure reasonable sizes
        processed_chunks = []
        for chunk in chunks:
            # If chunk is still too large, split by paragraphs
            if len(self.encoding.encode(chunk['text'])) > self.max_tokens:
                sub_chunks = self._split_large_chunk(chunk)
                processed_chunks.extend(sub_chunks)
            else:
                processed_chunks.append(chunk)
        
        return processed_chunks
    
    def _split_large_chunk(self, chunk: Dict[str, str]) -> List[Dict[str, str]]:
        """Split a large chunk into smaller ones by paragraphs"""
        text = chunk['text']
        heading_path = chunk['heading_path']
        
        # Split by double newlines (paragraphs)
        paragraphs = re.split(r'\n\s*\n', text)
        
        sub_chunks = []
        current_text = []
        current_tokens = 0
        
        for para in paragraphs:
            para_tokens = len(self.encoding.encode(para))
            
            if current_tokens + para_tokens > self.max_tokens and current_text:
                # Save current sub-chunk
                sub_chunks.append({
                    'heading_path': heading_path,
                    'text': '\n\n'.join(current_text)
                })
                current_text = [para]
                current_tokens = para_tokens
            else:
                current_text.append(para)
                current_tokens += para_tokens
        
        # Save final sub-chunk
        if current_text:
            sub_chunks.append({
                'heading_path': heading_path,
                'text': '\n\n'.join(current_text)
            })
        
        return sub_chunks
    
    def extract_headings_from_html(self, html_content: str) -> List[str]:
        """Extract all headings from HTML content for TOC"""
        soup = BeautifulSoup(html_content, 'html.parser')
        headings = []
        
        for heading in soup.find_all(['h1', 'h2', 'h3', 'h4', 'h5', 'h6']):
            level = int(heading.name[1])
            text = heading.get_text().strip()
            if text:
                headings.append({
                    'level': level,
                    'text': text,
                    'id': self._generate_heading_id(text)
                })
        
        return headings
    
    def _generate_heading_id(self, text: str) -> str:
        """Generate a URL-friendly ID from heading text"""
        # Convert to lowercase and replace spaces/special chars
        id_text = re.sub(r'[^\w\s-]', '', text.lower())
        id_text = re.sub(r'[-\s]+', '-', id_text)
        return f"h-{id_text}"
