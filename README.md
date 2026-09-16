# Lumen Gate

Lumen Gate is a front-end prototype for Case 3: **Inpatient Chemotherapy Infusion Safety Gate** from the Vibe Coder Recruitment brief.

The experience follows one treatment through the important safety moments:

- FHIR MedicationRequest regimen composition
- LOINC-coded ANC and serum creatinine checks
- Automated hold behavior when ANC is below protocol threshold
- HL7 v2 `RAS^O17` administration event review
- PHI-minimized notification posture and FHIR AuditEvent traceability
- BAA-scoped downstream access and TEFCA registry bundle preparation
- MedicationDispense release and treatment completion states
- Fail-safe lab retrieval for missing observations, stale results, HTTP errors, malformed payloads, and timeouts
- Profile-tagged registry bundle generation with minimum-necessary data filtering

## Run locally

```powershell
npm install
npm run dev
```

Open the local URL Vite prints in the terminal.

## Scope

This is a synthetic-data UI prototype, not a clinical system. The interactions demonstrate the intended workflow and state transitions. Live RxNorm, FHIR, SMART on FHIR, HL7 parsing, BAA enforcement, and TEFCA exchange require a secure backend and approved healthcare infrastructure.

## Verify

```powershell
npm run build
npm run lint
npm test
```
