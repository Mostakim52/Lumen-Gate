export const LAB_CODES = {
  anc: '2276-4',
  creatinine: '2160-0',
} as const

export type LabCode = (typeof LAB_CODES)[keyof typeof LAB_CODES]
export type LabKind = 'anc' | 'creatinine'

export interface LabObservation {
  code: LabCode
  kind: LabKind
  value: number
  unit: string
  observedAt: string
  source: string
}

export interface SafetyGateResult {
  status: 'pass' | 'hold'
  checks: Array<{
    code: LabCode
    kind: LabKind
    status: 'pass' | 'hold'
    value?: number
    unit?: string
    observedAt?: string
    reason?: string
  }>
  reasons: string[]
}

export interface FetchLabSafetyGateOptions {
  endpoint: string
  fetchImpl?: typeof fetch
  timeoutMs?: number
  now?: () => number
}

const thresholds: Record<LabKind, { minimum?: number; maximum?: number; label: string }> = {
  anc: { minimum: 1.5, label: 'ANC' },
  creatinine: { maximum: 110, label: 'serum creatinine' },
}

const kindByCode: Record<LabCode, LabKind> = {
  [LAB_CODES.anc]: 'anc',
  [LAB_CODES.creatinine]: 'creatinine',
}

function observationUrl(endpoint: string, code: LabCode): string {
  const url = new URL('/Observation', endpoint)
  url.searchParams.set('code', `http://loinc.org|${code}`)
  url.searchParams.set('_sort', '-date')
  url.searchParams.set('_count', '1')
  return url.toString()
}

function readObservation(payload: unknown, code: LabCode, source: string): LabObservation | undefined {
  if (!payload || typeof payload !== 'object' || !('entry' in payload) || !Array.isArray(payload.entry)) {
    return undefined
  }

  const entry = payload.entry[0]
  if (!entry || typeof entry !== 'object' || !('resource' in entry) || !entry.resource || typeof entry.resource !== 'object') {
    return undefined
  }

  const resource = entry.resource as Record<string, unknown>
  const valueQuantity = resource.valueQuantity
  const value = typeof valueQuantity === 'object' && valueQuantity !== null && 'value' in valueQuantity
    ? valueQuantity.value
    : undefined
  const observedAt = typeof resource.effectiveDateTime === 'string' ? resource.effectiveDateTime : undefined
  const unit = typeof valueQuantity === 'object' && valueQuantity !== null && 'unit' in valueQuantity && typeof valueQuantity.unit === 'string'
    ? valueQuantity.unit
    : undefined

  if (resource.resourceType !== 'Observation' || typeof value !== 'number' || !Number.isFinite(value) || !observedAt || !unit) {
    return undefined
  }

  return { code, kind: kindByCode[code], value, unit, observedAt, source }
}

function evaluateObservation(observation: LabObservation | undefined, code: LabCode): SafetyGateResult['checks'][number] {
  const kind = kindByCode[code]
  if (!observation) {
    return { code, kind, status: 'hold', reason: `Missing latest ${thresholds[kind].label} result` }
  }

  const threshold = thresholds[kind]
  const withinThreshold = threshold.minimum !== undefined
    ? observation.value >= threshold.minimum
    : observation.value < (threshold.maximum ?? Number.POSITIVE_INFINITY)

  return withinThreshold
    ? { code, kind, status: 'pass', value: observation.value, unit: observation.unit, observedAt: observation.observedAt }
    : { code, kind, status: 'hold', value: observation.value, unit: observation.unit, observedAt: observation.observedAt, reason: `${threshold.label} is outside the protocol threshold` }
}

export function evaluateLabSafetyGate(observations: Partial<Record<LabCode, LabObservation>>): SafetyGateResult {
  const checks = (Object.values(LAB_CODES) as LabCode[]).map((code) => evaluateObservation(observations[code], code))
  const reasons = checks.flatMap((check) => check.reason ? [check.reason] : [])
  return { status: reasons.length > 0 ? 'hold' : 'pass', checks, reasons }
}

export async function fetchLabSafetyGate({ endpoint, fetchImpl = fetch, timeoutMs = 5000, now = Date.now }: FetchLabSafetyGateOptions): Promise<SafetyGateResult> {
  const observations: Partial<Record<LabCode, LabObservation>> = {}
  const errors: string[] = []

  await Promise.all((Object.values(LAB_CODES) as LabCode[]).map(async (code) => {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), timeoutMs)
    try {
      const response = await fetchImpl(observationUrl(endpoint, code), { headers: { Accept: 'application/fhir+json' }, signal: controller.signal })
      if (!response.ok) {
        errors.push(`${kindByCode[code]} endpoint returned HTTP ${response.status}`)
        return
      }
      const observation = readObservation(await response.json(), code, endpoint)
      if (!observation) {
        errors.push(`Malformed or missing latest ${thresholds[kindByCode[code]].label} result`)
        return
      }
      if (now() - Date.parse(observation.observedAt) > 24 * 60 * 60 * 1000) {
        errors.push(`Latest ${thresholds[kindByCode[code]].label} result is stale`)
        return
      }
      observations[code] = observation
    } catch (error) {
      errors.push(`${kindByCode[code]} endpoint unavailable: ${error instanceof Error ? error.message : 'request failed'}`)
    } finally {
      clearTimeout(timer)
    }
  }))

  const result = evaluateLabSafetyGate(observations)
  return { status: errors.length > 0 || result.status === 'hold' ? 'hold' : 'pass', checks: result.checks, reasons: [...errors, ...result.reasons] }
}
