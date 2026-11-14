# FormPilot AI: Development Roadmap & Implementation Plan

This roadmap outlines the phased development path for FormPilot AI, transforming the conceptual specification into a robust, production-grade system.

---

## Phase 1: Repository Foundation & Shared Core
- [x] Repository initialization and Git branch setup (`main`).
- [x] Architecture design specification and roadmap documentation.
- [x] Git remote origin connection (`https://github.com/SahilS2004/FormPilotai.git`).
- [x] Monorepo workspace configuration (`package.json`).
- [x] Shared TypeScript type definitions package (`@formpilot/shared`):
  - Normalized Form Field Schemas (id, name, label, type, options, validations).
  - Document & Metadata Schemas (id, name, description, activeStatus, vectorEmbeddingRef).
  - Form Fill History & Audit Schemas (domain, timestamp, rawQuestions, filledAnswers, userEdits).
  - Persona & Tone Configuration Models.
  - Form Reminders & Auto-Action Policy Contracts.
  - Bulk Multi-Site Form Queue & Fleet Worker Contracts.
  - Confidence Heatmap & Citation Reference Models.
  - Multi-Step Form State Machine Contracts.
  - Extension Micro-Prompt Command Definitions.
  - Dynamic Document Generator Contracts.

---

## Phase 2: Context Engine & Document Intelligence Service
- [ ] Document Ingestion Pipeline:
  - Multi-format parser for PDF, DOCX, TXT, CSV, and image OCR.
  - Chunking strategies preserving table structures and metadata hierarchies.
- [ ] Knowledge Base (KB) Management:
  - Document description indexing for top-level semantic routing.
  - Granular document scope filtering (Enable/Disable toggling per query).
  - Embedding generation and hybrid retrieval (vector similarity + keyword matching).
- [ ] Tone & Prompt Engineering Subsystem:
  - System prompt synthesizer incorporating persona tone and user add-on directives.
  - Document gap analysis module (detecting missing data requirements from form schemas).
- [ ] Dynamic Document Generator Engine:
  - Markdown-to-PDF compiler for synthesizing tailored resumes and cover letters on the fly.

---

## Phase 3: Web Dashboard (Management Portal)
- [ ] Document Hub UI:
  - File drag-and-drop uploader with automatic format validation.
  - Inline document description editor with AI auto-summarization suggestion.
  - Real-time active/inactive toggle switches.
- [ ] History & Recorder View:
  - Searchable log of past form submissions filtered by domain and date.
  - Detailed view of extracted questions, generated answers, and confidence indicators.
  - Re-use and export capabilities (JSON / CSV).
- [ ] Settings & Persona Studio:
  - Tone selector (Requesting, Informative, Professional, Casual).
  - User custom system prompt editor with live test playground.
  - Document gap notification center recommending missing files.
- [ ] **Website Form Reminders & Auto-Action Hub**:
  - Add URL reminder with target deadline and reminder notification window.
  - Auto-action policy configuration (`notify_only`, `auto_fill_draft`, `auto_submit`).
  - Safety thresholds (minimum confidence percentage required to auto-submit).
  - Execution logs and status tracking (`pending`, `user_reviewed`, `auto_completed`, `failed`).
- [ ] **Bulk Form Queue & Batch Runner**:
  - Multi-URL batch ingestion interface (paste lists of job/application links).
  - Configuration of active KB docs, tone, and auto-submit rules for the batch.
  - Live agent progress monitor (queued, scanning, processing, filled, submitted).
  - Consolidated batch export and results analytics.

---

## Phase 4: Browser Extension (Manifest V3 In-Page Copilot)
- [ ] Manifest V3 Setup & Permissions:
  - Configuration for `activeTab`, `storage`, `scripting`, and `sidePanel`.
  - Secure communication between content script, background service worker, and side panel.
- [ ] In-Page Form Detector & Universal DOM Analyzer:
  - Universal form field extractor: standard HTML5 inputs, textareas, selects.
  - Custom component traversal: ARIA comboboxes, custom dropdowns, radio/checkbox sets.
  - Associated label resolution via aria-labels, surrounding DOM hierarchy, and heuristics.
  - File upload detection: identifies `<input type="file">`, accept attributes, and prompt labels.
- [ ] In-Page Extension UI:
  - Side panel / floating pill interface with quick-action "Fill Form" button.
  - Lightweight document scope switchers (on/off toggles synced with web dashboard).
  - Quick-access button to launch the Web KB Manager.
  - Missing document upload alert drawer.
- [ ] **Confidence Heatmap & Review Mode**:
  - Visual field highlights: 🟢 High ($\ge 90\%$), 🟡 Medium ($50-89\%$), 🔴 Low ($< 50\%$).
  - Clickable citation tooltips showing source document, page, and excerpt.
- [ ] **Multi-Step Form Navigator**:
  - Automated detection of step indicators and pagination controls ("Next", "Continue").
  - Sequential step validation and traversal across multi-page forms.
- [ ] **Extension Micro-Prompt Bar**:
  - In-page conversational prompt bar allowing users to request real-time modifications.
- [ ] Synthetic Event Dispatcher:
  - Reactive framework compatibility layer for React, Vue, Angular, Svelte.
  - Value assignment via native prototype setters and full event cascade (`focus`, `input`, `change`, `blur`).

---

## Phase 5: Autonomous Fleet & Scaled Automation
- [ ] Headless Worker Fleet:
  - Distributed Playwright/Puppeteer execution engine for scheduled form reminders and bulk jobs.
  - Safe retry policies, screenshot capture on failure, and anti-bot challenge detection.
- [ ] Client-Side PII Security Vault:
  - Local encryption for sensitive attributes (SSN, national IDs, bank numbers) with user confirmation gates.
- [ ] Domain-Specific Few-Shot Learning Cache:
  - Automatic caching of manual user corrections to improve site-specific accuracy over time.
