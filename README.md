# FormPilot AI 🚀

> **Autonomous Context-Aware AI Form Filler & Multi-Agent Operations Copilot**
> Seamlessly bridges unstructured documents and dynamic web forms using intelligent document retrieval, persona tuning, autonomous reminder actions, bulk agent processing, and universal DOM reasoning.

---

## 🌟 The Vision

Online forms—from job applications and grant requests to visa slots and vendor registrations—are repetitive, time-sensitive, and fragmented across disparate documents.

**FormPilot AI** transforms form filling into an automated, context-grounded experience:
1. **A Centralized Web Application**: Manage your Knowledge Base with semantic descriptions and scope toggles, configure response tones and custom prompt rules, track historical submissions, set **deadline-driven website reminders with autonomous auto-action**, and launch **bulk agent queues across dozens of form links**.
2. **A Lightweight Browser Extension (Manifest V3)**: Inspects and understands any web form structure on the fly, provides **Confidence Heatmaps with source citations**, manages **Multi-Step Form flows**, offers an in-page **Micro-Prompt Bar** for natural language tweaks, and generates **Tailored Documents** for file upload requirements.

---

## 🏗️ Architecture & Core System Pillars

```
                     +---------------------------------------+
                     |            FormPilot AI Core          |
                     +-------------------+-------------------+
                                         |
            +----------------------------+----------------------------+
            |                                                         |
            v                                                         v
+-------------------------------+                         +-------------------------------+
|     Part 1: Web Application   |                         |   Part 2: Browser Extension   |
|   (Knowledge Base & Fleet)    |                         |     (In-Page Form Copilot)    |
+-------------------------------+                         +-------------------------------+
| • Document Ingestion & Storage|                         | • Universal In-Page DOM Parser|
| • Doc Scope On/Off Toggles    |                         | • Fast Doc Scope On/Off Swaps |
| • Semantic Document Descriptors|                        | • "Fill Form" Primary Action  |
| • Form Submission Recorder    |                         | • "Manage KB" Direct Portal   |
| • Tone & Persona Customizer   |                         | • 🟢 Confidence Heatmap Review|
| • Custom System Prompt Add-ons|                         | • 🧭 Multi-Step Form Navigator|
| • AI Document Gap Suggestions |                         | • 🎙️ In-Page Micro-Prompt Bar |
| • ⏰ Reminders & Auto-Action  |                         | • 📄 Dynamic Document Creator |
| • 🚀 Bulk Multi-Site Runner   |                         | • Framework Event Dispatcher  |
+-------------------------------+                         +-------------------------------+
```

---

## ⚡ Key Capabilities

### Part 1: Central Web Application (Context Engine & Autonomous Fleet)
* **Knowledge Base (KB) Management**: Ingest multiple documents (`.pdf`, `.docx`, `.txt`, `.csv`, images).
* **Document Scope Toggles**: Selectively enable or disable documents with a click to restrict retrieval to relevant files.
* **Semantic Document Descriptions**: Add rich descriptions (e.g., *"2024 Form 1040 Tax Return with AGI and employer details"*) to help the agent accurately route queries.
* **Form History & Audit Recorder**: Logs every submission (domain, URL, questions, generated answers, timestamps, user edits) for audits and 1-click re-use.
* **Tone & Persona Customizer**: Tailor response styles (`Requesting`, `Informative / Factual`, `Professional`, `Casual`).
* **Custom System Prompt Add-ons**: Add custom user directives directly to the system prompt (e.g., *"Always emphasize 5 years of full-stack experience"*).
* **Document Gap Recommendations**: Automatically identifies missing data and recommends specific documents to upload.
* **⏰ Website Form Reminders & Autonomous Action**:
  * Set reminders for any website form URL with a target deadline and notification window.
  * **Auto-Action Policy**: If not manually reviewed before the deadline, an autonomous background agent navigates to the site, validates inputs against your KB, and auto-submits the form if confidence meets your safety threshold!
* **🚀 Bulk Multi-Site Form Queue**:
  * Add multiple website form links at once (e.g., 20 job application URLs, 5 grant portals).
  * Launch a fleet of autonomous background agents to scan, reason, fill, and stage or submit all forms in parallel with live status tracking.

### Part 2: Browser Extension (Manifest V3 In-Page Copilot)
* **In-Page Document Scope Toggles**: Quick on/off toggle switches for each document directly inside the extension popup or side panel.
* **"Manage Knowledge Base" Button**: Quick navigation to open the full Knowledge Base dashboard in a new tab.
* **"Fill Form" Engine**: Scans any page, classifies form elements, and reliably populates inputs using framework-compatible synthetic events.
* **🟢 Confidence Heatmap & Review Mode**:
  * Highlights inputs: 🟢 High Confidence ($\ge 90\%$), 🟡 Medium Confidence ($50-89\%$), or 🔴 Low Confidence ($< 50\%$).
  * Clickable citation badges show the exact document name, page, and excerpt supporting each answer.
* **🧭 Multi-Step Form Navigator**: Detects pagination and wizard flows ("Step 1 of 4", "Next", "Continue"), preserving state and continuing filling across steps.
* **🎙️ In-Page Micro-Prompt Bar**: Floating conversational prompt bar for real-time adjustments (e.g., *"Make answer 3 more concise"*, *"Emphasize my React skills"*).
* **📄 Dynamic Document Generator**: Detects `<input type="file">` prompts (e.g., *"Attach custom cover letter in PDF"*), generates a tailored markdown document, converts it to PDF on the fly, and prepares it for upload.

---

## 📁 Repository Structure

```
formpilotai/
├── apps/
│   ├── web/               # Next.js web application (KB dashboard, History, Reminders, Bulk Runner)
│   └── extension/         # Browser Extension (Manifest V3, Vite + WXT / CRXJS)
├── packages/
│   ├── context-engine/    # RAG pipeline, Document chunking, Embeddings & Reasoning
│   ├── dom-analyzer/      # Universal DOM form parser & synthetic event dispatcher
│   └── shared/            # Common TypeScript types, DTOs, and schemas
├── docs/
│   ├── ARCHITECTURE.md    # Detailed technical specification & system diagrams
│   └── ROADMAP.md         # Phased implementation plan and milestones
├── .gitignore
├── package.json
└── README.md
```

---

## 🛠️ Technology Stack

* **Web Application**: Next.js 14+ (App Router), React, Tailwind CSS, shadcn/ui
* **Browser Extension**: Manifest V3, Vite, TypeScript, WXT / CRXJS
* **Context Engine & AI**: Google Gemini 1.5 Pro / Flash via Google GenAI SDK
* **Database & Vector Storage**: PostgreSQL with `pgvector`, Prisma ORM
* **Task Queue & Fleet**: Redis + BullMQ, Headless Playwright / Puppeteer
* **Document Processing**: Unstructured.io / pdf-parse / Tesseract OCR / PDFKit

---

## 🗺️ Documentation

* 📐 **System Architecture**: Read the full system blueprint in [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).
* 📅 **Roadmap & Milestones**: Track our phased execution plan in [docs/ROADMAP.md](docs/ROADMAP.md).
