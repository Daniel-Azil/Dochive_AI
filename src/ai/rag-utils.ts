/**
 * Utilities for managing the RAG system
 */

import { vectorStore, clearFileEmbeddings, getRAGStats } from '@/ai/flows/rag-flow';

// Re-export key functions for easier access
export { clearFileEmbeddings, getRAGStats };

/**
 * Clear all embeddings in the vector store
 */
export function clearAllEmbeddings(): void {
  vectorStore.clear();
  console.log('Cleared all embeddings from vector store');
}

/**
 * Get detailed statistics about the RAG system
 */
export function getDetailedRAGStats() {
  const stats = getRAGStats();
  console.log('RAG System Statistics:', {
    ...stats,
    memoryUsage: `${stats.totalVectors} vectors stored`,
    status: stats.totalVectors > 0 ? 'Active' : 'Empty'
  });
  return stats;
}

/**
 * Check if a file has been indexed
 */
export async function isFileIndexed(fileName: string): Promise<boolean> {
  const vectors = await vectorStore.getByFileName(fileName);
  return vectors.length > 0;
}

/**
 * Get indexing status for all files
 */
export function getIndexingStatus() {
  const stats = getRAGStats();
  return {
    totalIndexedFiles: stats.totalFiles,
    indexedFileNames: stats.fileNames,
    totalChunks: stats.totalVectors,
    averageChunksPerFile: Math.round(stats.averageChunksPerFile * 100) / 100
  };
}
