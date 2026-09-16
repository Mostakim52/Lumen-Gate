<div align="center">
  <img src="./public/favicon.svg" alt="Lumen Gate logo" width="96" height="96" />
  <h1>Lumen Gate</h1>
  <p><strong>Infusion safety, made unmistakable.</strong></p>
  <p>A polished React prototype for Case 3: Inpatient Chemotherapy Infusion Safety Gate.</p>

  <p>
    <a href="YOUR_VERCEL_URL">Live Demo</a>
    ·
    <a href="https://github.com/Mostakim52/Lumen-Gate">GitHub Repository</a>
  </p>

  <p>
    <img src="https://img.shields.io/badge/React-19-149eca?logo=react&logoColor=white" alt="React 19" />
    <img src="https://img.shields.io/badge/TypeScript-6-3178c6?logo=typescript&logoColor=white" alt="TypeScript 6" />
    <img src="https://img.shields.io/badge/Vite-8-646cff?logo=vite&logoColor=white" alt="Vite 8" />
    <img src="https://img.shields.io/badge/Tests-10%20passing-14766a" alt="10 tests passing" />
  </p>
</div>

> **Submission project:** Vibe Coder Recruitment · Case 3 · Inpatient Chemotherapy Infusion Safety Gate
>
> **Important:** This is a safe synthetic-data prototype for product and engineering evaluation. It is not a clinical system and does not connect to real patients or hospital infrastructure.

## Overview

Lumen Gate is a calm, high-signal workspace for reviewing whether an inpatient chemotherapy infusion is ready to proceed. It brings regimen composition, coded lab safety checks, administration events, pharmacy release, auditability, and downstream registry preparation into one focused flow.

The experience is designed for oncology pharmacists, infusion nurses, and clinical informatics reviewers who need the next safe action to be obvious without hiding the interoperability details behind generic status cards.

## What The Demo Covers

### Safety gate

- Three synthetic patient contexts with independent labs and oncology protocols
- FOLFOX-6 and CAPOX regimen examples
- Absolute neutrophil count using LOINC `2276-4`
- Serum creatinine using LOINC `2160-0`
- Safe-to-proceed and hold-required states
- Threshold-driven release blocking when a lab fails
- Patient switching with synthetic FHIR context loading feedback

### Interoperability workflow

- Complex multi-drug regimen composition from a FHIR `MedicationRequest` concept
- Carrier fluid, dose, route, schedule, and continuous infusion details
- HL7 v2 `RAS^O17` administration-event review
- PHI-minimized message preview
- `MedicationDispense` pharmacy release state
- `AuditEvent` traceability state
- RxNorm medication mapping review state
- SMART on FHIR launch-context and PKCE posture

### Trust and export

- Minimum-necessary BAA policy presentation
- TEFCA-oriented registry export state
- Treatment completion workflow
- Profile-tagged FHIR collection bundle generation
- Direct identifier filtering from registry exports
- Notification center for audit, release, patient-switch, and export events

## Demo Patient Contexts

All patient data is synthetic and intentionally minimized.

| Context | Protocol | Lab state | Demonstrates |
| --- | --- | --- | --- |
| Demo 04 · A.M. | FOLFOX-6 | ANC `3.8`, creatinine `86` | Passing safety gate |
| Demo 11 · R.K. | FOLFOX-6 | ANC `1.1` | ANC hold and release blocking |
| Demo 19 · M.S. | CAPOX | Creatinine `124` | Renal threshold hold |

Try switching patients from the context selector. The active regimen, labs, gate status, and eventual registry subject reference update with the selected synthetic case.

## Safety Behavior

The lab service in [`src/clinical/labSafetyGate.ts`](src/clinical/labSafetyGate.ts) fails closed. It returns a hold state instead of throwing when it encounters:

- Missing FHIR observations
- Malformed FHIR bundles or values
- Stale lab results
- HTTP errors from lab endpoints
- Network failures and request timeouts
- Values outside protocol thresholds

The registry builder in [`src/clinical/registryBundle.ts`](src/clinical/registryBundle.ts) accepts an explicit allowlist of clinical fields and does not include names, dates of birth, phone numbers, addresses, emails, or arbitrary patient demographics.

## Architecture

```text
src/
├── App.tsx                         Product workflow and interactive demo states
├── index.css                       Editorial clinical design system and responsive layout
├── main.tsx                        React application bootstrap
└── clinical/
    ├── labSafetyGate.ts             Resilient LOINC lab retrieval and threshold evaluation
    ├── labSafetyGate.test.ts        Lab integration and failure-mode tests
    ├── registryBundle.ts             Minimum-necessary FHIR registry bundle builder
    └── registryBundle.test.ts        Profile, PHI, and bundle-shape tests

public/
└── favicon.svg                     Lumen Gate browser icon
```

## Technology

- React 19
- TypeScript 6
- Vite 8
- Framer Motion
- Lucide React
- Vitest
- Oxlint
- GitHub Actions
- Vercel-compatible Vite deployment

## Run Locally

Requirements: Node.js 22+ and npm.

```powershell
npm install
npm run dev
```

Open the local URL printed by Vite.

## Available Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Vite development server |
| `npm run build` | Type-check and create a production build |
| `npm run preview` | Preview the production build locally |
| `npm run lint` | Run Oxlint |
| `npm test` | Run the Vitest integration suite |

## Verification

The repository is configured for local and GitHub Actions verification:

```powershell
npm run lint
npm test
npm run build
```

The CI workflow lives at [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and runs lint, tests, and the production build on pushes and pull requests.

## Deployment

The app is a standard Vite build and can be deployed to Vercel without a custom server.

1. Import the repository into Vercel.
2. Use the default Vite settings.
3. Build command: `npm run build`
4. Output directory: `dist`
5. Add the final deployment URL to the Live Demo link at the top of this README.

## Production Boundary

The interface intentionally demonstrates product states using synthetic data. A production implementation would still need:

- A secure backend and approved FHIR server connection
- SMART on FHIR OAuth 2.0 with PKCE and EHR launch context
- Official NLM RxNav REST API integration
- An approved HL7 v2 parsing library for `RAS^O17`
- HAPI FHIR or another approved FHIR validation environment
- Validation against the selected US Core version and applicable TEFCA exchange requirements
- Real BAA policy enforcement, access controls, audit retention, and security monitoring
- Clinical governance, local protocol configuration, and human confirmation before administration

No real patient identifiers, credentials, tokens, or production endpoints are stored in this repository.

## Design Direction

Lumen Gate uses a restrained clinical editorial system:

- Deep slate blue for trusted clinical context
- Muted forest green for passing states
- Accessible amber and crimson for safety warnings
- Warm ivory surfaces for reduced visual fatigue
- Serif display typography paired with monospaced clinical data
- Staggered reveals, loading states, responsive patient cards, and non-blocking notifications
- Mobile and tablet layouts suitable for clinical rounds or an iPad cart

## Standards And References

- [HL7 FHIR](https://hl7.org/fhir/)
- [FHIR MedicationRequest](https://hl7.org/fhir/R4/medicationrequest.html)
- [FHIR MedicationDispense](https://hl7.org/fhir/R4/medicationdispense.html)
- [FHIR AuditEvent](https://hl7.org/fhir/R4/auditevent.html)
- [SMART App Launch](https://hl7.org/fhir/smart-app-launch/)
- [LOINC](https://loinc.org/)
- [NLM RxNorm](https://lhncbc.nlm.nih.gov/RxNav/APIs/RxNormAPIs.html)
- [HL7 FHIR US Core](https://hl7.org/fhir/us/core/)
- [TEFCA](https://www.healthit.gov/topic/interoperability/policy/health-information-network-and-tefca)

## Repository Hygiene

The repository includes:

- `.gitignore` rules for dependencies, builds, editor history, caches, local environment files, and credentials
- `.gitattributes` for normalized line endings and binary assets
- GitHub Actions CI
- `AGENTS.md` for future agent handoff and project constraints

## License

This project was created as a recruitment exercise and portfolio prototype. Add a license before publishing it for reuse outside the evaluation context.
