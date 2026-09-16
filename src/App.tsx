import { useEffect, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bell,
  Check,
  ChevronDown,
  ClipboardCheck,
  Database,
  ExternalLink,
  FileCheck2,
  FlaskConical,
  LockKeyhole,
  Menu,
  PackageCheck,
  RefreshCw,
  ShieldCheck,
  Syringe,
  X,
  Zap,
} from 'lucide-react'
import { buildRegistryBundle } from './clinical/registryBundle'

type LabStatus = 'pass' | 'hold'
type Toast = { id: number; message: string; tone: 'success' | 'warning' }
type LabRecord = { code: string; name: string; value: string; unit: string; range: string; status: LabStatus }
type RegimenItem = { name: string; dose: string; route: string; schedule: string; tone: string }
type DemoPatient = { id: string; initials: string; label: string; location: string; bed: string; protocol: string; cycle: string; labs: LabRecord[]; regimen: RegimenItem[] }
type NotificationItem = { id: number; title: string; detail: string; time: string; tone: 'info' | 'warning' }

const baseRegimen: RegimenItem[] = [
  { name: 'Oxaliplatin', dose: '85 mg/m2', route: 'IV infusion', schedule: 'Day 1 · 2 hr', tone: 'blue' },
  { name: 'Leucovorin', dose: '400 mg/m2', route: 'IV infusion', schedule: 'Day 1 · 2 hr', tone: 'sand' },
  { name: 'Fluorouracil', dose: '400 mg/m2', route: 'IV push', schedule: 'Day 1 · 10 min', tone: 'rose' },
  { name: 'Fluorouracil', dose: '2,400 mg/m2', route: 'Continuous IV', schedule: '46 hr · 5 mL/hr', tone: 'green' },
]

const patientDemos: DemoPatient[] = [
  {
    id: 'demo-004', initials: 'AM', label: 'Demo 04 · A.M.', location: 'Oncology floor 4B', bed: 'Bed 12', protocol: 'FOLFOX-6', cycle: 'Cycle 4, Day 1',
    labs: [
      { code: '2276-4', name: 'Absolute neutrophil count', value: '3.8', unit: '10^9/L', range: '>= 1.5', status: 'pass' },
      { code: '2160-0', name: 'Serum creatinine', value: '86', unit: 'umol/L', range: '< 110', status: 'pass' },
    ], regimen: baseRegimen,
  },
  {
    id: 'demo-011', initials: 'RK', label: 'Demo 11 · R.K.', location: 'Oncology floor 3A', bed: 'Bed 08', protocol: 'FOLFOX-6', cycle: 'Cycle 2, Day 1',
    labs: [
      { code: '2276-4', name: 'Absolute neutrophil count', value: '1.1', unit: '10^9/L', range: '>= 1.5', status: 'hold' },
      { code: '2160-0', name: 'Serum creatinine', value: '82', unit: 'umol/L', range: '< 110', status: 'pass' },
    ], regimen: baseRegimen,
  },
  {
    id: 'demo-019', initials: 'MS', label: 'Demo 19 · M.S.', location: 'Oncology floor 5C', bed: 'Bed 03', protocol: 'CAPOX', cycle: 'Cycle 1, Day 1',
    labs: [
      { code: '2276-4', name: 'Absolute neutrophil count', value: '2.4', unit: '10^9/L', range: '>= 1.5', status: 'pass' },
      { code: '2160-0', name: 'Serum creatinine', value: '124', unit: 'umol/L', range: '< 110', status: 'hold' },
    ], regimen: [
      { name: 'Oxaliplatin', dose: '130 mg/m2', route: 'IV infusion', schedule: 'Day 1 · 2 hr', tone: 'blue' },
      { name: 'Capecitabine', dose: '1,000 mg/m2', route: 'Oral tablets', schedule: 'Days 1–14 · BID', tone: 'sand' },
      { name: 'D5W carrier', dose: '500 mL', route: 'IV carrier fluid', schedule: 'Day 1 · 2 hr', tone: 'green' },
    ],
  },
]

const navItems = [
  { label: 'Safety gate', id: 'safety-gate' },
  { label: 'Regimen', id: 'regimen' },
  { label: 'Trust & export', id: 'audit' },
]

const revealVariants = {
  up: { hidden: { opacity: 0, y: 26 }, visible: { opacity: 1, y: 0 } },
  left: { hidden: { opacity: 0, x: -30 }, visible: { opacity: 1, x: 0 } },
  right: { hidden: { opacity: 0, x: 30 }, visible: { opacity: 1, x: 0 } },
  top: { hidden: { opacity: 0, y: -22 }, visible: { opacity: 1, y: 0 } },
}

function Reveal({ children, direction = 'up', delay = 0, className }: { children: ReactNode; direction?: keyof typeof revealVariants; delay?: number; className?: string }) {
  return <motion.div className={className} variants={revealVariants[direction]} initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.18 }} transition={{ duration: 0.62, delay, ease: [0.22, 1, 0.36, 1] }}>{children}</motion.div>
}

function App() {
  const [navOpen, setNavOpen] = useState(false)
  const [pageLoading, setPageLoading] = useState(true)
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    { id: 1, title: 'Safety review ready', detail: 'Demo 04 is ready for clinical review.', time: 'Now', tone: 'info' },
    { id: 2, title: 'Registry bundle staged', detail: 'Minimum-necessary export is available after completion.', time: '2 min ago', tone: 'info' },
  ])
  const [activeTab, setActiveTab] = useState('safety-gate')
  const [activePatientId, setActivePatientId] = useState(patientDemos[0].id)
  const [patientLoading, setPatientLoading] = useState(false)
  const [hl7Received, setHl7Received] = useState(false)
  const [released, setReleased] = useState(false)
  const [completed, setCompleted] = useState(false)
  const [holdDemo, setHoldDemo] = useState(false)
  const [rxNormChecked, setRxNormChecked] = useState(false)
  const [rxNormLoading, setRxNormLoading] = useState(false)
  const [registryEntryCount, setRegistryEntryCount] = useState(0)
  const [registryLoading, setRegistryLoading] = useState(false)
  const [toast, setToast] = useState<Toast | null>(null)
  const toastSequence = useRef(0)

  useEffect(() => {
    const timer = window.setTimeout(() => setPageLoading(false), 1150)
    return () => window.clearTimeout(timer)
  }, [])

  const activePatient = patientDemos.find((patient) => patient.id === activePatientId) ?? patientDemos[0]
  const gateBlocked = holdDemo || activePatient.labs.some((lab) => lab.status === 'hold')

  const showToast = (message: string, tone: Toast['tone'] = 'success') => {
    const id = ++toastSequence.current
    const notificationTone: NotificationItem['tone'] = tone === 'warning' ? 'warning' : 'info'
    setToast({ id, message, tone })
    setNotifications((current) => [{ id, title: message, detail: 'Lumen Gate workflow update', time: 'Now', tone: notificationTone }, ...current].slice(0, 5))
    window.setTimeout(() => setToast((current) => current?.id === id ? null : current), 3200)
  }

  const reviewRxNorm = () => {
    setRxNormLoading(true)
    window.setTimeout(() => {
      setRxNormLoading(false)
      setRxNormChecked(true)
      showToast('RxNorm medication mapping reviewed')
    }, 900)
  }

  const toggleLabHold = () => {
    setHoldDemo((current) => !current)
    showToast(holdDemo ? 'Lab gate restored to pass' : 'ANC hold applied; release blocked', holdDemo ? 'success' : 'warning')
  }

  const switchPatient = (patientId: string) => {
    if (patientId === activePatientId) return
    setActivePatientId(patientId)
    setPatientLoading(true)
    setHl7Received(false)
    setReleased(false)
    setCompleted(false)
    setHoldDemo(false)
    setRxNormChecked(false)
    setRegistryEntryCount(0)
    window.setTimeout(() => {
      setPatientLoading(false)
      showToast('Synthetic EHR context loaded')
    }, 700)
  }

  const receiveAdministrationEvent = () => {
    setHl7Received(true)
    showToast('AuditEvent logged for RAS^O17 administration event')
  }

  const releaseBatch = () => {
    setReleased(true)
    showToast('Batch released to pharmacy')
  }

  const completeTreatment = () => {
    setRegistryLoading(true)
    window.setTimeout(() => {
      const anc = activePatient.labs.find((lab) => lab.code === '2276-4')
      const bundle = buildRegistryBundle({ bundleId: `registry-bundle-${activePatient.id}`, subjectReference: `Patient/${activePatient.id}`, observations: [{ id: `anc-${activePatient.id}`, code: '2276-4', display: 'Absolute neutrophil count', value: Number(anc?.value ?? 0), unit: '10^9/L', observedAt: '2026-09-16T08:00:00Z' }], medications: [{ id: `protocol-${activePatient.id}`, code: '363406005', display: `${activePatient.protocol} chemotherapy protocol`, status: 'completed', authoredOn: '2026-09-16' }], dispense: { id: `dispense-${activePatient.id}`, medicationReference: `MedicationRequest/protocol-${activePatient.id}`, status: 'completed', whenHandedOver: '2026-09-16T09:00:00Z' } })
      setRegistryEntryCount(bundle.entry.length)
      setRegistryLoading(false)
      setCompleted(true)
      showToast('Treatment complete; registry bundle prepared')
    }, 1100)
  }

  const scrollToSection = (id: string) => {
    setActiveTab(id)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })
    setNavOpen(false)
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner">
          <button className="wordmark" type="button" onClick={() => scrollToSection('safety-gate')}>
            <span className="wordmark-mark"><Syringe size={16} /></span>
            lumen gate
          </button>

          <nav className="main-nav" aria-label="Main navigation">
            {navItems.map((item) => (
              <button className={activeTab === item.id ? 'nav-item active' : 'nav-item'} key={item.id} type="button" onClick={() => scrollToSection(item.id)}>
                {item.label}
              </button>
            ))}
          </nav>

          <div className="topbar-actions">
            <span className="environment"><span className="status-dot" /> SMART sandbox · demo data</span>
            <div className="notification-wrap">
              <button className="notification-button" type="button" aria-label="Open notifications" aria-expanded={notificationsOpen} onClick={() => setNotificationsOpen((current) => !current)}><Bell size={17} />{notifications.length > 0 && <span className="notification-count">{notifications.length}</span>}</button>
              {notificationsOpen && <div className="notification-panel"><div className="notification-panel-head"><strong>Notifications</strong><span>{notifications.length} updates</span></div>{notifications.map((notification) => <div className="notification-item" key={notification.id}><span className={`notification-dot ${notification.tone}`} /><div><strong>{notification.title}</strong><p>{notification.detail}</p><small>{notification.time}</small></div></div>)}</div>}
            </div>
            <button className="avatar-button" type="button" aria-label="Open profile menu">LC</button>
            <button className="mobile-menu-button" type="button" aria-label="Toggle menu" onClick={() => setNavOpen((current) => !current)}>
              {navOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {navOpen && <div className="mobile-nav">{navItems.map((item) => <button key={item.id} type="button" onClick={() => scrollToSection(item.id)}>{item.label}</button>)}</div>}
      </header>

      <AnimatePresence>
        {pageLoading && <motion.div className="page-loader" initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: .45 }}><div className="loader-orbit"><span /><span /><span /></div><p className="loader-brand">lumen gate</p><p className="loader-copy">Preparing synthetic care context</p><div className="loader-track"><span /></div></motion.div>}
      </AnimatePresence>

      <main>
        <section className="hero-panel" id="safety-gate">
          <div className="hero-copy">
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="kicker">
              LUMEN GATE <span>·</span> INFUSION 04
            </motion.div>
            <motion.h1 initial={{ opacity: 0, filter: 'blur(12px)' }} animate={{ opacity: 1, filter: 'blur(0px)' }} transition={{ duration: 0.9, delay: 0.1 }}>
              Clarity<br /><em>before treatment.</em>
            </motion.h1>
            <p className="hero-intro">A clinical safety gate for complex oncology infusions, designed to make the next right action unmistakable.</p>
          </div>
          <div className="hero-meta">
            <span className="live-pill"><span className="status-dot" /> Live review</span>
            <span>SMART launch context · Last synced 08:42:16</span>
          </div>
          <motion.div className="hero-sync" initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ duration: .9, delay: .75, ease: [0.22, 1, 0.36, 1] }}><span className="hero-sync-line" /><span>Clinical context synchronized</span><span className="hero-sync-dot" /></motion.div>
          <div className="hero-visual" aria-label="Animated clinical signal map">
            <div className="hero-visual-grid" />
            <motion.div className="hero-loader-orbit" animate={{ rotate: 360 }} transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}><span /><span /><span /></motion.div>
            <motion.div className="hero-loader-orbit hero-loader-orbit-inner" animate={{ rotate: -360 }} transition={{ duration: 11, repeat: Infinity, ease: 'linear' }}><span /><span /></motion.div>
            <span className="signal-line signal-line-one" /><span className="signal-line signal-line-two" /><span className="signal-line signal-line-three" />
            <motion.div className="hero-core" animate={{ scale: [1, 1.04, 1], boxShadow: ['0 0 0 0 rgba(229,201,141,.14)', '0 0 0 18px rgba(229,201,141,0)', '0 0 0 0 rgba(229,201,141,0)'] }} transition={{ duration: 3.2, repeat: Infinity, ease: 'easeInOut' }}><ShieldCheck size={22} /><span>SAFETY<br />GATE</span></motion.div>
            <motion.div className="hero-node hero-node-lab" animate={{ y: [0, -7, 0] }} transition={{ duration: 3.4, repeat: Infinity, ease: 'easeInOut' }}><FlaskConical size={17} /><span>LABS<small>LOINC</small></span></motion.div>
            <motion.div className="hero-node hero-node-fhir" animate={{ y: [0, 7, 0] }} transition={{ duration: 3.8, repeat: Infinity, ease: 'easeInOut', delay: .3 }}><Database size={17} /><span>FHIR<small>ORDER</small></span></motion.div>
            <motion.div className="hero-node hero-node-hl7" animate={{ x: [0, 6, 0] }} transition={{ duration: 3.6, repeat: Infinity, ease: 'easeInOut', delay: .5 }}><Activity size={17} /><span>HL7<small>EVENT</small></span></motion.div>
          </div>
        </section>

        <section className={patientLoading ? 'workspace-section is-patient-loading' : 'workspace-section'} aria-busy={patientLoading}>
          <Reveal direction="left" className="workspace-head">
            <div>
              <p className="eyebrow-dark">TODAY'S REVIEW</p>
              <h2>Infusion readiness</h2>
            </div>
            <div className="patient-context">
              <span className="patient-initials">{activePatient.initials}</span>
              <label className="patient-picker"><span>Demo patient</span><select value={activePatient.id} onChange={(event) => switchPatient(event.target.value)} aria-label="Select demo patient">{patientDemos.map((patient) => <option key={patient.id} value={patient.id}>{patient.label}</option>)}</select></label>
              <div className="patient-location"><strong>{patientLoading ? 'Loading EHR context…' : 'Patient context loaded'}</strong><span>{activePatient.location} · {activePatient.bed}</span></div>
              <ChevronDown size={17} />
            </div>
          </Reveal>

          <AnimatePresence>{patientLoading && <motion.div className="patient-loading-bar" initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} exit={{ opacity: 0 }} transition={{ duration: .35 }}><span /> Refreshing synthetic FHIR context</motion.div>}</AnimatePresence>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={gateBlocked ? 'hold' : 'pass'} className={gateBlocked ? 'gate-banner hold' : 'gate-banner'} initial={{ opacity: 0, y: -10, height: 0 }} animate={{ opacity: 1, y: 0, height: 'auto' }} exit={{ opacity: 0, y: 10, height: 0 }} transition={{ duration: 0.28, ease: 'easeOut' }}>
              <div className="gate-icon">{gateBlocked ? <AlertTriangle size={26} /> : <ShieldCheck size={26} />}</div>
              <div className="gate-message"><span className="gate-label">{gateBlocked ? 'HOLD REQUIRED' : 'SAFE TO PROCEED'}</span><strong>{gateBlocked ? 'One or more lab values need clinical review.' : 'All required checks are within protocol thresholds.'}</strong><span>Clinical decision support is advisory. Confirm against local policy before administration.</span></div>
              <div className="gate-score"><strong>{gateBlocked ? '1 / 2' : '2 / 2'}</strong><span>checks passed</span></div>
            </motion.div>
          </AnimatePresence>

          <Reveal direction="up" className="signal-grid">
            {activePatient.labs.map((lab, index) => {
              const isHeld = (holdDemo && index === 0) || lab.status === 'hold'
              return (
              <motion.article className="signal-card" key={lab.code} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} whileHover={{ y: -5, scale: 1.01 }} whileTap={{ scale: .99 }} viewport={{ once: true }} transition={{ delay: index * 0.1, duration: .45 }}>
                <div className="signal-top"><span className="signal-icon"><FlaskConical size={18} /></span><span className={isHeld ? 'hold-label' : 'pass-label'}>{isHeld ? <AlertTriangle size={13} /> : <Check size={13} />} {isHeld ? 'Hold' : 'Passed'}</span></div>
                <p className="signal-code">LOINC {lab.code}</p>
                <h3>{lab.name}</h3>
                <div className="signal-value"><strong>{holdDemo && index === 0 ? '1.1' : lab.value}</strong><span>{lab.unit}</span></div>
                <div className="signal-bottom"><span>Protocol limit</span><strong>{lab.range}</strong></div>
              </motion.article>
              )
            })}
            <motion.article className="signal-card signal-card-soft" whileHover={{ y: -5, scale: 1.01 }} whileTap={{ scale: .99 }}>
              <div className="signal-top"><span className="signal-icon"><ClipboardCheck size={18} /></span><span className="pass-label"><Check size={13} /> Verified</span></div>
              <p className="signal-code">FHIR MedicationRequest</p>
              <h3>Oncology protocol</h3>
              <div className="signal-value"><strong>{activePatient.protocol}</strong></div>
              <div className="signal-bottom"><span>Order status</span><strong>Active · {activePatient.regimen.length} items</strong></div>
            </motion.article>
          </Reveal>
        </section>

        <section className="content-section" id="regimen">
          <Reveal direction="right" className="section-heading-row">
            <div><p className="eyebrow-dark">01 / MEDICATION SAFETY</p><h2>Regimen composition</h2></div>
            <span className="data-source"><Database size={15} /> FHIR MedicationRequest <ArrowRight size={14} /></span>
          </Reveal>

          <Reveal direction="up" className="regimen-layout">
            <div className="regimen-card">
              <div className="regimen-card-head"><div><span className="protocol-tag">PROTOCOL</span><h3>{activePatient.protocol} · {activePatient.cycle}</h3></div><span className="verified-badge"><Check size={13} /> Verified</span></div>
              <div className="regimen-list">
                {activePatient.regimen.map((item, index) => <motion.div className="drug-row" key={`${item.name}-${item.dose}`} whileHover={{ x: 7 }} transition={{ type: 'spring', stiffness: 360, damping: 24, delay: index * .03 }}><span className={`drug-marker ${item.tone}`}><Syringe size={15} /></span><div className="drug-name"><strong>{item.name}</strong><span>{item.route}</span></div><div className="drug-dose"><strong>{item.dose}</strong><span>{item.schedule}</span></div></motion.div>)}
              </div>
              <div className="regimen-foot"><span><Zap size={14} /> Carrier fluid: D5W · 250 mL</span><span>{rxNormChecked ? 'RxNorm verified' : 'RxNorm lookup pending'} <Check size={13} /></span></div>
            </div>

            <aside className="explain-card">
              <span className="aside-number">A</span>
              <h3>Why this matters</h3>
              <p>Nested medication arrays are resolved into a human-readable protocol before any release event is accepted.</p>
              <button className="inline-action" type="button" onClick={reviewRxNorm} disabled={rxNormLoading || rxNormChecked} aria-busy={rxNormLoading}><RefreshCw className={rxNormLoading ? 'spin' : ''} size={14} /> {rxNormLoading ? 'Reviewing RxNorm mapping' : rxNormChecked ? 'RxNorm mapping reviewed' : 'Review RxNorm mapping'} <ArrowRight size={14} /></button>
            </aside>
          </Reveal>
        </section>

        <section className="content-section event-section" id="audit">
          <Reveal direction="left" className="section-heading-row">
            <div><p className="eyebrow-dark">02 / FLOOR EVENT</p><h2>Administration handoff</h2></div>
            <span className="data-source"><Activity size={15} /> HL7 v2 · RAS^O17</span>
          </Reveal>
          <Reveal direction="up" className="event-layout">
            <div className={`event-card ${hl7Received ? 'received' : ''}`}>
              <div className="event-card-head"><div className="event-status"><span className="status-dot" /> {hl7Received ? 'Event received' : 'Awaiting event'}</div><span className="mono-label">HL7 v2</span></div>
              <div className="message-preview"><span>MSH</span><span>|^~\&amp;|PHARMACY|IPD|INFUSION|4B|202609150842||RAS^O17|</span><span>RXA</span><span>|0|1|202609150900|OXALIPLATIN^...|</span></div>
              <div className="event-card-foot"><span><LockKeyhole size={14} /> No patient identifiers displayed</span><button type="button" onClick={receiveAdministrationEvent}><RefreshCw size={14} /> {hl7Received ? 'Demo parse: valid' : 'Run demo parser'}</button></div>
            </div>
            <div className="audit-card"><div className="audit-icon"><FileCheck2 size={20} /></div><div><p className="eyebrow-dark">FHIR AUDITEVENT</p><h3>Traceable by design</h3><p>Every read, validation, and release action is written to an immutable audit record with minimum necessary context.</p></div><span className="audit-check"><Check size={15} /></span></div>
          </Reveal>
        </section>

        <section className="trust-section" id="trust">
          <Reveal direction="right" className="section-heading-row"><div><p className="eyebrow-dark">03 / INTEROPERABILITY</p><h2>Trust travels with the record.</h2></div><span className="data-source"><LockKeyhole size={15} /> Minimum necessary data</span></Reveal>
          <Reveal direction="up" className="trust-grid">
            <motion.article className="trust-card" whileHover={{ y: -5 }} whileTap={{ scale: .99 }}><span className="trust-icon"><ShieldCheck size={19} /></span><div><p className="eyebrow-dark">BAA POLICY</p><h3>Downstream access is scoped</h3><p>Only the minimum clinical context is included in the partner payload. Identifiers stay inside the EHR boundary.</p><span className="trust-status"><Check size={13} /> Policy check passed</span></div></motion.article>
            <motion.article className={`trust-card ${registryLoading ? 'is-loading' : ''}`} whileHover={{ y: -5 }} whileTap={{ scale: .99 }} aria-busy={registryLoading}><span className="trust-icon"><Database size={19} /></span><div><p className="eyebrow-dark">TEFCA EXPORT</p><h3>Registry bundle is ready</h3><p>The completed treatment record will be packaged for an authorized cancer registry exchange using a structured FHIR payload.</p><span className="trust-status">{registryLoading ? <><span className="loading-pulse" /> Validating FHIR bundle</> : <><Check size={13} /> FHIR bundle staged</>}</span></div></motion.article>
            <motion.article className="trust-card smart-card" whileHover={{ y: -5 }} whileTap={{ scale: .99 }}><span className="trust-icon"><LockKeyhole size={19} /></span><div><p className="eyebrow-dark">SMART ON FHIR</p><h3>Launch context protected</h3><p>Session identity is supplied by the EHR launch context. No tokens or patient IDs are stored in the browser.</p><span className="trust-status"><Check size={13} /> PKCE session active</span></div></motion.article>
          </Reveal>
        </section>

        <section className="release-section">
          <div className="release-inner">
            <div><p className="eyebrow-dark">FINAL DECISION</p><h2>{completed ? 'Treatment record complete.' : 'Release to pharmacy?'}</h2><p>{completed ? 'The completed record is ready for a standards-based registry handoff.' : 'Releasing this batch will create a MedicationDispense record and notify the inpatient floor.'}</p></div>
            <div className="release-actions"><button className="secondary-action" type="button" onClick={toggleLabHold}>{holdDemo ? 'Pass lab' : 'Simulate lab hold'} <AlertTriangle size={15} /></button><button className="primary-action" type="button" disabled={gateBlocked || released} onClick={releaseBatch}>{released ? 'Released to pharmacy' : 'Release batch'} <ArrowRight size={16} /></button></div>
          </div>
          {gateBlocked && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="hold-notice"><AlertTriangle size={16} /> Release is disabled while ANC is below the protocol threshold.</motion.div>}
          {released && !completed && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="release-confirmation"><Check size={16} /> MedicationDispense created · privacy-minimized floor notification queued · AuditEvent recorded <button type="button" onClick={completeTreatment} disabled={registryLoading}>{registryLoading ? 'Preparing registry bundle…' : 'Mark treatment complete'} <PackageCheck size={15} /></button></motion.div>}
          {completed && <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="release-confirmation"><PackageCheck size={16} /> Treatment completion recorded · TEFCA registry bundle prepared ({registryEntryCount} resources) <button type="button"><ExternalLink size={15} /> View bundle</button></motion.div>}
        </section>
      </main>

      <AnimatePresence>
        {toast && <motion.div className={`toast toast-${toast.tone}`} role="status" initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 24 }} transition={{ duration: 0.22 }}><span className="toast-icon">{toast.tone === 'warning' ? <AlertTriangle size={15} /> : <Check size={15} />}</span><span>{toast.message}</span><button type="button" aria-label="Dismiss notification" onClick={() => setToast(null)}><X size={15} /></button></motion.div>}
      </AnimatePresence>

      <footer className="app-footer"><span className="footer-mark">lumen gate</span><span>Case 3 · Inpatient chemotherapy infusion safety gate · {patientDemos.length} demo contexts</span><span>BAA policy aligned <ShieldCheck size={14} /></span></footer>
    </div>
  )
}

export default App
