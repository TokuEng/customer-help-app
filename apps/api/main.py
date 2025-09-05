from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
import logging
from core.settings import settings

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Database connection pool
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    # Startup
    logger.info("Starting up API server...")
    logger.info(f"Database URL: {settings.database_url[:50]}...")
    
    try:
        db_pool = await asyncpg.create_pool(settings.database_url)
        logger.info("Database pool created successfully")
        
        # Test the connection
        async with db_pool.acquire() as conn:
            version = await conn.fetchval('SELECT version()')
            logger.info(f"Connected to database: {version.split(',')[0]}")
    except Exception as e:
        logger.error(f"Failed to create database pool: {type(e).__name__}: {str(e)}")
        raise
    
    yield
    
    # Shutdown
    logger.info("Shutting down API server...")
    await db_pool.close()
    logger.info("Database pool closed")

app = FastAPI(
    title="Customer Help Center API",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check
@app.get("/healthz")
async def health_check():
    return {"ok": True}

# Import and include routers after app creation to avoid circular imports
from routers import search, articles, feedback, revalidate, rag, ingestion, admin, analytics, ai_render

app.include_router(search.router, prefix=settings.api_prefix)
app.include_router(articles.router, prefix=settings.api_prefix)
app.include_router(feedback.router, prefix=settings.api_prefix)
app.include_router(revalidate.router, prefix=settings.api_prefix)
app.include_router(rag.router, prefix=settings.api_prefix)
app.include_router(ingestion.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(ai_render.router, prefix=settings.api_prefix)

# Make db_pool accessible
app.state.db_pool = lambda: db_pool