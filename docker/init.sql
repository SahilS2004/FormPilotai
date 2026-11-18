-- FormPilot AI - Production PostgreSQL Database Initialization Schema
-- Automatically executed on Docker container startup via /docker-entrypoint-initdb.d/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(32) DEFAULT 'user',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Knowledge Base Documents
CREATE TABLE IF NOT EXISTS documents (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    size_bytes BIGINT NOT NULL,
    description TEXT NOT NULL,
    is_enabled BOOLEAN DEFAULT true,
    content_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Website Form Reminders & Autonomous Action Policies
CREATE TABLE IF NOT EXISTS reminders (
    id VARCHAR(64) PRIMARY KEY,
    website_url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    title VARCHAR(255) NOT NULL,
    deadline_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    reminder_window_minutes INT DEFAULT 120,
    auto_action_policy VARCHAR(64) DEFAULT 'auto_submit', -- notify_only, auto_fill_draft, auto_submit
    min_confidence_threshold NUMERIC(3, 2) DEFAULT 0.85,
    status VARCHAR(64) DEFAULT 'pending',                -- pending, user_reviewed, auto_action_in_progress, auto_completed, failed
    tone VARCHAR(64) DEFAULT 'professional',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Bulk Multi-Site Form Jobs
CREATE TABLE IF NOT EXISTS bulk_jobs (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    status VARCHAR(64) DEFAULT 'queued',                 -- queued, running, completed, partially_failed
    auto_submit BOOLEAN DEFAULT false,
    tone VARCHAR(64) DEFAULT 'professional',
    total_count INT DEFAULT 0,
    completed_count INT DEFAULT 0,
    failed_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP WITH TIME ZONE
);

-- 5. Bulk Job Line Items
CREATE TABLE IF NOT EXISTS bulk_job_items (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES bulk_jobs(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    domain VARCHAR(255) NOT NULL,
    status VARCHAR(64) DEFAULT 'queued',
    form_title VARCHAR(255),
    filled_fields_count INT DEFAULT 0,
    total_fields_count INT DEFAULT 0,
    average_confidence NUMERIC(3, 2) DEFAULT 0.0,
    error TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Form Filling History & Audit Records
CREATE TABLE IF NOT EXISTS form_history (
    id VARCHAR(64) PRIMARY KEY,
    domain VARCHAR(255) NOT NULL,
    url TEXT NOT NULL,
    form_title VARCHAR(255) NOT NULL,
    submitted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    tone VARCHAR(64) DEFAULT 'professional',
    total_fields_count INT NOT NULL,
    filled_fields_count INT NOT NULL,
    was_auto_submitted BOOLEAN DEFAULT false,
    fields_payload JSONB NOT NULL DEFAULT '[]'::jsonb
);

-- 7. Persona Directives & System Settings
CREATE TABLE IF NOT EXISTS system_settings (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default',
    tone VARCHAR(64) DEFAULT 'professional',
    custom_prompt_addons TEXT,
    user_context TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Onboarding Checklist Progress
CREATE TABLE IF NOT EXISTS onboarding_progress (
    id VARCHAR(64) PRIMARY KEY DEFAULT 'default_user',
    completed_steps TEXT[] DEFAULT '{}',
    is_tour_completed BOOLEAN DEFAULT false,
    is_dismissed BOOLEAN DEFAULT false,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =========================================================================
-- INITIAL SEED DATA
-- =========================================================================

-- Seed Demo User
INSERT INTO users (id, email, name, role)
VALUES ('user_demo_1', 'pilot@formpilot.ai', 'Sahil Sarawgi', 'admin')
ON CONFLICT (email) DO NOTHING;

-- Seed Knowledge Base Documents
INSERT INTO documents (id, name, original_filename, mime_type, size_bytes, description, is_enabled, content_text)
VALUES 
(
    'doc_1',
    'Sahil_Sarawgi_Resume_2026.pdf',
    'Sahil_Sarawgi_Resume_2026.pdf',
    'application/pdf',
    142800,
    'Updated Software Engineering resume detailing 4 years of TypeScript, React, Next.js, and autonomous AI systems experience.',
    true,
    'Sahil Sarawgi. Senior Software Engineer. Email: sahilsarawgi1239@gmail.com. Phone: +91 9876543210. Location: Bangalore, India. 4+ years building high-scale fullstack web applications, TypeScript, Next.js, distributed agent architectures, and autonomous browser automation.'
),
(
    'doc_2',
    'Form_1040_Tax_Return_2024.pdf',
    'Form_1040_Tax_Return_2024.pdf',
    'application/pdf',
    312400,
    'Official tax declaration containing gross income, deductions, and tax registration IDs.',
    true,
    'Taxpayer: Sahil Sarawgi. Filing Status: Single. Gross Annual Income: $140,000 USD. Employer Identification Number (EIN): 12-3456789. Verified 2024 tax declaration.'
),
(
    'doc_3',
    'Passport_and_ID_Scan.pdf',
    'Passport_and_ID_Scan.pdf',
    'application/pdf',
    890000,
    'Government identification scan with legal name, date of birth, citizenship, and passport number.',
    false,
    'Identity Document: Republic of India. Full Legal Name: Sahil Sarawgi. Nationality: Indian. Date of Birth: 15/08/2000. Passport Number: Z19827364. Place of Issue: New Delhi.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Form Reminders
INSERT INTO reminders (id, website_url, domain, title, deadline_timestamp, reminder_window_minutes, auto_action_policy, min_confidence_threshold, status, tone, notes)
VALUES
(
    'rem_1',
    'https://careers.google.com/jobs/results/12345',
    'careers.google.com',
    'Google Senior Frontend Engineer Application',
    CURRENT_TIMESTAMP + INTERVAL '2 days',
    120,
    'auto_submit',
    0.85,
    'pending',
    'professional',
    'Prioritize distributed web experience in cover questions.'
),
(
    'rem_2',
    'https://grants.gov/apply/opportunity/9871',
    'grants.gov',
    'Open Source AI Infrastructure Grant',
    CURRENT_TIMESTAMP + INTERVAL '5 days',
    240,
    'auto_fill_draft',
    0.80,
    'pending',
    'requesting',
    'Draft needs project timeline verification.'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Bulk Job & Line Items
INSERT INTO bulk_jobs (id, name, status, auto_submit, tone, total_count, completed_count, failed_count, completed_at)
VALUES
(
    'bulk_1',
    'Top 5 YC Startup Application Batch',
    'completed',
    false,
    'professional',
    5,
    5,
    0,
    CURRENT_TIMESTAMP
)
ON CONFLICT (id) DO NOTHING;

INSERT INTO bulk_job_items (id, job_id, url, domain, status, form_title, filled_fields_count, total_fields_count, average_confidence)
VALUES
('item_1_1', 'bulk_1', 'https://jobs.lever.co/stripe/software-engineer', 'jobs.lever.co', 'submitted', 'Stripe Fullstack Application', 14, 14, 0.94),
('item_1_2', 'bulk_1', 'https://boards.greenhouse.io/figma/jobs/45281', 'boards.greenhouse.io', 'submitted', 'Figma Systems Engineer', 18, 18, 0.91),
('item_1_3', 'bulk_1', 'https://jobs.ashbyhq.com/linear/frontend-lead', 'jobs.ashbyhq.com', 'filled', 'Linear Product Engineer', 12, 12, 0.88),
('item_1_4', 'bulk_1', 'https://apply.workable.com/vercel/eng-lead', 'apply.workable.com', 'submitted', 'Vercel Platform Engineer', 16, 16, 0.96),
('item_1_5', 'bulk_1', 'https://careers.openai.com/jobs/agent-dev', 'careers.openai.com', 'submitted', 'OpenAI Research Engineer', 22, 22, 0.92)
ON CONFLICT (id) DO NOTHING;

-- Seed Form History with Heatmap Fields
INSERT INTO form_history (id, domain, url, form_title, submitted_at, tone, total_fields_count, filled_fields_count, was_auto_submitted, fields_payload)
VALUES
(
    'hist_1',
    'greenhouse.io',
    'https://boards.greenhouse.io/anthropic/jobs/10293',
    'Anthropic AI Systems Engineer Application',
    CURRENT_TIMESTAMP - INTERVAL '3 hours',
    'professional',
    4,
    4,
    false,
    '[
        {"fieldId": "f_1", "question": "Full Legal Name", "answer": "Sahil Sarawgi", "confidence": 0.98, "wasEditedByUser": false},
        {"fieldId": "f_2", "question": "Primary Contact Email", "answer": "sahilsarawgi1239@gmail.com", "confidence": 0.97, "wasEditedByUser": false},
        {"fieldId": "f_3", "question": "Years of TypeScript Experience", "answer": "4+ years of professional high-scale engineering", "confidence": 0.92, "wasEditedByUser": false},
        {"fieldId": "f_4", "question": "Why Anthropic / System Alignment?", "answer": "Deeply aligned with constitutional AI and robust retrieval-grounded systems.", "confidence": 0.84, "wasEditedByUser": true}
    ]'::jsonb
),
(
    'hist_2',
    'grants.gov',
    'https://grants.gov/forms/sf424-individual',
    'SF-424 Individual Technology Grant Submission',
    CURRENT_TIMESTAMP - INTERVAL '1 day',
    'requesting',
    3,
    3,
    true,
    '[
        {"fieldId": "g_1", "question": "Applicant Annual Gross Income", "answer": "$140,000 USD", "confidence": 0.95, "wasEditedByUser": false},
        {"fieldId": "g_2", "question": "Tax Identification / EIN", "answer": "12-3456789", "confidence": 0.96, "wasEditedByUser": false},
        {"fieldId": "g_3", "question": "Proposed Project Objective", "answer": "Autonomous context engine for web form assistance.", "confidence": 0.88, "wasEditedByUser": false}
    ]'::jsonb
)
ON CONFLICT (id) DO NOTHING;

-- Seed Default System Settings
INSERT INTO system_settings (id, tone, custom_prompt_addons, user_context)
VALUES (
    'default',
    'professional',
    'Be concise, highlight demonstrated impact with metrics, and ground all statements in verified document context.',
    'Software engineer candidate with 4+ years building web and AI systems'
)
ON CONFLICT (id) DO NOTHING;

-- Seed Initial Onboarding Progress
INSERT INTO onboarding_progress (id, completed_steps, is_tour_completed, is_dismissed)
VALUES ('default_user', ARRAY['kb', 'history']::text[], false, false)
ON CONFLICT (id) DO NOTHING;
