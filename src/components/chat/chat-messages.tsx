'use client';

import type { ChatMessage } from '@/types';
import { cn } from '@/lib/utils';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { DochiveLogo } from '../dochive-logo';

interface ChatMessagesProps {
  messages: ChatMessage[];
}

export function ChatMessages({ messages }: ChatMessagesProps) {
  // Ensure unique keys by deduplicating messages and adding index fallback
  const uniqueMessages = messages.reduce((acc: ChatMessage[], message, index) => {
    // Check if message ID already exists in accumulator
    const existingIndex = acc.findIndex(m => m.id === message.id);
    if (existingIndex >= 0) {
      // Replace the existing message (keep the later one)
      acc[existingIndex] = message;
    } else {
      acc.push(message);
    }
    return acc;
  }, []);

  return (
    <div className="space-y-4 sm:space-y-6">
      {uniqueMessages.map((message, index) => (
        <div
          key={`${message.id}-${index}`} // Add index as fallback for uniqueness
          className={cn(
            'flex items-start gap-3 sm:gap-4',
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          {message.role === 'assistant' && (
            <Avatar className="w-7 h-7 sm:w-8 sm:h-8 border flex-shrink-0">
              <AvatarFallback>
                <DochiveLogo className="w-4 h-4 sm:w-5 sm:h-5" />
              </AvatarFallback>
            </Avatar>
          )}
          <div
            className={cn(
              'rounded-lg p-3 text-sm whitespace-pre-wrap break-words',
              'max-w-[85%] sm:max-w-prose',
              message.role === 'user'
                ? 'bg-primary text-primary-foreground'
                : 'bg-secondary'
            )}
          >
            {message.isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-current animate-pulse delay-0" />
                <div className="w-2 h-2 rounded-full bg-current animate-pulse delay-150" />
                <div className="w-2 h-2 rounded-full bg-current animate-pulse delay-300" />
              </div>
            ) : (
              message.content
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
