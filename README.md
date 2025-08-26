# Customer Help Center

A modern, searchable help center for Toku that ingests content from Notion and provides fast search with BM25 and semantic similarity.

## Features

- **Notion Integration**: Automatically syncs content from Notion Knowledge Base
- **Hybrid Search**: BM25 (Meilisearch) + Vector search (pgvector) for best results
- **Auto-categorization**: Intelligently categorizes articles by type and persona
- **ISR**: Incremental Static Regeneration for instant updates
- **Beautiful UI**: Clean, professional design with shadcn/ui components
- **Reading Time**: Estimated reading time for each article
- **Related Articles**: Semantic similarity-based recommendations
- **Feedback System**: Collect user feedback on article helpfulness

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Notion    │────▶│  Ingestion   │────▶│  PostgreSQL │
│ Knowledge   │     │  Function    │     │  + pgvector │
│    Base     │     │   (cron)     │     └─────────────┘
└─────────────┘     └──────────────┘              │
                            │                      │
                            ▼                      ▼
                    ┌──────────────┐     ┌─────────────┐
                    │  Next.js     │◀────│   FastAPI   │
                    │    (ISR)     │     │     API     │
                    └──────────────┘     └─────────────┘
                                                  │
                                                  ▼
                                         ┌─────────────┐
                                         │ Meilisearch │
                                         └─────────────┘
```

## Tech Stack

- **Frontend**: Next.js 15, TypeScript, Tailwind CSS, shadcn/ui
- **Backend**: FastAPI, Python 3.11, asyncpg, pydantic
- **Database**: PostgreSQL with pgvector extension
- **Search**: Meilisearch (BM25) + pgvector (semantic)
- **Ingestion**: DigitalOcean Functions, Notion API
- **Deployment**: DigitalOcean App Platform

## Local Development

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ with pgvector
- Meilisearch
- Notion integration token

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/customer-help-center.git
cd customer-help-center
```

2. Install dependencies:
```bash
# Root dependencies
npm install

# Web app
cd apps/web
npm install
cp env.template .env.local

# API
cd ../api
python -m venv venv
source venv/bin/activate  # or venv\Scripts\activate on Windows
pip install -r requirements.txt
cp env.template .env
```

3. Set up PostgreSQL:
```bash
createdb help_center
psql help_center < apps/api/db/schema.sql
```

4. Start Meilisearch:
```bash
# Using Docker
docker run -p 7700:7700 -v $(pwd)/meili_data:/meili_data getmeili/meilisearch:v1.5

# Or install locally
# brew install meilisearch
# meilisearch --master-key=masterKey
```

5. Configure environment variables in `.env` files

6. Run development servers:
```bash
# In separate terminals

# API (from apps/api)
uvicorn main:app --reload --port 8080

# Web (from apps/web)
npm run dev

# Ingestion function (manual trigger)
cd functions/ingestion
python handler.py
```

## Deployment

See [infra/README_DO.md](infra/README_DO.md) for detailed DigitalOcean deployment instructions.

## Content Structure

The Notion Knowledge Base should have:
- An index page with headings: Library, Token Payroll, Benefits, Policy
- Links to individual pages under each heading
- Each page becomes an article with automatic categorization

## API Endpoints

- `GET /healthz` - Health check
- `GET /articles/:slug` - Get article by slug
- `POST /search` - Search articles
- `GET /related?slug=...` - Get related articles
- `POST /feedback` - Submit article feedback
- `POST /revalidate` - Trigger ISR revalidation (protected)

## Environment Variables

See `infra/env.example` for all required environment variables.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

## License

MIT
