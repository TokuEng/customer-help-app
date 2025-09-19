import { NextRequest } from 'next/server'

// Use edge runtime for better SSE support
export const runtime = 'edge'

// Maximum duration for the SSE connection (30 seconds)
export const maxDuration = 30

/**
 * Get the backend URL for API calls
 */
function getBackendUrl() {
  // Use environment variable if available
  const envBackendUrl = process.env.BACKEND_URL
  if (envBackendUrl && envBackendUrl !== '') {
    return envBackendUrl
  }
  
  // For server-side, use internal service communication
  return 'http://api:8080'
}

/**
 * Proxy SSE stream from FastAPI agent to the client
 * 
 * This route:
 * 1. Forwards the request to the FastAPI agent endpoint
 * 2. Streams the SSE events back to the client
 * 3. Handles errors gracefully
 */
export async function POST(req: NextRequest) {
  try {
    // Get the request body
    const body = await req.text()
    
    // Validate that we have a body
    if (!body) {
      return new Response('Request body is required', { status: 400 })
    }
    
    // Parse and validate the JSON
    let requestData
    try {
      requestData = JSON.parse(body)
    } catch {
      return new Response('Invalid JSON in request body', { status: 400 })
    }
    
    // Validate required fields
    if (!requestData.user_query) {
      return new Response('user_query is required', { status: 400 })
    }
    
    // Build the backend URL
    const backendUrl = getBackendUrl()
    const agentUrl = `${backendUrl}/api/agent/stream`
    
    // Forward the request to the backend
    const response = await fetch(agentUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'text/event-stream',
      },
      body: JSON.stringify(requestData),
      // @ts-ignore - Next.js specific option
      duplex: 'half',
    })
    
    // Check if the backend responded successfully
    if (!response.ok) {
      // Try to get error details from the response
      let errorMessage = `Agent service error: ${response.status}`
      try {
        const errorData = await response.json()
        if (errorData.detail) {
          errorMessage = errorData.detail
        }
      } catch {
        // If we can't parse the error, use the status text
        errorMessage = `Agent service error: ${response.statusText || response.status}`
      }
      
      return new Response(errorMessage, { status: response.status })
    }
    
    // Check if we got an SSE response
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('text/event-stream')) {
      return new Response('Invalid response from agent service', { status: 502 })
    }
    
    // Return the SSE stream directly to the client
    return new Response(response.body, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'X-Accel-Buffering': 'no',
      },
    })
    
  } catch (error) {
    console.error('Agent proxy error:', error)
    
    // Return an error SSE event
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    const errorEvent = `event: error\ndata: ${JSON.stringify({ error: errorMessage })}\n\n`
    
    return new Response(errorEvent, {
      status: 500,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
      },
    })
  }
}

/**
 * Health check for the agent proxy
 */
export async function GET() {
  const backendUrl = getBackendUrl()
  
  try {
    // Check if the backend agent is healthy
    const response = await fetch(`${backendUrl}/api/agent/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    })
    
    if (response.ok) {
      const health = await response.json()
      return Response.json({
        status: 'healthy',
        backend: backendUrl,
        agent: health,
      })
    } else {
      return Response.json({
        status: 'unhealthy',
        backend: backendUrl,
        error: `Backend returned ${response.status}`,
      }, { status: 503 })
    }
  } catch (error) {
    return Response.json({
      status: 'error',
      backend: backendUrl,
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 })
  }
}
