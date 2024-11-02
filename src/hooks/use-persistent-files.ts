import { useState, useEffect, useCallback } from 'react';
import type { FileObject } from '@/types';

const FILES_KEY = 'dochive-files';

// Load files from localStorage
const loadFiles = (): FileObject[] => {
  if (typeof window === 'undefined') return [];
  
  try {
    const stored = localStorage.getItem(FILES_KEY);
    const parsed = stored ? JSON.parse(stored) : [];
    
    if (parsed.length > 0) {
      console.log(`Loaded ${parsed.length} files from localStorage`);
    }
    
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load files from localStorage:', error);
    return [];
  }
};

// Save files to localStorage
const saveFiles = (files: FileObject[]) => {
  if (typeof window === 'undefined') return;
  
  try {
    localStorage.setItem(FILES_KEY, JSON.stringify(files));
    // Dispatch custom event for cross-tab synchronization
    window.dispatchEvent(new CustomEvent('filesUpdated', { 
      detail: files 
    }));
  } catch (error) {
    console.error('Failed to save files to localStorage:', error);
  }
};

export function usePersistentFiles() {
  const [files, setFiles] = useState<FileObject[]>([]);

  // Load files on mount
  useEffect(() => {
    const loaded = loadFiles();
    setFiles(loaded);
  }, []);

  // Listen for localStorage changes from other tabs
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === FILES_KEY && e.newValue) {
        try {
          const newFiles = JSON.parse(e.newValue);
          if (Array.isArray(newFiles)) {
            setFiles(newFiles);
          }
        } catch (error) {
          console.error('Failed to sync files from other tab:', error);
        }
      }
    };

    // Listen for custom events from same tab
    const handleFilesUpdate = (e: CustomEvent) => {
      if (Array.isArray(e.detail)) {
        setFiles(e.detail);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('filesUpdated', handleFilesUpdate as EventListener);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('filesUpdated', handleFilesUpdate as EventListener);
    };
  }, []);

  // Save to localStorage whenever files changes
  useEffect(() => {
    // Don't use saveFiles here to avoid event loop
    try {
      localStorage.setItem(FILES_KEY, JSON.stringify(files));
    } catch (error) {
      console.error('Failed to save files to localStorage:', error);
    }
  }, [files]);

  const addFiles = useCallback((newFiles: FileObject[]) => {
    setFiles(prev => {
      const updated = [...prev, ...newFiles];
      saveFiles(updated);
      return updated;
    });
  }, []);

  const removeFile = useCallback((fileId: string) => {
    setFiles(prev => {
      const updated = prev.filter(f => f.id !== fileId);
      saveFiles(updated);
      return updated;
    });
  }, []);

  const updateFile = useCallback((fileId: string, updates: Partial<FileObject>) => {
    setFiles(prev => {
      const updated = prev.map(f => 
        f.id === fileId ? { ...f, ...updates } : f
      );
      saveFiles(updated);
      return updated;
    });
  }, []);

  const clearAllFiles = useCallback(() => {
    setFiles([]);
    if (typeof window !== 'undefined') {
      localStorage.removeItem(FILES_KEY);
      window.dispatchEvent(new CustomEvent('filesUpdated', { 
        detail: [] 
      }));
    }
  }, []);

  return {
    files,
    addFiles,
    removeFile,
    updateFile,
    clearAllFiles,
  };
}
