"""
AI-powered article content renderer using GPT-4o
Intelligently formats and styles article content based on context
"""

from typing import Dict, Optional, List
import openai
import asyncio
import re
from datetime import datetime

# Try both import paths to work in different contexts
try:
    from core.settings import settings
except ImportError:
    from apps.api.core.settings import settings


class AIRendererService:
    def __init__(self):
        if hasattr(settings, 'openai_api_key'):
            openai.api_key = settings.openai_api_key
            self.model = "gpt-4o"
        
    async def render_article_content(
        self, 
        title: str, 
        content_md: str, 
        article_type: str,
        category: str,
        summary: Optional[str] = None
    ) -> str:
        """
        Use GPT-4o to intelligently render article content with optimal HTML structure
        """
        
        # Create the AI prompt for intelligent rendering
        system_prompt = self._create_system_prompt()
        user_prompt = self._create_user_prompt(title, content_md, article_type, category, summary)
        
        try:
            # Make async call to OpenAI
            response = await asyncio.to_thread(
                openai.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.1,  # Low temperature for consistent formatting
                max_tokens=8000
            )
            
            ai_html = response.choices[0].message.content
            
            # Clean and validate the HTML
            cleaned_html = self._clean_and_validate_html(ai_html)
            
            return cleaned_html
            
        except Exception as e:
            print(f"AI rendering failed: {e}")
            # Fallback to basic markdown conversion
            return self._fallback_render(content_md)
    
    def _create_system_prompt(self) -> str:
        return """You are an expert content formatter for a customer help center. Your job is to transform markdown content into beautifully structured, semantic HTML that enhances readability and user experience.

GUIDELINES:
1. **Smart Structure**: Analyze content and apply optimal HTML structure
2. **Semantic HTML**: Use proper heading hierarchy (h1-h6), sections, lists
3. **Enhanced Readability**: Add appropriate spacing, emphasis, and visual breaks
4. **Consistent Styling**: Apply CSS classes that work with existing Tailwind prose styles
5. **Accessibility**: Ensure proper ARIA labels and semantic markup
6. **Performance**: Generate clean, minimal HTML without unnecessary elements

FORMATTING RULES:
- DO NOT create H1 headings - the article title is already displayed separately
- Start with H2 headings as the highest level for content sections
- Convert markdown headers to proper HTML headings with IDs for linking (H2-H6 only)
- Transform lists into well-structured <ul>/<ol> with proper nesting
- Add semantic emphasis (<strong>, <em>) where appropriate
- Create proper code blocks with syntax highlighting hints
- Structure tables with proper headers and accessibility
- Add callout boxes for important information using <div class="callout-*">
- Insert visual breaks and sections where content flow suggests it
- Convert image URLs to proper <img> tags with alt text and responsive classes
- Format numbered steps as ordered lists or step containers with <div class="step">
- Use <div class="callout-info"> for important notes and instructions
- Wrap introductory content in callout boxes for better visual hierarchy

SPECIAL CONTENT HANDLING:
- **Navigation/Index Pages**: If content contains many links in list format, create a structured navigation with proper sections and categories
- **Link Lists**: Transform markdown link lists into organized HTML navigation with clear visual hierarchy
- **Country/Region Lists**: Group related items under clear headings with proper nesting
- **Mixed Content**: If content mixes headers, links, and text, create clear sections with appropriate spacing

CALLOUT CLASSES AVAILABLE:
- callout-info: Blue background for general information
- callout-warning: Yellow background for warnings/cautions
- callout-success: Green background for tips/success messages
- callout-error: Red background for errors/critical info

OUTPUT: Return ONLY the HTML content, no markdown formatting, no explanations."""

    def _create_user_prompt(self, title: str, content_md: str, article_type: str, category: str, summary: Optional[str]) -> str:
        context = f"""
ARTICLE CONTEXT:
- Title: {title}
- Type: {article_type}
- Category: {category}
- Summary: {summary or "None provided"}

CONTENT TO RENDER:
{content_md}

Please transform this markdown content into optimal HTML structure. Analyze the content type and apply appropriate formatting:

CONTENT TYPE SPECIFIC FORMATTING:
- **How-to guides**: Use numbered steps, clear sections, and highlight important actions
- **Policies**: Use clear sections, emphasis on key points, and structured lists  
- **FAQs**: Use question-answer format with clear visual separation
- **Processes**: Use step-by-step structure with visual flow indicators
- **Navigation/Index pages**: Create organized sections with proper heading hierarchy, group related links under clear categories
- **Benefits/Country lists**: Structure as organized navigation with regional groupings and clear visual separation

SPECIAL INSTRUCTIONS FOR THIS CONTENT:
- NEVER create an H1 heading - the article title is already shown in the page header
- Start content sections with H2 headings as the top level
- Convert any ![Image](URL) or raw image URLs to proper <img src="URL" alt="description" class="w-full rounded-lg shadow-lg my-4">
- For step-by-step instructions, use either:
  * <div class="steps"><div class="step">Step content</div></div> for visual steps
  * <ol> lists for simple numbered steps
- Wrap important introductory information in <div class="callout-info">
- Use <div class="callout-warning"> for warnings or important notes
- If the content contains many markdown links in list format, organize them into a clean navigation structure
- Group related items under appropriate headings (e.g., by region, category, or type)
- Use proper HTML list structures (<ul>, <li>) for link collections
- Ensure links are properly formatted and accessible
- Create clear visual hierarchy with headings and spacing
- If content appears to be a navigation index, format it as such with proper sections
- Remove any duplicate title information that matches the article title
- Make the content visually appealing with proper structure, callouts, and formatted elements

Focus on making the content scannable, well-organized, visually appealing, and easy to navigate."""

        return context
    
    def _clean_and_validate_html(self, html: str) -> str:
        """Clean and validate the AI-generated HTML"""
        if not html:
            return ""
        
        # Remove any markdown code block wrappers if AI included them
        html = re.sub(r'^```html\s*\n?', '', html, flags=re.MULTILINE)
        html = re.sub(r'\n?```\s*$', '', html, flags=re.MULTILINE)
        
        # Remove any H1 tags - convert them to H2 to avoid duplicate titles
        html = re.sub(r'<h1([^>]*)>', r'<h2\1>', html, flags=re.IGNORECASE)
        html = re.sub(r'</h1>', '</h2>', html, flags=re.IGNORECASE)
        
        # Convert markdown images to proper HTML img tags
        html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" class="w-full rounded-lg shadow-lg my-4">', html)
        
        # Convert raw image URLs to proper img tags (if they end with image extensions)
        html = re.sub(r'(https?://[^\s]+\.(png|jpg|jpeg|gif|webp|svg))', r'<img src="\1" alt="Image" class="w-full rounded-lg shadow-lg my-4">', html, flags=re.IGNORECASE)
        
        # Convert **bold** markdown to <strong>
        html = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', html)
        
        # Convert *italic* markdown to <em>
        html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)
        
        # Fix numbered list patterns that might not be properly formatted
        html = re.sub(r'(\d+\.\s+)', r'', html)  # Remove "1. " patterns if they're not in proper lists
        
        # Ensure proper heading IDs for navigation
        html = self._add_heading_ids(html)
        
        # Clean up any excessive whitespace
        html = re.sub(r'\n\s*\n\s*\n', '\n\n', html)
        
        return html.strip()
    
    def _add_heading_ids(self, html: str) -> str:
        """Add IDs to headings for navigation"""
        def add_id(match):
            tag = match.group(1)
            content = match.group(2)
            
            # Generate ID from content
            id_text = re.sub(r'[^\w\s-]', '', content.lower())
            id_text = re.sub(r'[-\s]+', '-', id_text)
            id_text = id_text.strip('-')
            
            if id_text:
                return f'<{tag} id="h-{id_text}">{content}</{tag}>'
            else:
                return match.group(0)
        
        # Add IDs to headings that don't have them
        html = re.sub(r'<(h[1-6])(?![^>]*id=)>([^<]+)</h[1-6]>', add_id, html, flags=re.IGNORECASE)
        
        return html
    
    def _fallback_render(self, content_md: str) -> str:
        """Enhanced fallback rendering if AI fails"""
        if not content_md:
            return ""
        
        # Basic markdown to HTML conversion
        html = content_md
        
        # Convert headers (avoid H1)
        html = re.sub(r'^### (.*)', r'<h3>\1</h3>', html, flags=re.MULTILINE)
        html = re.sub(r'^## (.*)', r'<h2>\1</h2>', html, flags=re.MULTILINE)
        html = re.sub(r'^# (.*)', r'<h2>\1</h2>', html, flags=re.MULTILINE)  # Convert H1 to H2
        
        # Convert images
        html = re.sub(r'!\[([^\]]*)\]\(([^)]+)\)', r'<img src="\2" alt="\1" class="w-full rounded-lg shadow-lg my-4">', html)
        html = re.sub(r'(https?://[^\s]+\.(png|jpg|jpeg|gif|webp|svg))', r'<img src="\1" alt="Image" class="w-full rounded-lg shadow-lg my-4">', html, flags=re.IGNORECASE)
        
        # Convert bold and italic
        html = re.sub(r'\*\*([^*]+)\*\*', r'<strong>\1</strong>', html)
        html = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', html)
        
        # Convert links
        html = re.sub(r'\[([^\]]+)\]\(([^)]+)\)', r'<a href="\2">\1</a>', html)
        
        # Convert paragraphs
        paragraphs = html.split('\n\n')
        html_paragraphs = []
        
        for p in paragraphs:
            p = p.strip()
            if p and not p.startswith('<h') and not p.startswith('<img'):
                # Wrap in callout if it looks like important info
                if any(word in p.lower() for word in ['important', 'note', 'warning', 'remember']):
                    html_paragraphs.append(f'<div class="callout-info"><p>{p}</p></div>')
                else:
                    html_paragraphs.append(f'<p>{p}</p>')
            elif p:
                html_paragraphs.append(p)
        
        return '\n\n'.join(html_paragraphs)

    async def should_rerender(self, article_data: Dict) -> bool:
        """
        Determine if an article should be re-rendered based on various factors
        """
        # Always re-render if no AI content exists
        if not article_data.get('ai_rendered_html'):
            return True
        
        # Re-render if content has been updated recently
        updated_at = article_data.get('updated_at')
        if updated_at:
            # If updated in last 24 hours and no AI content, re-render
            now = datetime.now()
            if hasattr(updated_at, 'replace'):
                time_diff = now - updated_at.replace(tzinfo=None)
                if time_diff.days == 0:  # Updated today
                    return True
        
        return False
