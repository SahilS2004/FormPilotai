export const SITE_CONFIG = {
  name: 'FormPilot AI',
  tagline: 'Context-Aware Autonomous Form Copilot',
  description: 'Autonomous AI form filling copilot powered by your verified knowledge base documents and universal DOM reasoning.',
  version: '0.2.0',
  parentCompany: {
    name: 'InnovChromatic',
    website: 'https://www.innovchromatic.tech',
    displayUrl: 'www.innovchromatic.tech'
  },
  api: {
    base: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000',
    auth: '/api/auth',
    fillForm: '/api/fill-form',
    documents: '/api/documents',
    reminders: '/api/reminders',
    bulkJobs: '/api/bulk-jobs',
    documentJobs: '/api/document-jobs',
    history: '/api/history',
    onboarding: '/api/onboarding'
  },
  downloads: {
    extensionZip: '/downloads/formpilot-extension.zip',
    sampleProfileTxt: '/downloads/sample-reference-profile.txt'
  },
  links: {
    github: 'https://github.com/SahilS2004/FormPilotai',
    docs: '/#features',
    chromeWebStore: 'https://chrome.google.com/webstore',
    parentCompany: 'https://www.innovchromatic.tech'
  },
  defaultModel: {
    provider: 'Google Gemini',
    name: 'Gemini 3 Flash',
    fallback: 'Gemini 3.5 Flash',
    embedding: 'Gemini Embedding 2',
    contextWindow: '1M tokens',
    description: 'Reads the page heading and answers each field from the knowledge base. Embeddings are remote. No local model runs in production.'
  }
} as const;
