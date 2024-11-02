'use server';
/**
 * @fileOverview Extracts key information from a file.
 *
 * - extractKeyInfoFromFile - A function that extracts key information from a file.
 * - ExtractKeyInfoFromFileInput - The input type for the extractKeyInfoFromFile function.
 * - ExtractKeyInfoFromFileOutput - The return type for the extractKeyInfoFromFile function.
 */

import { ollama } from '@/ai/ollama';
import { z } from 'zod';

const ExtractKeyInfoFromFileInputSchema = z.object({
  fileContent: z.string().describe('The content of the file to extract key information from.'),
  informationTypes: z
    .string()
    .describe(
      'The types of information to extract from the file content (e.g., names, dates, locations).'
    ),
  userInstructions: z
    .string()
    .optional()
    .describe('Specific instructions from the user regarding the information extraction task.'),
});
export type ExtractKeyInfoFromFileInput = z.infer<typeof ExtractKeyInfoFromFileInputSchema>;

const ExtractKeyInfoFromFileOutputSchema = z.object({
  extractedInformation: z
    .string()
    .describe('The extracted key information from the file content.'),
});
export type ExtractKeyInfoFromFileOutput = z.infer<typeof ExtractKeyInfoFromFileOutputSchema>;

export async function extractKeyInfoFromFile(
  input: ExtractKeyInfoFromFileInput
): Promise<ExtractKeyInfoFromFileOutput> {
  return extractKeyInfoFromFileFlow(input);
}

async function extractKeyInfoFromFileFlow({ 
  fileContent, 
  informationTypes, 
  userInstructions 
}: ExtractKeyInfoFromFileInput): Promise<ExtractKeyInfoFromFileOutput> {
  try {
    let promptContent = `You are an expert at extracting key information from documents.

The user has uploaded a file and wants to extract specific types of information from it. Your task is to read the file content and extract the information types specified by the user.

File Content: ${fileContent}
Information Types to Extract: ${informationTypes}`;

    if (userInstructions) {
      promptContent += `\nUser Instructions: ${userInstructions}`;
    }

    promptContent += '\n\nPlease provide the extracted information in a clear and concise manner.';

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert at extracting key information from documents. Provide clear, accurate, and well-organized extracted information.'
      },
      {
        role: 'user' as const,
        content: promptContent
      }
    ];

    const result = await ollama.generateStructured(messages, ExtractKeyInfoFromFileOutputSchema);
    return result;
  } catch (error) {
    console.error('Error in extract key info flow:', error);
    
    // Fallback: try with plain text response and wrap it
    let promptContent = `Extract the following types of information from this document: ${informationTypes}\n\nDocument Content:\n${fileContent}`;
    
    if (userInstructions) {
      promptContent += `\n\nAdditional Instructions: ${userInstructions}`;
    }

    const messages = [
      {
        role: 'system' as const,
        content: 'You are an expert at extracting key information from documents.'
      },
      {
        role: 'user' as const,
        content: promptContent
      }
    ];

    const extractedInformation = await ollama.chat(messages);
    return { extractedInformation };
  }
}
