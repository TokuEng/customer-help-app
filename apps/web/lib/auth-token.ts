// Helper to get the correct auth token based on environment
export function getAuthToken(): string {
  // In development, use the local admin key
  if (process.env.NODE_ENV === 'development') {
    return 'local_admin_dev_2024'
  }
  
  // In production, use the production admin key
  // This should match the ADMIN_KEY environment variable on the server
  return process.env.NEXT_PUBLIC_ADMIN_KEY || 'admin_access_token_2024'
}
