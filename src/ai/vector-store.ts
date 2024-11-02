/**
 * In-memory vector store for document embeddings
 */

import type { DocumentChunk } from './document-chunker';

export interface VectorStoreEntry {
  id: string;
  embedding: number[];
  chunk: DocumentChunk;
  metadata: Record<string, any>;
}

export interface SimilarityResult {
  entry: VectorStoreEntry;
  similarity: number;
}

export class InMemoryVectorStore {
  private vectors: Map<string, VectorStoreEntry> = new Map();

  /**
   * Add a vector to the store
   */
  async addVector(
    id: string,
    embedding: number[],
    chunk: DocumentChunk,
    metadata: Record<string, any> = {}
  ): Promise<void> {
    this.vectors.set(id, {
      id,
      embedding,
      chunk,
      metadata,
    });
  }

  /**
   * Add multiple vectors
   */
  async addVectors(entries: Omit<VectorStoreEntry, 'id'>[]): Promise<void> {
    for (const entry of entries) {
      await this.addVector(entry.chunk.id, entry.embedding, entry.chunk, entry.metadata);
    }
  }

  /**
   * Remove a vector by ID
   */
  async removeVector(id: string): Promise<void> {
    this.vectors.delete(id);
  }

  /**
   * Remove all vectors for a specific file
   */
  async removeByFileName(fileName: string): Promise<void> {
    const toRemove: string[] = [];
    
    for (const [id, entry] of this.vectors) {
      if (entry.chunk.metadata.fileName === fileName) {
        toRemove.push(id);
      }
    }
    
    for (const id of toRemove) {
      this.vectors.delete(id);
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) {
      throw new Error('Vectors must have the same length');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }

    if (normA === 0 || normB === 0) {
      return 0;
    }

    return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  /**
   * Find similar vectors
   */
  async similaritySearch(
    queryEmbedding: number[],
    topK: number = 5,
    threshold: number = 0.7,
    fileNameFilter?: string
  ): Promise<SimilarityResult[]> {
    const results: SimilarityResult[] = [];

    for (const entry of this.vectors.values()) {
      // Apply file filter if specified
      if (fileNameFilter && entry.chunk.metadata.fileName !== fileNameFilter) {
        continue;
      }

      const similarity = this.cosineSimilarity(queryEmbedding, entry.embedding);
      
      if (similarity >= threshold) {
        results.push({ entry, similarity });
      }
    }

    // Sort by similarity (highest first) and return top K
    return results
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, topK);
  }

  /**
   * Get all vectors for a specific file
   */
  async getByFileName(fileName: string): Promise<VectorStoreEntry[]> {
    const results: VectorStoreEntry[] = [];
    
    for (const entry of this.vectors.values()) {
      if (entry.chunk.metadata.fileName === fileName) {
        results.push(entry);
      }
    }
    
    // Sort by chunk index
    return results.sort((a, b) => a.chunk.metadata.chunkIndex - b.chunk.metadata.chunkIndex);
  }

  /**
   * Get total number of vectors
   */
  size(): number {
    return this.vectors.size;
  }

  /**
   * Get list of unique file names
   */
  getFileNames(): string[] {
    const fileNames = new Set<string>();
    
    for (const entry of this.vectors.values()) {
      fileNames.add(entry.chunk.metadata.fileName);
    }
    
    return Array.from(fileNames);
  }

  /**
   * Clear all vectors
   */
  clear(): void {
    this.vectors.clear();
  }

  /**
   * Get statistics about the vector store
   */
  getStats(): {
    totalVectors: number;
    totalFiles: number;
    fileNames: string[];
    averageChunksPerFile: number;
  } {
    const fileNames = this.getFileNames();
    
    return {
      totalVectors: this.size(),
      totalFiles: fileNames.length,
      fileNames,
      averageChunksPerFile: fileNames.length > 0 ? this.size() / fileNames.length : 0,
    };
  }
}

// Global vector store instance
export const vectorStore = new InMemoryVectorStore();
