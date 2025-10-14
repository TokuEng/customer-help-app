"""
AI-powered article summarizer using OpenAI GPT
Generates concise, informative 2-3 line summaries for articles
"""

import openai
import asyncio
import re
from typing import Optional
import os

# Try both import paths to work in different contexts
try:
    from core.settings import settings
except ImportError:
    from apps.api.core.settings import settings

class AISummarizerService:
    def __init__(self):
        # Use environment variable or settings for API key
        api_key = os.getenv('OPENAI_API_KEY') or getattr(settings, 'openai_api_key', None)
        if api_key:
            openai.api_key = api_key
            self.model = "gpt-4o-mini"  # Using gpt-4o-mini for cost efficiency
        else:
            print("Warning: OpenAI API key not found. AI summarization will be disabled.")
            self.model = None
    
    async def generate_summary(
        self,
        title: str,
        content_md: str,
        category: str,
        article_type: str,
        max_chars: int = 250
    ) -> str:
        """
        Generate a concise 2-3 line summary of the article using AI.
        Falls back to basic extraction if AI is not available.
        """
        
        # If AI is not available, fall back to basic extraction
        if not self.model:
            return self._fallback_summary(content_md, max_chars)
        
        # Clean the content for AI processing
        cleaned_content = self._clean_content_for_ai(content_md)
        
        # Limit content length to avoid token limits (roughly 3000 words)
        if len(cleaned_content) > 12000:
            cleaned_content = cleaned_content[:12000] + "..."
        
        # Create the prompt for GPT
        system_prompt = """You are an expert content summarizer for a help center. 
        Your task is to create clear, informative summaries that help users quickly understand what an article covers.
        
        Guidelines:
        - Write 2-3 concise sentences (max 250 characters total)
        - Focus on the main purpose and key benefits/information
        - Be specific about what the article covers
        - Use clear, simple language
        - Don't use marketing fluff or generic statements
        - Don't mention "this article" or "this guide" - just state what it covers directly
        """
        
        user_prompt = f"""Create a 2-3 line summary for this help article:

Title: {title}
Category: {category}
Type: {article_type}

Content:
{cleaned_content}

Write a clear, informative summary that tells users exactly what they'll learn or find in this article. Maximum 250 characters total."""
        
        try:
            # Make async call to OpenAI
            response = await asyncio.to_thread(
                openai.chat.completions.create,
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                temperature=0.3,  # Lower temperature for more consistent summaries
                max_tokens=100,   # Limit response length
                top_p=0.9
            )
            
            ai_summary = response.choices[0].message.content.strip()
            
            # Ensure summary isn't too long
            if len(ai_summary) > max_chars:
                # Truncate at sentence boundary
                sentences = re.split(r'[.!?]\s+', ai_summary)
                truncated = sentences[0]
                if len(sentences) > 1 and len(truncated) + len(sentences[1]) + 2 <= max_chars:
                    truncated = f"{sentences[0]}. {sentences[1]}"
                if not truncated.endswith(('.', '!', '?')):
                    truncated += '.'
                ai_summary = truncated
            
            # Final cleanup
            ai_summary = self._clean_summary(ai_summary)
            
            print(f"✨ AI Summary generated for: {title[:50]}...")
            return ai_summary
            
        except Exception as e:
            print(f"⚠️ AI summarization failed for '{title}': {str(e)}")
            # Fall back to basic extraction
            return self._fallback_summary(content_md, max_chars)
    
    def _clean_content_for_ai(self, content: str) -> str:
        """Clean markdown content for AI processing"""
        if not content:
            return ""
        
        # Remove images
        content = re.sub(r'!\[([^\]]*)\]\([^)]+\)', '', content)
        
        # Remove URLs but keep link text
        content = re.sub(r'\[([^\]]+)\]\([^)]+\)', r'\1', content)
        
        # Remove code blocks but keep the content
        content = re.sub(r'```[^`]*```', '', content)
        
        # Remove excessive markdown symbols
        content = re.sub(r'#{1,6}\s+', '', content)  # Headers
        content = re.sub(r'\*{1,2}([^*]+)\*{1,2}', r'\1', content)  # Bold/italic
        content = re.sub(r'[-*+]\s+', '', content)  # List markers
        
        # Remove HTML tags if any
        content = re.sub(r'<[^>]+>', '', content)
        
        # Clean up whitespace
        content = re.sub(r'\n{3,}', '\n\n', content)
        content = re.sub(r'[ \t]+', ' ', content)
        
        return content.strip()
    
    def _clean_summary(self, summary: str) -> str:
        """Clean and validate the AI-generated summary"""
        if not summary:
            return ""
        
        # Remove any "This article" or "This guide" prefixes
        summary = re.sub(r'^(This\s+(article|guide|document|page)\s+)', '', summary, flags=re.IGNORECASE)
        
        # Ensure it starts with a capital letter
        if summary and summary[0].islower():
            summary = summary[0].upper() + summary[1:]
        
        # Remove any quotes that might have been added
        summary = summary.strip('"\'')
        
        # Ensure it ends with proper punctuation
        if summary and not summary[-1] in '.!?':
            summary += '.'
        
        return summary.strip()
    
    def _fallback_summary(self, content: str, max_length: int = 250) -> str:
        """Fallback summary extraction when AI is not available"""
        if not content:
            return ""
        
        # Look for purpose statements
        purpose_patterns = [
            r'Purpose\s*:?\s*([^.!?\n]{20,}[.!?])',
            r'This\s+(?:article|guide|document)\s+(?:explains|shows|helps|covers)\s+([^.!?\n]{20,}[.!?])',
            r'(?:Learn|Understand|Discover)\s+(?:how\s+to\s+)?([^.!?\n]{20,}[.!?])',
            r'^([A-Z][^.!?\n]{30,}[.!?])'  # First sentence if substantial
        ]
        
        # Clean content first
        cleaned = self._clean_content_for_ai(content)
        
        for pattern in purpose_patterns:
            match = re.search(pattern, cleaned, re.IGNORECASE | re.MULTILINE)
            if match and match.group(1):
                summary = match.group(1).strip()
                if 20 < len(summary) <= max_length:
                    return self._clean_summary(summary)
        
        # Extract first meaningful sentences
        sentences = re.split(r'[.!?]\s+', cleaned)
        summary_sentences = []
        current_length = 0
        
        for sentence in sentences:
            sentence = sentence.strip()
            if len(sentence) > 20:  # Only meaningful sentences
                sentence_with_period = sentence if sentence[-1] in '.!?' else sentence + '.'
                if current_length + len(sentence_with_period) + 1 <= max_length:
                    summary_sentences.append(sentence_with_period)
                    current_length += len(sentence_with_period) + 1
                    if len(summary_sentences) >= 2:  # Aim for 2-3 sentences
                        break
        
        if summary_sentences:
            return ' '.join(summary_sentences)
        
        # Last resort: truncate first paragraph
        if cleaned:
            truncated = cleaned[:max_length-3]
            last_space = truncated.rfind(' ')
            if last_space > max_length * 0.7:
                truncated = truncated[:last_space]
            return truncated + '...'
        
        return ""

# Singleton instance for reuse
_summarizer_instance = None

def get_summarizer() -> AISummarizerService:
    """Get or create singleton summarizer instance"""
    global _summarizer_instance
    if _summarizer_instance is None:
        _summarizer_instance = AISummarizerService()
    return _summarizer_instance

