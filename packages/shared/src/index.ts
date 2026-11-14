/**
 * FormPilot AI - Shared Domain Types & Contracts
 * Universal contracts shared across Web Dashboard, Extension, and Context Engine.
 */

// ==========================================
// 1. Knowledge Base & Persona Configuration
// ==========================================

export type PersonaTone = 
  | 'requesting'     // Polite, formal, seeking approval/help
  | 'informative'    // Direct, factual, concise
  | 'professional'   // Polished, corporate-aligned
  | 'casual'         // Conversational, relaxed
  | 'custom';

export interface AgentPromptConfig {
  tone: PersonaTone;
  customPromptAddons?: string; // User-defined instructions appended to system prompt
  userContext?: string;        // Specific background info/persona
}

export interface KBDocument {
  id: string;
  name: string;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
  description: string;         // Semantic description to guide agent retrieval
  isEnabled: boolean;          // Active scope toggle for form filling
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// 2. Form Schema & DOM Analysis
// ==========================================

export type FormFieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'tel'
  | 'number'
  | 'date'
  | 'select'
  | 'radio'
  | 'checkbox'
  | 'file'
  | 'custom-combobox';

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormField {
  id: string;
  name?: string;
  selector: string;
  label: string;
  placeholder?: string;
  type: FormFieldType;
  required: boolean;
  options?: FormFieldOption[];
  accept?: string;             // For file upload inputs (e.g., ".pdf,image/*")
  currentValue?: string | boolean | string[];
}

export interface FormSchema {
  id: string;
  domain: string;
  url: string;
  title: string;
  fields: FormField[];
  detectedAt: string;
  stepInfo?: MultiStepFormState;
}

// ==========================================
// 3. Multi-Step Form Navigator
// ==========================================

export interface MultiStepFormState {
  currentStep: number;
  totalSteps?: number;
  stepName?: string;
  stepLabels?: string[];
  isFinalStep: boolean;
  nextButtonSelector?: string;
  prevButtonSelector?: string;
  submitButtonSelector?: string;
}

// ==========================================
// 4. Confidence Heatmap & Review System
// ==========================================

export type FieldConfidenceLevel = 'high' | 'medium' | 'low';

export interface CitationReference {
  documentId: string;
  documentName: string;
  pageOrSection?: string;
  excerpt?: string;
}

export interface PredictedFieldValue {
  fieldId: string;
  value: string | boolean | string[];
  confidence: number;                  // 0.0 to 1.0
  confidenceLevel: FieldConfidenceLevel; // 'high' (>=0.9), 'medium' (0.5-0.89), 'low' (<0.5)
  rationale?: string;
  citation?: CitationReference;
  missingDocHint?: string;             // Prompt user to upload missing document if confidence is low
}

// ==========================================
// 5. In-Page Extension Micro-Prompt Bar
// ==========================================

export interface MicroPromptCommand {
  targetFieldId?: string;              // Specific field or whole form
  promptInstruction: string;           // E.g., "Make answer 3 more concise and emphasize cloud experience"
  toneOverride?: PersonaTone;
}

// ==========================================
// 6. Dynamic Document Generator
// ==========================================

export interface GeneratedDocument {
  id: string;
  filename: string;
  fileType: 'pdf' | 'docx' | 'markdown';
  downloadUrl?: string;
  contentBase64?: string;
  tailoredFor: {
    formUrl: string;
    targetJobOrPrompt: string;
  };
  generatedAt: string;
}

// ==========================================
// 7. Form Filling History & Recorder
// ==========================================

export interface FormFillHistoryRecord {
  id: string;
  domain: string;
  url: string;
  formTitle: string;
  submittedAt: string;
  tone: PersonaTone;
  totalFieldsCount: number;
  filledFieldsCount: number;
  wasAutoSubmitted: boolean;
  fields: Array<{
    fieldId: string;
    question: string;
    answer: string;
    confidence: number;
    wasEditedByUser: boolean;
  }>;
}

// ==========================================
// 8. Website Form Reminders & Autonomous Action
// ==========================================

export type AutoActionPolicy = 
  | 'notify_only'            // Send notification before deadline
  | 'auto_fill_draft'        // Pre-fill form and save draft / keep tab ready
  | 'auto_submit';           // Auto-submit form if all required fields meet confidence threshold

export type ReminderStatus = 
  | 'pending'                // Waiting for trigger window
  | 'user_reviewed'          // User intervened or reviewed manually
  | 'auto_action_in_progress'// Autonomous agent is executing the action
  | 'auto_completed'         // Successfully completed by agent
  | 'failed';                // Encountered error or missing required inputs

export interface FormReminder {
  id: string;
  websiteUrl: string;
  domain: string;
  title: string;
  deadlineTimestamp: string;       // ISO 8601 string
  reminderWindowMinutes: number;   // E.g. 120 minutes before deadline
  autoActionPolicy: AutoActionPolicy;
  minConfidenceThreshold: number;  // E.g., 0.85 required to auto-submit
  status: ReminderStatus;
  activeDocIds?: string[];         // Subset of KB documents to use
  tone: PersonaTone;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  executedAt?: string;
  executionLog?: string;
}

// ==========================================
// 9. Bulk Form Processing & Agent Fleet
// ==========================================

export type BulkJobStatus = 
  | 'queued'
  | 'running'
  | 'completed'
  | 'partially_failed'
  | 'cancelled';

export type BulkItemStatus = 
  | 'queued'
  | 'pending'
  | 'scanning'
  | 'processing'
  | 'filled'
  | 'submitted'
  | 'failed'
  | 'skipped';

export interface BulkFormItem {
  id: string;
  url: string;
  domain: string;
  status: BulkItemStatus;
  formTitle?: string;
  filledFieldsCount?: number;
  totalFieldsCount?: number;
  averageConfidence?: number;
  error?: string;
  resultHistoryId?: string;
}

export interface BulkFormJob {
  id: string;
  name: string;
  status: BulkJobStatus;
  urls: BulkFormItem[];
  autoSubmit: boolean;
  activeDocIds: string[];
  tone: PersonaTone;
  customPromptAddons?: string;
  totalCount: number;
  completedCount: number;
  failedCount: number;
  createdAt: string;
  completedAt?: string;
}

// ==========================================
// 10. Document Gap Recommendation
// ==========================================

export interface DocumentRecommendation {
  missingDocumentName: string;
  description: string;
  reason: string;
  targetedFields: string[];
}
