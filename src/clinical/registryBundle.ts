export const PROFILE_URLS = {
  patient: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-patient',
  observation: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-observation-lab',
  medicationRequest: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationrequest',
  medicationDispense: 'http://hl7.org/fhir/us/core/StructureDefinition/us-core-medicationdispense',
} as const

export interface RegistryBundleInput {
  subjectReference: string
  bundleId: string
  exportedAt?: string
  observations: Array<{
    id: string
    code: string
    display: string
    value: number
    unit: string
    observedAt: string
  }>
  medications: Array<{
    id: string
    code: string
    display: string
    status: 'active' | 'completed' | 'stopped'
    authoredOn: string
  }>
  dispense?: {
    id: string
    medicationReference: string
    status: 'preparation' | 'in-progress' | 'completed' | 'cancelled'
    whenHandedOver?: string
  }
}

interface FhirResource {
  resourceType: string
  id: string
  meta: { profile: string[]; security: Array<{ system: string; code: string; display: string }> }
  [key: string]: unknown
}

export interface RegistryBundle {
  resourceType: 'Bundle'
  id: string
  type: 'collection'
  timestamp: string
  meta: { tag: Array<{ system: string; code: string; display: string }> }
  entry: Array<{ fullUrl: string; resource: FhirResource }>
}

const SECURITY_SYSTEM = 'http://terminology.hl7.org/CodeSystem/v3-ActCode'
const TEFCA_PROFILE_TAG = { system: 'https://healthit.gov/tefca', code: 'minimum-necessary', display: 'Minimum necessary disclosure' }

function assertSafeReference(reference: string): void {
  if (!/^Patient\/[A-Za-z0-9.-]+$/.test(reference)) {
    throw new Error('subjectReference must be a non-identifying Patient reference')
  }
}

function meta(profile: string): FhirResource['meta'] {
  return { profile: [profile], security: [{ system: SECURITY_SYSTEM, code: 'PUB', display: 'Minimum necessary synthetic registry data' }] }
}

export function buildRegistryBundle(input: RegistryBundleInput): RegistryBundle {
  assertSafeReference(input.subjectReference)
  const exportedAt = input.exportedAt ?? new Date().toISOString()
  const entries: RegistryBundle['entry'] = []

  for (const observation of input.observations) {
    entries.push({
      fullUrl: `urn:uuid:${observation.id}`,
      resource: {
        resourceType: 'Observation',
        id: observation.id,
        meta: meta(PROFILE_URLS.observation),
        status: 'final',
        subject: { reference: input.subjectReference },
        code: { coding: [{ system: 'http://loinc.org', code: observation.code, display: observation.display }] },
        effectiveDateTime: observation.observedAt,
        valueQuantity: { value: observation.value, unit: observation.unit, system: 'http://unitsofmeasure.org' },
      },
    })
  }

  for (const medication of input.medications) {
    entries.push({
      fullUrl: `urn:uuid:${medication.id}`,
      resource: {
        resourceType: 'MedicationRequest',
        id: medication.id,
        meta: meta(PROFILE_URLS.medicationRequest),
        status: medication.status,
        intent: 'order',
        subject: { reference: input.subjectReference },
        authoredOn: medication.authoredOn,
        medicationCodeableConcept: { coding: [{ system: 'http://www.nlm.nih.gov/research/umls/rxnorm', code: medication.code, display: medication.display }] },
      },
    })
  }

  if (input.dispense) {
    entries.push({
      fullUrl: `urn:uuid:${input.dispense.id}`,
      resource: {
        resourceType: 'MedicationDispense',
        id: input.dispense.id,
        meta: meta(PROFILE_URLS.medicationDispense),
        status: input.dispense.status,
        subject: { reference: input.subjectReference },
        medicationReference: { reference: input.dispense.medicationReference },
        ...(input.dispense.whenHandedOver ? { whenHandedOver: input.dispense.whenHandedOver } : {}),
      },
    })
  }

  return {
    resourceType: 'Bundle',
    id: input.bundleId,
    type: 'collection',
    timestamp: exportedAt,
    meta: { tag: [TEFCA_PROFILE_TAG] },
    entry: entries,
  }
}
