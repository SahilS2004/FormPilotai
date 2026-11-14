import { GeneratedDocument, KBDocument, PersonaTone } from '@formpilot/shared';

/**
 * Dynamic Document Generator
 * Synthesizes customized documents (e.g. 1-page tailored cover letters or custom resumes)
 * matching specific form requirements and stages them for upload.
 */
export class DynamicDocumentGenerator {
  /**
   * Generates a tailored cover letter or statement in markdown / PDF text
   */
  public static generateTailoredDocument(params: {
    formUrl: string;
    targetTitleOrRole: string;
    userProfile: {
      fullName: string;
      email: string;
      phone?: string;
      summary?: string;
      keySkills?: string[];
    };
    tone: PersonaTone;
    activeDocuments: KBDocument[];
  }): GeneratedDocument {
    const { formUrl, targetTitleOrRole, userProfile, tone } = params;
    const docId = `gen_doc_${Date.now()}`;
    const filename = `Tailored_Cover_Letter_${targetTitleOrRole.replace(/\s+/g, '_')}.pdf`;

    const greeting = tone === 'casual' ? 'Hello Team,' : 'Dear Hiring Committee / Review Panel,';
    const closing = tone === 'requesting' ? 'Respectfully submitted,' : 'Sincerely,';

    const contentMarkdown = `
# ${userProfile.fullName}
${userProfile.email} | ${userProfile.phone || ''}

Date: ${new Date().toLocaleDateString()}

**Application For:** ${targetTitleOrRole}
**Target Portal:** ${formUrl}

${greeting}

I am writing to express my earnest enthusiasm for the ${targetTitleOrRole} role. 

${userProfile.summary || 'With a proven track record of delivering impactful results and cross-functional leadership, I bring deep domain expertise and a passion for engineering excellence.'}

Key Strengths & Qualifications:
${(userProfile.keySkills || ['Full-Stack Engineering', 'System Architecture', 'Autonomous AI Systems']).map((s) => `- **${s}**`).join('\n')}

Thank you for your consideration. I look forward to the opportunity to discuss how my background aligns with your team's objectives.

${closing}

**${userProfile.fullName}**
`.trim();

    return {
      id: docId,
      filename,
      fileType: 'pdf',
      tailoredFor: {
        formUrl,
        targetJobOrPrompt: targetTitleOrRole
      },
      contentBase64: Buffer.from(contentMarkdown).toString('base64'),
      generatedAt: new Date().toISOString()
    };
  }
}
