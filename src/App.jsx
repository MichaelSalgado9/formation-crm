import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { supabase } from './lib/supabase'
import Layout from './components/Layout'
import Login from './pages/Login'
import Pipeline from './pages/Pipeline'
import Clients from './pages/Clients'
import ClientDetail from './pages/ClientDetail'
import Tasks from './pages/Tasks'
import Reports from './pages/Reports'
import AdvisorsPage from './pages/AdvisorsPage'
import AdvisorDetail from './pages/AdvisorDetail'
import Advisors from './pages/Advisors'
import AdvisorDetail from './pages/AdvisorDetail'

function RequireAuth({ user, children }) {
  if (!user) return <Navigate to="/login" replace />
  return children
}

export default function App() {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner" />
    </div>
  )

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
        <Route
          path="/*"
          element={
            <RequireAuth user={user}>
              <Layout user={user}>
                <Routes>
                  <Route path="/"                  element={<Pipeline />} />
                  <Route path="/clients"           element={<Clients />} />
                  <Route path="/clients/:id"       element={<ClientDetail />} />
                  <Route path="/tasks"             element={<Tasks />} />
                  <Route path="/reports"           element={<Reports />} />
                  <Route path="/advisors/investment"  element={<AdvisorsPage type="Investment" />} />
                  <Route path="/advisors/tax"         element={<AdvisorsPage type="Tax" />} />
                  <Route path="/advisors/:type/:id"   element={<AdvisorDetail />} />
                  <Route path="/investment-advisors"     element={<Advisors advisorType="Investment" />} />
                  <Route path="/investment-advisors/:id" element={<AdvisorDetail advisorType="Investment" />} />
                  <Route path="/tax-advisors"            element={<Advisors advisorType="Tax" />} />
                  <Route path="/tax-advisors/:id"        element={<AdvisorDetail advisorType="Tax" />} />
                </Routes>
              </Layout>
            </RequireAuth>
          }
        />
      </Routes>
    </BrowserRouter>
  )
}
