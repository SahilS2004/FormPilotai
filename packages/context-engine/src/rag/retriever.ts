import { KBDocument } from '@formpilot/shared';

export interface RetrievedChunk {
  documentId: string;
  documentName: string;
  content: string;
  score: number;
}

/**
 * Knowledge Base Context Retriever
 * Filters only active/enabled documents and selects relevant context snippets
 * based on question semantics and document descriptions.
 */
export class ContextRetriever {
  /**
   * Retrieves relevant document snippets for a target question or field label
   */
  public static retrieveContext(
    query: string,
    documents: KBDocument[],
    documentContents: Map<string, string>
  ): RetrievedChunk[] {
    // 1. Only consider enabled documents
    const activeDocs = documents.filter((doc) => doc.isEnabled);
    const results: RetrievedChunk[] = [];
    const queryTokens = query.toLowerCase().split(/\s+/).filter((t) => t.length > 2);

    for (const doc of activeDocs) {
      const fullText = documentContents.get(doc.id) || '';
      const docDescription = doc.description.toLowerCase();

      // Check if document description semantically matches the query
      let relevanceScore = 0;
      queryTokens.forEach((token) => {
        if (docDescription.includes(token)) relevanceScore += 0.3;
        if (fullText.toLowerCase().includes(token)) relevanceScore += 0.2;
      });

      if (relevanceScore > 0 || queryTokens.length === 0) {
        // Extract most relevant 300 characters
        const excerpt = this.extractExcerpt(fullText, queryTokens) || fullText.slice(0, 300);
        results.push({
          documentId: doc.id,
          documentName: doc.name,
          content: excerpt,
          score: Math.min(1.0, relevanceScore)
        });
      }
    }

    // Sort by score descending
    return results.sort((a, b) => b.score - a.score);
  }

  private static extractExcerpt(text: string, tokens: string[]): string {
    const lower = text.toLowerCase();
    for (const token of tokens) {
      const index = lower.indexOf(token);
      if (index !== -1) {
        const start = Math.max(0, index - 100);
        const end = Math.min(text.length, index + 200);
        return text.slice(start, end).trim();
      }
    }
    return text.slice(0, 200);
  }
}
