// A flow for rewriting sections of a document based on user prompts.

'use server';

import { ollama } from '@/ai/ollama';
import { z } from 'zod';

const RewriteDocumentSectionsInputSchema = z.object({
  documentText: z.string().describe('The full text content of the document.'),
  sectionsToRewrite: z
    .array(z.object({startIndex: z.number(), endIndex: z.number()}))
    .describe(
      'An array of objects, each defining a section to rewrite with start and end indices.'
    ),
  rewritePrompt: z.string().describe('The prompt for rewriting the specified sections.'),
});

export type RewriteDocumentSectionsInput = z.infer<typeof RewriteDocumentSectionsInputSchema>;

const RewriteDocumentSectionsOutputSchema = z.object({
  rewrittenDocument: z.string().describe('The document with the specified sections rewritten.'),
});

export type RewriteDocumentSectionsOutput = z.infer<typeof RewriteDocumentSectionsOutputSchema>;

export async function rewriteDocumentSections(
  input: RewriteDocumentSectionsInput
): Promise<RewriteDocumentSectionsOutput> {
  return rewriteDocumentSectionsFlow(input);
}

async function rewriteDocumentSectionsFlow(input: RewriteDocumentSectionsInput): Promise<RewriteDocumentSectionsOutput> {
  try {
    const sections = input.sectionsToRewrite;
    let rewrittenDocument = input.documentText;

    // Sort the sections by start index in descending order to avoid index conflicts
    sections.sort((a, b) => b.startIndex - a.startIndex);

    for (const section of sections) {
      const sectionText = input.documentText.substring(
        section.startIndex,
        section.endIndex
      );

      const messages = [
        {
          role: 'system' as const,
          content: 'You are a document rewriting assistant. Rewrite the given text section according to the provided instructions while maintaining the overall meaning and context.'
        },
        {
          role: 'user' as const,
          content: `Please rewrite this section of text according to the following prompt:

Rewrite Prompt: ${input.rewritePrompt}

Section to Rewrite:
${sectionText}

Please provide only the rewritten text without any additional explanations or formatting.`
        }
      ];

      const rewrittenSection = await ollama.chat(messages);

      if (rewrittenSection) {
        rewrittenDocument = rewrittenDocument.substring(0, section.startIndex) +
          rewrittenSection.trim() +
          rewrittenDocument.substring(section.endIndex);
      }
    }
    
    return { rewrittenDocument };
  } catch (error) {
    console.error('Error in rewrite document sections flow:', error);
    throw new Error(`Failed to rewrite document sections: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
