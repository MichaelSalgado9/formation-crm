import { NavLink, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Avatar } from './UI'

const NAV = [
  { to: '/',         label: 'Pipeline',  icon: '▦' },
  { to: '/clients',  label: 'Clients',   icon: '⊞' },
  { to: '/tasks',    label: 'Tasks',     icon: '✓' },
  { to: '/reports',  label: 'Reports',   icon: '↗' },
]

export default function Layout({ user, children }) {
  const navigate = useNavigate()

  async function signOut() {
    await supabase.auth.signOut()
    navigate('/login')
  }

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
      {/* Sidebar */}
      <aside style={{
        width: 220, flexShrink: 0,
        background: '#1A1917',
        display: 'flex', flexDirection: 'column',
        padding: '0',
        borderRight: '1px solid rgba(255,255,255,0.06)'
      }}>
        {/* Logo */}
        <div style={{
          padding: '1.25rem 1.25rem 1rem',
          borderBottom: '1px solid rgba(255,255,255,0.06)'
        }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: '#fff', letterSpacing: '.3px' }}>
            Formation CRM
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', marginTop: 2 }}>
            Trust &amp; Company
          </div>
        </div>

        {/* Nav */}
        <nav style={{ flex: 1, padding: '0.75rem 0.75rem' }}>
          {NAV.map(({ to, label, icon }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 12px',
                borderRadius: 8,
                marginBottom: 2,
                fontSize: 13,
                fontWeight: 500,
                color: isActive ? '#fff' : 'rgba(255,255,255,0.5)',
                background: isActive ? 'rgba(255,255,255,0.1)' : 'transparent',
                transition: 'all .15s',
              })}
            >
              <span style={{ fontSize: 14, width: 18, textAlign: 'center' }}>{icon}</span>
              {label}
            </NavLink>
          ))}
        </nav>

        {/* User */}
        {user && (
          <div style={{
            padding: '1rem 1.25rem',
            borderTop: '1px solid rgba(255,255,255,0.06)',
            display: 'flex', alignItems: 'center', gap: 10
          }}>
            <Avatar name={user.email} size={28} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.7)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {user.email}
              </div>
            </div>
            <button
              onClick={signOut}
              title="Sign out"
              style={{ color: 'rgba(255,255,255,0.35)', fontSize: 14, lineHeight: 1 }}
            >
              ⏏
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <main style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column' }}>
        {children}
      </main>
    </div>
  )
}
