import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  AgentPromptConfig, 
  DocumentRecommendation 
} from '@formpilot/shared';

type MemoryState = {
  documents: KBDocument[];
  reminders: FormReminder[];
  bulkJobs: BulkFormJob[];
  history: FormFillHistoryRecord[];
  prompt: AgentPromptConfig;
  gaps: DocumentRecommendation[];
  contents: Map<string, string>;
  notifications: Array<{
    id: string;
    reminderId?: string;
    title: string;
    body: string;
    href?: string;
    isRead: boolean;
    createdAt: string;
  }>;
};

const root = globalThis as typeof globalThis & { __formpilotMemory?: MemoryState };
if (!root.__formpilotMemory) {
  root.__formpilotMemory = {
    documents: [],
    reminders: [],
    bulkJobs: [],
    history: [],
    prompt: { tone: 'professional', customPromptAddons: '', userContext: '' },
    gaps: [],
    contents: new Map(),
    notifications: [],
  };
}

const memory = root.__formpilotMemory;

export const documentsStore = memory.documents;
export const documentContentsStore = memory.contents;
export const remindersStore = memory.reminders;
export const bulkJobsStore = memory.bulkJobs;
export const historyStore = memory.history;
export let promptConfigStore = memory.prompt;
export const gapRecommendationsStore = memory.gaps;
export const notificationStore = memory.notifications;
