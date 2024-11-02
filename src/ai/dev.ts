import { config } from 'dotenv';
config();

// Import all AI flows to make them available
import '@/ai/flows/extract-key-info-from-file.ts';
import '@/ai/flows/qa-flow.ts';
import '@/ai/flows/summarize-uploaded-file.ts';
import '@/ai/flows/rewrite-document-sections.ts';
import '@/ai/flows/rag-flow.ts';

// Initialize Ollama connection
import { ollama } from '@/ai/ollama';

console.log('AI flows loaded with Ollama endpoint');

// Test the connection
async function testOllamaConnection() {
  try {
    const response = await ollama.chat([
      { role: 'user', content: 'Hello, can you respond with a simple greeting?' }
    ]);
    console.log('Ollama connection test successful:', response);
  } catch (error) {
    console.error('Ollama connection test failed:', error);
  }
}

testOllamaConnection();
