/**
 * Document chunking utilities for RAG implementation
 */

export interface DocumentChunk {
  id: string;
  content: string;
  metadata: {
    fileName: string;
    chunkIndex: number;
    startChar: number;
    endChar: number;
  };
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
  preserveSentences: boolean;
}

const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkSize: 1000,
  chunkOverlap: 200,
  preserveSentences: true,
};

/**
 * Split text into chunks with overlap
 */
export function chunkDocument(
  content: string,
  fileName: string,
  options: Partial<ChunkingOptions> = {}
): DocumentChunk[] {
  const opts = { ...DEFAULT_CHUNKING_OPTIONS, ...options };
  const chunks: DocumentChunk[] = [];

  if (!content || content.trim().length === 0) {
    return chunks;
  }

  // Clean the content
  const cleanContent = content.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  
  if (opts.preserveSentences) {
    return chunkBySentences(cleanContent, fileName, opts);
  } else {
    return chunkBySize(cleanContent, fileName, opts);
  }
}

/**
 * Chunk by sentences to preserve semantic meaning
 */
function chunkBySentences(
  content: string,
  fileName: string,
  options: ChunkingOptions
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  
  // Split into sentences (simple regex - could be improved with NLP)
  const sentences = content.split(/(?<=[.!?])\s+/);
  
  let currentChunk = '';
  let currentStartChar = 0;
  let chunkIndex = 0;

  for (let i = 0; i < sentences.length; i++) {
    const sentence = sentences[i];
    const potentialChunk = currentChunk + (currentChunk ? ' ' : '') + sentence;

    if (potentialChunk.length > options.chunkSize && currentChunk) {
      // Create chunk
      chunks.push({
        id: `${fileName}-chunk-${chunkIndex}`,
        content: currentChunk.trim(),
        metadata: {
          fileName,
          chunkIndex,
          startChar: currentStartChar,
          endChar: currentStartChar + currentChunk.length,
        },
      });

      // Start new chunk with overlap
      const overlapText = getOverlapText(currentChunk, options.chunkOverlap);
      currentChunk = overlapText + (overlapText ? ' ' : '') + sentence;
      currentStartChar = currentStartChar + currentChunk.length - overlapText.length;
      chunkIndex++;
    } else {
      currentChunk = potentialChunk;
    }
  }

  // Add final chunk if there's content
  if (currentChunk.trim()) {
    chunks.push({
      id: `${fileName}-chunk-${chunkIndex}`,
      content: currentChunk.trim(),
      metadata: {
        fileName,
        chunkIndex,
        startChar: currentStartChar,
        endChar: currentStartChar + currentChunk.length,
      },
    });
  }

  return chunks;
}

/**
 * Simple chunking by character count
 */
function chunkBySize(
  content: string,
  fileName: string,
  options: ChunkingOptions
): DocumentChunk[] {
  const chunks: DocumentChunk[] = [];
  const step = options.chunkSize - options.chunkOverlap;
  let chunkIndex = 0;

  for (let i = 0; i < content.length; i += step) {
    const end = Math.min(i + options.chunkSize, content.length);
    const chunkContent = content.slice(i, end);

    chunks.push({
      id: `${fileName}-chunk-${chunkIndex}`,
      content: chunkContent,
      metadata: {
        fileName,
        chunkIndex,
        startChar: i,
        endChar: end,
      },
    });

    chunkIndex++;
  }

  return chunks;
}

/**
 * Get overlap text from the end of a chunk
 */
function getOverlapText(text: string, overlapSize: number): string {
  if (text.length <= overlapSize) {
    return text;
  }

  const overlap = text.slice(-overlapSize);
  
  // Try to start from a word boundary
  const spaceIndex = overlap.indexOf(' ');
  if (spaceIndex > 0) {
    return overlap.slice(spaceIndex + 1);
  }

  return overlap;
}
