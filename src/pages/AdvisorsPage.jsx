import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAdvisors, createAdvisor, updateAdvisor } from '../hooks/useAdvisors'
import { Avatar, Modal, Spinner } from '../components/UI'
import { format } from 'date-fns'

const TYPE_META = {
  Investment: { bg: '#EDE9FE', text: '#4C1D95', border: '#7C3AED' },
  Tax:        { bg: '#D1FAE5', text: '#064E3B', border: '#10B981' },
}

function AdvisorForm({ initial = {}, onSave, onCancel, saving, type }) {
  const [form, setForm] = useState({
    full_name: initial.full_name || '',
    firm_name: initial.firm_name || '',
    email: initial.email || '',
    phone: initial.phone || '',
    license_number: initial.license_number || '',
    notes: initial.notes || '',
    advisor_type: type,
    is_active: initial.is_active !== undefined ? initial.is_active : true,
  })
  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const licenseLabel = type === 'Investment' ? 'FSP Number' : 'Tax Practitioner Number'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      <div>
        <label style={lbl}>Full name *</label>
        <input required value={form.full_name} onChange={e => setForm(f => ({ ...f, full_name: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Jane Smith" />
      </div>
      <div style={row}>
        <div>
          <label style={lbl}>Firm / Practice name</label>
          <input value={form.firm_name} onChange={e => setForm(f => ({ ...f, firm_name: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Smith & Associates" />
        </div>
        <div>
          <label style={lbl}>{licenseLabel}</label>
          <input value={form.license_number} onChange={e => setForm(f => ({ ...f, license_number: e.target.value }))} style={{ width: '100%' }} />
        </div>
      </div>
      <div style={row}>
        <div>
          <label style={lbl}>Email</label>
          <input type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} style={{ width: '100%' }} />
        </div>
        <div>
          <label style={lbl}>Phone</label>
          <input value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} style={{ width: '100%' }} />
        </div>
      </div>
      <div>
        <label style={lbl}>Notes</label>
        <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} rows={3} style={{ width: '100%', resize: 'vertical' }} />
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn btn-ghost" onClick={onCancel} type="button">Cancel</button>
        <button className="btn btn-primary" onClick={() => onSave(form)} disabled={saving || !form.full_name}>
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
    </div>
  )
}

export default function AdvisorsPage({ type }) {
  const navigate = useNavigate()
  const { advisors, loading, refetch } = useAdvisors(type)
  const [newOpen, setNewOpen] = useState(false)
  const [editAdvisor, setEditAdvisor] = useState(null)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const meta = TYPE_META[type]

  const filtered = advisors.filter(a =>
    !search ||
    a.full_name.toLowerCase().includes(search.toLowerCase()) ||
    (a.firm_name || '').toLowerCase().includes(search.toLowerCase())
  )

  async function handleCreate(form) {
    setSaving(true)
    await createAdvisor(form)
    setSaving(false)
    setNewOpen(false)
    refetch()
  }

  async function handleUpdate(form) {
    setSaving(true)
    await updateAdvisor(editAdvisor.id, form)
    setSaving(false)
    setEditAdvisor(null)
    refetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <h1 style={{ fontSize: 17, fontWeight: 600 }}>{type} Advisors</h1>
          <span style={{ fontSize: 12, padding: '2px 8px', borderRadius: 20, background: meta.bg, color: meta.text, fontWeight: 600 }}>
            {advisors.filter(a => a.is_active).length} active
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <input placeholder="Search advisors…" style={{ width: 180 }} value={search} onChange={e => setSearch(e.target.value)} />
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>+ Add {type} advisor</button>
        </div>
      </div>

      {/* Table */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
            No {type.toLowerCase()} advisors yet. Click "+ Add {type} advisor" to get started.
          </div>
        ) : (
          <div className="card" style={{ overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Advisor', 'Firm', 'Contact', 'Linked entities', 'Status', ''].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map(advisor => {
                  const activeLinks = (advisor.advisor_clients || []).filter(l => l.is_current)
                  return (
                    <tr
                      key={advisor.id}
                      onClick={() => navigate(`/advisors/${type.toLowerCase()}/${advisor.id}`)}
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                      onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                      onMouseLeave={e => e.currentTarget.style.background = ''}
                    >
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <Avatar name={advisor.full_name} size={30} />
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 600 }}>{advisor.full_name}</div>
                            {advisor.license_number && (
                              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                                {type === 'Investment' ? 'FSP: ' : 'TP: '}{advisor.license_number}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '12px 14px', fontSize: 13, color: 'var(--text-2)' }}>{advisor.firm_name || '—'}</td>
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{advisor.email || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{advisor.phone || ''}</div>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        {activeLinks.length === 0 ? (
                          <span style={{ fontSize: 12, color: 'var(--text-3)' }}>None linked</span>
                        ) : (
                          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                            {activeLinks.slice(0, 3).map(l => (
                              <span key={l.id} style={{ fontSize: 11, padding: '2px 7px', borderRadius: 20, background: 'var(--surface2)', color: 'var(--text-2)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                                {l.client?.name}
                              </span>
                            ))}
                            {activeLinks.length > 3 && (
                              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>+{activeLinks.length - 3} more</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: advisor.is_active ? '#D1FAE5' : '#F3F4F6', color: advisor.is_active ? '#065F46' : '#6B7280' }}>
                          {advisor.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ padding: '12px 14px' }}>
                        <button
                          className="btn btn-ghost"
                          style={{ fontSize: 12 }}
                          onClick={e => { e.stopPropagation(); setEditAdvisor(advisor) }}
                        >
                          ✏️ Edit
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* New advisor modal */}
      <Modal open={newOpen} onClose={() => setNewOpen(false)} title={`Add ${type} advisor`} width={520}>
        <AdvisorForm type={type} onSave={handleCreate} onCancel={() => setNewOpen(false)} saving={saving} />
      </Modal>

      {/* Edit advisor modal */}
      <Modal open={!!editAdvisor} onClose={() => setEditAdvisor(null)} title={`Edit ${type} advisor`} width={520}>
        {editAdvisor && (
          <AdvisorForm type={type} initial={editAdvisor} onSave={handleUpdate} onCancel={() => setEditAdvisor(null)} saving={saving} />
        )}
      </Modal>
    </div>
  )
}
