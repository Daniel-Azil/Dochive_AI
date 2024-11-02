'use client';

import { useState, useMemo, useCallback, useRef, useEffect, ChangeEvent, useTransition } from 'react';
import type { FileObject, ChatMessage } from '@/types';
import {
  SidebarProvider,
  SidebarInset,
} from '@/components/ui/sidebar';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { FileSidebar } from '@/components/file-sidebar';
import { ChatView } from '@/components/chat/chat-view';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { UploadCloud, FileText, X, MessageSquare, Menu, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { usePersistentChat } from '@/hooks/use-persistent-chat';
import { usePersistentFiles } from '@/hooks/use-persistent-files';
import { usePersistentSelectedFile } from '@/hooks/use-persistent-selected-file';
import { askQuestion, summarizeFile } from '@/app/actions';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import mammoth from 'mammoth';

export default function Home() {
  const [fileContent, setFileContent] = useState('');
  const [isChatHistoryOpen, setIsChatHistoryOpen] = useState(false);
  const [isDocPreviewOpen, setIsDocPreviewOpen] = useState(false);
  const [isRenameDialogOpen, setRenameDialogOpen] = useState(false);
  const [fileToRename, setFileToRename] = useState<FileObject | null>(null);
  const [newName, setNewName] = useState('');
  const { toast } = useToast();
  const [isPending, startTransition] = useTransition();
  const inputFileRef = useRef<HTMLInputElement>(null);

  // Use persistent hooks
  const {
    files,
    addFiles,
    removeFile,
    updateFile,
  } = usePersistentFiles();

  const [selectedFileId, setSelectedFileId] = usePersistentSelectedFile();

  const {
    chatHistories,
    updateChatHistory,
    replaceLastMessage,
    clearChatHistory,
    initializeChatHistory,
  } = usePersistentChat();

  const selectedFile = useMemo(
    () => files.find(f => f.id === selectedFileId),
    [files, selectedFileId]
  );

  const chatHistory = useMemo(
    () => chatHistories[selectedFileId || ''] || [],
    [chatHistories, selectedFileId]
  );

  useEffect(() => {
    if (selectedFile) {
      setFileContent(selectedFile.content);
    } else {
      setFileContent('');
    }
  }, [selectedFile]);

  const handleFileAdd = useCallback(
    (newFiles: FileObject[]) => {
      addFiles(newFiles);
      if (newFiles.length > 0 && !selectedFileId) {
        setSelectedFileId(newFiles[0].id);
      }
      // Initialize chat history for new files
      for (const file of newFiles) {
        initializeChatHistory(file.id);
      }
      toast({
        title: 'File(s) uploaded',
        description: `${newFiles.length} file(s) successfully processed.`,
      });
    },
    [toast, selectedFileId, initializeChatHistory, addFiles, setSelectedFileId]
  );

  const readFileContent = (file: File): Promise<FileObject> => {
    return new Promise(async (resolve, reject) => {
      const id = crypto.randomUUID();
      const name = file.name;

      try {
        if (file.type === 'application/pdf') {
          const reader = new FileReader();
          reader.onload = async e => {
            try {
              const pdfjs = await import('pdfjs-dist');
              pdfjs.GlobalWorkerOptions.workerSrc = `//unpkg.com/pdfjs-dist@${pdfjs.version}/legacy/build/pdf.worker.min.mjs`;

              const typedArray = new Uint8Array(e.target?.result as ArrayBuffer);
              const pdf: PDFDocumentProxy = await pdfjs.getDocument({data: typedArray}).promise;
              let text = '';
              for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const textContent = await page.getTextContent();
                text += textContent.items.map(item => ('str' in item ? item.str : '')).join(' ');
              }
              resolve({ id, name, content: text });
            } catch (error) { reject(error); }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        } else if (file.name.endsWith('.docx')) {
          const reader = new FileReader();
          reader.onload = async e => {
            try {
              const arrayBuffer = e.target?.result as ArrayBuffer;
              const result = await mammoth.extractRawText({ arrayBuffer });
              resolve({ id, name, content: result.value });
            } catch (error) { reject(error); }
          };
          reader.onerror = reject;
          reader.readAsArrayBuffer(file);
        } else {
          const reader = new FileReader();
          reader.onload = e => {
            resolve({ id, name, content: e.target?.result as string });
          };
          reader.onerror = reject;
          reader.readAsText(file);
        }
      } catch (error) {
        reject(error);
      }
    });
  };
  
  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = event.target.files;
    if (!uploadedFiles) return;

    startTransition(() => {
      const filePromises = Array.from(uploadedFiles).map(readFileContent);

      Promise.all(filePromises)
        .then(handleFileAdd)
        .catch(err => {
          console.error('Error processing files:', err);
          toast({
            variant: 'destructive',
            title: 'Error processing files',
            description: 'Could not read one or more files.',
          });
        });
    });
    // Reset input value to allow re-uploading the same file
    if(inputFileRef.current) {
      inputFileRef.current.value = '';
    }
  };

  const handleFileSelect = useCallback((fileId: string) => {
    setSelectedFileId(fileId);
  }, [setSelectedFileId]);

  const handleFileDelete = useCallback(
    (fileId: string) => {
      const remainingFiles = files.filter(f => f.id !== fileId);
      removeFile(fileId);
      
      if (selectedFileId === fileId) {
        setSelectedFileId(remainingFiles.length > 0 ? remainingFiles[0].id : null);
      }
      
      // Clear chat history for deleted file
      clearChatHistory(fileId);
      toast({ title: 'File deleted' });
    },
    [selectedFileId, toast, clearChatHistory, removeFile, files, setSelectedFileId]
  );

  const handleFileRename = useCallback(
    (fileId: string, newName: string) => {
      updateFile(fileId, { name: newName });
      toast({ title: 'File renamed' });
    },
    [toast, updateFile]
  );

  const handleSendMessage = useCallback(
    async (message: string) => {
      if (!selectedFile) return;

      console.log('🚀 Starting handleSendMessage with:', { message, selectedFile: selectedFile.name });

      // Generate unique IDs with timestamp to prevent duplicates  
      const timestamp = Date.now();
      const userMessageId = `user-${timestamp}-${crypto.randomUUID()}`;
      const loadingMessageId = `assistant-${timestamp + 1}-${crypto.randomUUID()}`; // +1 to ensure different timestamp

      console.log('📝 Generated message IDs:', { userMessageId, loadingMessageId });

      // Add user message first
      const userMessage: ChatMessage = {
        id: userMessageId,
        role: 'user',
        content: message,
      };
      updateChatHistory(selectedFile.id, userMessage);
      console.log('✅ Added user message to chat history');

      // Small delay to ensure user message is processed first
      await new Promise(resolve => setTimeout(resolve, 10));

      // Add loading message
      const loadingMessage: ChatMessage = {
        id: loadingMessageId,
        role: 'assistant',
        content: 'Thinking...',
        isLoading: true,
      };
      updateChatHistory(selectedFile.id, loadingMessage);
      console.log('⏳ Added loading message to chat history');

      try {
        console.log('🔥 Calling askQuestion...');
        
        // Test with a simple prompt first
        console.log('📋 Request details:', {
          fileName: selectedFile.name,
          contentLength: selectedFile.content?.length || 0,
          questionLength: message.length
        });
        
        const answer = await askQuestion({
          fileContent: selectedFile.content,
          question: message,
          fileName: selectedFile.name,
        });
        
        console.log('🎉 Got answer from askQuestion:', { 
          answerLength: answer?.length || 0,
          answerPreview: answer?.substring(0, 100) + '...' 
        });
        
        if (!answer || answer.trim() === '') {
          throw new Error('Empty response from AI');
        }
        
        const assistantMessage: ChatMessage = {
          id: loadingMessageId, // Keep same ID for replacement
          role: 'assistant',
          content: answer,
          isLoading: false, // Explicitly set to false
        };
        replaceLastMessage(selectedFile.id, assistantMessage);
        console.log('✅ Replaced loading message with assistant response');
      } catch (error) {
        console.error('❌ Error getting response:', error);
        const errorMessage: ChatMessage = {
          id: loadingMessageId, // Keep same ID for replacement
          role: 'assistant',
          content: 'Sorry, I encountered an error.',
          isLoading: false, // Explicitly set to false
        };
        replaceLastMessage(selectedFile.id, errorMessage);
        toast({
          variant: 'destructive',
          title: 'An error occurred',
          description: 'Failed to get a response from the AI.',
        });
      }
    },
    [selectedFile, updateChatHistory, replaceLastMessage, toast]
  );

  const handleSummarize = useCallback(async () => {
    if (!selectedFile) {
      console.log('❌ No file selected for summarization');
      return;
    }
    
    console.log('📄 Starting summarization for:', selectedFile.name);
    
    // Generate unique ID with timestamp
    const loadingMessageId = `summary-${Date.now()}-${crypto.randomUUID()}`;
    console.log('📝 Generated summary loading ID:', loadingMessageId);
    
    const loadingMessage: ChatMessage = {
      id: loadingMessageId,
      role: 'assistant',
      content: 'Summarizing...',
      isLoading: true,
    };
    updateChatHistory(selectedFile.id, loadingMessage);
    console.log('⏳ Added summarizing message to chat history');
    
    try {
      console.log('🔥 Calling summarizeFile...');
      console.log('📋 File details:', {
        fileName: selectedFile.name,
        contentLength: selectedFile.content?.length || 0
      });
      
      const summary = await summarizeFile({ fileContent: selectedFile.content });
      
      console.log('🎉 Got summary from summarizeFile:', { 
        summaryLength: summary?.length || 0,
        summaryPreview: summary?.substring(0, 100) + '...' 
      });
      
      if (!summary || summary.trim() === '') {
        throw new Error('Empty summary response');
      }
      
      const summaryMessage: ChatMessage = {
        id: loadingMessageId, // Keep same ID for replacement
        role: 'assistant',
        content: summary,
        isLoading: false, // Explicitly set to false
      };
      replaceLastMessage(selectedFile.id, summaryMessage);
      console.log('✅ Replaced loading message with summary response');
    } catch (error) {
      console.error('❌ Error during summarization:', error);
      const errorMessage: ChatMessage = {
        id: loadingMessageId, // Keep same ID for replacement
        role: 'assistant',
        content: 'Sorry, I could not summarize the document.',
        isLoading: false, // Explicitly set to false
      };
      replaceLastMessage(selectedFile.id, errorMessage);
      toast({
        variant: 'destructive',
        title: 'Summarization failed',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
      });
    }
  }, [selectedFile, updateChatHistory, replaceLastMessage, toast]);

  // Handle rename actions
  const handleRenameClick = (file: FileObject) => {
    setFileToRename(file);
    setNewName(file.name);
    setRenameDialogOpen(true);
  };

  const handleRenameSubmit = () => {
    if (fileToRename && newName.trim()) {
      handleFileRename(fileToRename.id, newName.trim());
    }
    setRenameDialogOpen(false);
    setFileToRename(null);
    setNewName('');
  };

  const triggerFileInput = useCallback(() => {
    inputFileRef.current?.click();
  }, []);

  return (
    <SidebarProvider>
      <FileSidebar
        files={files}
        selectedFileId={selectedFileId}
        onFileSelect={handleFileSelect}
        onFileDelete={handleFileDelete}
        onFileRename={handleFileRename}
        onFileUpload={triggerFileInput}
        isUploading={isPending}
      />
       <input
        type="file"
        ref={inputFileRef}
        onChange={handleFileChange}
        className="hidden"
        accept=".txt,.md,.pdf,.docx"
        multiple
      />
      <SidebarInset className="flex flex-col h-screen">
        {/* Mobile Navigation Bar */}
        <div className="lg:hidden flex items-center justify-between p-3 border-b bg-background/95 backdrop-blur-sm sticky top-0 z-50">
          <div className="flex items-center gap-3">
            <Sheet open={isChatHistoryOpen} onOpenChange={setIsChatHistoryOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm" className="p-2">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-80">
                <SheetHeader>
                  <SheetTitle>Files & Chat History</SheetTitle>
                </SheetHeader>
                <div className="mt-6 space-y-4">
                  {/* Upload new file button */}
                  <Button
                    onClick={() => {
                      setIsChatHistoryOpen(false);
                      triggerFileInput();
                    }}
                    disabled={isPending}
                    className="w-full"
                    variant="outline"
                  >
                    <UploadCloud className="mr-2 h-4 w-4" />
                    {isPending ? 'Processing...' : 'Upload New File'}
                  </Button>
                  
                  {/* Divider */}
                  {files.length > 0 && (
                    <div className="border-t pt-4">
                      <p className="text-sm text-muted-foreground mb-3">Recent Files</p>
                    </div>
                  )}
                  
                  {files.length > 0 ? (
                    files.map((file) => {
                      const fileHistory = chatHistories[file.id] || [];
                      const isSelected = file.id === selectedFileId;
                      
                      return (
                        <div 
                          key={file.id} 
                          className={`relative p-3 rounded-lg border transition-colors ${
                            isSelected ? 'bg-primary/10 border-primary/20' : 'bg-card hover:bg-accent'
                          }`}
                        >
                          <div 
                            className="cursor-pointer"
                            onClick={() => {
                              setSelectedFileId(file.id);
                              setIsChatHistoryOpen(false);
                            }}
                          >
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <h4 className="font-medium text-sm truncate">{file.name}</h4>
                                <span className="text-xs text-muted-foreground">
                                  ({fileHistory.length})
                                </span>
                              </div>
                            </div>
                            {fileHistory.length > 0 ? (
                              <div className="space-y-2">
                                {fileHistory.slice(-2).map((message, index) => (
                                  <div key={index} className="text-xs">
                                    <span className="text-muted-foreground">
                                      {message?.role === 'user' ? 'You: ' : 'AI: '}
                                    </span>
                                    <span className="text-foreground/80">
                                      {message?.content && message.content.length > 50 
                                        ? message.content.substring(0, 50) + '...' 
                                        : message?.content || 'No content'}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-muted-foreground">No messages yet</p>
                            )}
                          </div>
                          
                          {/* Three-dot menu */}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2 top-2 h-6 w-6 opacity-50 hover:opacity-100 z-10"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreVertical className="w-3 h-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRenameClick(file);
                                }}
                              >
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleFileDelete(file.id);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })
                  ) : (
                    <div className="flex flex-col items-center justify-center py-8 text-center">
                      <UploadCloud className="h-12 w-12 text-muted-foreground/50 mb-4" />
                      <p className="text-sm text-muted-foreground">No files uploaded</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Upload files to start chatting
                      </p>
                    </div>
                  )}
                </div>
              </SheetContent>
            </Sheet>
            <h1 className="text-lg font-semibold">Dochive</h1>
          </div>
        </div>

        <main className="flex-1 flex flex-col min-h-0">
          {!selectedFile ? (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 sm:p-8">
              <div className="relative mb-6">
                <UploadCloud className="w-16 sm:w-24 h-16 sm:h-24 text-muted-foreground" />
                <div className="absolute inset-0 bg-gradient-to-t from-primary to-accent opacity-20 blur-2xl rounded-full"></div>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2">Welcome to Dochive AI</h2>
              <p className="text-base sm:text-lg text-muted-foreground mb-6 max-w-md px-2">
                Upload a document to start an intelligent conversation with your
                files.
              </p>
              <Button
                size="lg"
                onClick={triggerFileInput}
                disabled={isPending}
                className="w-full max-w-xs"
              >
                <UploadCloud className="mr-2 h-5 w-5" />
                {isPending ? 'Processing...' : 'Upload Your First File'}
              </Button>
            </div>
          ) : (
            <div className="flex flex-col lg:grid lg:grid-cols-2 flex-1 min-h-0 relative">
              {/* File content section - always visible on desktop, hidden on mobile */}
              <div className="hidden lg:flex flex-col p-3 sm:p-4 lg:p-6">
                <div className="flex-shrink-0 flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-3">
                  <h2 className="text-lg sm:text-xl font-bold truncate pr-4" title={selectedFile.name}>
                    {selectedFile.name}
                  </h2>
                </div>
                <div className="flex-1 relative overflow-hidden">
                  <Textarea
                    value={fileContent}
                    onChange={e => setFileContent(e.target.value)}
                    className="w-full h-full resize-none text-sm sm:text-base border-0 focus:ring-0 focus:outline-none bg-transparent"
                    placeholder="File content appears here..."
                  />
                </div>
              </div>
              
              {/* Mobile Document Preview Sheet */}
              <Sheet open={isDocPreviewOpen} onOpenChange={setIsDocPreviewOpen}>
                <SheetContent side="right" className="w-full sm:w-96 lg:hidden border-0 [&>button]:h-8 [&>button]:w-8 [&>button>svg]:h-6 [&>button>svg]:w-6">
                  <SheetHeader>
                    <SheetTitle>{selectedFile.name}</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col h-full">
                    <div className="flex-1 relative">
                      <Textarea
                        value={fileContent}
                        onChange={e => setFileContent(e.target.value)}
                        className="w-full h-full resize-none text-sm border-0 focus:ring-0 focus:outline-none bg-transparent"
                        placeholder="File content appears here..."
                      />
                    </div>
                  </div>
                </SheetContent>
              </Sheet>
              
              {/* Chat section - with mobile-specific layout */}
              <div className="flex flex-col border-t lg:border-t-0 lg:border-l bg-card/50 min-h-0 lg:h-auto order-last lg:order-none">
                <ChatView
                  chatHistory={chatHistory}
                  onSendMessage={handleSendMessage}
                  onSummarize={handleSummarize}
                  onToggleDocPreview={() => setIsDocPreviewOpen(!isDocPreviewOpen)}
                  showDocPreview={isDocPreviewOpen}
                />
              </div>
            </div>
          )}
        </main>
      </SidebarInset>
      
      {/* Rename Dialog */}
      <Dialog open={isRenameDialogOpen} onOpenChange={setRenameDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename File</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Name
              </Label>
              <Input
                id="name"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                className="col-span-3"
                onKeyDown={e => e.key === 'Enter' && handleRenameSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="secondary">
                Cancel
              </Button>
            </DialogClose>
            <Button onClick={handleRenameSubmit}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
