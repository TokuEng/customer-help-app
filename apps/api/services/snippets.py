import re
from typing import List, Dict
from difflib import SequenceMatcher
import math

async def build_snippet(query: str, chunks: List[Dict[str, str]], max_length: int = 240) -> str:
    """Build a snippet from chunks that best matches the query"""
    if not chunks:
        return ""
    
    # Tokenize query for matching
    query_tokens = set(query.lower().split())
    
    # Score each chunk
    scored_chunks = []
    for chunk in chunks:
        score = _score_chunk(query_tokens, chunk['text'])
        scored_chunks.append((score, chunk))
    
    # Sort by score and get best chunk
    scored_chunks.sort(key=lambda x: x[0], reverse=True)
    best_chunk = scored_chunks[0][1] if scored_chunks else chunks[0]
    
    # Extract snippet from best chunk
    snippet_text = _extract_snippet_from_text(
        query, 
        best_chunk['text'], 
        max_length
    )
    
    # Add heading context if available
    if best_chunk.get('heading_path'):
        heading_prefix = f"[{best_chunk['heading_path']}] "
        if len(heading_prefix) + len(snippet_text) <= max_length + 20:  # Allow some extra for heading
            snippet_text = heading_prefix + snippet_text
    
    return snippet_text

def _score_chunk(query_tokens: set, text: str) -> float:
    """Score a chunk based on query relevance"""
    text_lower = text.lower()
    text_tokens = set(text_lower.split())
    
    # Calculate different scoring factors
    
    # 1. Token overlap
    overlap = len(query_tokens & text_tokens)
    overlap_score = overlap / len(query_tokens) if query_tokens else 0
    
    # 2. Exact phrase matching
    query_str = ' '.join(query_tokens)
    phrase_score = 1.0 if query_str in text_lower else 0.0
    
    # 3. Proximity of query terms
    proximity_score = _calculate_proximity_score(list(query_tokens), text_lower)
    
    # 4. BM25-like term frequency
    tf_score = _calculate_tf_score(query_tokens, text_lower)
    
    # Combine scores with weights
    final_score = (
        overlap_score * 0.3 +
        phrase_score * 0.3 +
        proximity_score * 0.2 +
        tf_score * 0.2
    )
    
    return final_score

def _calculate_proximity_score(query_terms: List[str], text: str) -> float:
    """Calculate how close query terms are to each other in the text"""
    if len(query_terms) < 2:
        return 0.0
    
    positions = {}
    words = text.lower().split()
    
    # Find positions of query terms
    for term in query_terms:
        positions[term] = [i for i, word in enumerate(words) if term in word]
    
    # If not all terms are present, return 0
    if any(not pos for pos in positions.values()):
        return 0.0
    
    # Calculate minimum span containing all terms
    all_positions = []
    for term, pos_list in positions.items():
        for pos in pos_list:
            all_positions.append((pos, term))
    
    all_positions.sort()
    
    # Find minimum window
    min_window = float('inf')
    for i in range(len(all_positions)):
        terms_seen = set()
        for j in range(i, len(all_positions)):
            terms_seen.add(all_positions[j][1])
            if len(terms_seen) == len(query_terms):
                window = all_positions[j][0] - all_positions[i][0] + 1
                min_window = min(min_window, window)
                break
    
    # Convert to score (smaller window = higher score)
    if min_window == float('inf'):
        return 0.0
    
    return 1.0 / (1.0 + math.log(min_window))

def _calculate_tf_score(query_tokens: set, text: str) -> float:
    """Calculate term frequency score (simplified BM25)"""
    text_lower = text.lower()
    words = text_lower.split()
    doc_length = len(words)
    
    if doc_length == 0:
        return 0.0
    
    # Average document length (assumed)
    avg_doc_length = 500
    k1 = 1.2
    b = 0.75
    
    score = 0.0
    for term in query_tokens:
        # Term frequency
        tf = sum(1 for word in words if term in word)
        
        # BM25 formula (simplified without IDF)
        denominator = tf + k1 * (1 - b + b * (doc_length / avg_doc_length))
        term_score = (tf * (k1 + 1)) / denominator
        
        score += term_score
    
    return score / len(query_tokens) if query_tokens else 0.0

def _extract_snippet_from_text(query: str, text: str, max_length: int) -> str:
    """Extract the most relevant snippet from text"""
    # First, try to find exact match
    query_lower = query.lower()
    text_lower = text.lower()
    
    match_pos = text_lower.find(query_lower)
    if match_pos != -1:
        # Found exact match, center snippet around it
        return _extract_around_position(text, match_pos, len(query), max_length)
    
    # Otherwise, find best matching segment
    words = text.split()
    query_words = query.lower().split()
    
    best_start = 0
    best_score = 0
    
    # Sliding window to find best segment
    window_size = min(len(words), 20)  # Look at 20-word windows
    
    for i in range(len(words) - window_size + 1):
        window = ' '.join(words[i:i + window_size])
        score = _score_chunk(set(query_words), window)
        
        if score > best_score:
            best_score = score
            best_start = i
    
    # Extract snippet from best window
    snippet_words = words[best_start:best_start + window_size]
    snippet = ' '.join(snippet_words)
    
    # Trim to max length
    if len(snippet) > max_length:
        snippet = snippet[:max_length].rsplit(' ', 1)[0] + '...'
    elif best_start > 0:
        snippet = '...' + snippet
    
    return snippet

def _extract_around_position(text: str, pos: int, query_len: int, max_length: int) -> str:
    """Extract snippet centered around a position"""
    # Calculate padding on each side
    padding = (max_length - query_len) // 2
    
    start = max(0, pos - padding)
    end = min(len(text), pos + query_len + padding)
    
    snippet = text[start:end]
    
    # Clean up edges
    if start > 0:
        # Find word boundary
        space_pos = snippet.find(' ')
        if space_pos != -1 and space_pos < 20:
            snippet = '...' + snippet[space_pos + 1:]
        else:
            snippet = '...' + snippet
    
    if end < len(text):
        # Find word boundary
        space_pos = snippet.rfind(' ')
        if space_pos != -1 and space_pos > len(snippet) - 20:
            snippet = snippet[:space_pos] + '...'
        else:
            snippet = snippet + '...'
    
    return snippet.strip()
