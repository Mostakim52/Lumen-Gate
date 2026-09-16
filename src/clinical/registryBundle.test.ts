import { describe, expect, it } from 'vitest'
import { buildRegistryBundle, PROFILE_URLS } from './registryBundle'

const input = {
  bundleId: 'registry-bundle-004',
  subjectReference: 'Patient/demo-004',
  exportedAt: '2026-09-16T12:00:00Z',
  observations: [{ id: 'anc-004', code: '2276-4', display: 'Absolute neutrophil count', value: 3.8, unit: '10^9/L', observedAt: '2026-09-16T08:00:00Z' }],
  medications: [{ id: 'med-004', code: '363406005', display: 'Oxaliplatin 5 MG/ML', status: 'completed' as const, authoredOn: '2026-09-16' }],
  dispense: { id: 'dispense-004', medicationReference: 'MedicationRequest/med-004', status: 'completed' as const, whenHandedOver: '2026-09-16T09:00:00Z' },
}

describe('registry bundle integration', () => {
  it('creates a profile-tagged collection with only minimum necessary clinical data', () => {
    const bundle = buildRegistryBundle(input)
    const resources = bundle.entry.map((entry) => entry.resource)

    expect(bundle.resourceType).toBe('Bundle')
    expect(bundle.type).toBe('collection')
    expect(bundle.meta.tag).toContainEqual(expect.objectContaining({ code: 'minimum-necessary' }))
    expect(resources.map((resource) => resource.resourceType)).toEqual(['Observation', 'MedicationRequest', 'MedicationDispense'])
    expect(resources[0].meta.profile).toContain(PROFILE_URLS.observation)
    expect(resources[1].meta.profile).toContain(PROFILE_URLS.medicationRequest)
    expect(resources[2].meta.profile).toContain(PROFILE_URLS.medicationDispense)
  })

  it('does not leak direct identifiers or unsupported patient demographics', () => {
    const bundle = buildRegistryBundle(input)
    const serialized = JSON.stringify(bundle)

    expect(serialized).not.toContain('Alice')
    expect(serialized).not.toContain('1984-02-03')
    expect(serialized).not.toContain('555-0100')
    expect(serialized).not.toContain('123 Example Street')
    expect(serialized).not.toContain('email')
    expect(serialized).toContain('Patient/demo-004')
  })

  it('rejects subject references that could contain names or arbitrary identifiers', () => {
    expect(() => buildRegistryBundle({ ...input, subjectReference: 'Patient/Alice Smith' })).toThrow('non-identifying Patient reference')
    expect(() => buildRegistryBundle({ ...input, subjectReference: 'Observation/anc-004' })).toThrow('non-identifying Patient reference')
  })

  it('omits optional dispense fields instead of emitting undefined PHI-shaped data', () => {
    const bundle = buildRegistryBundle({ ...input, dispense: { id: 'dispense-004', medicationReference: 'MedicationRequest/med-004', status: 'preparation' } })
    const dispense = bundle.entry.find((entry) => entry.resource.resourceType === 'MedicationDispense')?.resource

    expect(dispense).toBeDefined()
    expect(dispense).not.toHaveProperty('whenHandedOver')
  })
})
