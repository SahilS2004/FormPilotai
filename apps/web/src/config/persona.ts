import { PersonaTone } from '@formpilot/shared';

export interface TonePresetOption {
  id: PersonaTone;
  label: string;
  desc: string;
  example: string;
}

export const TONE_PRESETS: TonePresetOption[] = [
  {
    id: 'professional',
    label: 'Professional',
    desc: 'Articulate, formal, and executive-level clarity',
    example: 'I bring over 4 years of proven engineering leadership in scalable cloud microservices.'
  },
  {
    id: 'informative',
    label: 'Informative',
    desc: 'Factual, precise, data-oriented, and concise',
    example: '4.5 years experience in React/Node.js; GPA 3.9/4.0; Certified Kubernetes Administrator.'
  },
  {
    id: 'requesting',
    label: 'Requesting',
    desc: 'Polite, persuasive, and respectfully petitioning',
    example: 'I would be grateful for the opportunity to contribute my skills to your innovation team.'
  },
  {
    id: 'casual',
    label: 'Casual',
    desc: 'Approachable, friendly, direct, and conversational',
    example: 'Excited about the role! Love building fast, accessible web apps with modern tech.'
  }
];

export const DIRECTIVE_SUGGESTION_CHIPS = [
  {
    label: '+ Standard Phone Format',
    snippet: 'Always format telephone numbers in international E.164 (+1-XXX-XXX-XXXX).'
  },
  {
    label: '+ Remote Preference',
    snippet: 'Express explicit preference for remote or hybrid positions.'
  },
  {
    label: '+ Tech Stack Focus',
    snippet: 'Highlight TypeScript, React, Next.js, and autonomous AI systems experience.'
  },
  {
    label: '+ Concise Answers',
    snippet: 'Keep open-ended answers under 150 words while retaining all essential facts.'
  }
];

export const PROFESSION_OPTIONS = [
  'Software Engineer / Tech',
  'Product Manager / Designer',
  'Data Scientist / AI Researcher',
  'Business / Finance / Operations',
  'Academic Researcher / Student',
  'Healthcare / Medical Professional',
  'Legal / Compliance Specialist',
  'Freelancer / Independent Consultant',
  'Other Professional'
] as const;

export const REFERRAL_SOURCE_OPTIONS = [
  'Google / Web Search',
  'GitHub / Open Source',
  'X (Twitter) / Social Media',
  'LinkedIn',
  'Friend or Colleague Recommendation',
  'Tech Blog / Newsletter / YouTube'
] as const;

export const PRIMARY_USE_CASES = [
  'Basic form filling',
  'Applying to companies with a resume or CV',
  'Grant and academic applications',
  'Vendor and registration forms',
  'Immigration and visa portals',
  'Other paperwork'
] as const;
