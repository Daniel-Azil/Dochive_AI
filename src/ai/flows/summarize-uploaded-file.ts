'use server';

/**
 * @fileOverview Summarizes the content of an uploaded file.
 *
 * - summarizeUploadedFile - A function that summarizes the content of an uploaded file.
 * - SummarizeUploadedFileInput - The input type for the summarizeUploadedFile function.
 * - SummarizeUploadedFileOutput - The return type for the summarizeUploadedFile function.
 */

import { GeminiClient } from '@/ai/gemini';
import { z } from 'zod';

const SummarizeUploadedFileInputSchema = z.object({
  fileContent: z.string().describe('The content of the uploaded file.'),
});
export type SummarizeUploadedFileInput = z.infer<
  typeof SummarizeUploadedFileInputSchema
>;

const SummarizeUploadedFileOutputSchema = z.object({
  summary: z.string().describe('A summary of the uploaded file.'),
});
export type SummarizeUploadedFileOutput = z.infer<
  typeof SummarizeUploadedFileOutputSchema
>;

export async function summarizeUploadedFile(
  input: SummarizeUploadedFileInput
): Promise<SummarizeUploadedFileOutput> {
  return summarizeUploadedFileFlow(input);
}

async function summarizeUploadedFileFlow({ fileContent }: SummarizeUploadedFileInput): Promise<SummarizeUploadedFileOutput> {
  try {
    // Initialize Gemini client with API key from environment
    const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY!);

    const messages = [
      {
        role: 'user' as const,
        parts: [{ 
          text: `You are a helpful AI assistant. Please provide a clear, concise summary of the following document. Focus on the main points, key information, and important details:\n\n${fileContent}`
        }]
      }
    ];

    // Use Gemini chat directly
    const summary = await geminiClient.chat(messages);
    
    return { summary };
  } catch (error) {
    console.error('Error in summarize flow:', error);
    
    // Fallback: try with simplified request
    try {
      const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY!);
      const messages = [
        {
          role: 'user' as const,
          parts: [{ 
            text: `Summarize this document:\n\n${fileContent}`
          }]
        }
      ];

      const summary = await geminiClient.chat(messages);
      return { summary };
    } catch (fallbackError) {
      console.error('Fallback summarization also failed:', fallbackError);
      throw new Error(`Summarization failed: ${fallbackError instanceof Error ? fallbackError.message : 'Unknown error'}`);
    }
  }
}
