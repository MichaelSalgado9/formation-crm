import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [sent, setSent] = useState(false)

  async function signIn(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setLoading(false)
    if (error) setError(error.message)
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '1rem'
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 360, padding: '2rem' }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>Formation CRM</div>
          <div style={{ fontSize: 13, color: 'var(--text-3)' }}>Sign in to your team account</div>
        </div>

        <form onSubmit={signIn} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>EMAIL</label>
            <input
              type="email" required
              value={email} onChange={e => setEmail(e.target.value)}
              style={{ width: '100%' }}
              placeholder="you@practice.co.za"
            />
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 500, color: 'var(--text-3)', display: 'block', marginBottom: 4 }}>PASSWORD</label>
            <input
              type="password" required
              value={password} onChange={e => setPassword(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
          {error && <p style={{ fontSize: 12, color: '#DC2626' }}>{error}</p>}
          <button type="submit" className="btn btn-primary" disabled={loading} style={{ width: '100%', justifyContent: 'center', marginTop: 4 }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
