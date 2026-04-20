import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useAdvisors(type = null) {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('advisors')
      .select(`
        *,
        advisor_clients(
          id, notes, is_current, linked_at,
          client:clients(id, name, entity_type, stage)
        )
      `)
      .order('full_name')
    if (type) q = q.eq('advisor_type', type)
    const { data } = await q
    setAdvisors(data || [])
    setLoading(false)
  }, [type])

  useEffect(() => { fetch() }, [fetch])

  return { advisors, loading, refetch: fetch }
}

export function useAdvisor(id) {
  const [advisor, setAdvisor] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('advisors')
      .select(`
        *,
        advisor_clients(
          id, notes, is_current, linked_at,
          client:clients(id, name, entity_type, stage)
        ),
        advisor_advice_log(
          id, date_of_advice, subject, summary, document_url, created_at,
          client:clients(id, name),
          logger:team_members(full_name)
        )
      `)
      .eq('id', id)
      .single()
    setAdvisor(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])
  return { advisor, loading, refetch: fetch }
}

export async function createAdvisor(data) {
  const { data: advisor, error } = await supabase
    .from('advisors')
    .insert(data)
    .select()
    .single()
  return { advisor, error }
}

export async function updateAdvisor(id, data) {
  const { error } = await supabase.from('advisors').update(data).eq('id', id)
  return { error }
}

export async function linkAdvisorToClient(advisorId, clientId, notes = '') {
  const { error } = await supabase
    .from('advisor_clients')
    .upsert({ advisor_id: advisorId, client_id: clientId, notes, is_current: true })
  return { error }
}

export async function unlinkAdvisorFromClient(advisorId, clientId) {
  const { error } = await supabase
    .from('advisor_clients')
    .update({ is_current: false })
    .eq('advisor_id', advisorId)
    .eq('client_id', clientId)
  return { error }
}

export async function logAdvice(data) {
  const { error } = await supabase.from('advisor_advice_log').insert(data)
  return { error }
}

export function useClientAdvisors(clientId) {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!clientId) return
    setLoading(true)
    const { data } = await supabase
      .from('advisor_clients')
      .select(`
        id, notes, is_current, linked_at,
        advisor:advisors(id, full_name, firm_name, email, phone, advisor_type, license_number)
      `)
      .eq('client_id', clientId)
      .order('linked_at', { ascending: false })
    setAdvisors(data || [])
    setLoading(false)
  }, [clientId])

  useEffect(() => { fetch() }, [fetch])
  return { advisors, loading, refetch: fetch }
}
