import { withDatabase, markDocumentIndexed } from './db';
import { storeDocumentVectors } from './vector';

export const ONBOARDING_DOC_ID = 'user_basic_info';

export interface OnboardingFacts {
  name?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  nationality?: string;
  profession?: string;
  primaryUseCases?: string[];
  tone?: string;
  referralSource?: string;
}

export function renderOnboardingText(facts: OnboardingFacts): string {
  const use = (facts.primaryUseCases || []).filter(Boolean).join(', ');
  const line = (label: string, value?: string) => value?.trim() ? `${label}: ${value.trim()}` : '';
  return [
    'User basic information',
    line('Full name', facts.name),
    line('Email', facts.email),
    line('Phone', facts.phone),
    line('Date of birth', facts.dateOfBirth),
    line('Gender', facts.gender),
    line('Address', facts.address),
    line('Street address', facts.address),
    line('City', facts.city),
    line('State', facts.state),
    line('Postal code', facts.postalCode),
    line('ZIP code', facts.postalCode),
    line('Country', facts.country),
    line('Nationality', facts.nationality),
    line('Profession', facts.profession),
    use ? `Primary use: ${use}` : '',
    line('Preferred tone', facts.tone),
    line('Referral source', facts.referralSource),
  ].filter(Boolean).join('\n');
}

export async function indexOnboardingProfile(facts: OnboardingFacts): Promise<{ indexed: boolean; chunkCount: number }> {
  const text = renderOnboardingText(facts);
  if (!facts.name && !facts.email && !facts.phone && !facts.dateOfBirth && !facts.address) {
    return { indexed: false, chunkCount: 0 };
  }

  const now = new Date().toISOString();
  const active = await withDatabase();
  if (active) {
    await active.query(`DELETE FROM document_chunks WHERE document_id = 'profile_onboarding'`);
    await active.query(`DELETE FROM documents WHERE id = 'profile_onboarding'`);
    await active.query(
      `INSERT INTO documents (
         id, name, original_filename, mime_type, size_bytes, description, is_enabled,
         content_text, source_type, index_status, chunk_count, created_at, updated_at
       ) VALUES ($1, 'user_basic_info', 'user_basic_info.txt', 'text/plain', $2, $3, true, $4, 'file', 'pending', 0, $5, $5)
       ON CONFLICT (id) DO UPDATE SET
         name = 'user_basic_info',
         original_filename = 'user_basic_info.txt',
         description = EXCLUDED.description,
         content_text = EXCLUDED.content_text,
         size_bytes = EXCLUDED.size_bytes,
         source_type = 'file',
         is_enabled = true,
         updated_at = CURRENT_TIMESTAMP`,
      [ONBOARDING_DOC_ID, text.length, 'Basic details collected during welcome setup.', text, now]
    );
  }

  const stored = await storeDocumentVectors({
    documentId: ONBOARDING_DOC_ID,
    documentName: 'user_basic_info',
    contentText: text,
    metadata: { docType: 'onboarding' },
  });
  await markDocumentIndexed(ONBOARDING_DOC_ID, stored.chunksStored, 'indexed');
  return { indexed: true, chunkCount: stored.chunksStored };
}
