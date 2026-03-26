import { createClient } from '@supabase/supabase-js'
import { getBpmFromSampleRate } from '@/services/bpmService'
import { getClipEnd, ticksToSamples } from '@/utils/timeUtils'

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

function resolveLocationOrigin() {
  if (typeof window === 'undefined' || !window.location?.origin) {
    return ''
  }

  return window.location.origin
}

function normalizeBasePath(basePath) {
  if (typeof basePath !== 'string') {
    return '/'
  }

  const trimmedBasePath = basePath.trim()

  if (!trimmedBasePath) {
    return '/'
  }

  const withoutLeadingSlash = trimmedBasePath.replace(/^\/+/, '')
  const withoutEdgeSlashes = withoutLeadingSlash.replace(/\/+$/, '')

  if (!withoutEdgeSlashes) {
    return '/'
  }

  return `/${withoutEdgeSlashes}/`
}

function isNotFoundError(error) {
  return error?.code === 'PGRST116' || error?.status === 406
}

export function isSharedProjectConfigured() {
  return Boolean(getSupabaseClient())
}

export function createSharedProjectUrl(
  snapshotId,
  locationOrigin = resolveLocationOrigin(),
  basePath = import.meta.env.BASE_URL
) {
  const normalizedSnapshotId = normalizeSharedProjectId(snapshotId)

  if (!normalizedSnapshotId) {
    throw new Error('Missing shared snapshot id.')
  }

  if (!locationOrigin) {
    throw new Error('Could not resolve location origin.')
  }

  const normalizedOrigin = String(locationOrigin).replace(/\/+$/, '')
  const normalizedBasePath = normalizeBasePath(basePath)

  return `${normalizedOrigin}${normalizedBasePath}#/app/p/${normalizedSnapshotId}`
}

function normalizePositiveNumber(value) {
  const normalizedValue = Number(value)
  return Number.isFinite(normalizedValue) && normalizedValue > 0 ? normalizedValue : null
}

function getTrackCollectionDurationTicks(trackCollection = []) {
  let maxEnd = 0

  for (const track of trackCollection) {
    for (const clip of track?.clips ?? []) {
      maxEnd = Math.max(maxEnd, getClipEnd(clip))
    }
  }

  return maxEnd
}

function getAutomationDurationTicks(automationLanes = []) {
  let maxTime = 0

  for (const lane of automationLanes) {
    for (const point of lane?.points ?? []) {
      const pointTime = Number(point?.time)

      if (Number.isFinite(pointTime)) {
        maxTime = Math.max(maxTime, pointTime)
      }
    }
  }

  return maxTime
}

function formatDurationTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) {
    return null
  }

  const totalMilliseconds = Math.floor(seconds * 1000)
  const minutes = Math.floor(totalMilliseconds / 60000)
  const remainingMilliseconds = totalMilliseconds % 60000
  const wholeSeconds = Math.floor(remainingMilliseconds / 1000)
  const milliseconds = remainingMilliseconds % 1000

  return `${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}:${String(milliseconds).padStart(3, '0')}`
}

function buildSharedProjectMetadata(snapshot = {}) {
  const sampleRate = normalizePositiveNumber(snapshot.sampleRate)
  const bpm = normalizePositiveNumber(getBpmFromSampleRate(sampleRate, snapshot.bpmMeasure))
  const loopEnd = Math.max(0, Number(snapshot.loopEnd) || 0)
  const contentDurationTicks = Math.max(
    getTrackCollectionDurationTicks(snapshot.tracks),
    getTrackCollectionDurationTicks(snapshot.variableTracks),
    getTrackCollectionDurationTicks(snapshot.valueTrackerTracks),
    getAutomationDurationTicks(snapshot.automationLanes)
  )
  const durationTicks = Math.max(loopEnd, contentDurationTicks)
  const durationSeconds = sampleRate
    ? normalizePositiveNumber(ticksToSamples(durationTicks, snapshot.tickSize) / sampleRate)
    : null

  return {
    bpm,
    hz: sampleRate,
    durationSeconds,
    durationTime: durationSeconds ? formatDurationTime(durationSeconds) : null,
    projectDescription: typeof snapshot.projectDescription === 'string' ? snapshot.projectDescription.trim() : null,
    projectAuthor: typeof snapshot.projectAuthor === 'string' ? snapshot.projectAuthor.trim() : null
  }
}

export async function createSharedProjectSnapshot(snapshot, name = '') {
  const client = requireSupabaseClient()

  const normalizedName = typeof name === 'string' ? name.trim() : ''
  const metadata = buildSharedProjectMetadata(snapshot)

  const { data, error } = await client
    .from('projects')
    .insert({
      data: snapshot,
      name: normalizedName || null,
      projectDescription: metadata.projectDescription || null,
      projectAuthor: metadata.projectAuthor || null,
      tempoBpm: metadata.bpm,
      sampleRateHz: metadata.hz,
      durationSeconds: metadata.durationSeconds,
      durationTime: metadata.durationTime
    })
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
