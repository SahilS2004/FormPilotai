import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  AgentPromptConfig, 
  DocumentRecommendation 
} from '@formpilot/shared';

// Initial Seed Documents
export let documentsStore: KBDocument[] = [
  {
    id: 'doc_1',
    name: 'Sahil_Sarawgi_Resume_2026.pdf',
    originalFilename: 'Sahil_Sarawgi_Resume_2026.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 142800,
    description: 'Updated Software Engineering resume detailing 4 years of TypeScript, React, Next.js, and autonomous AI systems experience.',
    isEnabled: true,
    createdAt: '2026-11-10T10:00:00Z',
    updatedAt: '2026-11-18T14:30:00Z',
  },
  {
    id: 'doc_2',
    name: 'Form_1040_Tax_Return_2024.pdf',
    originalFilename: 'Form_1040_Tax_Return_2024.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 312400,
    description: 'Official tax declaration containing gross income, deductions, and tax registration IDs.',
    isEnabled: true,
    createdAt: '2026-10-15T08:20:00Z',
    updatedAt: '2026-10-15T08:20:00Z',
  },
  {
    id: 'doc_3',
    name: 'Passport_and_ID_Scan.pdf',
    originalFilename: 'Passport_and_ID_Scan.pdf',
    mimeType: 'application/pdf',
    sizeBytes: 890000,
    description: 'Government identification scan with legal name, date of birth, citizenship, and passport number.',
    isEnabled: false,
    createdAt: '2026-09-01T12:00:00Z',
    updatedAt: '2026-09-01T12:00:00Z',
  }
];

export const documentContentsStore = new Map<string, string>([
  [
    'doc_1',
    'Sahil Sarawgi. Senior Software Engineer. Email: sahilsarawgi1239@gmail.com. Phone: +91 9876543210. Location: Bangalore, India. 4+ years building high-scale fullstack web applications, TypeScript, Next.js, distributed agent architectures, and autonomous browser automation.'
  ],
  [
    'doc_2',
    'Taxpayer: Sahil Sarawgi. Filing Status: Single. Gross Annual Income: $140,000 USD. Employer Identification Number (EIN): 12-3456789. Verified 2024 tax declaration.'
  ],
  [
    'doc_3',
    'Identity Document: Republic of India. Full Legal Name: Sahil Sarawgi. Nationality: Indian. Date of Birth: 15/08/2000. Passport Number: Z19827364. Place of Issue: New Delhi.'
  ]
]);

export let remindersStore: FormReminder[] = [
  {
    id: 'rem_1',
    websiteUrl: 'https://careers.google.com/jobs/results/12345',
    domain: 'careers.google.com',
    title: 'Google Senior Frontend Engineer Application',
    deadlineTimestamp: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    reminderWindowMinutes: 120,
    autoActionPolicy: 'auto_submit',
    minConfidenceThreshold: 0.85,
    status: 'pending',
    tone: 'professional',
    notes: 'Prioritize distributed web experience in cover questions.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  {
    id: 'rem_2',
    websiteUrl: 'https://grants.gov/apply/opportunity/9871',
    domain: 'grants.gov',
    title: 'Open Source AI Infrastructure Grant',
    deadlineTimestamp: new Date(Date.now() + 86400000 * 5).toISOString(),
    reminderWindowMinutes: 240,
    autoActionPolicy: 'auto_fill_draft',
    minConfidenceThreshold: 0.80,
    status: 'pending',
    tone: 'requesting',
    notes: 'Draft needs project timeline verification.',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  }
];

export let bulkJobsStore: BulkFormJob[] = [
  {
    id: 'bulk_1',
    name: 'Top 5 YC Startup Application Batch',
    status: 'completed',
    autoSubmit: false,
    activeDocIds: ['doc_1'],
    tone: 'professional',
    totalCount: 3,
    completedCount: 3,
    failedCount: 0,
    createdAt: '2026-11-18T18:00:00Z',
    completedAt: '2026-11-18T18:05:00Z',
    urls: [
      {
        id: 'item_1',
        url: 'https://jobs.lever.co/supabase/frontend-lead',
        domain: 'jobs.lever.co',
        status: 'filled',
        formTitle: 'Supabase - Frontend Engineering Lead',
        filledFieldsCount: 14,
        totalFieldsCount: 14,
        averageConfidence: 0.94,
      },
      {
        id: 'item_2',
        url: 'https://boards.greenhouse.io/posthog/lead-eng',
        domain: 'boards.greenhouse.io',
        status: 'filled',
        formTitle: 'PostHog - Fullstack Developer',
        filledFieldsCount: 12,
        totalFieldsCount: 12,
        averageConfidence: 0.91,
      },
      {
        id: 'item_3',
        url: 'https://ashbyhq.com/resend/staff-eng',
        domain: 'ashbyhq.com',
        status: 'filled',
        formTitle: 'Resend - Staff Software Engineer',
        filledFieldsCount: 16,
        totalFieldsCount: 16,
        averageConfidence: 0.96,
      }
    ]
  }
];

export let historyStore: FormFillHistoryRecord[] = [
  {
    id: 'hist_1',
    domain: 'jobs.lever.co',
    url: 'https://jobs.lever.co/company/job-id-44',
    formTitle: 'Software Architect Application',
    submittedAt: '2026-11-18T19:30:00Z',
    tone: 'professional',
    totalFieldsCount: 8,
    filledFieldsCount: 8,
    wasAutoSubmitted: false,
    fields: [
      { fieldId: 'name', question: 'Full Name', answer: 'Sahil Sarawgi', confidence: 0.99, wasEditedByUser: false },
      { fieldId: 'email', question: 'Email Address', answer: 'sahilsarawgi1239@gmail.com', confidence: 0.99, wasEditedByUser: false },
      { fieldId: 'phone', question: 'Phone Number', answer: '+91 9876543210', confidence: 0.95, wasEditedByUser: false },
      { fieldId: 'exp', question: 'Years of Experience', answer: '4', confidence: 0.95, wasEditedByUser: false },
      { fieldId: 'cover', question: 'Why are you a good fit?', answer: 'With 4+ years in TypeScript, distributed systems, and autonomous agents...', confidence: 0.88, wasEditedByUser: true }
    ]
  }
];

export let promptConfigStore: AgentPromptConfig = {
  tone: 'professional',
  customPromptAddons: 'Always emphasize full-stack TypeScript and autonomous agent systems experience. If asked for remote preference, declare strong preference for remote.',
  userContext: 'Candidate is based in Bangalore, India with valid passport and immediate joining availability.'
};

export let gapRecommendationsStore: DocumentRecommendation[] = [
  {
    missingDocumentName: 'Academic Degree & Official Transcripts',
    description: 'Undergraduate or Postgraduate degree certificates with GPA breakdown',
    reason: 'Detected 2 recent scholarship and university verification forms requesting GPA and graduation proof.',
    targetedFields: ['College GPA', 'Graduation Year', 'Major / Degree Title']
  }
];
