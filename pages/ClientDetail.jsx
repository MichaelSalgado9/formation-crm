import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClient, addNote, updateDocStatus, updateClientStage, createTask, updateTask, updateClient, useTeamMembers } from '../hooks/useClients'
import { STAGES, ALL_STAGES, STAGE_META } from '../lib/supabase'
import { StageBadge, TypeBadge, PriorityDot, Avatar, Field, Spinner, Modal } from '../components/UI'
import { formatDistanceToNow, format, differenceInDays, parseISO } from 'date-fns'

const DOC_STATUS_COLORS = {
  Pending:  { bg: '#F3F4F6', text: '#374151' },
  Received: { bg: '#DBEAFE', text: '#1D4ED8' },
  Verified: { bg: '#D1FAE5', text: '#065F46' },
  Rejected: { bg: '#FEE2E2', text: '#991B1B' },
}

export default function ClientDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { client, loading, refetch } = useClient(id)
  const [tab, setTab] = useState('overview')
  const [noteText, setNoteText] = useState('')
  const [savingNote, setSavingNote] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const teamMembers = useTeamMembers()

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 12, flexDirection: 'column' }}>
      <Spinner />
      <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Loading client…</div>
    </div>
  )
  if (!client) return (
    <div style={{ padding: 40, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center', justifyContent: 'center', height: '100%' }}>
      <div style={{ fontSize: 14, color: 'var(--text-2)' }}>Could not load this client.</div>
      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>This may be a permissions issue. Try refreshing the page.</div>
      <button className="btn btn-ghost" onClick={() => window.location.reload()}>Refresh</button>
    </div>
  )

  async function submitNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setSavingNote(true)
    await addNote(client.id, noteText)
    setNoteText('')
    setSavingNote(false)
    refetch()
  }

  async function moveStage(dir) {
    const idx = ALL_STAGES.indexOf(client.stage)
    const next = ALL_STAGES[idx + dir]
    if (!next) return
    await updateClientStage(client.id, next)
    refetch()
  }

  const stageIdx = ALL_STAGES.indexOf(client.stage)
  const docsVerified = (client.documents || []).filter(d => d.status === 'Verified').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '1rem 1.5rem' }}>
        <button onClick={() => navigate(-1)} style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}>
          ← Back
        </button>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <Avatar name={client.name} size={36} />
              <h1 style={{ fontSize: 18, fontWeight: 700 }}>{client.name}</h1>
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <StageBadge stage={client.stage} />
              <TypeBadge type={client.entity_type} />
              <PriorityDot priority={client.priority} />
              {client.assigned_member && (
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>Assigned to <strong>{client.assigned_member.full_name}</strong></span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-ghost" onClick={() => setEditOpen(true)}>✏️ Edit client</button>
            {stageIdx > 0 && <button className="btn btn-ghost" onClick={() => moveStage(-1)}>← Move back</button>}
            {stageIdx < ALL_STAGES.length - 1 && <button className="btn btn-primary" onClick={() => moveStage(1)}>Advance to {ALL_STAGES[stageIdx + 1]} →</button>}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {ALL_STAGES.map((s, i) => {
            const m = STAGE_META[s]
            return (
              <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ height: 4, background: i <= stageIdx ? m.color : 'var(--surface2)', width: '100%', borderRadius: i === 0 ? '4px 0 0 4px' : i === ALL_STAGES.length-1 ? '0 4px 4px 0' : 0, transition: 'background .3s' }} />
                <span style={{ fontSize: 9, color: i === stageIdx ? m.color : 'var(--text-3)', fontWeight: i === stageIdx ? 600 : 400 }}>{s.split(' ')[0]}</span>
              </div>
            )
          })}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1.5rem', overflowX: 'auto' }}>
        {['overview', 'follow up', 'documents', 'notes', 'tasks'].map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '10px 14px', fontSize: 13, fontWeight: 500, color: tab === t ? 'var(--accent)' : 'var(--text-3)', borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent', textTransform: 'capitalize', transition: 'color .15s', whiteSpace: 'nowrap' }}>
            {t}
            {t === 'documents' && ` (${docsVerified}/${(client.documents || []).length})`}
            {t === 'tasks' && ` (${(client.tasks || []).filter(x => x.status === 'Open' || x.status === 'In Progress').length})`}
          </button>
        ))}
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {tab === 'overview'   && <OverviewTab client={client} refetch={refetch} />}
        {tab === 'follow up'  && <FollowUpTab client={client} refetch={refetch} />}
        {tab === 'documents'  && <DocumentsTab client={client} refetch={refetch} />}
        {tab === 'notes'      && <NotesTab client={client} noteText={noteText} setNoteText={setNoteText} onSubmit={submitNote} saving={savingNote} />}
        {tab === 'tasks'      && <TasksTab client={client} refetch={refetch} />}
      </div>
      <EditClientModal open={editOpen} onClose={() => setEditOpen(false)} client={client} teamMembers={teamMembers} onSaved={refetch} />
    </div>
  )
}

const SECT_STYLE = { fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '.4px' }
const REFERRAL_SOURCES = ['Existing Client', 'Broker / IFA', 'Staff Referral', 'Website', 'Cold Call', 'Social Media', 'Other']

// Reusable editable card — shows read view with Edit button, switches to inline form on click
function EditableCard({ title, onSave, saving, children, renderEdit }) {
  const [editing, setEditing] = useState(false)
  async function save() {
    await onSave()
    setEditing(false)
  }
  return (
    <div className="card" style={{ padding: '1rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
        <div style={SECT_STYLE}>{title}</div>
        {!editing && (
          <button className="btn btn-ghost" onClick={() => setEditing(true)} style={{ fontSize: 11, padding: '4px 10px' }}>
            ✏️ Edit
          </button>
        )}
      </div>
      {editing ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {renderEdit()}
          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <button className="btn btn-primary" onClick={save} disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
            <button className="btn btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>{children}</div>
      )}
    </div>
  )
}

function OverviewTab({ client, refetch }) {
  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  const row = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }

  // Each section has its own local state + saving flag
  const [contact, setContact]   = useState({ email: client.email || '', phone: client.phone || '', id_number: client.id_number || '', ubo_name: client.ubo_name || '', proposed_entity_name: client.proposed_entity_name || '' })
  const [savingContact, setSavingContact] = useState(false)

  const [location, setLocation] = useState({ country: client.country || '', city: client.city || '' })
  const [savingLocation, setSavingLocation] = useState(false)

  const [setup, setSetup]       = useState({ setup_type: client.setup_type || 'New Setup', transfer_from_company: client.transfer_from_company || '' })
  const [savingSetup, setSavingSetup] = useState(false)

  const [referral, setReferral] = useState({ referral_source: client.referral_source || '', referral_person: client.referral_person || '' })
  const [savingReferral, setSavingReferral] = useState(false)

  const [rel, setRel]           = useState({ proposed_director: client.proposed_director || '', client_executive: client.client_executive || '', manager: client.manager || '', administrator: client.administrator || '', accounting_manager: client.accounting_manager || '', accountant: client.accountant || '' })
  const [savingRel, setSavingRel] = useState(false)

  const [editingDate, setEditingDate] = useState(false)
  const [dateVal, setDateVal]   = useState(client.enquiry_date ? client.enquiry_date.slice(0, 10) : client.created_at ? client.created_at.slice(0, 10) : '')
  const [savingDate, setSavingDate] = useState(false)

  async function save(fields, setFlag) {
    setFlag(true)
    await updateClient(client.id, fields)
    setFlag(false)
    refetch()
  }

  const stageHistory = [...(client.stage_history || [])].sort((a, b) => new Date(a.entered_at) - new Date(b.entered_at))
  const enquiryDate  = client.enquiry_date ? parseISO(client.enquiry_date) : client.created_at ? new Date(client.created_at) : null
  const totalDays    = enquiryDate ? differenceInDays(new Date(), enquiryDate) : null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, maxWidth: 700 }}>

      {/* Contact details */}
      <EditableCard
        title="Contact details"
        saving={savingContact}
        onSave={() => save(contact, setSavingContact)}
        renderEdit={() => (
          <>
            <div style={row}>
              <div><label style={lbl}>Email</label><input type="email" value={contact.email} onChange={e => setContact(c => ({ ...c, email: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={lbl}>Phone</label><input value={contact.phone} onChange={e => setContact(c => ({ ...c, phone: e.target.value }))} style={{ width: '100%' }} /></div>
            </div>
            <div><label style={lbl}>SA ID / Passport</label><input value={contact.id_number} onChange={e => setContact(c => ({ ...c, id_number: e.target.value }))} style={{ width: '100%' }} /></div>
          </>
        )}
      >
        <Field label="Email">{client.email || '—'}</Field>
        <Field label="Phone">{client.phone || '—'}</Field>
        <Field label="SA ID / Passport">{client.id_number || '—'}</Field>
        <Field label="Total days in pipeline"><span style={{ fontWeight: 600 }}>{totalDays !== null ? `${totalDays} days` : '—'}</span></Field>
      </EditableCard>

      {/* UBO / Entity */}
      <EditableCard
        title="Entity & UBO details"
        saving={savingContact}
        onSave={() => save({ ubo_name: contact.ubo_name, proposed_entity_name: contact.proposed_entity_name }, setSavingContact)}
        renderEdit={() => (
          <div style={row}>
            <div><label style={lbl}>Proposed entity name</label><input value={contact.proposed_entity_name || ''} onChange={e => setContact(c => ({ ...c, proposed_entity_name: e.target.value }))} style={{ width: '100%' }} placeholder="Official entity name" /></div>
            <div><label style={lbl}>UBO (Beneficial Owner)</label><input value={contact.ubo_name || ''} onChange={e => setContact(c => ({ ...c, ubo_name: e.target.value }))} style={{ width: '100%' }} placeholder="Full name of beneficial owner" /></div>
          </div>
        )}
      >
        <Field label="Proposed entity name">{client.proposed_entity_name || '—'}</Field>
        <Field label="UBO (Beneficial Owner)">{client.ubo_name || '—'}</Field>
      </EditableCard>

      {/* Location */}
      <EditableCard
        title="Location"
        saving={savingLocation}
        onSave={() => save(location, setSavingLocation)}
        renderEdit={() => (
          <div style={row}>
            <div><label style={lbl}>Country</label><input value={location.country} onChange={e => setLocation(l => ({ ...l, country: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. South Africa" /></div>
            <div><label style={lbl}>City</label><input value={location.city} onChange={e => setLocation(l => ({ ...l, city: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Cape Town" /></div>
          </div>
        )}
      >
        <Field label="Country">{client.country || '—'}</Field>
        <Field label="City">{client.city || '—'}</Field>
      </EditableCard>

      {/* Setup type */}
      <EditableCard
        title="Setup type"
        saving={savingSetup}
        onSave={() => save(setup, setSavingSetup)}
        renderEdit={() => (
          <div style={row}>
            <div>
              <label style={lbl}>Type</label>
              <select value={setup.setup_type} onChange={e => setSetup(s => ({ ...s, setup_type: e.target.value }))} style={{ width: '100%' }}>
                <option>New Setup</option>
                <option>Transfer In</option>
              </select>
            </div>
            {setup.setup_type === 'Transfer In' && (
              <div><label style={lbl}>Transferring from</label><input value={setup.transfer_from_company} onChange={e => setSetup(s => ({ ...s, transfer_from_company: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Sanlam Trust" /></div>
            )}
          </div>
        )}
      >
        <Field label="Type">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20, background: client.setup_type === 'Transfer In' ? '#FEF3C7' : '#D1FAE5', color: client.setup_type === 'Transfer In' ? '#92400E' : '#065F46' }}>
            {client.setup_type === 'Transfer In' ? '↩ Transfer In' : '✦ New Setup'}
          </span>
        </Field>
        {client.setup_type === 'Transfer In' && <Field label="Transferring from">{client.transfer_from_company || '—'}</Field>}
      </EditableCard>

      {/* Referral */}
      <EditableCard
        title="Referral"
        saving={savingReferral}
        onSave={() => save(referral, setSavingReferral)}
        renderEdit={() => (
          <div style={row}>
            <div>
              <label style={lbl}>Referral source</label>
              <select value={referral.referral_source} onChange={e => setReferral(r => ({ ...r, referral_source: e.target.value }))} style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {REFERRAL_SOURCES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Referred by</label><input value={referral.referral_person} onChange={e => setReferral(r => ({ ...r, referral_person: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. John Smith" /></div>
          </div>
        )}
      >
        <Field label="Referral source">{client.referral_source || '—'}</Field>
        <Field label="Referred by">{client.referral_person || '—'}</Field>
      </EditableCard>

      {/* Relationship */}
      <EditableCard
        title="Relationship"
        saving={savingRel}
        onSave={() => save(rel, setSavingRel)}
        renderEdit={() => (
          <div style={row}>
            <div><label style={lbl}>Proposed director</label><input value={rel.proposed_director} onChange={e => setRel(r => ({ ...r, proposed_director: e.target.value }))} style={{ width: '100%' }} /></div>
            <div><label style={lbl}>Client executive</label><input value={rel.client_executive} onChange={e => setRel(r => ({ ...r, client_executive: e.target.value }))} style={{ width: '100%' }} /></div>
          </div>
        )}
      >
        <Field label="Proposed director">{client.proposed_director || '—'}</Field>
        <Field label="Client executive">{client.client_executive || '—'}</Field>
        <Field label="Assigned advisor">{client.assigned_member?.full_name || '—'}</Field>
      </EditableCard>

      {/* Ongoing Management roles — only shown when in that stage */}
      {client.stage === 'Ongoing Management' && (
        <EditableCard
          title="Ongoing Management team"
          saving={savingRel}
          onSave={() => save({ manager: rel.manager, administrator: rel.administrator, accounting_manager: rel.accounting_manager, accountant: rel.accountant }, setSavingRel)}
          renderEdit={() => (
            <div style={row}>
              <div><label style={lbl}>Manager</label><input value={rel.manager || ''} onChange={e => setRel(r => ({ ...r, manager: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={lbl}>Administrator</label><input value={rel.administrator || ''} onChange={e => setRel(r => ({ ...r, administrator: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={lbl}>Accounting manager</label><input value={rel.accounting_manager || ''} onChange={e => setRel(r => ({ ...r, accounting_manager: e.target.value }))} style={{ width: '100%' }} /></div>
              <div><label style={lbl}>Accountant</label><input value={rel.accountant || ''} onChange={e => setRel(r => ({ ...r, accountant: e.target.value }))} style={{ width: '100%' }} /></div>
            </div>
          )}
        >
          <Field label="Manager">{client.manager || '—'}</Field>
          <Field label="Administrator">{client.administrator || '—'}</Field>
          <Field label="Accounting manager">{client.accounting_manager || '—'}</Field>
          <Field label="Accountant">{client.accountant || '—'}</Field>
        </EditableCard>
      )}

      {/* Enquiry date */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={SECT_STYLE}>Date of first enquiry</div>
          {!editingDate && <button className="btn btn-ghost" onClick={() => setEditingDate(true)} style={{ fontSize: 11, padding: '4px 10px' }}>✏️ Edit</button>}
        </div>
        {editingDate ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="date" value={dateVal} onChange={e => setDateVal(e.target.value)} style={{ fontSize: 13 }} />
            <button className="btn btn-primary" onClick={async () => { setSavingDate(true); await updateClient(client.id, { enquiry_date: dateVal }); setSavingDate(false); setEditingDate(false); refetch() }} disabled={savingDate}>{savingDate ? 'Saving…' : 'Save'}</button>
            <button className="btn btn-ghost" onClick={() => setEditingDate(false)}>Cancel</button>
          </div>
        ) : (
          <span style={{ fontSize: 15, fontWeight: 600 }}>{dateVal ? format(parseISO(dateVal), 'dd MMM yyyy') : '—'}</span>
        )}
      </div>

      {/* Stage history */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '.4px' }}>Stage history — time in each stage</div>
        <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 14 }}>🟢 On track &nbsp;·&nbsp; 🟡 Over 14 days &nbsp;·&nbsp; 🔴 Over 30 days</div>
        {stageHistory.length === 0 && <p style={{ fontSize: 12, color: 'var(--text-3)' }}>No stage history yet — will appear as client moves through stages.</p>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0, paddingLeft: 8 }}>
          {stageHistory.map((h, i) => {
            const isCurrent  = !h.exited_at
            const entered    = new Date(h.entered_at)
            const exited     = h.exited_at ? new Date(h.exited_at) : new Date()
            const days       = differenceInDays(exited, entered)
            const daysWarn   = days > 14
            const daysUrgent = days > 30
            const isLast     = i === stageHistory.length - 1
            return (
              <div key={i} style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 14, flexShrink: 0 }}>
                  <div style={{ width: 12, height: 12, borderRadius: '50%', flexShrink: 0, background: isCurrent ? '#2563EB' : '#10B981', border: isCurrent ? '2px solid #BFDBFE' : '2px solid #A7F3D0', marginTop: 2 }} />
                  {!isLast && <div style={{ width: 2, flex: 1, background: 'var(--border)', minHeight: 24 }} />}
                </div>
                <div style={{ flex: 1, paddingBottom: isLast ? 0 : 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: isCurrent ? '#2563EB' : 'var(--text)' }}>
                      {h.stage}{isCurrent && <span style={{ fontSize: 11, fontWeight: 400, color: '#2563EB', marginLeft: 6 }}>← current</span>}
                    </span>
                    <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: daysUrgent ? '#FEE2E2' : daysWarn ? '#FEF3C7' : '#D1FAE5', color: daysUrgent ? '#991B1B' : daysWarn ? '#92400E' : '#065F46' }}>
                      {daysUrgent ? '🔴' : daysWarn ? '🟡' : '🟢'} {days === 0 ? 'Less than 1 day' : `${days} day${days !== 1 ? 's' : ''}`}
                    </span>
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 3 }}>
                    {format(entered, 'dd MMM yyyy')}{h.exited_at ? ` → ${format(new Date(h.exited_at), 'dd MMM yyyy')}` : ' → present'}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Notes */}
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>Notes</div>
        <p style={{ fontSize: 13, color: 'var(--text-2)', whiteSpace: 'pre-wrap' }}>{client.notes || 'No notes.'}</p>
      </div>
    </div>
  )
}

function DocumentsTab({ client, refetch }) {
  const docs = client.documents || []
  async function changeStatus(docId, status) {
    await updateDocStatus(docId, status)
    refetch()
  }
  if (!docs.length) return <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No documents on file yet.</div>
  return (
    <div style={{ maxWidth: 700 }}>
      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border)' }}>
            {['Document', 'Required for', 'Status', 'Uploaded', 'Action'].map(h => (
              <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '8px 10px', textTransform: 'uppercase', letterSpacing: '.4px' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {docs.map(doc => {
            const sc = DOC_STATUS_COLORS[doc.status] || DOC_STATUS_COLORS.Pending
            return (
              <tr key={doc.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '10px', fontSize: 13, fontWeight: 500 }}>{doc.doc_type}</td>
                <td style={{ padding: '10px', fontSize: 12, color: 'var(--text-2)' }}>{doc.required_for}</td>
                <td style={{ padding: '10px' }}><span className="badge" style={{ background: sc.bg, color: sc.text }}>{doc.status}</span></td>
                <td style={{ padding: '10px', fontSize: 12, color: 'var(--text-3)' }}>{doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd MMM yy') : '—'}</td>
                <td style={{ padding: '10px' }}>
                  <select value={doc.status} onChange={e => changeStatus(doc.id, e.target.value)} style={{ fontSize: 12, padding: '4px 6px' }}>
                    <option>Pending</option><option>Received</option><option>Verified</option><option>Rejected</option>
                  </select>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function NotesTab({ client, noteText, setNoteText, onSubmit, saving }) {
  const notes = [...(client.notes || [])].sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
  return (
    <div style={{ maxWidth: 600 }}>
      <form onSubmit={onSubmit} style={{ marginBottom: '1.5rem' }}>
        <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3} placeholder="Add a note…" style={{ width: '100%', marginBottom: 8, resize: 'vertical' }} />
        <button type="submit" className="btn btn-primary" disabled={saving || !noteText.trim()}>{saving ? 'Saving…' : 'Add note'}</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {notes.map(n => (
          <div key={n.id} className="card" style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 13, whiteSpace: 'pre-wrap', marginBottom: 8 }}>{n.content}</p>
            <div style={{ fontSize: 11, color: 'var(--text-3)', display: 'flex', gap: 8 }}>
              {n.author && <span>{n.author.full_name}</span>}
              <span>{formatDistanceToNow(new Date(n.created_at), { addSuffix: true })}</span>
            </div>
          </div>
        ))}
        {!notes.length && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No notes yet.</p>}
      </div>
    </div>
  )
}

function TasksTab({ client, refetch }) {
  const [form, setForm] = useState({ title: '', due_date: '', priority: 'Medium' })
  const tasks = client.tasks || []

  async function addTask(e) {
    e.preventDefault()
    await createTask({ ...form, client_id: client.id, status: 'Open' })
    setForm({ title: '', due_date: '', priority: 'Medium' })
    refetch()
  }

  async function toggle(task) {
    await updateTask(task.id, { status: task.status === 'Done' ? 'Open' : 'Done' })
    refetch()
  }

  return (
    <div style={{ maxWidth: 600 }}>
      <form onSubmit={addTask} style={{ display: 'flex', gap: 8, marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input required placeholder="New task…" value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} style={{ flex: 1, minWidth: 160 }} />
        <input type="date" value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          <option>High</option><option>Medium</option><option>Low</option>
        </select>
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <div key={t.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: t.status === 'Done' ? .5 : 1 }}>
            <input type="checkbox" checked={t.status === 'Done'} onChange={() => toggle(t)} style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>{t.title}</div>
              {t.due_date && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Due {format(new Date(t.due_date), 'dd MMM yyyy')}</div>}
            </div>
            <PriorityDot priority={t.priority} />
          </div>
        ))}
        {!tasks.length && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No tasks yet.</p>}
      </div>
    </div>
  )
}

// ─────────────────────────────────────────────
// Edit Client Modal — full edit of all fields
// ─────────────────────────────────────────────
function EditClientModal({ open, onClose, client, teamMembers = [], onSaved }) {
  const [form, setForm] = useState({})
  const [saving, setSaving] = useState(false)

  // Reset form whenever modal opens with latest client data
  useState(() => { setForm({ ...client }) }, [client, open])

  // Keep form in sync when client changes
  if (open && form.id !== client.id) setForm({ ...client })

  function set(k, v) { setForm(f => ({ ...f, [k]: v })) }

  async function submit(e) {
    e.preventDefault()
    setSaving(true)
    const payload = {
      name:                   form.name,
      email:                  form.email,
      phone:                  form.phone,
      id_number:              form.id_number,
      entity_type:            form.entity_type,
      priority:               form.priority,
      assigned_to:            form.assigned_to || null,
      source:                 form.source,
      notes:                  form.notes,
      // Location
      country:                form.country,
      city:                   form.city,
      // Setup
      setup_type:             form.setup_type,
      ubo_name:               form.ubo_name,
      proposed_entity_name:   form.proposed_entity_name,
      transfer_from_company:  form.setup_type === 'Transfer In' ? form.transfer_from_company : null,
      // Referral
      referral_source:        form.referral_source,
      referral_person:        form.referral_person,
      // Relationship
      proposed_director:      form.proposed_director,
      client_executive:       form.client_executive,
    }
    await updateClient(client.id, payload)
    setSaving(false)
    onSaved()
    onClose()
  }

  const lbl  = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }
  const row  = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }
  const sect = { fontSize: 12, fontWeight: 600, color: 'var(--text-2)', borderBottom: '1px solid var(--border)', paddingBottom: 6, marginTop: 8 }

  if (!open) return null

  return (
    <Modal open={open} onClose={onClose} title={`Edit — ${client.name}`} width={600}>
      <form onSubmit={submit}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, maxHeight: '70vh', overflowY: 'auto', paddingRight: 4 }}>

          <div style={sect}>Client details</div>
          <div>
            <label style={lbl}>Full name / Entity name *</label>
            <input required value={form.name || ''} onChange={e => set('name', e.target.value)} style={{ width: '100%' }} />
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Proposed entity name</label>
              <input value={form.proposed_entity_name || ''} onChange={e => set('proposed_entity_name', e.target.value)} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lbl}>UBO (Beneficial Owner)</label>
              <input value={form.ubo_name || ''} onChange={e => set('ubo_name', e.target.value)} style={{ width: '100%' }} />
            </div>
          </div>
          <div style={row}>
            <div><label style={lbl}>Email</label><input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} style={{ width: '100%' }} /></div>
            <div><label style={lbl}>Phone</label><input value={form.phone || ''} onChange={e => set('phone', e.target.value)} style={{ width: '100%' }} /></div>
          </div>
          <div style={row}>
            <div>
              <label style={lbl}>Entity type *</label>
              <select value={form.entity_type || 'Trust'} onChange={e => set('entity_type', e.target.value)} style={{ width: '100%' }}>
                <option>Trust</option><option>Company</option><option>Both</option>
              </select>
            </div>
            <div><label style={lbl}>SA ID / Passport</label><input value={form.id_number || ''} onChange={e => set('id_number', e.target.value)} style={{ width: '100%' }} /></div>
          </div>

          <div style={sect}>Location</div>
          <div style={row}>
            <div><label style={lbl}>Country</label><input value={form.country || ''} onChange={e => set('country', e.target.value)} style={{ width: '100%' }} placeholder="e.g. South Africa" /></div>
            <div><label style={lbl}>City</label><input value={form.city || ''} onChange={e => set('city', e.target.value)} style={{ width: '100%' }} placeholder="e.g. Cape Town" /></div>
          </div>

          <div style={sect}>Setup type</div>
          <div style={row}>
            <div>
              <label style={lbl}>New setup or transfer in?</label>
              <select value={form.setup_type || 'New Setup'} onChange={e => set('setup_type', e.target.value)} style={{ width: '100%' }}>
                <option>New Setup</option><option>Transfer In</option>
              </select>
            </div>
            {form.setup_type === 'Transfer In' && (
              <div><label style={lbl}>Transferring from (Management Co.)</label><input value={form.transfer_from_company || ''} onChange={e => set('transfer_from_company', e.target.value)} style={{ width: '100%' }} /></div>
            )}
          </div>

          <div style={sect}>Referral</div>
          <div style={row}>
            <div>
              <label style={lbl}>Referral source</label>
              <select value={form.referral_source || ''} onChange={e => set('referral_source', e.target.value)} style={{ width: '100%' }}>
                <option value="">— Select —</option>
                {['Existing Client','Broker / IFA','Staff Referral','Website','Cold Call','Social Media','Other'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div><label style={lbl}>Referred by (person name)</label><input value={form.referral_person || ''} onChange={e => set('referral_person', e.target.value)} style={{ width: '100%' }} /></div>
          </div>

          <div style={sect}>Relationship</div>
          <div style={row}>
            <div><label style={lbl}>Proposed director</label><input value={form.proposed_director || ''} onChange={e => set('proposed_director', e.target.value)} style={{ width: '100%' }} /></div>
            <div><label style={lbl}>Client executive</label><input value={form.client_executive || ''} onChange={e => set('client_executive', e.target.value)} style={{ width: '100%' }} /></div>
          </div>

          <div style={sect}>Pipeline</div>
          <div style={row}>
            <div>
              <label style={lbl}>Priority</label>
              <select value={form.priority || 'Medium'} onChange={e => set('priority', e.target.value)} style={{ width: '100%' }}>
                <option>High</option><option>Medium</option><option>Low</option>
              </select>
            </div>
            <div>
              <label style={lbl}>Stage</label>
              <select value={form.stage || 'Lead / PNC'} onChange={e => set('stage', e.target.value)} style={{ width: '100%' }}>
                {ALL_STAGES.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={lbl}>Assigned advisor</label>
              <select value={form.assigned_to || ''} onChange={e => set('assigned_to', e.target.value)} style={{ width: '100%' }}>
                <option value="">— Unassigned —</option>
                {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label style={lbl}>Notes</label>
            <textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} style={{ width: '100%', resize: 'vertical' }} />
          </div>

        </div>

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
          <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : 'Save changes'}</button>
        </div>
      </form>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// Follow Up Tab
// ─────────────────────────────────────────────
import { supabase } from '../lib/supabase'

function FollowUpTab({ client, refetch }) {
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    follow_up_date: new Date().toISOString().slice(0, 10),
    outcome: '',
    next_action: '',
    next_follow_up: '',
  })
  const [saving, setSaving] = useState(false)

  async function loadEntries() {
    setLoading(true)
    const { data } = await supabase
      .from('follow_ups')
      .select('*, logger:team_members(full_name)')
      .eq('client_id', client.id)
      .order('follow_up_date', { ascending: false })
    setEntries(data || [])
    setLoading(false)
  }

  useEffect(() => { loadEntries() }, [client.id])

  async function submit(e) {
    e.preventDefault()
    if (!form.outcome.trim()) return
    setSaving(true)
    const payload = { ...form, client_id: client.id }
    if (!payload.next_follow_up) delete payload.next_follow_up
    await supabase.from('follow_ups').insert(payload)
    setSaving(false)
    setForm({ follow_up_date: new Date().toISOString().slice(0, 10), outcome: '', next_action: '', next_follow_up: '' })
    loadEntries()
  }

  const lbl = { fontSize: 11, fontWeight: 500, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '.4px', display: 'block', marginBottom: 4 }

  return (
    <div style={{ maxWidth: 680 }}>
      {/* Next follow-up banner */}
      {entries[0]?.next_follow_up && (
        <div style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', borderRadius: 8, padding: '10px 14px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'center' }}>
          <span style={{ fontSize: 16 }}>📅</span>
          <div>
            <div style={{ fontSize: 12, fontWeight: 600, color: '#1D4ED8' }}>Next follow-up due</div>
            <div style={{ fontSize: 13, color: '#1D4ED8' }}>{format(new Date(entries[0].next_follow_up), 'dd MMM yyyy')}</div>
          </div>
          {entries[0].next_action && (
            <div style={{ marginLeft: 16, fontSize: 12, color: '#1E40AF' }}>
              <strong>Action:</strong> {entries[0].next_action}
            </div>
          )}
        </div>
      )}

      {/* Log new follow-up */}
      <div className="card" style={{ padding: '1rem', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 12 }}>Log follow-up</div>
        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={lbl}>Date of follow-up *</label>
              <input type="date" value={form.follow_up_date} onChange={e => setForm(f => ({ ...f, follow_up_date: e.target.value }))} style={{ width: '100%' }} />
            </div>
            <div>
              <label style={lbl}>Next follow-up date</label>
              <input type="date" value={form.next_follow_up} onChange={e => setForm(f => ({ ...f, next_follow_up: e.target.value }))} style={{ width: '100%' }} />
            </div>
          </div>
          <div>
            <label style={lbl}>Outcome / what was discussed *</label>
            <textarea value={form.outcome} onChange={e => setForm(f => ({ ...f, outcome: e.target.value }))} rows={3} style={{ width: '100%', resize: 'vertical' }} placeholder="e.g. Spoke with client — they are reviewing the proposal and will revert in 2 weeks." />
          </div>
          <div>
            <label style={lbl}>Next action</label>
            <input value={form.next_action} onChange={e => setForm(f => ({ ...f, next_action: e.target.value }))} style={{ width: '100%' }} placeholder="e.g. Send updated fee proposal" />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="btn btn-primary" disabled={saving || !form.outcome.trim()}>
              {saving ? 'Saving…' : 'Log follow-up'}
            </button>
          </div>
        </form>
      </div>

      {/* History */}
      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '.4px' }}>
        Follow-up history ({entries.length})
      </div>
      {loading && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>Loading…</div>}
      {!loading && entries.length === 0 && <div style={{ color: 'var(--text-3)', fontSize: 13 }}>No follow-ups logged yet.</div>}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {entries.map(e => (
          <div key={e.id} className="card" style={{ padding: '12px 14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 6 }}>
              <div style={{ fontSize: 13, fontWeight: 600 }}>
                📅 {format(new Date(e.follow_up_date), 'dd MMM yyyy')}
              </div>
              {e.next_follow_up && (
                <div style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#EFF6FF', color: '#1D4ED8' }}>
                  Next: {format(new Date(e.next_follow_up), 'dd MMM yyyy')}
                </div>
              )}
            </div>
            {e.outcome && <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: e.next_action ? 6 : 0, whiteSpace: 'pre-wrap' }}>{e.outcome}</p>}
            {e.next_action && (
              <div style={{ fontSize: 12, color: '#1D4ED8', background: '#EFF6FF', padding: '4px 8px', borderRadius: 4 }}>
                ➡️ Next action: {e.next_action}
              </div>
            )}
            {e.logger && <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 6 }}>Logged by {e.logger.full_name}</div>}
          </div>
        ))}
      </div>
    </div>
  )
}
