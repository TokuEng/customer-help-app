import { NextRequest, NextResponse } from 'next/server';

// Get backend URL
function getBackendUrl() {
  const envBackendUrl = process.env.BACKEND_URL;
  if (envBackendUrl && envBackendUrl !== '') {
    return envBackendUrl;
  }
  return 'http://api:8080';
}

export async function POST(req: NextRequest) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader) {
      return NextResponse.json(
        { detail: 'Authorization header required' },
        { status: 401 }
      );
    }

    // Forward the request to the backend
    const body = await req.json();
    const backendUrl = getBackendUrl();
    
    const response = await fetch(`${backendUrl}/api/admin/visa/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });

    const result = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        result,
        { status: response.status }
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Visa upload error:', error);
    return NextResponse.json(
      { detail: 'Internal server error' },
      { status: 500 }
    );
  }
}

