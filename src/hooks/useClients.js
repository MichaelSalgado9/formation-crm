import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'

export function useClients(filters = {}) {
  const [clients, setClients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('clients')
      .select(`
        *,
        assigned_member:team_members(id, full_name, avatar_url),
        documents(id, status),
        tasks(id, status),
        stage_history(stage, entered_at, exited_at)
      `)
      .eq('is_archived', false)
      .order('created_at', { ascending: false })

    if (filters.stage)         q = q.eq('stage', filters.stage)
    if (filters.entity_type)   q = q.eq('entity_type', filters.entity_type)
    if (filters.priority)      q = q.eq('priority', filters.priority)
    if (filters.assigned_to)   q = q.eq('assigned_to', filters.assigned_to)
    if (filters.search)        q = q.ilike('name', `%${filters.search}%`)

    const { data, error } = await q
    if (error) setError(error)
    else {
      // attach current stage entered_at to each client for easy access
      const enriched = (data || []).map(c => ({
        ...c,
        stage_entered_at: (c.stage_history || [])
          .filter(h => h.stage === c.stage && !h.exited_at)
          .map(h => h.entered_at)[0] || c.created_at
      }))
      setClients(enriched)
    }
    setLoading(false)
  }, [JSON.stringify(filters)])

  useEffect(() => { fetch() }, [fetch])

  // Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel('clients-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'clients' }, fetch)
      .subscribe()
    return () => supabase.removeChannel(channel)
  }, [fetch])

  return { clients, loading, error, refetch: fetch }
}

export function useClient(id) {
  const [client, setClient] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    if (!id) return
    setLoading(true)
    const { data } = await supabase
      .from('clients')
      .select(`
        *,
        assigned_member:team_members(id, full_name, avatar_url),
        documents(*),
        notes(*, author:team_members(full_name)),
        tasks(*, assigned_member:team_members(full_name)),
        stage_history(*, moved_by_member:team_members(full_name))
      `)
      .eq('id', id)
      .single()
    setClient(data)
    setLoading(false)
  }, [id])

  useEffect(() => { fetch() }, [fetch])

  return { client, loading, refetch: fetch }
}

export async function updateClientStage(clientId, newStage) {
  const { error } = await supabase
    .from('clients')
    .update({ stage: newStage })
    .eq('id', clientId)
  return { error }
}

export async function createClient(data) {
  const { data: client, error } = await supabase
    .from('clients')
    .insert(data)
    .select()
    .single()
  return { client, error }
}

export async function updateClient(id, data) {
  const { error } = await supabase
    .from('clients')
    .update(data)
    .eq('id', id)
  return { error }
}

export async function addNote(clientId, content, authorId) {
  const { error } = await supabase
    .from('notes')
    .insert({ client_id: clientId, content, author_id: authorId })
  if (!error) {
    await supabase.from('activity_log').insert({
      client_id: clientId,
      actor_id: authorId,
      action: 'note_added',
      metadata: { preview: content.slice(0, 80) }
    })
  }
  return { error }
}

export async function updateDocStatus(docId, status, verifiedBy = null) {
  const update = { status }
  if (status === 'Verified') {
    update.verified_by = verifiedBy
    update.verified_at = new Date().toISOString()
  }
  const { error } = await supabase
    .from('documents')
    .update(update)
    .eq('id', docId)
  return { error }
}

export async function createTask(data) {
  const { error } = await supabase.from('tasks').insert(data)
  return { error }
}

export async function updateTask(id, data) {
  const update = { ...data }
  if (data.status === 'Done') update.completed_at = new Date().toISOString()
  const { error } = await supabase.from('tasks').update(update).eq('id', id)
  return { error }
}

export function useTeamMembers() {
  const [members, setMembers] = useState([])
  useEffect(() => {
    supabase.from('team_members').select('*').then(({ data }) => setMembers(data || []))
  }, [])
  return members
}

export function useActivityLog(clientId) {
  const [log, setLog] = useState([])
  useEffect(() => {
    if (!clientId) return
    supabase
      .from('activity_log')
      .select('*, actor:team_members(full_name)')
      .eq('client_id', clientId)
      .order('created_at', { ascending: false })
      .limit(30)
      .then(({ data }) => setLog(data || []))
  }, [clientId])
  return log
}

// ============================================================
// ADVISORS
// ============================================================

export function useAdvisors(type) {
  const [advisors, setAdvisors] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    setLoading(true)
    let q = supabase
      .from('advisors')
      .select(`*, client_advisors(client_id, notes, clients(id, name, entity_type))`)
      .eq('is_active', true)
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
        client_advisors(*, client:clients(id, name, entity_type, stage)),
        advisor_history(*, author:team_members(full_name)),
        advisor_documents(*)
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
    .from('advisors').insert(data).select().single()
  return { advisor, error }
}

export async function updateAdvisor(id, data) {
  const { error } = await supabase.from('advisors').update(data).eq('id', id)
  return { error }
}

export async function linkAdvisorToClient(advisorId, clientId, advisorType, notes = '') {
  const { error } = await supabase.from('client_advisors').upsert({
    advisor_id: advisorId, client_id: clientId, advisor_type: advisorType, notes
  })
  return { error }
}

export async function unlinkAdvisorFromClient(advisorId, clientId) {
  const { error } = await supabase.from('client_advisors')
    .delete().eq('advisor_id', advisorId).eq('client_id', clientId)
  return { error }
}

export async function addAdvisorHistory(advisorId, clientId, summary, authorId) {
  const { error } = await supabase.from('advisor_history').insert({
    advisor_id: advisorId, client_id: clientId || null, summary, author_id: authorId,
    date: new Date().toISOString().slice(0, 10)
  })
  return { error }
}

export function useClientAdvisors(clientId) {
  const [linkedAdvisors, setLinkedAdvisors] = useState([])
  const fetch = useCallback(async () => {
    if (!clientId) return
    const { data } = await supabase
      .from('client_advisors')
      .select('*, advisor:advisors(*)')
      .eq('client_id', clientId)
    setLinkedAdvisors(data || [])
  }, [clientId])
  useEffect(() => { fetch() }, [fetch])
  return { linkedAdvisors, refetch: fetch }
}
