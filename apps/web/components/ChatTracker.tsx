'use client';

import { api } from '@/lib/api';

// Generate a simple session ID
function generateSessionId(): string {
  return `chat_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

class ChatTracker {
  private static sessionId: string | null = null;

  /**
   * Get or create a chat session ID
   */
  static getSessionId(): string {
    if (!this.sessionId) {
      this.sessionId = generateSessionId();
    }
    return this.sessionId;
  }

  /**
   * Reset the session (for new chat conversations)
   */
  static resetSession(): string {
    this.sessionId = generateSessionId();
    return this.sessionId;
  }

  /**
   * Track a chat interaction
   */
  static async trackChatInteraction(
    userMessage: string,
    assistantResponse?: string,
    contextsUsed?: unknown[],
    responseTimeMs?: number
  ): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      
      await api.trackChat(
        sessionId,
        userMessage,
        assistantResponse,
        contextsUsed,
        responseTimeMs
      );
    } catch {
      // Silently fail - don't disrupt user experience for analytics
    }
  }

  /**
   * Track when a user starts a new chat session
   */
  static async trackChatStart(): Promise<void> {
    try {
      const sessionId = this.resetSession();
      
      await api.trackChat(
        sessionId,
        '[CHAT_START]', // Special marker for session start
        '[SESSION_INITIATED]',
        [],
        0
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Track a user message (before getting response)
   */
  static async trackUserMessage(userMessage: string): Promise<void> {
    try {
      const sessionId = this.getSessionId();
      
      await api.trackChat(
        sessionId,
        userMessage,
        undefined, // No response yet
        [],
        undefined
      );
    } catch {
      // Silently fail
    }
  }

  /**
   * Track a complete chat interaction with timing
   */
  static async trackChatComplete(
    userMessage: string,
    assistantResponse: string,
    startTime: number,
    contextsUsed?: unknown[]
  ): Promise<void> {
    try {
      const responseTimeMs = Date.now() - startTime;
      const sessionId = this.getSessionId();
      
      await api.trackChat(
        sessionId,
        userMessage,
        assistantResponse,
        contextsUsed,
        responseTimeMs
      );
    } catch {
      // Silently fail
    }
  }
}

export { ChatTracker };
