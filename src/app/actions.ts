'use server';

import { GeminiClient } from '@/ai/gemini';
import { ragFlow } from '@/ai/flows/rag-flow';
import {
  summarizeUploadedFile,
  SummarizeUploadedFileInput,
} from '@/ai/flows/summarize-uploaded-file';
import {
  extractKeyInfoFromFile,
  ExtractKeyInfoFromFileInput,
} from '@/ai/flows/extract-key-info-from-file';
import {
  rewriteDocumentSections,
  RewriteDocumentSectionsInput,
} from '@/ai/flows/rewrite-document-sections';

// Initialize Gemini client
const geminiClient = new GeminiClient(process.env.GEMINI_API_KEY!);

export interface AskQuestionInput {
  fileContent: string;
  question: string;
  fileName: string;
}

export async function askQuestion(input: AskQuestionInput) {
  try {
    const answer = await ragFlow(
      geminiClient,
      input.question,
      input.fileContent,
      input.fileName
    );
    return answer;
  } catch (error) {
    console.error('Error in askQuestion action:', error);
    throw new Error('Failed to get an answer from the AI.');
  }
}

export async function summarizeFile(input: SummarizeUploadedFileInput) {
  try {
    const { summary } = await summarizeUploadedFile(input);
    return summary;
  } catch (error) {
    console.error('Error in summarizeFile action:', error);
    throw new Error('Failed to summarize the file.');
  }
}

export async function extractInfo(input: ExtractKeyInfoFromFileInput) {
  try {
    const { extractedInformation } = await extractKeyInfoFromFile(input);
    return extractedInformation;
  } catch (error) {
    console.error('Error in extractInfo action:', error);
    throw new Error('Failed to extract information.');
  }
}

export async function rewriteSection(input: RewriteDocumentSectionsInput) {
  try {
    const { rewrittenDocument } = await rewriteDocumentSections(input);
    return rewrittenDocument;
  } catch (error) {
    console.error('Error in rewriteSection action:', error);
    throw new Error('Failed to rewrite the section.');
  }
}
