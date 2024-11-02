'use client';

import type { ChatMessage } from '@/types';
import { ChatMessages } from './chat-messages';
import { ChatInput } from './chat-input';
import { Button } from '../ui/button';
import { ScrollText, ArrowDown, FileText } from 'lucide-react';
import { useState, useRef, useLayoutEffect, useEffect } from 'react';

interface ChatViewProps {
  chatHistory: ChatMessage[];
  onSendMessage: (message: string) => Promise<void>;
  onSummarize: () => Promise<void>;
  onToggleDocPreview?: () => void;
  showDocPreview?: boolean;
}

export function ChatView({
  chatHistory,
  onSendMessage,
  onSummarize,
  onToggleDocPreview,
  showDocPreview,
}: ChatViewProps) {
  const [isLoading, setIsLoading] = useState(false);
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const [shouldAutoScroll, setShouldAutoScroll] = useState(true);
  const lastMessageCountRef = useRef(0);

  // Check if user is at bottom of scroll
  const isAtBottom = () => {
    const el = scrollAreaRef.current;
    if (!el) return false;
    const threshold = 10; // px from bottom
    return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
  };

  // Scroll to bottom function
  const scrollToBottom = () => {
    const el = scrollAreaRef.current;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  };

  // Handle scroll events
  const handleScroll = () => {
    setShouldAutoScroll(isAtBottom());
  };

  // Auto-scroll when new messages arrive, but only if user was at bottom
  useEffect(() => {
    const newMessageCount = chatHistory.length;
    const hasNewMessage = newMessageCount > lastMessageCountRef.current;
    
    if (hasNewMessage) {
      if (shouldAutoScroll) {
        // Small delay to ensure DOM has updated
        setTimeout(scrollToBottom, 50);
      }
      lastMessageCountRef.current = newMessageCount;
    }
  }, [chatHistory, shouldAutoScroll]);

  // Initial scroll to bottom on mount
  useLayoutEffect(() => {
    scrollToBottom();
  }, []);

  const handleSend = async (message: string) => {
    setIsLoading(true);
    // Force auto-scroll when user sends a message
    setShouldAutoScroll(true);
    await onSendMessage(message);
    setIsLoading(false);
  };

  const handleSummarize = async () => {
    setIsLoading(true);
    await onSummarize();
    setIsLoading(false);
  };

  return (
    <div className="flex flex-col h-full relative min-h-0">
      {/* Chat messages area - takes remaining space on mobile, full height on desktop */}
      <div
        className="flex-1 overflow-y-auto p-3 sm:p-4 lg:p-6 min-h-0 lg:pb-0 pb-32"
        ref={scrollAreaRef}
        onScroll={handleScroll}
      >
        <ChatMessages messages={chatHistory} />
      </div>
      
      {/* Scroll to bottom button */}
      {!shouldAutoScroll && (
        <div className="absolute bottom-32 lg:bottom-20 right-3 sm:right-6 z-10">
          <Button
            size="sm"
            onClick={() => {
              setShouldAutoScroll(true);
              scrollToBottom();
            }}
            className="rounded-full shadow-lg h-8 w-8 sm:h-10 sm:w-10"
          >
            <ArrowDown className="h-3 w-3 sm:h-4 sm:w-4" />
          </Button>
        </div>
      )}
      
      {/* Chat input - fixed at bottom on mobile, normal flow on desktop */}
      <div className="fixed lg:relative bottom-0 left-0 right-0 lg:border-t bg-card/95 lg:bg-card/80 backdrop-blur-sm lg:backdrop-blur-none p-3 sm:p-4 flex-shrink-0 border-t lg:border-t z-20 shadow-lg lg:shadow-none">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            onClick={handleSummarize}
            disabled={isLoading}
            className="flex-1 sm:flex-none min-w-0"
          >
            <ScrollText className="mr-2 h-4 w-4" />
            <span className="hidden sm:inline">Summarize</span>
            <span className="sm:hidden">Summary</span>
          </Button>
          {/* Document preview toggle - only on mobile */}
          {onToggleDocPreview && (
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleDocPreview}
              className="lg:hidden flex-1 sm:flex-none min-w-0"
            >
              <FileText className="mr-2 h-4 w-4" />
              <span className="sm:hidden">
                {showDocPreview ? 'Back to Chat' : 'View Doc'}
              </span>
            </Button>
          )}
          {/* Add more task buttons here */}
        </div>
        <ChatInput onSend={handleSend} isLoading={isLoading} />
        <p className="text-xs text-muted-foreground mt-2 text-center hidden sm:block">
          Dochive AI can make mistakes. Check important information.
        </p>
      </div>
    </div>
  );
}
