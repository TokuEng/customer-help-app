from typing import List
import numpy as np
import openai
from core.settings import settings
import asyncio

class EmbeddingsService:
    def __init__(self):
        if settings.embeddings_provider == "openai":
            openai.api_key = settings.openai_api_key
            self.model = "text-embedding-3-small"  # 1536 dimensions
    
    async def embed(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings for a list of texts"""
        if not texts:
            return []
        
        if settings.embeddings_provider == "openai":
            return await self._embed_openai(texts)
        else:
            # Local/stub implementation
            return await self._embed_local(texts)
    
    async def _embed_openai(self, texts: List[str]) -> List[np.ndarray]:
        """Generate embeddings using OpenAI API"""
        # OpenAI has a limit on batch size
        batch_size = 100
        all_embeddings = []
        
        for i in range(0, len(texts), batch_size):
            batch = texts[i:i + batch_size]
            
            # Make async call to OpenAI
            response = await asyncio.to_thread(
                openai.embeddings.create,
                input=batch,
                model=self.model
            )
            
            # Extract embeddings
            batch_embeddings = [np.array(item.embedding) for item in response.data]
            all_embeddings.extend(batch_embeddings)
        
        return all_embeddings
    
    async def _embed_local(self, texts: List[str]) -> List[np.ndarray]:
        """Generate stub embeddings for local development"""
        # Simple stub implementation - returns random embeddings
        # In production, you might use sentence-transformers or similar
        embeddings = []
        
        for text in texts:
            # Create deterministic "embedding" based on text length and content
            # This is just for testing - replace with real local model
            np.random.seed(hash(text) % 2**32)
            embedding = np.random.randn(1536).astype(np.float32)
            # Normalize
            embedding = embedding / np.linalg.norm(embedding)
            embeddings.append(embedding)
        
        return embeddings
    
    def compute_similarity(self, embedding1: np.ndarray, embedding2: np.ndarray) -> float:
        """Compute cosine similarity between two embeddings"""
        # Ensure embeddings are normalized
        norm1 = embedding1 / np.linalg.norm(embedding1)
        norm2 = embedding2 / np.linalg.norm(embedding2)
        
        # Compute dot product (cosine similarity)
        return float(np.dot(norm1, norm2))
    
    def average_embeddings(self, embeddings: List[np.ndarray]) -> np.ndarray:
        """Compute the average of multiple embeddings"""
        if not embeddings:
            return np.zeros(1536)
        
        # Stack embeddings and compute mean
        stacked = np.vstack(embeddings)
        avg = np.mean(stacked, axis=0)
        
        # Normalize the average
        return avg / np.linalg.norm(avg)
