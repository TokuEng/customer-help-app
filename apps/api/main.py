from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import asyncpg
from core.settings import settings

# Database connection pool
db_pool = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    global db_pool
    # Startup
    
    try:
        # Configure connection pool with proper limits for production
        db_pool = await asyncpg.create_pool(
            settings.database_url,
            min_size=2,        # Minimum connections to keep open
            max_size=5,        # Maximum connections (conservative for shared DB)
            command_timeout=30, # Command timeout in seconds
            server_settings={
                'jit': 'off',   # Disable JIT for better connection stability
                'application_name': 'customer_help_center_api'
            }
        )
        # Database pool created successfully
        
        # Test the connection
        async with db_pool.acquire() as conn:
            version = await conn.fetchval('SELECT version()')
            # Connected to database
    except Exception as e:
        # Failed to create database pool
        raise
    
    yield
    
    # Shutdown
    await db_pool.close()

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
from routers import search, articles, feedback, revalidate, rag, ingestion, admin, analytics, ai_render, admin_panel, chat, admin_visa

app.include_router(search.router, prefix=settings.api_prefix)
app.include_router(articles.router, prefix=settings.api_prefix)
app.include_router(feedback.router, prefix=settings.api_prefix)
app.include_router(revalidate.router, prefix=settings.api_prefix)
app.include_router(rag.router, prefix=settings.api_prefix)
app.include_router(ingestion.router, prefix=settings.api_prefix)
app.include_router(admin.router, prefix=settings.api_prefix)
app.include_router(analytics.router, prefix=settings.api_prefix)
app.include_router(ai_render.router, prefix=settings.api_prefix)
app.include_router(admin_panel.router, prefix=settings.api_prefix)
app.include_router(chat.router, prefix=settings.api_prefix)
app.include_router(admin_visa.router, prefix=settings.api_prefix)

# Make db_pool accessible
app.state.db_pool = lambda: db_pool