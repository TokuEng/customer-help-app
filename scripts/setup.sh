#!/bin/bash

echo "🚀 Setting up Customer Help Center..."

# Check prerequisites
command -v node >/dev/null 2>&1 || { echo "❌ Node.js is required but not installed."; exit 1; }
command -v python3 >/dev/null 2>&1 || { echo "❌ Python 3 is required but not installed."; exit 1; }
command -v psql >/dev/null 2>&1 || { echo "❌ PostgreSQL is required but not installed."; exit 1; }

# Install root dependencies
echo "📦 Installing root dependencies..."
npm install

# Setup web app
echo "🌐 Setting up web app..."
cd apps/web
npm install
if [ ! -f .env.local ]; then
    cp env.template .env.local
    echo "✅ Created .env.local - please update with your values"
fi

# Setup API
echo "🐍 Setting up API..."
cd ../api
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
if [ ! -f .env ]; then
    cp env.template .env
    echo "✅ Created .env - please update with your values"
fi

# Database setup
echo "🗄️ Setting up database..."
read -p "Enter PostgreSQL database name (default: help_center): " DB_NAME
DB_NAME=${DB_NAME:-help_center}

createdb $DB_NAME 2>/dev/null || echo "Database already exists"
psql $DB_NAME < db/schema.sql

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Update environment variables in apps/web/.env.local and apps/api/.env"
echo "2. Start Meilisearch: docker run -p 7700:7700 getmeili/meilisearch:v1.5"
echo "3. Run development servers:"
echo "   - API: cd apps/api && uvicorn main:app --reload"
echo "   - Web: cd apps/web && npm run dev"
