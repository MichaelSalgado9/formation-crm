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
        tasks(id, status)
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
    else setClients(data || [])
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
