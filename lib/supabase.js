import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export const STAGES = [
  'Lead / PNC',
  'WIP',
  'Ongoing Management',
]

export const ALL_STAGES = [
  'Lead / PNC',
  'WIP',
  'Ongoing Management',
  'Long Term',
  'Lost',
]

export const STAGE_META = {
  'Lead / PNC':         { color: '#3B82F6', bg: '#EFF6FF', text: '#1D4ED8' },
  'WIP':                { color: '#F59E0B', bg: '#FFFBEB', text: '#92400E' },
  'Ongoing Management': { color: '#10B981', bg: '#ECFDF5', text: '#065F46' },
  'Long Term':          { color: '#8B5CF6', bg: '#F5F3FF', text: '#5B21B6' },
  'Lost':               { color: '#6B7280', bg: '#F9FAFB', text: '#374151' },
}

export const PRIORITY_META = {
  High:   { dot: '#EF4444', label: 'High' },
  Medium: { dot: '#F59E0B', label: 'Medium' },
  Low:    { dot: '#6B7280', label: 'Low' },
}

export const TYPE_META = {
  Trust:   { bg: '#EDE9FE', text: '#4C1D95' },
  Company: { bg: '#D1FAE5', text: '#064E3B' },
  Both:    { bg: '#FEF3C7', text: '#78350F' },
}
