-- FormPilot AI - Production PostgreSQL Database Initialization Schema
-- Automatically executed on Docker container startup via /docker-entrypoint-initdb.d/

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS vector;

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
    file_data_base64 TEXT,
    s3_bucket VARCHAR(128),
    s3_key TEXT,
    source_type VARCHAR(32) DEFAULT 'file',
    source_url TEXT,
    index_status VARCHAR(32) DEFAULT 'pending',
    chunk_count INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2b. Vector DB Document Chunks for Semantic RAG Reasoning
CREATE TABLE IF NOT EXISTS document_chunks (
    id VARCHAR(64) PRIMARY KEY,
    document_id VARCHAR(64) REFERENCES documents(id) ON DELETE CASCADE,
    document_name VARCHAR(255) NOT NULL,
    chunk_index INT NOT NULL,
    content TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    embedding vector(768),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS document_chunks_doc_idx ON document_chunks(document_id);

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
    execution_log TEXT,
    executed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    reminder_id VARCHAR(64),
    title VARCHAR(255) NOT NULL,
    body TEXT NOT NULL,
    href TEXT,
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
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
    is_submitted BOOLEAN NOT NULL DEFAULT false,
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
