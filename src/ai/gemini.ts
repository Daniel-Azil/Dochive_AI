/**
 * Google Gemini API client for chat and embeddings
 */

import { GoogleGenerativeAI } from '@google/generative-ai';

export interface GeminiMessage {
  role: 'user' | 'model';
  parts: { text: string }[];
}

export interface GeminiChatOptions {
  temperature?: number;
  topP?: number;
  topK?: number;
  maxOutputTokens?: number;
}

export class GeminiClient {
  private genAI: GoogleGenerativeAI;
  private chatModel: string;
  private embeddingModel: string;

  constructor(
    apiKey: string,
    chatModel: string = 'gemini-1.5-flash',
    embeddingModel: string = 'text-embedding-004'
  ) {
    this.genAI = new GoogleGenerativeAI(apiKey);
    this.chatModel = chatModel;
    this.embeddingModel = embeddingModel;
  }

  /**
   * Generate chat completion
   */
  async chat(messages: GeminiMessage[], options: GeminiChatOptions = {}): Promise<string> {
    try {
      const model = this.genAI.getGenerativeModel({ 
        model: this.chatModel,
        generationConfig: {
          temperature: options.temperature ?? 0.1,
          topP: options.topP ?? 0.95,
          topK: options.topK ?? 40,
          maxOutputTokens: options.maxOutputTokens ?? 2000,
        }
      });

      // Convert messages to Gemini format
      const history = messages.slice(0, -1).map(msg => ({
        role: msg.role,
        parts: msg.parts
      }));

      const lastMessage = messages[messages.length - 1];

      const chat = model.startChat({ history });
      const result = await chat.sendMessage(lastMessage.parts[0].text);
      
      return result.response.text();
    } catch (error) {
      console.error('Error in Gemini chat:', error);
      throw new Error(`Gemini chat failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate structured response using JSON schema
   */
  async generateStructured<T>(
    messages: GeminiMessage[],
    schema: any,
    options: GeminiChatOptions = {}
  ): Promise<T> {
    try {
      // Add instruction for JSON response
      const structuredMessages = [
        ...messages,
        {
          role: 'user' as const,
          parts: [{ text: `Please respond in valid JSON format matching this schema: ${JSON.stringify(schema)}` }]
        }
      ];

      const response = await this.chat(structuredMessages, options);
      
      // Try to parse JSON response
      try {
        return JSON.parse(response);
      } catch (parseError) {
        // If direct parsing fails, try to extract JSON from response
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          return JSON.parse(jsonMatch[0]);
        }
        throw new Error('Failed to parse structured response');
      }
    } catch (error) {
      console.error('Error in Gemini structured generation:', error);
      throw new Error(`Gemini structured generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate text embeddings
   */
  async generateEmbedding(text: string): Promise<number[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
      const result = await model.embedContent(text);
      
      if (!result.embedding || !result.embedding.values) {
        throw new Error('No embedding returned from Gemini');
      }
      
      return result.embedding.values;
    } catch (error) {
      console.error('Error generating Gemini embedding:', error);
      throw new Error(`Gemini embedding failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Convert simple messages to Gemini format
   */
  static convertMessages(messages: Array<{role: 'system' | 'user' | 'assistant', content: string}>): GeminiMessage[] {
    return messages.map(msg => {
      // Map roles: system -> user, assistant -> model
      const role = msg.role === 'assistant' ? 'model' : 'user';
      
      // For system messages, prefix with instruction
      const content = msg.role === 'system' 
        ? `Instructions: ${msg.content}`
        : msg.content;
      
      return {
        role,
        parts: [{ text: content }]
      };
    });
  }
}

// Create default client instance
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
export const geminiClient = new GeminiClient(GEMINI_API_KEY);
