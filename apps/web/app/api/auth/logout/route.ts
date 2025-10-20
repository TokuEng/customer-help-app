import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';

export async function POST(request: NextRequest) {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_token')?.value;
    
    if (token) {
      // Call backend logout endpoint
      const backendUrl = process.env.BACKEND_URL || 'http://localhost:8080';
      await fetch(`${backendUrl}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
    }

    // Clear cookies
    const res = NextResponse.json({ success: true });
    res.cookies.delete('admin_authenticated');
    res.cookies.delete('admin_token');
    
    return res;
  } catch (error) {
    return NextResponse.json(
      { detail: 'Logout failed' },
      { status: 500 }
    );
  }
}
