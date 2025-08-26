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
    db_pool = await asyncpg.create_pool(settings.database_url)
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
from routers import search, articles, feedback, revalidate

app.include_router(search.router, prefix=settings.api_prefix)
app.include_router(articles.router, prefix=settings.api_prefix)
app.include_router(feedback.router, prefix=settings.api_prefix)
app.include_router(revalidate.router, prefix=settings.api_prefix)

# Make db_pool accessible
app.state.db_pool = lambda: db_pool