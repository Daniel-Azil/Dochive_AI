import { useState, useEffect } from 'react';

const SELECTED_FILE_KEY = 'dochive-selected-file';

export function usePersistentSelectedFile() {
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);

  // Load selected file on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(SELECTED_FILE_KEY);
      if (stored) {
        setSelectedFileId(stored);
      }
    }
  }, []);

  // Listen for changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === SELECTED_FILE_KEY) {
        setSelectedFileId(e.newValue);
      }
    };

    const handleSelectedFileUpdate = (e: CustomEvent) => {
      setSelectedFileId(e.detail);
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('selectedFileUpdated', handleSelectedFileUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('selectedFileUpdated', handleSelectedFileUpdate as EventListener);
    };
  }, []);

  // Save whenever selectedFileId changes
  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (selectedFileId) {
        localStorage.setItem(SELECTED_FILE_KEY, selectedFileId);
      } else {
        localStorage.removeItem(SELECTED_FILE_KEY);
      }
      // Dispatch event for same-tab updates
      window.dispatchEvent(new CustomEvent('selectedFileUpdated', { 
        detail: selectedFileId 
      }));
    }
  }, [selectedFileId]);

  return [selectedFileId, setSelectedFileId] as const;
}
