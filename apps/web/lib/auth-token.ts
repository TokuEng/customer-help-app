// Helper to get the correct auth token based on environment
export function getAuthToken(): string | null {
  if (typeof window === 'undefined') {
    // Server-side - we can't access cookies directly here
    return null;
  }
  
  // Client-side - get token from localStorage (set during login)
  const token = localStorage.getItem('admin_token');
  if (token) {
    return token;
  }
  
  // Fallback - try to get from cookie if available
  const match = document.cookie.match(/admin_token=([^;]+)/);
  if (match) {
    return match[1];
  }
  
  return null;
}

// Get current user from localStorage
export function getCurrentUser(): any | null {
  if (typeof window === 'undefined') return null;
  
  const userStr = localStorage.getItem('admin_user');
  if (!userStr) return null;
  
  try {
    return JSON.parse(userStr);
  } catch {
    return null;
  }
}

// Check if user is authenticated
export function isAuthenticated(): boolean {
  return !!getAuthToken();
}

// Clear authentication
export function clearAuth(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_user');
    
    // Clear cookies
    document.cookie = 'admin_token=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
    document.cookie = 'admin_authenticated=; path=/; expires=Thu, 01 Jan 1970 00:00:01 GMT';
  }
}
