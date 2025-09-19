'use client';

import { MessageCircle, HeadphonesIcon } from 'lucide-react';

import React, { useState, useRef, useEffect } from 'react';
import { useChat } from '@ai-sdk/react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import Link from 'next/link';
import { ChatTracker } from '@/components/ChatTracker';
import { isFeatureEnabled } from '@/lib/featureFlags';
import { SupportEscalation } from '@/components/help-center/SupportEscalation';
import { AgentBadge } from '@/components/help-center/AgentBadge';

// Type for message parts
interface MessagePart {
  type: string;
  text?: string;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showEscalation, setShowEscalation] = useState(false);
  const [lastTicketId, setLastTicketId] = useState<string | undefined>();
  const [agentConfidence, setAgentConfidence] = useState<number | undefined>();
  const [agentCategory, setAgentCategory] = useState<string | undefined>();
  const scrollRef = useRef<HTMLDivElement>(null);
  
  const { messages, sendMessage } = useChat({
    onFinish: (message) => {
      setIsLoading(false);
      
      // Track the completed chat interaction
      if (messages.length > 0) {
        const lastUserMessage = messages[messages.length - 1];
        if (lastUserMessage?.role === 'user') {
          // Extract text content from the user message parts
          const userContent = lastUserMessage.parts
            ?.filter((part: MessagePart) => part.type === 'text')
            .map((part: MessagePart) => part.text)
            .join('') || '';
          
          // Extract text content from the assistant message parts
          const assistantContent = message.message.parts
            ?.filter((part: MessagePart) => part.type === 'text')
            .map((part: MessagePart) => part.text)
            .join('') || '';
          
          if (userContent) {
            ChatTracker.trackChatComplete(
              userContent,
              assistantContent,
              Date.now() - 2000, // Rough estimate for response time
              [] // We could pass RAG contexts here if available
            );
          }
        }
      }
    }
  });

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTo({ 
        top: scrollRef.current.scrollHeight, 
        behavior: 'smooth' 
      });
    }
  }, [messages, open, isLoading]);

  const onSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (input.trim() && !isLoading) {
      const userMessage = input.trim();
      
      // Track the user message
      ChatTracker.trackUserMessage(userMessage);
      
      setIsLoading(true);
      sendMessage({ text: userMessage });
      setInput('');
    }
  };

  return (
    <>
      {/* Floating Chat Button */}
      <Button
        onClick={() => setOpen(v => !v)}
        className="fixed bottom-4 right-4 z-50 h-12 w-12 sm:h-14 sm:w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 bg-primary hover:bg-primary/90"
        size="icon"
        aria-label="Open Toku Assistant"
      >
        <MessageCircle className="h-6 w-6 sm:h-7 sm:w-7" aria-hidden="true" />
      </Button>

      {/* Chat Panel */}
      {open && (
        <div className="fixed bottom-16 right-4 left-4 sm:left-auto sm:right-4 z-50 w-auto sm:w-80 md:w-96 max-w-none sm:max-w-[calc(100vw-2rem)] max-h-[70vh] sm:bottom-20 sm:max-h-[75vh] md:max-h-[80vh] rounded-2xl border border-gray-200 shadow-xl bg-white flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-blue-600 text-white rounded-t-2xl">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-white text-base sm:text-lg truncate">Toku Help Assistant</h3>
              <p className="text-xs text-blue-100 truncate">Ask me anything about Toku</p>
            </div>
            <Button
              onClick={() => setOpen(false)}
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-white hover:text-blue-100 hover:bg-blue-700"
            >
              <span className="text-lg">×</span>
            </Button>
          </div>

          {/* Messages Container */}
          <div 
            ref={scrollRef} 
            className="flex-1 p-3 sm:p-4 overflow-y-auto space-y-3 min-h-[200px] max-h-[350px] sm:max-h-[400px] md:max-h-[450px]"
          >
            {messages.length === 0 && (
              <div className="text-center text-gray-500 py-6 sm:py-8 px-2">
                <div className="mb-3 text-3xl">👋</div>
                <p className="mb-2 text-sm font-medium text-gray-700">Hi! I&apos;m your Toku Help Assistant.</p>
                <p className="text-sm text-gray-500 leading-relaxed px-2">Ask me about benefits, payroll, policies, and more!</p>
                
                {/* Suggested Questions */}
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-500 mb-2">Try asking:</p>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {[
                      "How to review and approve expenses?",
                      "How to enable Token Payroll?",
                      "How to submit an automated invoice?",
                      "How to approve time off requests?",
                      "What are Toku supplemental benefits?",
                      "When is the next payment date?"
                    ].map((question, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          setInput(question);
                          
                          // Track the suggested question click
                          ChatTracker.trackUserMessage(question);
                          
                          setIsLoading(true);
                          sendMessage({ text: question });
                        }}
                        className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-full transition-colors"
                      >
                        {question}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((message, messageIndex) => (
              <div key={message.id}>
                <div
                  className={cn(
                    "flex",
                    message.role === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[85%] sm:max-w-[80%] rounded-2xl px-3 py-2.5 sm:px-4 text-sm break-words",
                      message.role === 'user'
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 text-gray-900 border"
                    )}
                  >
                  {message.parts.map((part, i) => {
                    switch (part.type) {
                      case 'text':
                        return (
                          <div key={`${message.id}-${i}`}>
                            {message.role === 'user' ? (
                              <div className="text-sm">{part.text}</div>
                            ) : (
                              <div className="text-gray-900">
                                <ReactMarkdown 
                                  components={{
                                  p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed text-sm">{children}</p>,
                                  ul: ({ children }) => <ul className="mb-3 space-y-2">{children}</ul>,
                                  ol: ({ children }) => {
                                    let counter = 0;
                                    return (
                                      <ol className="mb-3 space-y-2">
                                        {React.Children.map(children, (child, index) => {
                                          if (React.isValidElement<{ children: React.ReactNode }>(child) && child.type === 'li') {
                                            counter++;
                                            return (
                                              <li key={index} className="flex items-start gap-3 text-sm leading-relaxed">
                                                <span className="flex-shrink-0 w-6 h-6 bg-blue-600 text-white rounded-full text-xs font-semibold flex items-center justify-center mt-0.5">
                                                  {counter}
                                                </span>
                                                <div className="flex-1">{child.props.children}</div>
                                              </li>
                                            );
                                          }
                                          return child;
                                        })}
                                      </ol>
                                    );
                                  },
                                  li: ({ children }) => {
                                    // For unordered lists only - ordered lists are handled in ol component
                                    return (
                                      <li className="flex items-start gap-3 text-sm leading-relaxed">
                                        <span className="flex-shrink-0 w-2 h-2 bg-blue-600 rounded-full mt-2"></span>
                                        <div className="flex-1">{children}</div>
                                      </li>
                                    );
                                  },
                                  strong: ({ children }) => <strong className="font-semibold text-gray-900">{children}</strong>,
                                  em: ({ children }) => <em className="italic text-gray-700">{children}</em>,
                                  code: ({ children }) => <code className="bg-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-xs font-mono">{children}</code>,
                                  h1: ({ children }) => <h1 className="text-sm font-bold mb-2 text-gray-900">{children}</h1>,
                                  h2: ({ children }) => <h2 className="text-sm font-bold mb-2 text-gray-900">{children}</h2>,
                                  h3: ({ children }) => <h3 className="text-sm font-semibold mb-1 text-gray-900">{children}</h3>,
                                  blockquote: ({ children }) => <blockquote className="border-l-2 border-gray-300 pl-3 ml-2 text-gray-700 italic text-sm">{children}</blockquote>,
                                  a: ({ href, children }) => {
                                    // Handle internal app links (relative URLs)
                                    if (href?.startsWith('/a/') || (href?.startsWith('/') && !href?.startsWith('//'))) {
                                      return (
                                        <Link 
                                          href={href} 
                                          className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-1 hover:bg-blue-50 rounded px-1 transition-colors"
                                          onClick={() => setOpen(false)} // Close chat when navigating
                                        >
                                          {children}
                                          <span className="text-xs">↗</span>
                                        </Link>
                                      );
                                    }
                                    // Handle external links (full URLs)
                                    return (
                                      <a 
                                        href={href} 
                                        target="_blank" 
                                        rel="noopener noreferrer"
                                        className="text-blue-600 hover:text-blue-800 underline font-medium inline-flex items-center gap-1 hover:bg-blue-50 rounded px-1 transition-colors"
                                      >
                                        {children}
                                        <span className="text-xs">🔗</span>
                                      </a>
                                    );
                                  },
                                  }}
                                >
                                  {part.text}
                                </ReactMarkdown>
                              </div>
                            )}
                          </div>
                        );
                      default:
                        return null;
                    }
                  })}
                  </div>
                </div>
                
                {/* Show escalation button and agent badge after assistant messages */}
                {message.role === 'assistant' && messageIndex === messages.length - 1 && !isLoading && (
                  <>
                    {isFeatureEnabled('agentDebugMode') && (
                      <div className="flex justify-start mt-2 ml-2">
                        <AgentBadge
                          confidence={agentConfidence}
                          category={agentCategory}
                          ticketId={lastTicketId}
                        />
                      </div>
                    )}
                    
                    {isFeatureEnabled('helpCenterV2Agent') && !lastTicketId && (
                      <div className="flex justify-start mt-3 ml-2">
                        <Button
                          onClick={() => setShowEscalation(true)}
                          variant="outline"
                          size="sm"
                          className="gap-2 text-xs"
                        >
                          <HeadphonesIcon className="h-3 w-3" />
                          Still need help?
                        </Button>
                      </div>
                    )}
                    
                    {lastTicketId && (
                      <div className="flex justify-start mt-3 ml-2">
                        <div className="bg-green-50 text-green-700 px-3 py-1.5 rounded-full text-xs font-medium">
                          ✅ Support ticket created: #{lastTicketId}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}

            {/* Typing Indicator */}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 border rounded-2xl px-3 py-2">
                  <div className="flex items-center gap-2">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></div>
                      <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    </div>
                    <span className="text-gray-500 text-sm">Toku is thinking...</span>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Input Form */}
          <form onSubmit={onSubmit} className="flex gap-2 p-3 sm:p-4 border-t border-gray-100">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isLoading ? "Toku is thinking..." : "Ask about benefits, payroll, policies..."}
              className="flex-1 text-sm placeholder:truncate"
              disabled={isLoading}
            />
            <Button
              type="submit"
              disabled={!input.trim() || isLoading}
              size="icon"
              className="h-10 w-10 shrink-0"
            >
              {isLoading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <span className="text-sm font-medium">→</span>
              )}
            </Button>
          </form>
        </div>
      )}
      
      {/* Support Escalation Modal */}
      {isFeatureEnabled('helpCenterV2Agent') && (
        <SupportEscalation
          open={showEscalation}
          onOpenChange={setShowEscalation}
          userQuery={messages.filter(m => m.role === 'user').slice(-1)[0]?.parts[0]?.text || ''}
          chatHistory={messages.map(m => ({
            role: m.role,
            content: m.parts.map(p => p.text).filter(Boolean).join(' ')
          }))}
          onTicketCreated={(ticketId) => {
            setLastTicketId(ticketId)
            setShowEscalation(false)
          }}
        />
      )}
    </>
  );
}
