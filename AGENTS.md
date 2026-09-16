# AGENTS.md

## Mission
This repository is a polished front-end prototype for **Lumen Gate**, an inpatient chemotherapy infusion safety gate. It is based on Case 3 from the Vibe Coder Recruitment brief and is designed to make oncology readiness, interoperability, and release decisions easy to inspect.

## Selected case
- Case 3: Inpatient Chemotherapy Infusion Safety Gate
- Core flow: complex regimen review, ANC and creatinine safety gate, HL7 v2 administration event, pharmacy release, treatment completion, and registry export preparation
- Audience: oncology pharmacists, infusion nurses, and clinical informatics reviewers

## Architecture
- App entry: src/App.tsx
- Design system and responsive styling: src/index.css
- Lab safety boundary: src/clinical/labSafetyGate.ts
- Registry export boundary: src/clinical/registryBundle.ts
- Integration tests: src/clinical/*.test.ts
- HTML shell and browser title: index.html
- Runtime: React + TypeScript + Vite
- UI libraries: Framer Motion and Lucide React

## Implemented prototype behavior
- Displays a FOLFOX-6 multi-drug regimen with carrier fluid and dose/rate details.
- Uses the required LOINC codes 2276-4 for ANC and 2160-0 for serum creatinine.
- Demonstrates a threshold-driven ANC hold state that disables batch release.
- Demonstrates an HL7 v2 RAS^O17 message review with PHI-minimized preview.
- Shows MedicationRequest, MedicationDispense, AuditEvent, RxNorm, BAA, SMART on FHIR, and TEFCA concepts in the workflow.
- Demonstrates release, treatment completion, and registry bundle preparation states.
- Uses fail-closed lab retrieval for missing, malformed, stale, HTTP-error, and timeout responses.
- Generates a minimum-necessary, profile-tagged FHIR collection bundle without direct patient identifiers.

## Important implementation boundary
This is a browser-only demonstration with safe synthetic data. The RxNorm review and HL7 parser controls intentionally demonstrate product states; they are not live API or parser integrations. A production implementation must add a backend, use an approved HL7 parsing library, call the NLM RxNav API, connect to a FHIR server, implement SMART PKCE, validate FHIR payloads with the HL7 validator, and enforce real BAA/TEFCA policies.

## Agent rules
- Keep clinical claims clearly labeled as demo or advisory unless backed by a real integration.
- Do not add real patient identifiers, tokens, or credentials.
- Prefer standard LOINC, RxNorm, FHIR, SMART on FHIR, HL7 v2, AuditEvent, BAA, and TEFCA terminology over string matching or invented protocol fields.
- Preserve the editorial clinical design: warm ivory, deep blue, muted teal, restrained sand accent, serif display typography, and generous spacing.
- Keep edits focused and maintain responsive desktop/mobile behavior.
- Use the Anaconda interpreter for Python work: C:\\Users\\Rubu\\anaconda3\\python.exe

## Verification
- Install dependencies: `npm install`
- Run development server: `npm run dev`
- Production build: `npm run build`
- Lint: `npm run lint`
- Integration tests: `npm test`

Before handoff, run `npm run build`, confirm TypeScript has no errors, and check the hold, release, completion, and mobile navigation states in the browser.
