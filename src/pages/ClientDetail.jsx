import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useClient, addNote, updateDocStatus, updateClientStage, createTask, updateTask } from '../hooks/useClients'
import { STAGES } from '../lib/supabase'
import { StageBadge, TypeBadge, PriorityDot, Avatar, Field, Spinner } from '../components/UI'
import { formatDistanceToNow, format } from 'date-fns'

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

  if (loading) return <div style={{ padding: 40, display: 'flex', justifyContent: 'center' }}><Spinner /></div>
  if (!client) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Client not found.</div>

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
    const idx = STAGES.indexOf(client.stage)
    const next = STAGES[idx + dir]
    if (!next) return
    await updateClientStage(client.id, next)
    refetch()
  }

  const stageIdx = STAGES.indexOf(client.stage)
  const docsVerified = (client.documents || []).filter(d => d.status === 'Verified').length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '1rem 1.5rem',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 4 }}
        >
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
                <span style={{ fontSize: 12, color: 'var(--text-2)' }}>
                  Assigned to <strong>{client.assigned_member.full_name}</strong>
                </span>
              )}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {stageIdx > 0 && (
              <button className="btn btn-ghost" onClick={() => moveStage(-1)}>
                ← Move back
              </button>
            )}
            {stageIdx < 4 && (
              <button className="btn btn-primary" onClick={() => moveStage(1)}>
                Advance to {STAGES[stageIdx + 1]} →
              </button>
            )}
          </div>
        </div>

        {/* Stage progress bar */}
        <div style={{ display: 'flex', gap: 0, marginTop: 16 }}>
          {STAGES.map((s, i) => (
            <div key={s} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                height: 4,
                background: i <= stageIdx ? '#2563EB' : 'var(--surface2)',
                width: '100%',
                borderRadius: i === 0 ? '4px 0 0 4px' : i === 4 ? '0 4px 4px 0' : 0,
                transition: 'background .3s'
              }} />
              <span style={{ fontSize: 10, color: i === stageIdx ? 'var(--accent)' : 'var(--text-3)', fontWeight: i === stageIdx ? 600 : 400 }}>
                {s.split(' ').slice(0, 2).join(' ')}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '0 1.5rem' }}>
        {['overview', 'documents', 'notes', 'tasks'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              padding: '10px 14px', fontSize: 13, fontWeight: 500,
              color: tab === t ? 'var(--accent)' : 'var(--text-3)',
              borderBottom: tab === t ? '2px solid var(--accent)' : '2px solid transparent',
              textTransform: 'capitalize', transition: 'color .15s'
            }}
          >
            {t}
            {t === 'documents' && ` (${docsVerified}/${(client.documents || []).length})`}
            {t === 'tasks' && ` (${(client.tasks || []).filter(x => x.status === 'Open' || x.status === 'In Progress').length})`}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {tab === 'overview' && <OverviewTab client={client} />}
        {tab === 'documents' && <DocumentsTab client={client} refetch={refetch} />}
        {tab === 'notes' && (
          <NotesTab
            client={client}
            noteText={noteText}
            setNoteText={setNoteText}
            onSubmit={submitNote}
            saving={savingNote}
          />
        )}
        {tab === 'tasks' && <TasksTab client={client} refetch={refetch} />}
      </div>
    </div>
  )
}

function OverviewTab({ client }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 700 }}>
      <div className="card" style={{ padding: '1rem', gridColumn: '1/-1' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>Contact details</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Email">{client.email || '—'}</Field>
          <Field label="Phone">{client.phone || '—'}</Field>
          <Field label="SA ID / Passport">{client.id_number || '—'}</Field>
          <Field label="Source">{client.source || '—'}</Field>
        </div>
      </div>
      <div className="card" style={{ padding: '1rem' }}>
        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-3)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: '.4px' }}>Stage history</div>
        {(client.stage_history || []).map((h, i) => (
          <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 8, alignItems: 'flex-start' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: h.exited_at ? '#10B981' : '#2563EB', marginTop: 4, flexShrink: 0 }} />
            <div>
              <div style={{ fontSize: 12, fontWeight: 500 }}>{h.stage}</div>
              <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
                {format(new Date(h.entered_at), 'dd MMM yyyy')}
                {h.exited_at ? ` → ${format(new Date(h.exited_at), 'dd MMM yyyy')}` : ' (current)'}
              </div>
            </div>
          </div>
        ))}
      </div>
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
                <td style={{ padding: '10px' }}>
                  <span className="badge" style={{ background: sc.bg, color: sc.text }}>{doc.status}</span>
                </td>
                <td style={{ padding: '10px', fontSize: 12, color: 'var(--text-3)' }}>
                  {doc.uploaded_at ? format(new Date(doc.uploaded_at), 'dd MMM yy') : '—'}
                </td>
                <td style={{ padding: '10px' }}>
                  <select
                    value={doc.status}
                    onChange={e => changeStatus(doc.id, e.target.value)}
                    style={{ fontSize: 12, padding: '4px 6px' }}
                  >
                    <option>Pending</option>
                    <option>Received</option>
                    <option>Verified</option>
                    <option>Rejected</option>
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
        <textarea
          value={noteText}
          onChange={e => setNoteText(e.target.value)}
          rows={3}
          placeholder="Add a note…"
          style={{ width: '100%', marginBottom: 8, resize: 'vertical' }}
        />
        <button type="submit" className="btn btn-primary" disabled={saving || !noteText.trim()}>
          {saving ? 'Saving…' : 'Add note'}
        </button>
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
        <input
          required
          placeholder="New task…"
          value={form.title}
          onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
          style={{ flex: 1, minWidth: 160 }}
        />
        <input
          type="date"
          value={form.due_date}
          onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))}
        />
        <select value={form.priority} onChange={e => setForm(f => ({ ...f, priority: e.target.value }))}>
          <option>High</option>
          <option>Medium</option>
          <option>Low</option>
        </select>
        <button type="submit" className="btn btn-primary">Add</button>
      </form>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {tasks.map(t => (
          <div key={t.id} className="card" style={{ padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, opacity: t.status === 'Done' ? .5 : 1 }}>
            <input
              type="checkbox"
              checked={t.status === 'Done'}
              onChange={() => toggle(t)}
              style={{ width: 16, height: 16, cursor: 'pointer' }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, fontWeight: 500, textDecoration: t.status === 'Done' ? 'line-through' : 'none' }}>{t.title}</div>
              {t.due_date && (
                <div style={{ fontSize: 11, color: 'var(--text-3)' }}>Due {format(new Date(t.due_date), 'dd MMM yyyy')}</div>
              )}
            </div>
            <PriorityDot priority={t.priority} />
          </div>
        ))}
        {!tasks.length && <p style={{ color: 'var(--text-3)', fontSize: 13 }}>No tasks yet.</p>}
      </div>
    </div>
  )
}
