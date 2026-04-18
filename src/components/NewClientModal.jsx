import { useState } from 'react'
import { Modal } from './UI'
import { createClient } from '../hooks/useClients'
import { STAGES } from '../lib/supabase'

export default function NewClientModal({ open, onClose, onCreated, teamMembers = [] }) {
  const [form, setForm] = useState({
    name: '', email: '', phone: '', id_number: '',
    entity_type: 'Trust', priority: 'Medium',
    stage: STAGES[0], assigned_to: '', notes: '', source: ''
  })
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload = { ...form }
    if (!payload.assigned_to) delete payload.assigned_to
    const { error } = await createClient(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated?.()
    onClose()
    setForm({ name:'',email:'',phone:'',id_number:'',entity_type:'Trust',priority:'Medium',stage:STAGES[0],assigned_to:'',notes:'',source:'' })
  }

  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const label = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }

  return (
    <Modal open={open} onClose={onClose} title="New client" width={560}>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          <div>
            <label style={label}>Full name / Entity name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Priya Naidoo or Steyn Family Trust" />
          </div>

          <div style={row}>
            <div>
              <label style={label}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={label}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={{ width: '100%' }} placeholder="071 234 5678" />
            </div>
          </div>

          <div style={row}>
            <div>
              <label style={label}>Entity type *</label>
              <select value={form.entity_type} onChange={e => set('entity_type', e.target.value)} style={{ width: '100%' }}>
                <option>Trust</option>
                <option>Company</option>
                <option>Both</option>
              </select>
            </div>
            <div>
              <label style={label}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
          </div>

          <div style={row}>
            <div>
              <label style={label}>Initial stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ width: '100%' }}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={label}>Assigned to</label>
              <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={{ width: '100%' }}>
                <option value="">— Unassigned —</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div style={row}>
            <div>
              <label style={label}>SA ID / Passport</label>
              <input value={form.id_number} onChange={e => set('id_number', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={label}>Source</label>
              <input value={form.source} onChange={e => set('source', e.target.value)} style={{ width: '100%' }} placeholder="Referral, Website…" />
            </div>
          </div>

          <div>
            <label style={label}>Notes</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>

          {err && <p style={{ fontSize: 12, color: '#DC2626' }}>{err}</p>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create client'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
