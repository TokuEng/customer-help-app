import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  // Check if the request is for admin routes
  if (request.nextUrl.pathname.startsWith('/admin')) {
    // Allow access to login page and auth API
    if (request.nextUrl.pathname === '/admin/login' || 
        request.nextUrl.pathname.startsWith('/api/auth')) {
      return NextResponse.next()
    }
    
    // Check for authentication cookie
    const adminToken = request.cookies.get('admin_token')?.value
    const isAuthenticated = request.cookies.get('admin_authenticated')?.value === 'true'
    
    // If not authenticated, redirect to login
    if (!isAuthenticated && !adminToken) {
      const loginUrl = new URL('/admin/login', request.url)
      // Preserve the original URL they were trying to access
      loginUrl.searchParams.set('from', request.nextUrl.pathname)
      return NextResponse.redirect(loginUrl)
    }
  }
  
  return NextResponse.next()
}

export const config = {
  matcher: '/admin/:path*'
}
