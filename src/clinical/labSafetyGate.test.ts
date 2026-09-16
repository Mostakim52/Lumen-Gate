import { describe, expect, it } from 'vitest'
import { evaluateLabSafetyGate, fetchLabSafetyGate, LAB_CODES } from './labSafetyGate'

const now = Date.parse('2026-09-16T12:00:00Z')

function response(payload: unknown, ok = true, status = 200): Response {
  return { ok, status, json: async () => payload } as Response
}

function observation(code: string, value: number, observedAt = '2026-09-16T08:00:00Z', unit = '10^9/L') {
  return { resourceType: 'Observation', effectiveDateTime: observedAt, valueQuantity: { value, unit }, code: { coding: [{ system: 'http://loinc.org', code }] } }
}

describe('lab safety gate integration', () => {
  it('passes when latest ANC and creatinine observations are returned by coded FHIR queries', async () => {
    const fetchImpl: typeof fetch = async (input) => {
      const url = String(input)
      return response({ entry: [{ resource: observation(url.includes(LAB_CODES.anc) ? LAB_CODES.anc : LAB_CODES.creatinine, url.includes(LAB_CODES.anc) ? 3.8 : 86, '2026-09-16T08:00:00Z', url.includes(LAB_CODES.anc) ? '10^9/L' : 'umol/L') }] })
    }

    const result = await fetchLabSafetyGate({ endpoint: 'https://ehr.example/fhir', fetchImpl, now: () => now })

    expect(result.status).toBe('pass')
    expect(result.checks).toHaveLength(2)
    expect(result.checks.map((check) => check.code)).toEqual([LAB_CODES.anc, LAB_CODES.creatinine])
  })

  it('fails closed when a FHIR search returns no latest observation', async () => {
    const result = await fetchLabSafetyGate({ endpoint: 'https://ehr.example/fhir', fetchImpl: async () => response({ resourceType: 'Bundle', entry: [] }), now: () => now })

    expect(result.status).toBe('hold')
    expect(result.reasons).toEqual(expect.arrayContaining([
      'Malformed or missing latest ANC result',
      'Malformed or missing latest serum creatinine result',
    ]))
    expect(result.checks.every((check) => check.status === 'hold')).toBe(true)
  })

  it('fails closed on malformed values instead of throwing', async () => {
    const malformed = { resourceType: 'Bundle', entry: [{ resource: observation(LAB_CODES.anc, Number.NaN) }] }
    const result = await fetchLabSafetyGate({ endpoint: 'https://ehr.example/fhir', fetchImpl: async () => response(malformed), now: () => now })

    expect(result.status).toBe('hold')
    expect(result.reasons).toContain('Malformed or missing latest ANC result')
  })

  it('fails closed when either endpoint returns a non-2xx response', async () => {
    const result = await fetchLabSafetyGate({ endpoint: 'https://ehr.example/fhir', fetchImpl: async () => response({}, false, 503), now: () => now })

    expect(result.status).toBe('hold')
    expect(result.reasons).toEqual(expect.arrayContaining([
      'anc endpoint returned HTTP 503',
      'creatinine endpoint returned HTTP 503',
    ]))
  })

  it('fails closed on network timeout and preserves the other safety check', async () => {
    const fetchImpl: typeof fetch = async (input, init) => {
      const url = String(input)
      if (url.includes(LAB_CODES.anc)) {
        return new Promise<Response>((_, reject) => {
          init?.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted', 'AbortError')))
        })
      }
      return response({ entry: [{ resource: observation(LAB_CODES.creatinine, 86, '2026-09-16T08:00:00Z', 'umol/L') }] })
    }

    const result = await fetchLabSafetyGate({ endpoint: 'https://ehr.example/fhir', fetchImpl, timeoutMs: 1, now: () => now })

    expect(result.status).toBe('hold')
    expect(result.reasons.some((reason) => reason.startsWith('anc endpoint unavailable:'))).toBe(true)
    expect(result.checks.find((check) => check.code === LAB_CODES.creatinine)?.status).toBe('pass')
  })

  it('holds on a stale result or a value outside protocol thresholds', () => {
    const result = evaluateLabSafetyGate({
      [LAB_CODES.anc]: { code: LAB_CODES.anc, kind: 'anc', value: 1.4, unit: '10^9/L', observedAt: '2026-09-16T08:00:00Z', source: 'test' },
      [LAB_CODES.creatinine]: { code: LAB_CODES.creatinine, kind: 'creatinine', value: 109, unit: 'umol/L', observedAt: '2026-09-16T08:00:00Z', source: 'test' },
    })

    expect(result.status).toBe('hold')
    expect(result.reasons).toContain('ANC is outside the protocol threshold')
    expect(result.checks.find((check) => check.code === LAB_CODES.creatinine)?.status).toBe('pass')
  })
})
