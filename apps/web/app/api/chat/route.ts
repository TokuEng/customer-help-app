import { NextRequest } from 'next/server';

// This is a proxy route that redirects to the collection-specific endpoint
export async function POST(req: NextRequest) {
  try {
    // Get the body
    const body = await req.json();
    // console.log('Chat API received:', JSON.stringify(body, null, 2));
    
    // Extract collection from body if present, otherwise use default
    const collection = body.collection_key || 'help_center';
    
    // Remove collection_key and other fields not needed by the backend
    const { collection_key, id, trigger, ...restBody } = body;
    
    // Only forward what the backend expects
    const forwardBody = {
      messages: restBody.messages
    };
    
    // Convert messages with parts structure to standard format
    if (forwardBody.messages) {
      forwardBody.messages = forwardBody.messages.map((msg: any) => {
        // Extract only the fields the backend expects
        const cleanMsg: any = {
          role: msg.role,
        };
        
        if (msg.parts && Array.isArray(msg.parts)) {
          // Extract text from parts
          cleanMsg.content = msg.parts
            .filter((p: any) => p.type === 'text')
            .map((p: any) => p.text)
            .join('');
        } else if (msg.content) {
          cleanMsg.content = msg.content;
        }
        
        return cleanMsg;
      });
    }
    
    // Forward to the collection-specific endpoint
    const forwardUrl = new URL(`/api/chat/${collection}`, req.url);
    // console.log('Forwarding to:', forwardUrl.toString());
    
    const response = await fetch(forwardUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(forwardBody),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Collection endpoint error:', response.status, errorText);
      return new Response(errorText, { 
        status: response.status,
        headers: response.headers 
      });
    }
    
    return response;
  } catch (error) {
    console.error('Chat proxy error:', error);
    return new Response('Internal Server Error', { status: 500 });
  }
}