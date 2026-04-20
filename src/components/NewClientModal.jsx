import { useState } from 'react'
import { Modal } from './UI'
import { createClient } from '../hooks/useClients'
import { STAGES } from '../lib/supabase'

const REFERRAL_SOURCES = [
  'Existing Client',
  'Broker / IFA',
  'Staff Referral',
  'Website',
  'Cold Call',
  'Social Media',
  'Other',
]

export default function NewClientModal({ open, onClose, onCreated, teamMembers = [] }) {
  const empty = {
    name: '', email: '', phone: '', id_number: '',
    entity_type: 'Trust', priority: 'Medium',
    stage: STAGES[0], assigned_to: '', notes: '',
    setup_type: 'New Setup', transfer_from_company: '',
    referral_source: '', referral_person: '',
    proposed_director: '', client_executive: '',
    country: '', city: '',
  }
  const [form, setForm] = useState(empty)
  const [saving, setSaving] = useState(false)
  const [err, setErr] = useState(null)

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    setErr(null)
    const payload = { ...form }
    if (!payload.assigned_to) delete payload.assigned_to
    if (payload.setup_type !== 'Transfer In') delete payload.transfer_from_company
    const { error } = await createClient(payload)
    setSaving(false)
    if (error) { setErr(error.message); return }
    onCreated?.()
    onClose()
    setForm(empty)
  }

  const row  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const lbl  = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  const sect = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 4 }

  return (
    <Modal open={open} onClose={onClose} title="New client" width={580}>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* ── Client details ── */}
          <div style={sect}>Client details</div>

          <div>
            <label style={lbl}>Full name / Entity name *</label>
            <input required value={form.name} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Priya Naidoo or Steyn Family Trust" />
          </div>

          <div style={row}>
            <div>
              <label style={lbl}>Email</label>
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lbl}>Phone</label>
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={{ width: '100%' }} placeholder="071 234 5678" />
            </div>
          </div>

          <div style={row}>
            <div>
              <label style={lbl}>Entity type *</label>
              <select value={form.entity_type} onChange={e => set('entity_type', e.target.value)} style={{ width: '100%' }}>
                <option>Trust</option>
                <option>Company</option>
                <option>Both</option>
              </select>
            </div>
            <div>
              <label style={lbl}>SA ID / Passport</label>
              <input value={form.id_number} onChange={e => set('id_number', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>

          {/* ── Location ── */}
          <div style={sect}>Location</div>

          <div style={row}>
            <div>
              <label style={lbl}>Country</label>
              <input value={form.country} onChange={e => set('country', e.target.value)} style={{ width: '100%' }} placeholder="e.g. South Africa" />
            </div>
            <div>
              <label style={lbl}>City</label>
              <input value={form.city} onChange={e => set('city', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Cape Town" />
            </div>
          </div>

          {/* ── Setup type ── */}
          <div style={sect}>Setup type</div>

          <div style={row}>
            <div>
              <label style={lbl}>New setup or transfer in?</label>
              <select value={form.setup_type} onChange={e => set('setup_type', e.target.value)} style={{ width: '100%' }}>
                <option>New Setup</option>
                <option>Transfer In</option>
              </select>
            </div>
            {form.setup_type === 'Transfer In' && (
              <div>
                <label style={lbl}>Transferring from (Management Co.)</label>
                <input value={form.transfer_from_company} onChange={e => set('transfer_from_company', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Sanlam Trust" />
              </div>
            )}
          </div>

          {/* ── Referral ── */}
          <div style={sect}>Referral</div>

          <div style={row}>
            <div>
              <label style={lbl}>Referral source</label>
              <select value={form.referral_source} onChange={e => set('referral_source', e.target.value)} style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {REFERRAL_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Referred by (person name)</label>
              <input value={form.referral_person} onChange={e => set('referral_person', e.target.value)} style={{ width: '100%' }} placeholder="e.g. John Smith" />
            </div>
          </div>

          {/* ── Relationship ── */}
          <div style={sect}>Relationship</div>

          <div style={row}>
            <div>
              <label style={lbl}>Proposed director</label>
              <input value={form.proposed_director} onChange={e => set('proposed_director', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Jane Doe" />
            </div>
            <div>
              <label style={lbl}>Client executive</label>
              <input value={form.client_executive} onChange={e => set('client_executive', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Michael Salgado" />
            </div>
          </div>

          {/* ── Pipeline ── */}
          <div style={sect}>Pipeline</div>

          <div style={row}>
            <div>
              <label style={lbl}>Priority</label>
              <select value={form.priority} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
                <option>High</option>
                <option>Medium</option>
                <option>Low</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Initial stage</label>
              <select value={form.stage} onChange={e => set('stage', e.target.value)} style={{ width: '100%' }}>
                {STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Assigned advisor</label>
            <select value={form.assigned_to} onChange={e => set('assigned_to', e.target.value)} style={{ width: '100%' }}>
              <option value="">— Unassigned —</option>
              {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
            </select>
          </div>

          <div>
            <label style={lbl}>Notes</label>
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
