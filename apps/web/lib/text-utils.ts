/**
 * Utility functions for cleaning and formatting text content
 */

/**
 * Clean markdown formatting from text
 */
export function cleanMarkdown(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove **bold** formatting
    .replace(/\*([^*]+)\*/g, '$1')     // Remove *italic* formatting
    .replace(/^Toku:\s*/i, '')         // Remove "Toku:" prefix
    .replace(/^\s*#+\s*/, '')          // Remove heading markers
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
