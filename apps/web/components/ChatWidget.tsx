'use client';

import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeRaw from 'rehype-raw';
import Link from 'next/link';
import { ChatTracker } from '@/components/ChatTracker';

type CollectionType = 'general' | 'visa';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [collectionType, setCollectionType] = useState<CollectionType>('general');
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  
  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input.trim()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    
    // Track user message
    await ChatTracker.trackUserMessage(userMessage.content);
    
    try {
      // Get backend URL from environment
      const backendUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';
      
      // Native fetch to FastAPI with streaming
      const response = await fetch(`${backendUrl}/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage.content,
          collection_type: collectionType,
          chat_id: chatId
        })
      });
      
      if (!response.ok) {
        throw new Error('Failed to get response');
      }
      
      // Get chat ID from response headers
      const newChatId = response.headers.get('X-Chat-ID');
      if (newChatId && !chatId) {
        setChatId(newChatId);
      }
      
      // Handle Server-Sent Events (SSE) streaming
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      const assistantMessageId = Date.now().toString();
      const startTime = Date.now();
      
      // Add initial empty message
      setMessages(prev => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: ''
      }]);
      
      const processStream = async () => {
        let buffer = '';
        
        while (true) {
          const { done, value } = await reader!.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;
          
          // Process complete SSE messages
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';
          
          for (const line of lines) {
            if (line.trim() === '') continue;
            
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              
              if (data === '[DONE]') {
                setIsLoading(false);
                await ChatTracker.trackChatComplete(
                  userMessage.content,
                  assistantMessage,
                  startTime,
                  []
                );
                return;
              }
              
              // Parse JSON data
              try {
                const parsed = JSON.parse(data);
                if (parsed.content) {
                  assistantMessage += parsed.content;
                }
              } catch {
                // Fallback for non-JSON data
                assistantMessage += data;
              }
              
              // Update the message
              setMessages(prev => prev.map(m => 
                m.id === assistantMessageId 
                  ? { ...m, content: assistantMessage }
                  : m
              ));
            }
          }
        }
      };
      
      await processStream();
      
      // Track completed interaction
      await ChatTracker.trackChatComplete(
        userMessage.content,
        assistantMessage,
        startTime,
        []
      );
      
    } catch (error) {
      console.error('Chat error:', error);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.'
      }]);
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleModeSwitch = (mode: CollectionType) => {
    if (messages.length > 0) {
      const confirmSwitch = confirm('Switching chat mode will start a new conversation. Continue?');
      if (!confirmSwitch) return;
      setMessages([]);
      setChatId(null);
      ChatTracker.resetSession();
    }
    setCollectionType(mode);
  };
  
  const handleSuggestedQuestion = (question: string) => {
    setInput(question);
  };
  
  return (
    <div className="fixed bottom-4 right-4 z-50">
      {isOpen && (
        <div className="bg-white rounded-2xl shadow-2xl w-[400px] h-[600px] flex flex-col mb-4 border border-gray-200">
          {/* Header with mode selector */}
          <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-purple-50">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-blue-600" />
                <h3 className="font-semibold text-gray-900">Toku AI Assistant</h3>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {/* Collection Type Selector */}
            <div className="flex gap-2">
              <button
                onClick={() => handleModeSwitch('general')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  collectionType === 'general'
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                💼 General Help
              </button>
              <button
                onClick={() => handleModeSwitch('visa')}
                className={cn(
                  "flex-1 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                  collectionType === 'visa'
                    ? 'bg-purple-500 text-white shadow-md'
                    : 'bg-white text-gray-700 hover:bg-gray-50'
                )}
              >
                🛂 Visa Support
              </button>
            </div>
            
            <p className="text-xs text-gray-600 mt-2">
              {collectionType === 'visa'
                ? 'Ask about visa requirements, timelines, and eligibility'
                : 'Ask about payroll, benefits, and HR policies'}
            </p>
          </div>
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 mt-8">
                <div className="text-4xl mb-3">
                  {collectionType === 'visa' ? '🛂' : '💬'}
                </div>
                <p className="text-sm mb-4">
                  {collectionType === 'visa'
                    ? 'Ask me anything about visa processes!'
                    : 'How can I help you today?'}
                </p>
                
                {/* Suggested Questions */}
                <div className="space-y-2">
                  {collectionType === 'visa' ? (
                    <>
                      <button
                        onClick={() => handleSuggestedQuestion('What are H-1B requirements?')}
                        className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors w-full"
                      >
                        What are H-1B requirements?
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion('How long does UK Skilled Worker visa take?')}
                        className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors w-full"
                      >
                        How long does UK Skilled Worker visa take?
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion('What are the fees for German Blue Card?')}
                        className="text-xs bg-purple-50 text-purple-700 px-3 py-2 rounded-lg hover:bg-purple-100 transition-colors w-full"
                      >
                        What are the fees for German Blue Card?
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => handleSuggestedQuestion('How do contractor payments work?')}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                      >
                        How do contractor payments work?
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion('What benefits does Toku offer?')}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                      >
                        What benefits does Toku offer?
                      </button>
                      <button
                        onClick={() => handleSuggestedQuestion('How does PTO work for employees?')}
                        className="text-xs bg-blue-50 text-blue-700 px-3 py-2 rounded-lg hover:bg-blue-100 transition-colors w-full"
                      >
                        How does PTO work for employees?
                      </button>
                    </>
                  )}
                </div>
              </div>
            ) : (
              <>
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    <div
                      className={cn(
                        "max-w-[80%] px-4 py-2 rounded-2xl",
                        message.role === 'user'
                          ? 'bg-blue-500 text-white'
                          : 'bg-gray-100 text-gray-900'
                      )}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-sm space-y-2 markdown-content">
                          <ReactMarkdown
                            remarkPlugins={[remarkGfm]}
                            rehypePlugins={[rehypeRaw]}
                            components={{
                              p: ({ children }) => (
                                <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>
                              ),
                              strong: ({ children }) => (
                                <strong className="font-semibold text-gray-900">{children}</strong>
                              ),
                              em: ({ children }) => (
                                <em className="italic">{children}</em>
                              ),
                              h1: ({ children }) => (
                                <h1 className="text-lg font-bold text-gray-900 mt-3 mb-2">{children}</h1>
                              ),
                              h2: ({ children }) => (
                                <h2 className="text-base font-bold text-gray-900 mt-3 mb-2">{children}</h2>
                              ),
                              h3: ({ children }) => (
                                <h3 className="text-sm font-semibold text-gray-900 mt-2 mb-1">{children}</h3>
                              ),
                              ul: ({ children }) => (
                                <ul className="list-disc pl-5 mb-2 space-y-1">{children}</ul>
                              ),
                              ol: ({ children }) => (
                                <ol className="list-decimal pl-5 mb-2 space-y-1">{children}</ol>
                              ),
                              li: ({ children }) => (
                                <li className="leading-relaxed">{children}</li>
                              ),
                              a: ({ href, children }) => (
                                <Link
                                  href={href || '#'}
                                  className="text-blue-600 hover:underline font-medium"
                                >
                                  {children}
                                </Link>
                              ),
                              code: ({ children }) => (
                                <code className="bg-gray-200 px-1.5 py-0.5 rounded text-xs font-mono">
                                  {children}
                                </code>
                              ),
                              pre: ({ children }) => (
                                <pre className="bg-gray-100 p-3 rounded-lg overflow-x-auto mb-2">
                                  {children}
                                </pre>
                              ),
                              blockquote: ({ children }) => (
                                <blockquote className="border-l-4 border-yellow-400 bg-yellow-50 pl-4 py-2 my-2 italic">
                                  {children}
                                </blockquote>
                              ),
                              hr: () => (
                                <hr className="my-3 border-gray-300" />
                              ),
                            }}
                          >
                            {message.content}
                          </ReactMarkdown>
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </>
            )}
            
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 px-4 py-2 rounded-2xl">
                  <div className="flex gap-1">
                    <span className="animate-bounce">●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.1s' }}>●</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>●</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* Input */}
          <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200">
            <div className="flex gap-2">
              <Input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={
                  collectionType === 'visa'
                    ? 'Ask about visa requirements...'
                    : 'Ask anything...'
                }
                className="flex-1"
                disabled={isLoading}
              />
              <Button
                type="submit"
                disabled={isLoading || !input.trim()}
                className="bg-blue-500 hover:bg-blue-600"
              >
                Send
              </Button>
            </div>
          </form>
        </div>
      )}
      
      {/* Floating Button */}
      {!isOpen && (
        <button
          onClick={() => {
            setIsOpen(true);
            if (!chatId) {
              ChatTracker.trackChatStart();
            }
          }}
          className="bg-gradient-to-r from-blue-500 to-purple-500 text-white p-4 rounded-full shadow-lg hover:shadow-xl transition-all hover:scale-110"
        >
          <MessageCircle className="w-6 h-6" />
        </button>
      )}
    </div>
  );
}