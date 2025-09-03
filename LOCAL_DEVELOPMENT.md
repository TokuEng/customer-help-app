# Local Development Setup

This guide helps you set up the help center for local development with PostgreSQL and Meilisearch.

## Prerequisites

- **PostgreSQL** running locally (port 5432)
- **Meilisearch** running locally (port 7700)
- **Python 3.8+** with conda environment
- **Node.js 18+** 

## Quick Setup

### 1. Environment Setup

Your `.env` file is already created with local development settings:

```bash
# Database - Local PostgreSQL  
DATABASE_URL=postgresql://knowhrishi:password@localhost:5432/help_center

# Meilisearch - Local
MEILI_HOST=http://localhost:7700
MEILI_MASTER_KEY=your-local-meili-key

# Analytics Admin Key
ADMIN_KEY=local_admin_dev_2024
```

### 2. Database Setup

Run the local development setup script:

```bash
conda activate customer-app-toku
python scripts/setup-local-dev.py
```

This will:
- Create the local PostgreSQL database
- Apply all schemas (articles, analytics tables, etc.)
- Verify the setup

### 3. Start Services

**Start Meilisearch:**
```bash
# If using homebrew
brew services start meilisearch

# Or run directly
meilisearch --master-key your-local-meili-key
```

**Start the API server:**
```bash
cd apps/api
conda activate customer-app-toku
python -m uvicorn main:app --reload --port 8080
```

**Start the web app:**
```bash
cd apps/web
npm install  # if not done already
npm run dev
```

### 4. Access the Application

- **Help Center**: http://localhost:3000
- **API Documentation**: http://localhost:8080/docs
- **Analytics Dashboard**: http://localhost:3000/admin/analytics
  - Admin key: `local_admin_dev_2024`

## Analytics in Development

The analytics system works the same in development:

- **Page visits** are tracked automatically
- **Search queries** are logged with results
- **Chat interactions** are recorded
- **Article views** are counted

Access the admin dashboard at `/admin/analytics` with key `local_admin_dev_2024`.

## Database Migration

To apply analytics tables to an existing local database:

```bash
conda activate customer-app-toku
python scripts/apply-analytics-migration.py
```

The script automatically detects if you're using local vs production database.

## Local vs Production

| Feature | Local Development | Production |
|---------|------------------|------------|
| Database | PostgreSQL localhost | DigitalOcean Managed DB |
| Meilisearch | localhost:7700 | Remote server |
| Admin Key | `local_admin_dev_2024` | `admin_access_token_2024` |
| Analytics | Fully functional | Fully functional |

## Troubleshooting

### Database Connection Issues

```bash
# Check if PostgreSQL is running
brew services list | grep postgresql

# Start PostgreSQL if needed
brew services start postgresql

# Test connection
psql -h localhost -U postgres -d customer_help_center
```

### Meilisearch Issues

```bash
# Check if Meilisearch is running
curl http://localhost:7700/health

# Start Meilisearch with master key
meilisearch --master-key your-local-meili-key --db-path ./meili_data
```

### Environment Variables

```bash
# Check if .env is loaded
python -c "import os; print('DATABASE_URL:', os.getenv('DATABASE_URL'))"
```

## Production Deployment

When ready to deploy:

1. **Commit your changes** (`.env` is gitignored)
2. **Update environment variables** in DigitalOcean App Platform
3. **Deploy** - analytics will work automatically in production

The same codebase works for both local development and production!

## Development Commands

```bash
# Setup everything from scratch
python scripts/setup-local-dev.py

# Apply analytics migration only
python scripts/apply-analytics-migration.py

# Check database status
python -c "
import asyncio
import asyncpg
import os

async def check():
    conn = await asyncpg.connect(os.getenv('DATABASE_URL'))
    tables = await conn.fetch('SELECT table_name FROM information_schema.tables WHERE table_schema = \\'public\\'')
    print('Tables:', [t['table_name'] for t in tables])
    await conn.close()

asyncio.run(check())
"
```

---

**🎉 You're all set for local development with full analytics tracking!**
