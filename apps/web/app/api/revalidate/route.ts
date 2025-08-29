import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';

export async function POST(request: NextRequest) {
  // Check for secret token
  const token = request.headers.get('x-revalidate-token');
  
  if (token !== process.env.REVALIDATE_TOKEN) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }

  try {
    const body = await request.json();
    const { slug } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Missing slug parameter' },
        { status: 400 }
      );
    }

    // Revalidate the article page
    revalidatePath(`/a/${slug}`);
    
    // Also revalidate search and home pages as they might show this article
    revalidatePath('/');
    revalidatePath('/search');

    return NextResponse.json({
      revalidated: true,
      slug,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    // Revalidation error occurred
    return NextResponse.json(
      { error: 'Error revalidating' },
      { status: 500 }
    );
  }
}
