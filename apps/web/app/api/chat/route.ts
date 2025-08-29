import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL!; // e.g., http://localhost:8080 or https://api.yourdomain.com

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { messages }: { messages: UIMessage[] } = await req.json();

    // Pull latest user question for retrieval
    const modelMessages = convertToModelMessages(messages);
    const lastUser = [...modelMessages].reverse().find((m) => m.role === 'user');
    const question: string = lastUser?.content?.toString() ?? '';

    if (!question.trim()) {
      return new Response('No question provided', { status: 400 });
    }

    // Fetch contexts from FastAPI RAG
    let contexts: Array<{ content_md?: string; summary?: string; title?: string; url?: string; [key: string]: unknown }> = [];
    try {
      const response = await fetch(`${BACKEND_URL}/api/rag/search`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: question, top_k: 6 }),
        cache: 'no-store',
      });

      if (response.ok) {
        const rag = await response.json();
        contexts = Array.isArray(rag?.hits) ? rag.hits : [];
        console.log('BACKEND_URL:', BACKEND_URL); // Debug log
        console.log('RAG Response:', { hits: contexts.length, sample: contexts[0]?.title });
      } else {
        console.warn('RAG search failed:', response.status, response.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch from RAG endpoint:', error);
      // Continue with empty contexts
    }

    const ctxText = contexts
      .map((c, i: number) => {
        const content = c.content_md?.slice(0, 2000) || c.summary?.slice(0, 2000) || '';
        const title = c.title ? `Title: ${c.title}\n` : '';
        const url = c.url ? `Article Link: ${c.url}\n` : '';
        return `[${i + 1}] ${title}${url}Content: ${content}`;
      })
      .join('\n---\n');

    // System prompt for Toku-specific context
    const systemPrompt = `You are Toku's Help Center assistant. You help users with questions about Toku's benefits, payroll, policies, and workplace tools.

IMPORTANT GUIDELINES:
- Always try to be as helpful as possible with the available context
- If you find relevant information in the context, provide a helpful answer with citations [1], [2]
- If you don't have exact information, look for related or similar topics in the context and mention: "I don't have specific information about [topic], but here's what I found that might be helpful..."
- Only say you don't know if the context is completely unrelated to the question
- Be helpful and provide step-by-step instructions when available
- Keep answers professional and friendly
- Focus specifically on Toku-related information
- When creating links, use ONLY relative URLs like /a/article-slug (example: [View Full Guide](/a/toku-how-to-view-payslips))
- NEVER add domains like toku.com or any other base URL`;

    const contextPrompt = contexts.length > 0 
      ? `\n\nContext from Toku Help Center:\n${ctxText}\n\nPlease answer the user's question using the above context. Look for any relevant or related information that might be helpful, even if it's not a perfect match. Always include citations [1], [2], etc. When relevant, include clickable links to articles using markdown format like [Article Title](URL) - IMPORTANT: Use only the relative URLs provided (like /a/article-slug), do NOT add any domain like toku.com or other domains. If the context doesn't directly answer their question but contains related information, mention that and provide the related details.`
      : `\n\nNo specific context found for this question. Please let the user know you don't have information about their specific question and suggest they browse the help center or contact Toku support for assistance.`;

    // Stream answer conditioned on contexts with citations
    console.log('Streaming with contexts:', contexts.length); // Debug log
    const result = await streamText({
      model: openai('gpt-4o-mini'),
      messages: modelMessages,
      system: systemPrompt + contextPrompt,
      temperature: 0.2,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('Chat API error:', error);
    return new Response('Internal server error', { status: 500 });
  }
}
