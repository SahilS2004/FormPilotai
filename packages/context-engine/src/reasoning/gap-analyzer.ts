import { FormField, KBDocument, DocumentRecommendation } from '@formpilot/shared';

/**
 * AI Document Gap Recommender
 * Identifies missing or low-confidence form requirements and suggests
 * specific documents the user should upload into their Knowledge Base.
 */
export class DocumentGapAnalyzer {
  private static readonly COMMON_REQUIREMENT_PATTERNS: Array<{
    keywords: string[];
    recommendedDoc: string;
    description: string;
    reason: string;
  }> = [
    {
      keywords: ['resume', 'cv', 'curriculum vitae', 'work experience', 'portfolio'],
      recommendedDoc: 'Updated Professional Resume / CV',
      description: 'PDF containing work history, key projects, skills, and education',
      reason: 'Required to answer detailed experience, skills, and previous employer questions'
    },
    {
      keywords: ['tax', 'w2', 'w-2', '1040', 'itr', 'annual income', 'gross earnings', 'salary slip'],
      recommendedDoc: 'Latest Tax Return / W-2 / Salary Slips',
      description: 'Official tax filing or compensation statement',
      reason: 'Needed to accurately declare income, employer tax identification, and earnings'
    },
    {
      keywords: ['passport', 'driver license', 'ssn', 'social security', 'national id', 'aadhaar', 'citizenship'],
      recommendedDoc: 'Government Identification Document',
      description: 'Passport, Driver’s License, or National ID copy',
      reason: 'Required to verify legal name, citizenship status, birth date, and identity number'
    },
    {
      keywords: ['degree', 'transcript', 'university', 'gpa', 'graduation date', 'major', 'diploma'],
      recommendedDoc: 'Academic Transcript / Degree Certificate',
      description: 'Official transcript or degree completion certificate',
      reason: 'Needed for educational credentials, GPA, graduation dates, and degree verification'
    },
    {
      keywords: ['cover letter', 'statement of purpose', 'motivation letter', 'why do you want to join'],
      recommendedDoc: 'Tailored Cover Letter / Statement of Purpose',
      description: 'Letter explaining interest in the role or academic program',
      reason: 'Required for custom narrative prompts and file attachment uploads'
    }
  ];

  /**
   * Scans form fields and existing active documents to detect gaps
   */
  public static analyzeGaps(
    fields: FormField[],
    existingDocs: KBDocument[]
  ): DocumentRecommendation[] {
    const recommendations: DocumentRecommendation[] = [];
    const activeDocNames = existingDocs
      .filter((d) => d.isEnabled)
      .map((d) => `${d.name} ${d.description}`.toLowerCase());

    for (const pattern of this.COMMON_REQUIREMENT_PATTERNS) {
      // Check if any field asks for these keywords
      const matchingFields = fields.filter((f) => {
        const text = `${f.label} ${f.name || ''} ${f.placeholder || ''}`.toLowerCase();
        return pattern.keywords.some((kw) => text.includes(kw));
      });

      if (matchingFields.length > 0) {
        // Check if user already has an active document covering this pattern
        const hasCoveringDoc = activeDocNames.some((docText) =>
          pattern.keywords.some((kw) => docText.includes(kw))
        );

        if (!hasCoveringDoc) {
          recommendations.push({
            missingDocumentName: pattern.recommendedDoc,
            description: pattern.description,
            reason: pattern.reason,
            targetedFields: matchingFields.map((f) => f.label)
          });
        }
      }
    }

    return recommendations;
  }
}
