import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STAGES, STAGE_META, TYPE_META } from '../lib/supabase'

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [{ data: clients }, { data: tasks }, { data: docs }] = await Promise.all([
        supabase.from('clients').select('stage, entity_type, priority, created_at').eq('is_archived', false),
        supabase.from('tasks').select('status, due_date'),
        supabase.from('documents').select('status'),
      ])

      const byStage = Object.fromEntries(STAGES.map(s => [s, 0]))
      const byType  = { Trust: 0, Company: 0, Both: 0 }
      const byPri   = { High: 0, Medium: 0, Low: 0 };

      (clients || []).forEach(c => {
        byStage[c.stage] = (byStage[c.stage] || 0) + 1
        byType[c.entity_type] = (byType[c.entity_type] || 0) + 1
        byPri[c.priority] = (byPri[c.priority] || 0) + 1
      })

      const totalDocs = (docs || []).length
      const verifiedDocs = (docs || []).filter(d => d.status === 'Verified').length

      const openTasks  = (tasks || []).filter(t => t.status === 'Open' || t.status === 'In Progress').length
      const overdueTasks = (tasks || []).filter(t => t.status !== 'Done' && t.due_date && new Date(t.due_date) < new Date()).length

      setStats({ byStage, byType, byPri, totalDocs, verifiedDocs, total: clients?.length || 0, openTasks, overdueTasks })
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div style={{ padding: 40, color: 'var(--text-3)' }}>Loading…</div>

  const maxStage = Math.max(...Object.values(stats.byStage), 1)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <h1 style={{ fontSize: 17, fontWeight: 600 }}>Reports</h1>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
        {/* Summary cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: '1.5rem' }}>
          {[
            { label: 'Total clients',  val: stats.total },
            { label: 'Open tasks',     val: stats.openTasks },
            { label: 'Overdue tasks',  val: stats.overdueTasks, alert: stats.overdueTasks > 0 },
            { label: 'Doc compliance', val: stats.totalDocs ? `${Math.round(stats.verifiedDocs / stats.totalDocs * 100)}%` : '—' },
          ].map((c, i) => (
            <div key={i} style={{
              background: c.alert ? '#FEF2F2' : 'var(--surface)',
              border: `1px solid ${c.alert ? '#FCA5A5' : 'var(--border)'}`,
              borderRadius: 10, padding: '14px 16px'
            }}>
              <div style={{ fontSize: 11, color: c.alert ? '#DC2626' : 'var(--text-3)', marginBottom: 4 }}>{c.label}</div>
              <div style={{ fontSize: 24, fontWeight: 700, color: c.alert ? '#DC2626' : 'var(--text)' }}>{c.val}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          {/* Pipeline breakdown */}
          <div className="card" style={{ padding: '1.25rem' }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '1rem' }}>Clients by stage</div>
            {STAGES.map(s => {
              const count = stats.byStage[s] || 0
              const pct   = Math.round((count / maxStage) * 100)
              const m     = STAGE_META[s]
              return (
                <div key={s} style={{ marginBottom: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 4 }}>
                    <span style={{ color: 'var(--text-2)' }}>{s}</span>
                    <span style={{ fontWeight: 600 }}>{count}</span>
                  </div>
                  <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${pct}%`, background: m.color, borderRadius: 4, transition: 'width .4s' }} />
                  </div>
                </div>
              )
            })}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* By type */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem' }}>By entity type</div>
              {Object.entries(stats.byType).map(([type, count]) => {
                const m = TYPE_META[type]
                return (
                  <div key={type} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <span className="badge" style={{ background: m.bg, color: m.text }}>{type}</span>
                    <span style={{ fontSize: 16, fontWeight: 600 }}>{count}</span>
                  </div>
                )
              })}
            </div>

            {/* By priority */}
            <div className="card" style={{ padding: '1.25rem' }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '0.75rem' }}>By priority</div>
              {[
                { label: 'High',   count: stats.byPri.High,   color: '#EF4444' },
                { label: 'Medium', count: stats.byPri.Medium, color: '#F59E0B' },
                { label: 'Low',    count: stats.byPri.Low,    color: '#9CA3AF' },
              ].map(({ label, count, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {label}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{count}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
