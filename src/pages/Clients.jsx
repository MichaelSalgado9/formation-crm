import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useClients, useTeamMembers } from '../hooks/useClients'
import { StageBadge, TypeBadge, PriorityDot, Avatar } from '../components/UI'
import NewClientModal from '../components/NewClientModal'
import { formatDistanceToNow } from 'date-fns'

export default function Clients() {
  const navigate = useNavigate()
  const [filters, setFilters] = useState({})
  const [newOpen, setNewOpen] = useState(false)
  const { clients, loading, refetch } = useClients(filters)
  const teamMembers = useTeamMembers()

  function setFilter(k, v) {
    setFilters(f => ({ ...f, [k]: v || undefined }))
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '1.25rem 1.5rem',
        borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap'
      }}>
        <h1 style={{ fontSize: 17, fontWeight: 600 }}>Clients <span style={{ fontSize: 13, fontWeight: 400, color: 'var(--text-3)' }}>({clients.length})</span></h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <input placeholder="Search…" style={{ width: 160 }} onChange={e => setFilter('search', e.target.value)} />
          <select onChange={e => setFilter('entity_type', e.target.value)}>
            <option value="">All types</option>
            <option>Trust</option>
            <option>Company</option>
            <option>Both</option>
          </select>
          <select onChange={e => setFilter('stage', e.target.value)}>
            <option value="">All stages</option>
            <option>Lead / Inquiry</option>
            <option>Document Collection</option>
            <option>Entity Formation</option>
            <option>Compliance / FICA</option>
            <option>Ongoing Management</option>
          </select>
          <select onChange={e => setFilter('priority', e.target.value)}>
            <option value="">All priority</option>
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <button className="btn btn-primary" onClick={() => setNewOpen(true)}>+ New client</button>
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border)' }}>
                {['Client', 'Type', 'Stage', 'Priority', 'Assigned', 'Added', ''].map(h => (
                  <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '10px 14px', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>Loading…</td></tr>
              )}
              {!loading && clients.length === 0 && (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: 30, color: 'var(--text-3)' }}>No clients found.</td></tr>
              )}
              {clients.map(client => (
                <tr
                  key={client.id}
                  onClick={() => navigate(`/clients/${client.id}`)}
                  style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer', transition: 'background .1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = ''}
                >
                  <td style={{ padding: '10px 14px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Avatar name={client.name} size={28} />
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600 }}>{client.name}</div>
                        {client.email && <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{client.email}</div>}
                      </div>
                    </div>
                  </td>
                  <td style={{ padding: '10px 14px' }}><TypeBadge type={client.entity_type} /></td>
                  <td style={{ padding: '10px 14px' }}><StageBadge stage={client.stage} /></td>
                  <td style={{ padding: '10px 14px' }}><PriorityDot priority={client.priority} /></td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-2)' }}>
                    {client.assigned_member?.full_name || '—'}
                  </td>
                  <td style={{ padding: '10px 14px', fontSize: 12, color: 'var(--text-3)', whiteSpace: 'nowrap' }}>
                    {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
                  </td>
                  <td style={{ padding: '10px 14px' }}>
                    <span style={{ fontSize: 12, color: 'var(--accent)', fontWeight: 500 }}>View →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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
