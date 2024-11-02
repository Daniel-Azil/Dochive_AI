import { z } from 'zod';

// Ollama API types
export interface OllamaMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface OllamaChatRequest {
  model: string;
  messages: OllamaMessage[];
  stream?: boolean;
  options?: {
    temperature?: number;
    top_p?: number;
    max_tokens?: number;
  };
}

export interface OllamaChatResponse {
  message: {
    role: string;
    content: string;
  };
  done: boolean;
  total_duration?: number;
  load_duration?: number;
  prompt_eval_count?: number;
  prompt_eval_duration?: number;
  eval_count?: number;
  eval_duration?: number;
}

export interface OllamaEmbeddingRequest {
  model: string;
  prompt: string;
}

export interface OllamaEmbeddingResponse {
  embedding: number[];
}

export class OllamaClient {
  private baseUrl: string;
  private model: string;
  private embeddingModel: string;

  constructor(
    baseUrl: string = 'http://34.172.163.135:11434', 
    model: string = 'gemma2:latest',
    embeddingModel: string = 'nomic-embed-text:latest'
  ) {
    this.baseUrl = baseUrl;
    this.model = model;
    this.embeddingModel = embeddingModel;
  }

  async chat(messages: OllamaMessage[], options?: OllamaChatRequest['options']): Promise<string> {
    const request: OllamaChatRequest = {
      model: this.model,
      messages,
      stream: false,
      options,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaChatResponse = await response.json();
      return data.message.content;
    } catch (error) {
      console.error('Error calling Ollama API:', error);
      throw new Error(`Failed to get response from Ollama: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateStructured<T>(
    messages: OllamaMessage[],
    schema: z.ZodSchema<T>,
    options?: OllamaChatRequest['options']
  ): Promise<T> {
    // Add instruction for JSON output
    const systemMessage: OllamaMessage = {
      role: 'system',
      content: `You must respond with valid JSON that matches this schema. Do not include any explanations or additional text outside the JSON response.`
    };

    const modifiedMessages = [systemMessage, ...messages];
    
    const response = await this.chat(modifiedMessages, options);
    
    try {
      // Try to extract JSON from the response
      let jsonStr = response.trim();
      
      // If response is wrapped in code blocks, extract the JSON
      const jsonMatch = jsonStr.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
      if (jsonMatch) {
        jsonStr = jsonMatch[1];
      }
      
      const parsed = JSON.parse(jsonStr);
      return schema.parse(parsed);
    } catch (error) {
      console.error('Failed to parse structured response:', response);
      throw new Error(`Failed to parse structured response: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async generateEmbedding(text: string): Promise<number[]> {
    const request: OllamaEmbeddingRequest = {
      model: this.embeddingModel,
      prompt: text,
    };

    try {
      const response = await fetch(`${this.baseUrl}/api/embeddings`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request),
      });

      if (!response.ok) {
        throw new Error(`Ollama embedding API error: ${response.status} ${response.statusText}`);
      }

      const data: OllamaEmbeddingResponse = await response.json();
      return data.embedding;
    } catch (error) {
      console.error('Error calling Ollama embedding API:', error);
      throw new Error(`Failed to generate embedding: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}

// Default client instance
import { geminiClient } from './gemini';

// Export gemini client as ollama for backward compatibility
export const ollama = {
  async chat(messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>, options?: any): Promise<string> {
    const geminiMessages = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' as const : 'user' as const;
      const content = msg.role === 'system' ? `Instructions: ${msg.content}` : msg.content;
      return {
        role,
        parts: [{ text: content }]
      };
    });
    
    return await geminiClient.chat(geminiMessages, options);
  },

  async generateStructured(messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>, schema: any, options?: any): Promise<any> {
    const geminiMessages = messages.map(msg => {
      const role = msg.role === 'assistant' ? 'model' as const : 'user' as const;
      const content = msg.role === 'system' ? `Instructions: ${msg.content}` : msg.content;
      return {
        role,
        parts: [{ text: content }]
      };
    });
    
    return await geminiClient.generateStructured(geminiMessages, schema, options);
  }
};
