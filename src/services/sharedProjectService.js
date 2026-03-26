import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_KEY =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY

let supabaseClient = null

function getSupabaseClient() {
  if (supabaseClient) {
    return supabaseClient
  }

  if (!SUPABASE_URL || !SUPABASE_KEY) {
    return null
  }

  supabaseClient = createClient(SUPABASE_URL, SUPABASE_KEY)
  return supabaseClient
}

function requireSupabaseClient() {
  const client = getSupabaseClient()

  if (!client) {
    throw new Error('Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY (or VITE_SUPABASE_ANON_KEY).')
  }

  return client
}

function normalizeSharedProjectId(value) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function isNotFoundError(error) {
  return error?.code === 'PGRST116' || error?.status === 406
}

export function isSharedProjectConfigured() {
  return Boolean(getSupabaseClient())
}

export function createSharedProjectUrl(snapshotId, locationOrigin = window?.location?.origin) {
  const normalizedSnapshotId = normalizeSharedProjectId(snapshotId)

  if (!normalizedSnapshotId) {
    throw new Error('Missing shared snapshot id.')
  }

  if (!locationOrigin) {
    throw new Error('Could not resolve location origin.')
  }

  return `${locationOrigin}/#/p/${normalizedSnapshotId}`
}

export async function createSharedProjectSnapshot(snapshot) {
  const client = requireSupabaseClient()

  const { data, error } = await client
    .from('projects')
    .insert({ data: snapshot })
    .select('id')
    .single()

  if (error) {
    throw error
  }

  if (!data?.id) {
    throw new Error('Share snapshot did not return an id.')
  }

  return data.id
}

export async function fetchSharedProjectSnapshot(snapshotId) {
  const normalizedSnapshotId = normalizeSharedProjectId(snapshotId)

  if (!normalizedSnapshotId) {
    return null
  }

  const client = requireSupabaseClient()

  const { data, error } = await client
    .from('projects')
    .select('data')
    .eq('id', normalizedSnapshotId)
    .single()

  if (error) {
    if (isNotFoundError(error)) {
      return null
    }

    throw error
  }

  return data?.data ?? null
}
