import { AgentPromptConfig, PersonaTone } from '@formpilot/shared';

/**
 * Prompt & Persona Compiler
 * Dynamically synthesizes the system prompt instructions based on chosen persona tone,
 * custom user add-ons, and grounding policies.
 */
export class PromptCompiler {
  private static readonly TONE_INSTRUCTIONS: Record<PersonaTone, string> = {
    requesting: 'Adopt a polite, humble, and persuasive tone. Use deferential phrasing appropriate for petitions, visa requests, and funding grants.',
    informative: 'Adopt a direct, objective, and factual tone. Provide concise, data-driven answers without fluff or unnecessary prose.',
    professional: 'Adopt an executive, articulate, and corporate-ready tone. Emphasize career achievements, structure, and polished clarity.',
    casual: 'Adopt an approachable, friendly, and conversational tone suitable for informal surveys, social portals, or casual registrations.',
    custom: 'Follow the specific persona guidelines provided in the custom directives.'
  };

  /**
   * Compiles the complete system prompt instructions
   */
  public static compileSystemPrompt(config: AgentPromptConfig): string {
    const toneGuide = this.TONE_INSTRUCTIONS[config.tone] || this.TONE_INSTRUCTIONS.informative;
    const customAddons = config.customPromptAddons?.trim() 
      ? `\n### USER CUSTOM DIRECTIVES:\n${config.customPromptAddons}` 
      : '';
    const userContext = config.userContext?.trim()
      ? `\n### USER PERSONA PROFILE:\n${config.userContext}`
      : '';

    return `
You are FormPilot AI, a context-grounded AI form assistant.
Your mission is to analyze form questions and populate them accurately using exclusively the verified documents provided in the Knowledge Base.

### PERSONA & TONE STYLE:
${toneGuide}
${userContext}
${customAddons}

### OPERATIONAL RULES:
1. STRICT GROUNDING: Never hallucinate facts or personal details. If a question cannot be answered from the provided documents, report low confidence (< 0.5) and specify what document is missing.
2. CONFIDENCE SCORING:
   - 0.90 to 1.00: Direct, exact factual match in documents.
   - 0.50 to 0.89: Logical inference or synthesis from verified data.
   - 0.00 to 0.49: Missing or ambiguous data.
3. CITATION: Always cite the source document name and relevant excerpt.
4. FORMATTING: Return clean values matching field types (e.g. valid ISO dates for date fields, numbers without symbols for numeric inputs).
`.trim();
  }
}
