import { NextResponse } from 'next/server';

// This would typically connect to a database or cache to track ingestion status
// For now, we'll return mock data
export async function GET() {
  try {
    // In production, this would check actual ingestion status
    // from database or a status tracking service
    
    const status = {
      state: 'idle', // idle, running, completed, failed
      progress: 0,
      currentItem: '',
      totalItems: 0,
      processedItems: 0,
      startTime: null,
      endTime: null,
      errors: []
    };
    
    // Try to fetch real status from the API
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/admin/ingestion/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${process.env.ADMIN_SECRET_KEY}`,
        },
        cache: 'no-store'
      });
      
      if (response.ok) {
        const data = await response.json();
        return NextResponse.json(data);
      }
    } catch (error) {
      console.error('Failed to fetch ingestion status from API:', error);
    }
    
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get ingestion status:', error);
    return NextResponse.json(
      { error: 'Failed to get ingestion status' },
      { status: 500 }
    );
  }
}
