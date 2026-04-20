import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAdvisor, updateAdvisor, linkAdvisorToClient, unlinkAdvisorFromClient, logAdvice } from '../hooks/useAdvisors'
import { supabase } from '../lib/supabase'
import { Avatar, Field, Spinner, Modal } from '../components/UI'
import { format } from 'date-fns'

const TYPE_META = {
  Investment: { bg: '#EDE9FE', text: '#4C1D95' },
  Tax:        { bg: '#D1FAE5', text: '#064E3B' },
}

export default function AdvisorDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { advisor, loading, refetch } = useAdvisor(id)
  const [tab, setTab] = useState('entities')
  const [linkOpen, setLinkOpen] = useState(false)
  const [logOpen, setLogOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)

  if (loading) return <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
  if (!advisor) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Advisor not found.</div>

  const meta = TYPE_META[advisor.advisor_type] || TYPE_META.Investment
  const activeLinks  = (advisor.advisor_clients || []).filter(l => l.is_current)
  const historyLinks = (advisor.advisor_clients || []).filter(l => !l.is_current)
  const adviceLog    = [...(advisor.advisor_advice_log || [])].sort((a, b) => new Date(b.date_of_advice) - new Date(a.date_of_advice))

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>← Back</button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <Avatar name={advisor.full_name} size={44} />
            <div>
              <h1 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>{advisor.full_name}</h1>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 10px', borderRadius: 20, background: meta.bg, color: meta.text }}>{advisor.advisor_type} Advisor</span>
                {advisor.firm_name && <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{advisor.firm_name}</span>}
                <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: advisor.is_active ? '#D1FAE5' : '#F3F4F6', color: advisor.is_active ? '#065F46' : '#6B7280' }}>
                  {advisor.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="btn btn-ghost" onClick={() => setEditOpen(true)}>✏️ Edit</button>
            <button className="btn btn-ghost" onClick={() => setLogOpen(true)}>+ Log advice</button>
            <button className="btn btn-primary" onClick={() => setLinkOpen(true)}>+ Link entity</button>
          </div>
        </div>
      </div>

      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '10px 1.5rem', display: 'flex', gap: 24, flexWrap: 'wrap' }}>
        {[
          { label: advisor.advisor_type === 'Investment' ? 'FSP Number' : 'Tax Practitioner No.', val: advisor.license_number || '—' },
          { label: 'Email', val: advisor.email || '—' },
          { label: 'Phone', val: advisor.phone || '—' },
          { label: 'Linked entities', val: activeLinks.length },
        ].map(({ label, val }) => (
          <div key={label}>
            <div style={{ fontSize: 10, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
            <div style={{ fontSize: 13, fontWeight: 500 }}>{val}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
        {[
          { key: 'entities', label: `Linked entities (${activeLinks.length})` },
          { key: 'history',  label: `Historical (${historyLinks.length})` },
          { key: 'advice',   label: `Advice log (${adviceLog.length})` },
          { key: 'notes',    label: 'Notes' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: tab === t.key ? 'var(--accent)' : 'var(--text-3)', borderBottom: tab === t.key ? '2px solid var(--accent)' : '2px solid transparent', transition: 'color .15s', whiteSpace: 'nowrap' }}>
            {t.label}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {tab === 'entities' && <EntitiesTab links={activeLinks} advisorId={advisor.id} navigate={navigate} onUnlink={async (aId, cId) => { await unlinkAdvisorFromClient(aId, cId); refetch() }} />}
        {tab === 'history'  && <EntitiesTab links={historyLinks} historical advisorId={advisor.id} navigate={navigate} />}
        {tab === 'advice'   && <AdviceTab log={adviceLog} />}
        {tab === 'notes'    && <div className="card" style={{ padding: '1rem', maxWidth: 600 }}><p style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{advisor.notes || 'No notes.'}</p></div>}
      </div>

      <LinkEntityModal open={linkOpen} onClose={() => setLinkOpen(false)} advisorId={advisor.id} onLinked={refetch} />
      <LogAdviceModal  open={logOpen}  onClose={() => setLogOpen(false)}  advisorId={advisor.id} onLogged={refetch} />
      <EditAdvisorModal open={editOpen} onClose={() => setEditOpen(false)} advisor={advisor} onSaved={refetch} />
    </div>
  )
}

function EntitiesTab({ links, historical, advisorId, navigate, onUnlink }) {
  if (!links.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>{historical ? 'No historical relationships.' : 'No entities linked yet.'}</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700 }}>
      {links.map(link => (
        <div key={link.id} className="card" style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ flex: 1, cursor: 'pointer' }} onClick={() => navigate(`/clients/${link.client?.id}`)}>
            <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--accent)', marginBottom: 3 }}>{link.client?.name}</div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              {link.client?.entity_type && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-2)' }}>{link.client.entity_type}</span>}
              {link.client?.stage && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{link.client.stage}</span>}
              {link.notes && <span style={{ fontSize: 11, color: 'var(--text-3)' }}>· {link.notes}</span>}
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>Linked {format(new Date(link.linked_at), 'dd MMM yyyy')}</div>
          </div>
          {!historical && onUnlink && (
            <button className="btn btn-ghost" style={{ fontSize: 11, color: '#DC2626', borderColor: '#FCA5A5' }} onClick={() => onUnlink(advisorId, link.client?.id)}>Unlink</button>
          )}
        </div>
      ))}
    </div>
  )
}

function AdviceTab({ log }) {
  if (!log.length) return <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No advice logged yet.</div>
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 700 }}>
      {log.map(entry => (
        <div key={entry.id} className="card" style={{ padding: '12px 16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>{entry.subject}</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>{format(new Date(entry.date_of_advice), 'dd MMM yyyy')}</div>
          </div>
          {entry.client && <span style={{ fontSize: 11, padding: '1px 7px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-2)', display: 'inline-block', marginBottom: 6 }}>{entry.client.name}</span>}
          {entry.summary && <p style={{ fontSize: 12, color: 'var(--text-2)', whiteSpace: 'pre-wrap', marginBottom: 6 }}>{entry.summary}</p>}
          {entry.document_url && <a href={entry.document_url} target="_blank" rel="noreferrer" style={{ fontSize: 12, color: 'var(--accent)' }}>📎 View document</a>}
          {entry.logger && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Logged by {entry.logger.full_name}</div>}
        </div>
      ))}
    </div>
  )
}

function LinkEntityModal({ open, onClose, advisorId, onLinked }) {
  const [clients, setClients] = useState([])
  const [selected, setSelected] = useState('')
  const [notes, setNotes] = useState('')
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) supabase.from('clients').select('id, name, entity_type').eq('is_archived', false).order('name').then(({ data }) => setClients(data || [])) }, [open])
  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await linkAdvisorToClient(advisorId, selected, notes)
    setSaving(false); setSelected(''); setNotes('')
    onLinked(); onClose()
  }
  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  return (
    <Modal open={open} onClose={onClose} title="Link entity to advisor" width={440}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={lbl}>Select entity *</label>
          <select required value={selected} onChange={e => setSelected(e.target.value)} style={{ width: '100%' }}>
            <option value="">— Choose client / entity —</option>
            {clients.map(c => <option key={c.id} value={c.id}>{c.name} ({c.entity_type})</option>)}
          </select>
        </div>
        <div><label style={lbl}>Notes (optional)</label><input value={notes} onChange={e => setNotes(e.target.value)} style={{ width: '100%' }} placeholder="e.g. Manages investment portfolio" /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !selected}>{saving ? 'Linking…' : 'Link entity'}</button>
        </div>
      </form>
    </Modal>
  )
}

function LogAdviceModal({ open, onClose, advisorId, onLogged }) {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({ client_id: '', date_of_advice: new Date().toISOString().slice(0, 10), subject: '', summary: '', document_url: '' })
  const [saving, setSaving] = useState(false)
  useEffect(() => { if (open) supabase.from('clients').select('id, name, entity_type').eq('is_archived', false).order('name').then(({ data }) => setClients(data || [])) }, [open])
  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = { ...form, advisor_id: advisorId }
    if (!payload.client_id) delete payload.client_id
    await logAdvice(payload)
    setSaving(false)
    setForm({ client_id: '', date_of_advice: new Date().toISOString().slice(0, 10), subject: '', summary: '', document_url: '' })
    onLogged(); onClose()
  }
  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  return (
    <Modal open={open} onClose={onClose} title="Log advice entry" width={500}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div><label style={lbl}>Entity (optional)</label>
            <select value={form.client_id} onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))} style={{ width: '100%' }}>
              <option value="">— General advice —</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div><label style={lbl}>Date of advice *</label><input type="date" required value={form.date_of_advice} onChange={e => setForm(f => ({ ...f, date_of_advice: e.target.value }))} style={{ width: '100%' }} /></div>
        </div>
        <div><label style={lbl}>Subject *</label><input required value={form.subject} onChange={e => setForm(f => ({ ...f, subject: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Annual portfolio review" /></div>
        <div><label style={lbl}>Summary</label><textarea value={form.summary} onChange={e => setForm(f => ({ ...f, summary: e.target.value }))} rows={3} style={{ width: '100%', resize: 'vertical' }} /></div>
        <div><label style={lbl}>Document URL (optional)</label><input value={form.document_url} onChange={e => setForm(f => ({ ...f, document_url: e.target.value }))} style={{ width: '100%' }} placeholder="https://..." /></div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving || !form.subject}>{saving ? 'Saving…' : 'Log advice'}</button>
        </div>
      </form>
    </Modal>
  )
}

function EditAdvisorModal({ open, onClose, advisor, onSaved }) {
  const [form, setForm] = useState({ ...advisor })
  const [saving, setSaving] = useState(false)
  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    await updateAdvisor(advisor.id, form)
    setSaving(false); onSaved(); onClose()
  }
  return (
    <Modal open={open} onClose={onClose} title="Edit advisor" width={520}>
      <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div><label style={lbl}>Full name *</label><input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: '100%' }} /></div>
        <div style={row}>
          <div><label style={lbl}>Firm name</label><input value={form.firm_name || ''} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} style={{ width: '100%' }} /></div>
          <div><label style={lbl}>{advisor.advisor_type === 'Investment' ? 'FSP Number' : 'Tax Practitioner No.'}</label><input value={form.license_number || ''} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} style={{ width: '100%' }} /></div>
        </div>
        <div style={row}>
          <div><label style={lbl}>Email</label><input type="email" value={form.email || ''} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} /></div>
          <div><label style={lbl}>Phone</label><input value={form.phone || ''} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} /></div>
        </div>
        <div><label style={lbl}>Notes</label><textarea value={form.notes || ''} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: '100%', resize: 'vertical' }} /></div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <input type="checkbox" id="is_active" checked={form.is_active} onChange={e => setForm(f => ({ ...f, is_active: e.target.checked }))} />
          <label htmlFor="is_active" style={{ fontSize: 13 }}>Active advisor</label>
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  )
}
