export type FileObject = {
  id: string;
  name: string;
  content: string;
};

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
};
