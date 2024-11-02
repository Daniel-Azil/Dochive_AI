/**
 * RAG (Retrieval-Augmented Generation) flow
 */

import { GeminiClient } from '../gemini';
import type { GeminiMessage } from '../gemini';
import { chunkDocument } from '../document-chunker';
import { vectorStore } from '../vector-store';
import type { SimilarityResult } from '../vector-store';

// Re-export vectorStore for utility functions
export { vectorStore };

export interface RAGFlowOptions {
  maxTokens?: number;
  temperature?: number;
  context?: string;
  topK?: number;
  similarityThreshold?: number;
  chunkSize?: number;
  chunkOverlap?: number;
}

export async function ragFlow(
  client: GeminiClient,
  query: string,
  fileContent: string,
  fileName: string,
  options: RAGFlowOptions = {}
): Promise<string> {
  const {
    maxTokens = 2000,
    temperature = 0.1,
    context = '',
    topK = 5,
    similarityThreshold = 0.7,
    chunkSize = 1000,
    chunkOverlap = 200
  } = options;

  try {
    // Check if we already have vectors for this file
    const existingVectors = await vectorStore.getByFileName(fileName);
    
    if (existingVectors.length === 0) {
      console.log(`Processing and indexing document: ${fileName}`);
      
      // Chunk the document
      const chunks = chunkDocument(fileContent, fileName, {
        chunkSize,
        chunkOverlap: chunkOverlap
      });

      // Generate embeddings for each chunk
      for (const chunk of chunks) {
        try {
          const embedding = await client.generateEmbedding(chunk.content);
          await vectorStore.addVector(
            chunk.id,
            embedding,
            chunk,
            {
              fileName,
              processedAt: Date.now()
            }
          );
        } catch (error) {
          console.error(`Failed to generate embedding for chunk ${chunk.id}:`, error);
        }
      }
      
      console.log(`Indexed ${chunks.length} chunks for ${fileName}`);
    }

    // Generate embedding for the query
    console.log('Generating query embedding...');
    const queryEmbedding = await client.generateEmbedding(query);

    // Retrieve relevant chunks
    console.log('Searching for relevant chunks...');
    const similarChunks = await vectorStore.similaritySearch(
      queryEmbedding,
      topK,
      similarityThreshold,
      fileName
    );

    if (similarChunks.length === 0) {
      // Fallback to lower threshold or use all chunks
      const fallbackChunks = await vectorStore.similaritySearch(
        queryEmbedding,
        Math.min(3, topK),
        0.3, // Lower threshold
        fileName
      );
      
      if (fallbackChunks.length === 0) {
        // If still no results, use first few chunks
        const allChunks = await vectorStore.getByFileName(fileName);
        const relevantContext = allChunks
          .slice(0, 3)
          .map(entry => entry.chunk.content)
          .join('\n\n');
          
        return await generateAnswer(client, query, relevantContext, fileName, context, temperature, maxTokens);
      }
      
      similarChunks.push(...fallbackChunks);
    }

    // Build context from retrieved chunks
    const retrievedContext = similarChunks
      .map((result: SimilarityResult, index: number) => 
        `[Chunk ${index + 1}, Similarity: ${result.similarity.toFixed(3)}]\n${result.entry.chunk.content}`
      )
      .join('\n\n---\n\n');

    console.log(`Found ${similarChunks.length} relevant chunks`);

    return await generateAnswer(client, query, retrievedContext, fileName, context, temperature, maxTokens);

  } catch (error) {
    console.error('Error in RAG flow:', error);
    throw new Error(`Failed to process query: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

async function generateAnswer(
  client: GeminiClient,
  query: string,
  retrievedContext: string,
  fileName: string,
  additionalContext: string,
  temperature: number,
  maxTokens: number
): Promise<string> {
  const systemPrompt = `You are an expert document analysis assistant. You have access to relevant excerpts from a document called "${fileName}".

Your task is to answer questions about this document accurately and comprehensively. When answering:

1. Base your answers strictly on the information provided in the retrieved excerpts
2. If the answer is not explicitly in the excerpts, say so clearly
3. Provide specific quotes or references when possible
4. Be concise but thorough
5. If asked about topics not covered in the excerpts, explain what the excerpts do cover instead
6. Reference chunk numbers when citing specific information

${additionalContext ? `Additional context: ${additionalContext}` : ''}

Retrieved relevant excerpts:
${retrievedContext}`;

  const messages: GeminiMessage[] = [
    {
      role: 'user',
      parts: [{ text: systemPrompt }]
    },
    {
      role: 'user',
      parts: [{ text: query }]
    }
  ];

  const response = await client.chat(messages, {
    temperature,
    maxOutputTokens: maxTokens
  });

  return response;
}

/**
 * Clear embeddings for a specific file (useful when file is updated)
 */
export async function clearFileEmbeddings(fileName: string): Promise<void> {
  await vectorStore.removeByFileName(fileName);
  console.log(`Cleared embeddings for file: ${fileName}`);
}

/**
 * Get RAG statistics
 */
export function getRAGStats() {
  return vectorStore.getStats();
}
