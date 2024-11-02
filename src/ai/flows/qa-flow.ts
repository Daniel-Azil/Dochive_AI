'use server';

/**
 * @fileOverview A flow that answers questions about a document.
 *
 * - answerQuestion - A function that handles the question answering process.
 * - AnswerQuestionInput - The input type for the answerQuestion function.
 * - AnswerQuestionOutput - The return type for the answerQuestion function.
 */

import { ollama } from '@/ai/ollama';
import { z } from 'zod';

const AnswerQuestionInputSchema = z.object({
  fileContent: z.string().describe('The content of the uploaded file.'),
  question: z.string().describe('The question to be answered about the file content.'),
});
export type AnswerQuestionInput = z.infer<typeof AnswerQuestionInputSchema>;

const AnswerQuestionOutputSchema = z.object({
  answer: z.string().describe('The answer to the question about the file content.'),
});
export type AnswerQuestionOutput = z.infer<typeof AnswerQuestionOutputSchema>;

export async function answerQuestion(input: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  return qaFlow(input);
}

async function qaFlow({ fileContent, question }: AnswerQuestionInput): Promise<AnswerQuestionOutput> {
  try {
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful AI assistant. Answer the user\'s question based on the following document content. Provide a clear, accurate, and helpful response.'
      },
      {
        role: 'user' as const,
        content: `DOCUMENT CONTENT:\n${fileContent}\n\nUSER QUESTION:\n${question}`
      }
    ];

    const result = await ollama.generateStructured(messages, AnswerQuestionOutputSchema);
    return result;
  } catch (error) {
    console.error('Error in QA flow:', error);
    
    // Fallback: try with plain text response and wrap it
    const messages = [
      {
        role: 'system' as const,
        content: 'You are a helpful AI assistant. Answer the user\'s question based on the document content provided. Give a direct, clear answer.'
      },
      {
        role: 'user' as const,
        content: `DOCUMENT CONTENT:\n${fileContent}\n\nUSER QUESTION:\n${question}`
      }
    ];

    const answer = await ollama.chat(messages);
    return { answer };
  }
}
