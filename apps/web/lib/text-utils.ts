/**
 * Utility functions for cleaning and formatting text content
 */

/**
 * Clean markdown formatting from text
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    // Remove HTML tags if present
    .replace(/<[^>]*>/g, '')
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // Remove **bold** formatting
    .replace(/\*([^*]+)\*/g, '$1')         // Remove *italic* formatting
    .replace(/__([^_]+)__/g, '$1')         // Remove __alt bold__ formatting
    .replace(/_([^_]+)_/g, '$1')           // Remove _alt italic_ formatting
    // Remove links but keep text
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\[[^\]]+\]/g, '$1')
    // Remove images
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')
    // Remove code blocks and inline code
    .replace(/```[^`]*```/g, '')
    .replace(/`([^`]+)`/g, '$1')
    // Remove prefixes and markers
    .replace(/^Toku:\s*/i, '')         // Remove "Toku:" prefix
    .replace(/^Summary:\s*/i, '')      // Remove "Summary:" prefix
    .replace(/^\s*#+\s*/gm, '')        // Remove heading markers
    // Clean special characters that might break rendering
    .replace(/[<>]/g, '')
    // Normalize whitespace
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Extract purpose or key information from content
 */
export function extractPurpose(content: string): string {
  if (!content) return '';
  
  // Look for purpose statements
  const purposePatterns = [
    /🎯\s*Purpose\s*:?\s*([^.!?]*[.!?])/i,
    /Purpose\s*:?\s*([^.!?]*[.!?])/i,
    /This\s+(?:article|guide|document)\s+(?:explains|shows|helps)\s+([^.!?]*[.!?])/i,
    /(?:Learn|Understand)\s+(?:how\s+to\s+)?([^.!?]*[.!?])/i
  ];
  
  for (const pattern of purposePatterns) {
    const match = content.match(pattern);
    if (match && match[1]) {
      return cleanMarkdown(match[1].trim());
    }
  }
  
  // Fallback: extract first meaningful sentence
  const sentences = content
    .replace(/[*#]/g, '') // Remove markdown
    .split(/[.!?]+/)
    .map(s => s.trim())
    .filter(s => s.length > 20); // Only meaningful sentences
  
  return sentences[0] ? sentences[0] + '.' : '';
}

/**
 * Generate a smart summary from content
 */
export function generateSmartSummary(content: string, title: string, maxLength: number = 150): string {
  if (!content) return '';
  
  // First try to extract purpose
  const purpose = extractPurpose(content);
  if (purpose && purpose.length <= maxLength) {
    return purpose;
  }
  
  // Clean the content
  const cleanContent = content
    .replace(/[*#`]/g, '') // Remove markdown
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '') // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  // Extract first meaningful paragraph
  const paragraphs = cleanContent
    .split(/\n\s*\n/)
    .map(p => p.trim())
    .filter(p => p.length > 30);
  
  if (paragraphs.length > 0) {
    let summary = paragraphs[0];
    
    // Truncate if too long
    if (summary.length > maxLength) {
      summary = summary.substring(0, maxLength - 3);
      const lastSpace = summary.lastIndexOf(' ');
      if (lastSpace > maxLength * 0.7) {
        summary = summary.substring(0, lastSpace);
      }
      summary += '...';
    }
    
    return summary;
  }
  
  return '';
}

/**
 * Clean snippet text for display (more aggressive than cleanMarkdown)
 */
export function cleanSnippet(text: string): string {
  if (!text) return '';
  
  return text
    // Remove image paths and URLs first
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '')  // Remove images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Convert links to text only
    .replace(/https?:\/\/[^\s]+/g, '')       // Remove URLs
    .replace(/[a-zA-Z0-9-]+\.(png|jpg|jpeg|gif|svg|webp)(\))?/gi, '') // Remove image filenames
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/gi, '') // Remove UUIDs
    .replace(/\.{3,}otion-images[^)]*\)/g, '') // Remove notion image paths
    // Remove markdown formatting
    .replace(/\*\*([^*]+)\*\*/g, '$1')     // Remove **bold** formatting
    .replace(/\*([^*]+)\*/g, '$1')         // Remove *italic* formatting
    .replace(/__([^_]+)__/g, '$1')         // Remove __alt bold__ formatting
    .replace(/_([^_]+)_/g, '$1')           // Remove _alt italic_ formatting
    // Remove special markers and prefixes
    .replace(/^Toku:\s*/i, '')            // Remove "Toku:" prefix
    .replace(/^\s*#+\s*/gm, '')           // Remove heading markers
    .replace(/^\s*\d+\.\s*/gm, '')        // Remove numbered list markers
    .replace(/^\s*[-*+]\s*/gm, '')        // Remove bullet points
    .replace(/^>/gm, '')                  // Remove blockquote markers
    // Remove code blocks and inline code
    .replace(/```[^`]*```/g, '')          // Remove code blocks
    .replace(/`([^`]+)`/g, '$1')          // Remove inline code formatting
    // Clean up whitespace and special characters
    .replace(/\n+/g, ' ')                 // Replace line breaks with spaces
    .replace(/\s+/g, ' ')                 // Normalize whitespace
    .replace(/[()[\]{}]/g, '')           // Remove brackets
    .replace(/\s+([.,!?])/g, '$1')       // Fix punctuation spacing
    .replace(/([.,!?])\1+/g, '$1')       // Remove duplicate punctuation
    .trim();
}

/**
 * Format article type for display
 */
export function formatArticleType(type: string): string {
  const typeMap: Record<string, string> = {
    'how-to': 'How-to',
    'guide': 'Guide', 
    'policy': 'Policy',
    'faq': 'FAQ',
    'process': 'Process',
    'info': 'Info'
  };
  
  return typeMap[type] || type;
}
