import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients, updateClientStage, useTeamMembers } from '../hooks/useClients'
import { STAGES, STAGE_META } from '../lib/supabase'
import { StageBadge, TypeBadge, PriorityDot, DocProgress, Avatar } from '../components/UI'
import NewClientModal from '../components/NewClientModal'
import { formatDistanceToNow, differenceInDays, format } from 'date-fns'

export default function Pipeline() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({})
  const [newOpen, setNewOpen] = useState(false)
  const { clients, loading, refetch } = useClients(filters)
  const teamMembers = useTeamMembers()

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v || undefined }))
  }

  async function moveStage(clientId, direction) {
    const client = clients.find(c => c.id === clientId)
    const idx = STAGES.indexOf(client.stage)
    const next = STAGES[idx + direction]
    if (!next) return
    await updateClientStage(clientId, next)
    refetch()
  }

  const byStage = stage => clients.filter(c => c.stage === stage)

  const metrics = {
    total:   clients.length,
    high:    clients.filter(c => c.priority === 'High').length,
    wip:     clients.filter(c => c.stage === 'WIP').length,
    ongoing: clients.filter(c => c.stage === 'Ongoing Management').length,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexWrap: 'wrap', gap: 12
      }}>
        <h1 style={{ fontSize: 17, fontWeight: 600 }}>Pipeline</h1>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input
            placeholder="Search clients…"
            style={{ width: 170 }}
            onChange={e => setFilter('search', e.target.value)}
          />
          <select onChange={e => setFilter('entity_type', e.target.value)}>
            <option value="">All types</option>
            <option>Trust</option>
            <option>Company</option>
            <option>Both</option>
          </select>
          <select onChange={e => setFilter('priority', e.target.value)}>
            <option value="">All priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <select onChange={e => setFilter('assigned_to', e.target.value)}>
            <option value="">All advisors</option>
            {teamMembers.map(m => <option key={m.id} value={m.id}>{m.full_name}</option>)}
          </select>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>
            + New client
          </button>
        </div>
      </div>

      {/* Metrics bar */}
      <div style={{
        display: 'flex', gap: 0,
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)'
      }}>
        {[
          { label: 'Total clients',      val: metrics.total },
          { label: 'High priority',      val: metrics.high },
          { label: 'WIP',                val: metrics.wip },
          { label: 'Ongoing Management', val: metrics.ongoing },
        ].map((m, i) => (
          <div key={i} style={{
            flex: 1, padding: '10px 1.25rem',
            borderRight: '1px solid var(--border)',
          }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 2 }}>{m.label}</div>
            <div style={{ fontSize: 20, fontWeight: 600 }}>{m.val}</div>
          </div>
        ))}
      </div>

      {/* Board */}
      <div style={{
        flex: 1, overflowX: 'auto', overflowY: 'hidden',
        padding: '1.25rem',
        display: 'flex', gap: 10
      }}>
        {STAGES.map(stage => {
          const m = STAGE_META[stage]
          const cols = byStage(stage)
          return (
            <div key={stage} style={{ width: 240, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '6px 10px',
                background: m.bg,
                borderRadius: 8,
                borderLeft: `3px solid ${m.color}`
              }}>
                <span style={{ fontSize: 12, fontWeight: 600, color: m.text }}>{stage}</span>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  background: m.color, color: '#fff',
                  borderRadius: 20, padding: '1px 7px'
                }}>{cols.length}</span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {loading && <div style={{ textAlign: 'center', padding: 20, color: 'var(--text-3)' }}>…</div>}
                {!loading && cols.length === 0 && (
                  <div style={{ fontSize: 12, color: 'var(--text-3)', textAlign: 'center', padding: '16px 0' }}>
                    No clients
                  </div>
                )}
                {cols.map(client => (
                  <ClientCard
                    key={client.id}
                    client={client}
                    onClick={() => navigate(`/clients/${client.id}`)}
                    onMove={dir => moveStage(client.id, dir)}
                    stageIndex={STAGES.indexOf(stage)}
                  />
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <NewClientModal
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={refetch}
        teamMembers={teamMembers}
      />
    </div>
  )
}

function MetaRow({ icon, label, value }) {
  if (!value) return null
  return (
    <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 3, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span style={{ flexShrink: 0 }}>{icon}</span>
      <span style={{ color: 'var(--text-2)', fontWeight: 500 }}>{label}:</span>
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</span>
    </div>
  )
}

function ClientCard({ client, onClick, onMove, stageIndex }) {
  const daysInStage = client.stage_entered_at
    ? differenceInDays(new Date(), new Date(client.stage_entered_at))
    : client.created_at
    ? differenceInDays(new Date(), new Date(client.created_at))
    : null
  const daysWarning = daysInStage !== null && daysInStage > 14
  const daysUrgent  = daysInStage !== null && daysInStage > 30
  const referralLabel = client.referral_source
    ? (client.referral_person ? `${client.referral_source} — ${client.referral_person}` : client.referral_source)
    : client.referral_person || null

  return (
    <div
      className="card"
      onClick={onClick}
      style={{ padding: '10px 12px', cursor: 'pointer', transition: 'box-shadow .15s' }}
      onMouseEnter={e => e.currentTarget.style.boxShadow = 'var(--shadow)'}
      onMouseLeave={e => e.currentTarget.style.boxShadow = ''}
    >
      <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 5 }}>{client.name}</div>
      <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 6 }}>
        <TypeBadge type={client.entity_type} />
        <PriorityDot priority={client.priority} />
      </div>
      <div style={{ marginBottom: 6 }}>
        <MetaRow icon="👤" label="Exec"     value={client.client_executive} />
        <MetaRow icon="🏛" label="Director" value={client.proposed_director} />
        <MetaRow icon="↗"  label="Referral" value={referralLabel} />
      </div>
      {client.created_at && (
        <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 5, display: 'flex', alignItems: 'center', gap: 4 }}>
          <span>📅</span>
          <span>Added {format(new Date(client.created_at), 'dd MMM yyyy')}</span>
        </div>
      )}
      {daysInStage !== null && (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, fontWeight: 600, padding: '2px 7px', borderRadius: 20, marginBottom: 6, background: daysUrgent ? '#FEE2E2' : daysWarning ? '#FEF3C7' : 'var(--surface2)', color: daysUrgent ? '#991B1B' : daysWarning ? '#92400E' : 'var(--text-2)' }}>
          <span>{daysUrgent ? '🔴' : daysWarning ? '🟡' : '🟢'}</span>
          {daysInStage === 0 ? 'Today' : `${daysInStage}d in stage`}
        </div>
      )}
      {client.documents?.length > 0 && (
        <div style={{ marginBottom: 8 }}><DocProgress documents={client.documents} /></div>
      )}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          {client.assigned_member && <Avatar name={client.assigned_member.full_name} size={20} />}
          {client.assigned_member && <span style={{ fontSize: 10, color: 'var(--text-3)' }}>{client.assigned_member.full_name}</span>}
        </div>
        <div style={{ display: 'flex', gap: 2 }} onClick={e => e.stopPropagation()}>
          {stageIndex > 0 && <button onClick={() => onMove(-1)} title="Move back" style={{ fontSize: 12, color: 'var(--text-3)', padding: '2px 5px' }}>←</button>}
          {stageIndex < 4 && <button onClick={() => onMove(1)} title="Advance stage" style={{ fontSize: 12, color: 'var(--accent)', padding: '2px 5px', fontWeight: 600 }}>→</button>}
        </div>
      </div>
    </div>
  )
}
