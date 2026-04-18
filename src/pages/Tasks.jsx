import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { updateTask } from '../hooks/useClients'
import { PriorityDot } from '../components/UI'
import { format, isPast, isToday } from 'date-fns'

export default function Tasks() {
  const navigate = useNavigate()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('open')

  async function fetch() {
    setLoading(true)
    let q = supabase
      .from('tasks')
      .select('*, client:clients(id, name), assigned_member:team_members(full_name)')
      .order('due_date', { ascending: true, nullsLast: true })

    if (filter === 'open') q = q.in('status', ['Open', 'In Progress'])
    if (filter === 'done') q = q.eq('status', 'Done')

    const { data } = await q
    setTasks(data || [])
    setLoading(false)
  }

  useEffect(() => { fetch() }, [filter])

  async function toggle(task) {
    await updateTask(task.id, { status: task.status === 'Done' ? 'Open' : 'Done' })
    fetch()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{
        padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)',
        background: 'var(--surface)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12
      }}>
        <h1 style={{ fontSize: 17, fontWeight: 600 }}>Tasks</h1>
        <div style={{ display: 'flex', gap: 4 }}>
          {['open', 'done', 'all'].map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className="btn btn-ghost"
              style={{
                background: filter === f ? 'var(--accent)' : '',
                color: filter === f ? '#fff' : '',
                borderColor: filter === f ? 'var(--accent)' : '',
                textTransform: 'capitalize'
              }}
            >{f}</button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '1.25rem 1.5rem' }}>
        <div className="card" style={{ overflow: 'hidden' }}>
          {loading && <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-3)' }}>Loading…</div>}
          {!loading && tasks.length === 0 && (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)' }}>No tasks.</div>
          )}
          {tasks.map((task, i) => {
            const overdue = task.due_date && isPast(new Date(task.due_date)) && task.status !== 'Done'
            const dueToday = task.due_date && isToday(new Date(task.due_date))
            return (
              <div
                key={task.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 16px',
                  borderBottom: i < tasks.length - 1 ? '1px solid var(--border)' : 'none',
                  background: overdue ? '#FFF7F7' : '',
                  opacity: task.status === 'Done' ? .5 : 1,
                }}
              >
                <input
                  type="checkbox"
                  checked={task.status === 'Done'}
                  onChange={() => toggle(task)}
                  style={{ width: 16, height: 16, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 500, textDecoration: task.status === 'Done' ? 'line-through' : 'none' }}>
                    {task.title}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 2, display: 'flex', gap: 8 }}>
                    {task.client && (
                      <button
                        onClick={() => navigate(`/clients/${task.client.id}`)}
                        style={{ color: 'var(--accent)', fontSize: 11, fontWeight: 500 }}
                      >
                        {task.client.name}
                      </button>
                    )}
                    {task.assigned_member && <span>{task.assigned_member.full_name}</span>}
                  </div>
                </div>
                <PriorityDot priority={task.priority} />
                {task.due_date && (
                  <span style={{
                    fontSize: 11, padding: '2px 8px', borderRadius: 20,
                    background: overdue ? '#FEE2E2' : dueToday ? '#FEF3C7' : 'var(--surface2)',
                    color: overdue ? '#991B1B' : dueToday ? '#92400E' : 'var(--text-3)',
                    whiteSpace: 'nowrap', fontWeight: 500
                  }}>
                    {overdue ? 'Overdue · ' : dueToday ? 'Today · ' : ''}
                    {format(new Date(task.due_date), 'dd MMM')}
                  </span>
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
