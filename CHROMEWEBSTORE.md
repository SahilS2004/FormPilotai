# Chrome Web Store Listing: FormPilot AI

---

## Store Listing Metadata

- **Extension Name**: FormPilot AI - Context-Aware Form Copilot
- **Version**: 0.1.0
- **Category**: Productivity / Tools
- **Short Summary (max 132 chars)**: Automatically fill web forms using your verified documents with AI precision, confidence ratings, and multi-step guidance.
- **Support Contact**: sahilsarawgi1239@gmail.com

---

## Detailed Description

Tired of copying and pasting the same information across endless job applications, grant requests, and registration portals?

FormPilot AI is your context-aware form copilot. It securely analyzes web forms and populates them using your own verified documents—from resumes to tax forms—without hallucinating facts.

### Key Features:
- **Universal Form Understanding**: Seamlessly fills text inputs, textareas, dropdowns, radio buttons, and checkboxes on any website.
- **Precision Document Context**: Toggle specific documents on or off to choose exactly which information is used for each form.
- **Visual Confidence Heatmap**: Every filled field is highlighted in green (high certainty), amber (needs review), or red (missing data) with instant source citations.
- **Multi-Step Form Navigator**: Effortlessly progress through multi-page application flows without losing your place.
- **In-Page Micro-Prompt Bar**: Type quick natural language instructions right on the page to customize answers on the fly.
- **Missing Document Alerts**: Warns you whenever a form asks for information not found in your documents and suggests what file to upload.

---

## Permissions Justification

| Permission | Justification |
|---|---|
| `sidePanel` | Displays the copilot UI alongside target web forms, allowing users to toggle document scopes and trigger autofill without obstructing the page. |
| `storage` | Stores user document choices, tone preferences, and active scope locally so settings persist across sessions. |
| `tabs` | Identifies the active tab URL to match form fields and navigate multi-step form sequences. |
| `scripting` | Inspects form elements on the page and dispatches synthetic input events to reliably populate fields across modern web frameworks. |
| `<all_urls>` (`host_permissions`) | Enables the copilot to analyze and fill forms on any web portal the user visits. |

---

## Privacy & Data Use Disclosure

- **Data Collection**: FormPilot AI processes documents and form fields solely to predict form field values requested by the user.
- **Data Sharing**: We do not sell, rent, or transfer user personal data to third parties.
- **Local Control**: Document toggling and form fills require explicit user trigger.
