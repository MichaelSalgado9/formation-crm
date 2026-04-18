import { STAGE_META, TYPE_META, PRIORITY_META } from '../lib/supabase'

export function StageBadge({ stage }) {
  const m = STAGE_META[stage] || {}
  return (
    <span className="badge" style={{ background: m.bg, color: m.text }}>
      {stage}
    </span>
  )
}

export function TypeBadge({ type }) {
  const m = TYPE_META[type] || {}
  return (
    <span className="badge" style={{ background: m.bg, color: m.text }}>
      {type}
    </span>
  )
}

export function PriorityDot({ priority }) {
  const m = PRIORITY_META[priority] || {}
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 12, color: 'var(--text-2)' }}>
      <span style={{
        width: 7, height: 7, borderRadius: '50%',
        background: m.dot, display: 'inline-block', flexShrink: 0
      }} />
      {m.label}
    </span>
  )
}

export function Avatar({ name = '', size = 32 }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
  const hue = [...name].reduce((acc, c) => acc + c.charCodeAt(0), 0) % 360
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      background: `hsl(${hue},55%,88%)`,
      color: `hsl(${hue},55%,35%)`,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: size * 0.35, fontWeight: 600, flexShrink: 0,
      userSelect: 'none'
    }}>
      {initials}
    </div>
  )
}

export function DocProgress({ documents = [] }) {
  if (!documents.length) return null
  const total = documents.length
  const done  = documents.filter(d => d.status === 'Verified').length
  const pct   = Math.round((done / total) * 100)
  return (
    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
        <span>Docs</span>
        <span>{done}/{total}</span>
      </div>
      <div style={{ height: 4, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%',
          width: `${pct}%`,
          background: pct === 100 ? '#10B981' : '#3B82F6',
          borderRadius: 4,
          transition: 'width .3s'
        }} />
      </div>
    </div>
  )
}

export function Modal({ open, onClose, title, children, width = 520 }) {
  if (!open) return null
  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 100, padding: '1rem'
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="card"
        style={{ width: '100%', maxWidth: width, maxHeight: '90vh', overflowY: 'auto', padding: '1.5rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
          <h2 style={{ fontSize: 16, fontWeight: 600 }}>{title}</h2>
          <button onClick={onClose} style={{ fontSize: 18, color: 'var(--text-3)', lineHeight: 1 }}>✕</button>
        </div>
        {children}
      </div>
    </div>
  )
}

export function Field({ label, children }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
      <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
        {label}
      </label>
      <div style={{ fontSize: 13, color: 'var(--text)' }}>{children}</div>
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" />
}

export function PageLoader() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', flex: 1 }}>
      <Spinner />
    </div>
  )
}
