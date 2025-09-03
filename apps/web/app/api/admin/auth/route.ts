import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    const { adminKey } = await request.json()
    
    // Check if admin key matches
    const validAdminKey = process.env.ADMIN_KEY || 'local_admin_dev_2024'
    
    if (adminKey === validAdminKey) {
      // Create response with cookie
      const response = NextResponse.json({ success: true })
      
      // Set secure cookie
      response.cookies.set({
        name: 'admin_authenticated',
        value: 'true',
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 60 * 60 * 24 * 7, // 7 days
        path: '/'
      })
      
      return response
    } else {
      return NextResponse.json({ error: 'Invalid admin key' }, { status: 401 })
    }
  } catch {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}

export async function DELETE() {
  // Logout endpoint
  const response = NextResponse.json({ success: true })
  response.cookies.delete('admin_authenticated')
  return response
}
