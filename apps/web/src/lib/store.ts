import { 
  KBDocument, 
  FormReminder, 
  BulkFormJob, 
  FormFillHistoryRecord, 
  AgentPromptConfig, 
  DocumentRecommendation 
} from '@formpilot/shared';

// Clean Initial Stores (No Seed Data)
export let documentsStore: KBDocument[] = [];

export const documentContentsStore = new Map<string, string>();

export let remindersStore: FormReminder[] = [];

export let bulkJobsStore: BulkFormJob[] = [];

export let historyStore: FormFillHistoryRecord[] = [];

export let promptConfigStore: AgentPromptConfig = {
  tone: 'professional',
  customPromptAddons: '',
  userContext: ''
};

export let gapRecommendationsStore: DocumentRecommendation[] = [];
