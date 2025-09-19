import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const status = {
      database: 'healthy',
      meilisearch: 'healthy',
      spaces: 'healthy',
      api: 'healthy'
    };

    // Check Database
    try {
      const dbResponse = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/health/database`, {
        method: 'GET',
        cache: 'no-store'
      });
      status.database = dbResponse.ok ? 'healthy' : 'error';
    } catch {
      status.database = 'error';
    }

    // Check Meilisearch
    try {
      const meiliResponse = await fetch('http://147.182.245.91:7700/health', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.MEILI_MASTER_KEY || 'NzEzYTdkNjQ0N2FiYjFkODg0NzdjNzNk'}`
        },
        cache: 'no-store'
      });
      status.meilisearch = meiliResponse.ok ? 'healthy' : 'warning';
    } catch {
      status.meilisearch = 'error';
    }

    // Check Spaces (simplified check)
    status.spaces = process.env.SPACES_KEY && process.env.SPACES_SECRET ? 'healthy' : 'warning';

    // API is healthy if we're responding
    status.api = 'healthy';

    return NextResponse.json(status);
  } catch (error) {
    console.error('System status check failed:', error);
    return NextResponse.json(
      { 
        database: 'error',
        meilisearch: 'error',
        spaces: 'error',
        api: 'error'
      },
      { status: 500 }
    );
  }
}

