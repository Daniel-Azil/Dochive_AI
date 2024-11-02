import { useState, useEffect, useCallback } from 'react';
import type { ChatMessage } from '@/types';

const CHAT_HISTORY_KEY = 'dochive-chat-histories';

// Load chat histories from localStorage
const loadChatHistories = (): Record<string, ChatMessage[]> => {
  if (typeof window === 'undefined') return {};
  
  try {
    const stored = localStorage.getItem(CHAT_HISTORY_KEY);
    const parsed = stored ? JSON.parse(stored) : {};
    
    // Clean up any duplicate IDs
    const cleaned: Record<string, ChatMessage[]> = {};
    for (const [fileId, messages] of Object.entries(parsed)) {
      if (Array.isArray(messages)) {
        // Remove duplicates by ID, keeping the last occurrence
        const seen = new Set<string>();
        const uniqueMessages = messages.reverse().filter((msg: ChatMessage) => {
          if (seen.has(msg.id)) {
            return false;
          }
          seen.add(msg.id);
          return true;
        }).reverse();
        
        cleaned[fileId] = uniqueMessages;
      }
    }
    
    // Log how many chat histories were loaded
    const fileCount = Object.keys(cleaned).length;
    let messageCount = 0;
    for (const messages of Object.values(cleaned)) {
      if (Array.isArray(messages)) {
        messageCount += messages.length;
      }
    }
    
    if (fileCount > 0) {
      console.log(`Loaded chat history for ${fileCount} files with ${messageCount} total messages`);
    }
    
    return cleaned;
  } catch (error) {
    console.error('Failed to load chat histories from localStorage:', error);
    return {};
  }
};

// Save chat histories to localStorage
const saveChatHistories = (histories: Record<string, ChatMessage[]>) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(histories));
    // Dispatch custom event for cross-tab synchronization
    window.dispatchEvent(new CustomEvent('chatHistoryUpdated', { 
      detail: histories 
    }));
  } catch (error) {
    console.error('Failed to save chat histories to localStorage:', error);
  }
};

export function usePersistentChat() {
  const [chatHistories, setChatHistories] = useState<Record<string, ChatMessage[]>>({});

  // Load chat histories on mount
  useEffect(() => {
    const loaded = loadChatHistories();
    setChatHistories(loaded);
  }, []);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === CHAT_HISTORY_KEY && e.newValue) {
        try {
          const newHistories = JSON.parse(e.newValue);
          setChatHistories(newHistories);
        } catch (error) {
          console.error('Failed to sync chat histories from other tab:', error);
        }
      }
    };

    // Listen for custom events from same tab
    const handleChatHistoryUpdate = (e: CustomEvent) => {
      setChatHistories(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('chatHistoryUpdated', handleChatHistoryUpdate as EventListener);
    };
  }, []);

  // Save to localStorage whenever chatHistories changes (but prevent infinite loops)
  useEffect(() => {
    if (Object.keys(chatHistories).length > 0) {
      // Don't use saveChatHistories here to avoid the custom event loop
      try {
        localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistories));
      } catch (error) {
        console.error('Failed to save chat histories to localStorage:', error);
      }
    }
  }, [chatHistories]);

  const updateChatHistory = useCallback(
    (fileId: string, message: ChatMessage) => {
      setChatHistories(prev => {
        const currentHistory = prev[fileId] || [];
        
        // Check if message with same ID already exists
        const existingIndex = currentHistory.findIndex(msg => msg.id === message.id);
        
        if (existingIndex >= 0) {
          // Replace existing message instead of adding duplicate
          const newHistory = [...currentHistory];
          newHistory[existingIndex] = message;
          const updated = { ...prev, [fileId]: newHistory };
          saveChatHistories(updated);
          return updated;
        } else {
          // Add new message
          const newHistory = [...currentHistory, message];
          const updated = { ...prev, [fileId]: newHistory };
          saveChatHistories(updated);
          return updated;
        }
      });
    },
    []
  );

  const replaceLastMessage = useCallback(
    (fileId: string, message: ChatMessage) => {
      console.log('replaceLastMessage called:', { fileId, messageId: message.id, role: message.role });
      
      setChatHistories(prev => {
        const history = prev[fileId] || [];
        console.log('Current history length:', history.length, 'Looking for ID:', message.id);
        
        // Find the message with the same ID and replace it
        const messageIndex = history.findIndex(msg => msg.id === message.id);
        
        if (messageIndex >= 0) {
          console.log('Found message at index:', messageIndex);
          // Replace the existing message
          const newHistory = [...history];
          newHistory[messageIndex] = message;
          const updated = { ...prev, [fileId]: newHistory };
          saveChatHistories(updated);
          return updated;
        } else {
          console.log('Message ID not found, looking for loading messages');
          // If message with specific ID not found, look for the last loading message
          let lastLoadingIndex = -1;
          for (let i = history.length - 1; i >= 0; i--) {
            if (history[i].isLoading === true) {
              lastLoadingIndex = i;
              break;
            }
          }
          
          if (lastLoadingIndex >= 0) {
            console.log('Found loading message at index:', lastLoadingIndex);
            // Replace the last loading message
            const newHistory = [...history];
            newHistory[lastLoadingIndex] = message;
            const updated = { ...prev, [fileId]: newHistory };
            saveChatHistories(updated);
            return updated;
          } else {
            // If no loading message found, just add the new message
            console.warn('No loading message found to replace, adding new message instead');
            const newHistory = [...history, message];
            const updated = { ...prev, [fileId]: newHistory };
            saveChatHistories(updated);
            return updated;
          }
        }
      });
    },
    []
  );

  const clearChatHistory = useCallback(
    (fileId: string) => {
      setChatHistories(prev => {
        const updated = { ...prev };
        delete updated[fileId];
        saveChatHistories(updated);
        return updated;
      });
    },
    []
  );

  const clearAllChatHistories = useCallback(() => {
    setChatHistories({});
    if (typeof window !== 'undefined') {
      localStorage.removeItem(CHAT_HISTORY_KEY);
      window.dispatchEvent(new CustomEvent('chatHistoryUpdated', { 
        detail: {} 
      }));
    }
  }, []);

  const initializeChatHistory = useCallback(
    (fileId: string) => {
      setChatHistories(prev => {
        if (prev[fileId]) return prev; // Already exists
        const updated = { ...prev, [fileId]: [] };
        saveChatHistories(updated);
        return updated;
      });
    },
    []
  );

  return {
    chatHistories,
    updateChatHistory,
    replaceLastMessage,
    clearChatHistory,
    clearAllChatHistories,
    initializeChatHistory,
  };
}
