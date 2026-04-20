import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { STAGES, STAGE_META, TYPE_META } from '../lib/supabase'
import { differenceInDays, format } from 'date-fns'

function StatCard({ label, value, alert }) {
  return (
    <div style={{ background: alert ? '#FEF2F2' : 'var(--surface)', border: `1px solid ${alert ? '#FCA5A5' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px' }}>
      <div style={{ fontSize: 11, color: alert ? '#DC2626' : 'var(--text-3)', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 24, fontWeight: 700, color: alert ? '#DC2626' : 'var(--text)' }}>{value}</div>
    </div>
  )
}

function SectionTitle({ children }) {
  return <div style={{ fontSize: 13, fontWeight: 600, marginBottom: '1rem', paddingBottom: 8, borderBottom: '1px solid var(--border)' }}>{children}</div>
}

function BarBreakdown({ title, data, colorFn }) {
  const max = Math.max(...data.map(d => d.count), 1)
  if (!data.length) return null
  return (
    <div className="card" style={{ padding: '1.25rem' }}>
      <SectionTitle>{title}</SectionTitle>
      {data.map(({ label, count }) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
            <span style={{ color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '70%' }}>{label || '—'}</span>
            <span style={{ fontWeight: 600 }}>{count}</span>
          </div>
          <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${Math.round((count / max) * 100)}%`, background: colorFn ? colorFn(label) : '#2563EB', borderRadius: 4, transition: 'width .4s' }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export default function Reports() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [referralTab, setReferralTab] = useState('source')

  useEffect(() => {
    async function load() {
      const [
        { data: clients },
        { data: tasks },
        { data: docs },
        { data: stageHistory },
      ] = await Promise.all([
        supabase.from('clients').select('*').eq('is_archived', false),
        supabase.from('tasks').select('status, due_date'),
        supabase.from('documents').select('status'),
        supabase.from('stage_history').select('stage, entered_at, exited_at'),
      ])

      const cl = clients || []

      // Pipeline by stage
      const byStage = Object.fromEntries(STAGES.map(s => [s, 0]))
      cl.forEach(c => { byStage[c.stage] = (byStage[c.stage] || 0) + 1 })

      // By type
      const byType = { Trust: 0, Company: 0, Both: 0 }
      cl.forEach(c => { byType[c.entity_type] = (byType[c.entity_type] || 0) + 1 })

      // By priority
      const byPri = { High: 0, Medium: 0, Low: 0 }
      cl.forEach(c => { byPri[c.priority] = (byPri[c.priority] || 0) + 1 })

      // By referral source
      const refSourceMap = {}
      cl.forEach(c => {
        const key = c.referral_source || 'Not specified'
        refSourceMap[key] = (refSourceMap[key] || 0) + 1
      })
      const byReferralSource = Object.entries(refSourceMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)

      // By referral person
      const refPersonMap = {}
      cl.forEach(c => {
        if (c.referral_person) refPersonMap[c.referral_person] = (refPersonMap[c.referral_person] || 0) + 1
      })
      const byReferralPerson = Object.entries(refPersonMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)

      // By client executive
      const execMap = {}
      cl.forEach(c => {
        const key = c.client_executive || 'Unassigned'
        execMap[key] = (execMap[key] || 0) + 1
      })
      const byExec = Object.entries(execMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)

      // By director
      const dirMap = {}
      cl.forEach(c => {
        const key = c.proposed_director || 'Not specified'
        dirMap[key] = (dirMap[key] || 0) + 1
      })
      const byDirector = Object.entries(dirMap)
        .map(([label, count]) => ({ label, count }))
        .sort((a, b) => b.count - a.count)

      // Full referral detail table
      const referralDetail = cl
        .filter(c => c.referral_source || c.referral_person)
        .map(c => ({
          name: c.name,
          entity_type: c.entity_type,
          stage: c.stage,
          client_executive: c.client_executive,
          proposed_director: c.proposed_director,
          referral_source: c.referral_source,
          referral_person: c.referral_person,
          setup_type: c.setup_type,
        }))
        .sort((a, b) => (a.referral_source || '').localeCompare(b.referral_source || ''))

      // Avg days per stage
      const avgDaysPerStage = {}
      STAGES.forEach(stage => {
        const entries = (stageHistory || []).filter(h => h.stage === stage && h.exited_at)
        if (entries.length) {
          const total = entries.reduce((sum, h) => sum + differenceInDays(new Date(h.exited_at), new Date(h.entered_at)), 0)
          avgDaysPerStage[stage] = Math.round(total / entries.length)
        } else {
          avgDaysPerStage[stage] = null
        }
      })

      const totalDocs    = (docs || []).length
      const verifiedDocs = (docs || []).filter(d => d.status === 'Verified').length
      const openTasks    = (tasks || []).filter(t => ['Open', 'In Progress'].includes(t.status)).length
      const overdueTasks = (tasks || []).filter(t => t.status !== 'Done' && t.due_date && new Date(t.due_date) < new Date()).length

      setStats({ byStage, byType, byPri, byReferralSource, byReferralPerson, byExec, byDirector, referralDetail, totalDocs, verifiedDocs, total: cl.length, openTasks, overdueTasks, avgDaysPerStage })
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

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: 16 }}>

        {/* Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12 }}>
          <StatCard label="Total clients"  value={stats.total} />
          <StatCard label="Open tasks"     value={stats.openTasks} />
          <StatCard label="Overdue tasks"  value={stats.overdueTasks} alert={stats.overdueTasks > 0} />
          <StatCard label="Doc compliance" value={stats.totalDocs ? `${Math.round(stats.verifiedDocs / stats.totalDocs * 100)}%` : '—'} />
        </div>

        {/* Pipeline + type */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
          <div className="card" style={{ padding: '1.25rem' }}>
            <SectionTitle>Clients by stage</SectionTitle>
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
            <div className="card" style={{ padding: '1.25rem' }}>
              <SectionTitle>By entity type</SectionTitle>
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
            <div className="card" style={{ padding: '1.25rem' }}>
              <SectionTitle>By priority</SectionTitle>
              {[{ label: 'High', color: '#EF4444' }, { label: 'Medium', color: '#F59E0B' }, { label: 'Low', color: '#9CA3AF' }].map(({ label, color }) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                    {label}
                  </span>
                  <span style={{ fontSize: 16, fontWeight: 600 }}>{stats.byPri[label]}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Client executive + Director */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <BarBreakdown title="Clients by client executive" data={stats.byExec} colorFn={() => '#7C3AED'} />
          <BarBreakdown title="Clients by proposed director" data={stats.byDirector} colorFn={() => '#0891B2'} />
        </div>

        {/* Referral breakdowns */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <SectionTitle>Referral analysis</SectionTitle>
          <div style={{ display: 'flex', gap: 4, marginBottom: '1rem' }}>
            {[
              { key: 'source', label: 'By source' },
              { key: 'person', label: 'By person' },
            ].map(t => (
              <button key={t.key} onClick={() => setReferralTab(t.key)} style={{ fontSize: 12, padding: '5px 12px', borderRadius: 6, border: '1px solid var(--border)', background: referralTab === t.key ? 'var(--accent)' : 'transparent', color: referralTab === t.key ? '#fff' : 'var(--text-2)', cursor: 'pointer' }}>
                {t.label}
              </button>
            ))}
          </div>
          {referralTab === 'source' && (
            <div>
              {stats.byReferralSource.map(({ label, count }) => {
                const pct = Math.round((count / stats.total) * 100)
                return (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-2)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{count} <span style={{ color: 'var(--text-3)', fontWeight: 400 }}>({pct}%)</span></span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${pct}%`, background: '#10B981', borderRadius: 4, transition: 'width .4s' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          )}
          {referralTab === 'person' && (
            stats.byReferralPerson.length === 0
              ? <p style={{ fontSize: 13, color: 'var(--text-3)' }}>No referral persons recorded yet.</p>
              : stats.byReferralPerson.map(({ label, count }) => {
                const max = stats.byReferralPerson[0].count
                return (
                  <div key={label} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 3 }}>
                      <span style={{ color: 'var(--text-2)' }}>{label}</span>
                      <span style={{ fontWeight: 600 }}>{count}</span>
                    </div>
                    <div style={{ height: 8, background: 'var(--surface2)', borderRadius: 4, overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${Math.round((count / max) * 100)}%`, background: '#F59E0B', borderRadius: 4, transition: 'width .4s' }} />
                    </div>
                  </div>
                )
              })
          )}
        </div>

        {/* Full referral detail table */}
        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '1rem 1.25rem', borderBottom: '1px solid var(--border)' }}>
            <SectionTitle>Full referral detail</SectionTitle>
            <p style={{ fontSize: 12, color: 'var(--text-3)', marginTop: -8 }}>All clients with referral information recorded</p>
          </div>
          {stats.referralDetail.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
              No referral data yet. Add referral source/person when creating or editing clients.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Entity', 'Type', 'Client executive', 'Director', 'Referral source', 'Referred by', 'Setup', 'Stage'].map(h => (
                    <th key={h} style={{ textAlign: 'left', fontSize: 11, fontWeight: 600, color: 'var(--text-3)', padding: '8px 12px', textTransform: 'uppercase', letterSpacing: '.4px', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {stats.referralDetail.map((c, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '10px 12px', fontSize: 13, fontWeight: 600 }}>{c.name}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-2)' }}>{c.entity_type}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-2)' }}>{c.client_executive || '—'}</td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-2)' }}>{c.proposed_director || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      {c.referral_source
                        ? <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: '#D1FAE5', color: '#065F46', fontWeight: 600 }}>{c.referral_source}</span>
                        : <span style={{ fontSize: 12, color: 'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 12, color: 'var(--text-2)' }}>{c.referral_person || '—'}</td>
                    <td style={{ padding: '10px 12px' }}>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 20, background: c.setup_type === 'Transfer In' ? '#FEF3C7' : '#EDE9FE', color: c.setup_type === 'Transfer In' ? '#92400E' : '#4C1D95', fontWeight: 600 }}>
                        {c.setup_type || 'New Setup'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', fontSize: 11, color: 'var(--text-3)' }}>{c.stage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Avg days per stage */}
        <div className="card" style={{ padding: '1.25rem' }}>
          <SectionTitle>Average days per stage</SectionTitle>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: '1rem' }}>Based on completed stage transitions. 🟡 over 14 days · 🔴 over 30 days</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 10 }}>
            {STAGES.map(stage => {
              const avg     = stats.avgDaysPerStage[stage]
              const m       = STAGE_META[stage]
              const warn    = avg !== null && avg > 14
              const urgent  = avg !== null && avg > 30
              return (
                <div key={stage} style={{ background: urgent ? '#FEF2F2' : warn ? '#FFFBEB' : 'var(--surface2)', border: `1px solid ${urgent ? '#FCA5A5' : warn ? '#FDE68A' : 'var(--border)'}`, borderRadius: 10, padding: '12px 14px', borderTop: `3px solid ${m.color}` }}>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginBottom: 6 }}>{stage}</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: urgent ? '#DC2626' : warn ? '#92400E' : 'var(--text)' }}>
                    {avg !== null ? `${avg}d` : '—'}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2 }}>
                    {avg === null ? 'No data yet' : 'avg per client'}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
