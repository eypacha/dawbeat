import { reactive } from 'vue'
import { getAutomationLaneConfig, resolveAutomationLaneValueAtTime } from '@/services/automationService'
import { enqueueSnackbar } from '@/services/notifications'

const COMPANION_MODE = 'automation-companion'
const COMPANION_MODE_PARAM = 'mode'
const HOST_PEER_ID_PARAM = 'hostPeerId'
const LANE_ID_PARAM = 'laneId'
const COMPANION_SESSION_STORAGE_KEY = 'dawbeat-automation-companion-session'
const LOOPBACK_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1'])

export const automationCompanionModalState = reactive({
  laneId: null,
  open: false
})

export const automationCompanionHostState = reactive({
  controllers: [],
  error: '',
  hostPeerId: '',
  status: 'idle'
})

export const automationCompanionClientState = reactive({
  connected: false,
  controllerId: '',
  error: '',
  hostPeerId: '',
  lanes: [],
  status: 'idle'
})

let hostStore = null
let hostPeer = null
let hostPeerReadyPromise = null
let clientPeer = null
let clientConnection = null
let peerModulePromise = null

const hostControllersById = new Map()
const hostControllerByConnectionPeerId = new Map()
const activeRemoteInteractionKeys = new Set()

export function isAutomationCompanionMode(locationHref = getCurrentLocationHref()) {
  const locationUrl = safeCreateUrl(locationHref)
  return locationUrl?.searchParams.get(COMPANION_MODE_PARAM) === COMPANION_MODE
}

export function openAutomationCompanionModal(laneId) {
  automationCompanionModalState.laneId = typeof laneId === 'string' && laneId ? laneId : null
  automationCompanionModalState.open = Boolean(automationCompanionModalState.laneId)

  if (automationCompanionModalState.open) {
    void ensureAutomationCompanionHost().catch((error) => {
      automationCompanionHostState.error = normalizePeerErrorMessage(error)
      automationCompanionHostState.status = 'error'
    })
  }
}

export function closeAutomationCompanionModal() {
  automationCompanionModalState.laneId = null
  automationCompanionModalState.open = false
}

export function installAutomationCompanionHost(dawStore) {
  hostStore = dawStore
}

export async function ensureAutomationCompanionHost() {
  if (hostPeer?.open && hostPeer.id) {
    automationCompanionHostState.error = ''
    automationCompanionHostState.hostPeerId = hostPeer.id
    automationCompanionHostState.status = 'ready'
    return hostPeer.id
  }

  if (hostPeerReadyPromise) {
    return hostPeerReadyPromise
  }

  if (!hostStore) {
    throw new Error('Automation companion host is not installed.')
  }

  automationCompanionHostState.error = ''
  automationCompanionHostState.status = 'starting'

  hostPeerReadyPromise = createAutomationCompanionHost()

  try {
    return await hostPeerReadyPromise
  } finally {
    hostPeerReadyPromise = null
  }
}

export function disposeAutomationCompanionHost() {
  for (const controller of [...hostControllersById.values()]) {
    cleanupHostController(controller, {
      closeConnection: true
    })
  }

  hostControllersById.clear()
  hostControllerByConnectionPeerId.clear()
  activeRemoteInteractionKeys.clear()

  if (hostPeer) {
    hostPeer.destroy()
    hostPeer = null
  }

  hostStore = null

  automationCompanionHostState.controllers = []
  automationCompanionHostState.error = ''
  automationCompanionHostState.hostPeerId = ''
  automationCompanionHostState.status = 'idle'
}

export function getAutomationCompanionShareUrl(laneId, locationHref = getCurrentLocationHref()) {
  if (!automationCompanionHostState.hostPeerId || typeof laneId !== 'string' || !laneId) {
    return ''
  }

  const locationUrl = safeCreateUrl(locationHref)

  if (!locationUrl) {
    return ''
  }

  locationUrl.searchParams.set(COMPANION_MODE_PARAM, COMPANION_MODE)
  locationUrl.searchParams.set(HOST_PEER_ID_PARAM, automationCompanionHostState.hostPeerId)
  locationUrl.searchParams.set(LANE_ID_PARAM, laneId)
  locationUrl.hash = ''

  return locationUrl.toString()
}

export function isAutomationCompanionShareUrlLoopback(locationHref = getCurrentLocationHref()) {
  const locationUrl = safeCreateUrl(locationHref)
  return LOOPBACK_HOSTNAMES.has(locationUrl?.hostname ?? '')
}

export function getAutomationCompanionLaneControllerCount(laneId) {
  if (typeof laneId !== 'string' || !laneId) {
    return 0
  }

  return automationCompanionHostState.controllers.filter((controller) =>
    Array.isArray(controller.laneIds) && controller.laneIds.includes(laneId)
  ).length
}

export function isAutomationCompanionLaneControlled(laneId) {
  return getAutomationCompanionLaneControllerCount(laneId) > 0
}

export function syncAutomationCompanionHostControllersFromStore() {
  for (const controller of hostControllersById.values()) {
    sendAutomationCompanionControllerState(controller)
  }

  syncAutomationCompanionHostControllers()
}

export async function initializeAutomationCompanionClient() {
  const controllerSession = consumeAutomationCompanionSessionFromLocation()

  automationCompanionClientState.connected = false
  automationCompanionClientState.controllerId = controllerSession?.controllerId ?? ''
  automationCompanionClientState.error = ''
  automationCompanionClientState.hostPeerId = controllerSession?.hostPeerId ?? ''
  automationCompanionClientState.lanes = (controllerSession?.laneIds ?? []).map((laneId) =>
    createAutomationCompanionLaneState({
      laneId
    })
  )

  if (!controllerSession?.hostPeerId) {
    automationCompanionClientState.status = 'error'
    automationCompanionClientState.error = 'Scan a DawBeat automation QR to connect this controller.'
    return
  }

  try {
    await connectAutomationCompanionClient(controllerSession)
  } catch {
    // State is already updated by the connection handlers.
  }
}

export function disposeAutomationCompanionClient() {
  if (clientConnection) {
    clientConnection.close()
    clientConnection = null
  }

  if (clientPeer) {
    clientPeer.destroy()
    clientPeer = null
  }

  automationCompanionClientState.connected = false

  if (automationCompanionClientState.status !== 'error') {
    automationCompanionClientState.status = 'idle'
  }
}

export async function reconnectAutomationCompanionClient() {
  await initializeAutomationCompanionClient()
}

export function beginAutomationCompanionLaneGesture(laneId) {
  sendAutomationCompanionClientMessage({
    laneId,
    type: 'automation:gesture-start'
  })
}

export function setAutomationCompanionLaneValue(laneId, value) {
  const normalizedValue = Number(value)

  if (!Number.isFinite(normalizedValue)) {
    return
  }

  const laneIndex = automationCompanionClientState.lanes.findIndex((lane) => lane.laneId === laneId)

  if (laneIndex >= 0) {
    automationCompanionClientState.lanes = automationCompanionClientState.lanes.map((lane, index) =>
      index === laneIndex
        ? {
            ...lane,
            value: normalizedValue
          }
        : lane
    )
  }

  sendAutomationCompanionClientMessage({
    laneId,
    type: 'automation:set-value',
    value: normalizedValue
  })
}

export function endAutomationCompanionLaneGesture(laneId) {
  sendAutomationCompanionClientMessage({
    laneId,
    type: 'automation:gesture-end'
  })
}

export function removeAutomationCompanionLane(laneId) {
  const controllerSession = readAutomationCompanionSession()

  if (!controllerSession) {
    return
  }

  const nextSession = {
    ...controllerSession,
    laneIds: controllerSession.laneIds.filter((entry) => entry !== laneId)
  }

  writeAutomationCompanionSession(nextSession)
  automationCompanionClientState.lanes = automationCompanionClientState.lanes.filter((lane) => lane.laneId !== laneId)

  sendAutomationCompanionClientMessage({
    laneId,
    type: 'controller:unsubscribe'
  })
}

export function clearAutomationCompanionSession() {
  removeAutomationCompanionSession()
  disposeAutomationCompanionClient()
  automationCompanionClientState.connected = false
  automationCompanionClientState.controllerId = ''
  automationCompanionClientState.error = ''
  automationCompanionClientState.hostPeerId = ''
  automationCompanionClientState.lanes = []
  automationCompanionClientState.status = 'idle'
}

async function createAutomationCompanionHost() {
  const Peer = await loadPeerConstructor()
  const nextHostPeer = new Peer()

  hostPeer = nextHostPeer

  nextHostPeer.on('connection', handleAutomationCompanionHostConnection)
  nextHostPeer.on('close', () => {
    hostControllersById.clear()
    hostControllerByConnectionPeerId.clear()
    activeRemoteInteractionKeys.clear()
    automationCompanionHostState.controllers = []
    automationCompanionHostState.hostPeerId = ''
    automationCompanionHostState.status = 'idle'
  })
  nextHostPeer.on('disconnected', () => {
    automationCompanionHostState.error = 'PeerJS host disconnected.'
    automationCompanionHostState.status = 'error'
  })
  nextHostPeer.on('error', (error) => {
    const message = normalizePeerErrorMessage(error)
    automationCompanionHostState.error = message
    automationCompanionHostState.status = 'error'
    enqueueSnackbar(message, {
      duration: 4200,
      variant: 'error'
    })
  })

  return await new Promise((resolve, reject) => {
    nextHostPeer.on('open', (peerId) => {
      automationCompanionHostState.error = ''
      automationCompanionHostState.hostPeerId = peerId
      automationCompanionHostState.status = 'ready'
      resolve(peerId)
    })

    nextHostPeer.on('error', (error) => {
      reject(error)
    })
  })
}

function handleAutomationCompanionHostConnection(connection) {
  connection.on('data', (message) => {
    handleAutomationCompanionHostMessage(connection, message)
  })

  connection.on('close', () => {
    const controller = hostControllerByConnectionPeerId.get(connection.peer)

    if (controller) {
      cleanupHostController(controller)
    }
  })

  connection.on('error', () => {
    const controller = hostControllerByConnectionPeerId.get(connection.peer)

    if (controller) {
      cleanupHostController(controller)
    }
  })
}

function handleAutomationCompanionHostMessage(connection, message) {
  if (!isRecord(message) || typeof message.type !== 'string') {
    return
  }

  if (message.type === 'controller:hello') {
    const controller = registerHostController(connection, message)

    if (controller) {
      sendAutomationCompanionControllerState(controller)
    }

    return
  }

  const controller = hostControllerByConnectionPeerId.get(connection.peer)

  if (!controller) {
    return
  }

  if (message.type === 'controller:subscribe') {
    updateHostControllerSubscriptions(controller, [...controller.laneIds, message.laneId])
    sendAutomationCompanionControllerState(controller)
    return
  }

  if (message.type === 'controller:unsubscribe') {
    hostStore?.clearAutomationLiveOverride(message.laneId)
    endHostRemoteInteraction(controller, message.laneId)
    updateHostControllerSubscriptions(
      controller,
      [...controller.laneIds].filter((laneId) => laneId !== message.laneId)
    )
    sendAutomationCompanionControllerState(controller)
    return
  }

  if (!isHostControllerLaneAllowed(controller, message.laneId)) {
    return
  }

  if (message.type === 'automation:gesture-start') {
    beginHostRemoteInteraction(controller, message.laneId)
    return
  }

  if (message.type === 'automation:gesture-end') {
    endHostRemoteInteraction(controller, message.laneId)
    return
  }

  if (message.type === 'automation:set-value') {
    handleHostAutomationLaneValueMessage(controller, message)
  }
}

function registerHostController(connection, message) {
  const controllerId = normalizeNonEmptyString(message.controllerId) || `controller:${connection.peer}`
  const existingController = hostControllersById.get(controllerId)

  if (existingController && existingController.connection !== connection) {
    cleanupHostController(existingController, {
      closeConnection: true
    })
  }

  const controller = {
    connection,
    controllerId,
    laneIds: new Set(),
    peerId: connection.peer
  }

  hostControllersById.set(controllerId, controller)
  hostControllerByConnectionPeerId.set(connection.peer, controller)
  updateHostControllerSubscriptions(controller, message.laneIds)
  syncAutomationCompanionHostControllers()
  return controller
}

function updateHostControllerSubscriptions(controller, laneIds) {
  const { laneIds: validLaneIds } = partitionAutomationLaneIds(laneIds)
  controller.laneIds = new Set(validLaneIds)
  syncAutomationCompanionHostControllers()
}

function sendAutomationCompanionControllerState(controller) {
  if (!controller?.connection?.open) {
    return
  }

  const subscribedLaneIds = [...controller.laneIds]
  const { laneIds, missingLaneIds } = partitionAutomationLaneIds(subscribedLaneIds)
  controller.laneIds = new Set(laneIds)

  controller.connection.send({
    controllerId: controller.controllerId,
    hostPeerId: automationCompanionHostState.hostPeerId,
    lanes: laneIds.map((laneId) => getHostAutomationLanePayload(laneId)).filter(Boolean),
    missingLaneIds,
    type: 'controller:state'
  })

  syncAutomationCompanionHostControllers()
}

function getHostAutomationLanePayload(laneId) {
  const lane = hostStore?.getAutomationLaneById(laneId)

  if (!lane) {
    return null
  }

  const laneConfig = getAutomationLaneConfig(lane)

  return {
    label: laneConfig?.label ?? laneId,
    laneId,
    max: laneConfig?.max ?? 1,
    min: laneConfig?.min ?? 0,
    value:
      typeof hostStore?.getAutomationValueAt === 'function'
        ? hostStore.getAutomationValueAt(hostStore?.time ?? 0, laneId)
        : resolveAutomationLaneValueAtTime(hostStore?.time ?? 0, lane, laneConfig?.min ?? 0)
  }
}

function handleHostAutomationLaneValueMessage(controller, message) {
  if (!hostStore) {
    return
  }

  const normalizedValue = Number(message.value)

  if (!Number.isFinite(normalizedValue)) {
    return
  }

  const lane = hostStore.getAutomationLaneById(message.laneId)

  if (!lane) {
    updateHostControllerSubscriptions(
      controller,
      [...controller.laneIds].filter((laneId) => laneId !== message.laneId)
    )
    sendAutomationCompanionControllerState(controller)
    return
  }

  if (hostStore.automationRecordingArmed) {
    hostStore.clearAutomationLiveOverride(message.laneId)
    hostStore.setAutomationLaneValueAtTime(message.laneId, hostStore.time, normalizedValue)
    return
  }

  hostStore.setAutomationLiveOverride(message.laneId, normalizedValue)
}

function beginHostRemoteInteraction(controller, laneId) {
  if (!hostStore?.automationRecordingArmed) {
    return
  }

  const interactionKey = getRemoteInteractionKey(controller.controllerId, laneId)

  if (activeRemoteInteractionKeys.has(interactionKey)) {
    return
  }

  if (!activeRemoteInteractionKeys.size) {
    hostStore?.beginHistoryTransaction('remote-automation')
  }

  activeRemoteInteractionKeys.add(interactionKey)
}

function endHostRemoteInteraction(controller, laneId) {
  if (!hostStore?.automationRecordingArmed) {
    return
  }

  const interactionKey = getRemoteInteractionKey(controller.controllerId, laneId)

  if (!activeRemoteInteractionKeys.has(interactionKey)) {
    return
  }

  activeRemoteInteractionKeys.delete(interactionKey)

  if (!activeRemoteInteractionKeys.size) {
    hostStore?.commitHistoryTransaction()
  }
}

function cleanupHostController(controller, options = {}) {
  if (!controller) {
    return
  }

  for (const laneId of controller.laneIds) {
    hostStore?.clearAutomationLiveOverride(laneId)
    endHostRemoteInteraction(controller, laneId)
  }

  hostControllersById.delete(controller.controllerId)
  hostControllerByConnectionPeerId.delete(controller.peerId)

  if (options.closeConnection && controller.connection?.open) {
    controller.connection.close()
  }

  syncAutomationCompanionHostControllers()
}

function syncAutomationCompanionHostControllers() {
  automationCompanionHostState.controllers = [...hostControllersById.values()].map((controller) => ({
    controllerId: controller.controllerId,
    laneIds: [...controller.laneIds]
  }))

  if (!automationCompanionHostState.controllers.length) {
    hostStore?.setAutomationRecordingArmed(false)
  }
}

async function connectAutomationCompanionClient(controllerSession) {
  disposeAutomationCompanionClient()
  automationCompanionClientState.connected = false
  automationCompanionClientState.error = ''
  automationCompanionClientState.hostPeerId = controllerSession.hostPeerId
  automationCompanionClientState.status = 'connecting'

  const Peer = await loadPeerConstructor()
  const nextClientPeer = new Peer()

  clientPeer = nextClientPeer

  return await new Promise((resolve, reject) => {
    nextClientPeer.on('open', () => {
      const nextConnection = nextClientPeer.connect(controllerSession.hostPeerId)

      clientConnection = nextConnection
      attachAutomationCompanionClientConnectionHandlers(nextConnection, controllerSession, resolve, reject)
    })

    nextClientPeer.on('error', (error) => {
      const message = normalizePeerErrorMessage(error)
      automationCompanionClientState.connected = false
      automationCompanionClientState.error = message
      automationCompanionClientState.status = 'error'
      reject(error)
    })
  })
}

function attachAutomationCompanionClientConnectionHandlers(connection, controllerSession, resolve, reject) {
  connection.on('open', () => {
    automationCompanionClientState.connected = true
    automationCompanionClientState.status = 'connected'
    automationCompanionClientState.error = ''

    connection.send({
      controllerId: controllerSession.controllerId,
      laneIds: controllerSession.laneIds,
      type: 'controller:hello'
    })

    resolve(connection)
  })

  connection.on('data', (message) => {
    handleAutomationCompanionClientMessage(message)
  })

  connection.on('close', () => {
    automationCompanionClientState.connected = false

    if (automationCompanionClientState.status !== 'error') {
      automationCompanionClientState.status = 'idle'
    }
  })

  connection.on('error', (error) => {
    const message = normalizePeerErrorMessage(error)
    automationCompanionClientState.connected = false
    automationCompanionClientState.error = message
    automationCompanionClientState.status = 'error'
    reject(error)
  })
}

function handleAutomationCompanionClientMessage(message) {
  if (!isRecord(message) || typeof message.type !== 'string') {
    return
  }

  if (message.type !== 'controller:state') {
    return
  }

  const controllerSession = readAutomationCompanionSession()

  if (!controllerSession) {
    return
  }

  const missingLaneIds = Array.isArray(message.missingLaneIds)
    ? message.missingLaneIds.filter((laneId) => typeof laneId === 'string' && laneId)
    : []
  const nextSession = {
    ...controllerSession,
    hostPeerId: normalizeNonEmptyString(message.hostPeerId) || controllerSession.hostPeerId,
    laneIds: controllerSession.laneIds.filter((laneId) => !missingLaneIds.includes(laneId))
  }

  writeAutomationCompanionSession(nextSession)

  const lanePayloadsById = new Map(
    (Array.isArray(message.lanes) ? message.lanes : [])
      .filter(isRecord)
      .map((lane) => [lane.laneId, lane])
  )

  automationCompanionClientState.controllerId = nextSession.controllerId
  automationCompanionClientState.hostPeerId = nextSession.hostPeerId
  automationCompanionClientState.lanes = nextSession.laneIds.map((laneId) =>
    createAutomationCompanionLaneState(lanePayloadsById.get(laneId) ?? { laneId })
  )
}

function sendAutomationCompanionClientMessage(message) {
  if (!clientConnection?.open || !isRecord(message)) {
    return
  }

  clientConnection.send(message)
}

function createAutomationCompanionLaneState(lane = {}) {
  return {
    available: typeof lane.label === 'string' && lane.label.length > 0,
    label: typeof lane.label === 'string' && lane.label ? lane.label : lane.laneId ?? 'Automation',
    laneId: typeof lane.laneId === 'string' ? lane.laneId : '',
    max: Number.isFinite(Number(lane.max)) ? Number(lane.max) : 1,
    min: Number.isFinite(Number(lane.min)) ? Number(lane.min) : 0,
    value: Number.isFinite(Number(lane.value)) ? Number(lane.value) : 0
  }
}

function consumeAutomationCompanionSessionFromLocation() {
  const routeParams = getAutomationCompanionRouteParams()
  let controllerSession = readAutomationCompanionSession()

  if (!controllerSession) {
    controllerSession = createAutomationCompanionSession()
  }

  if (routeParams.hostPeerId) {
    controllerSession = {
      ...controllerSession,
      hostPeerId: routeParams.hostPeerId,
      laneIds: controllerSession.hostPeerId === routeParams.hostPeerId
        ? controllerSession.laneIds
        : []
    }
  }

  if (routeParams.laneId) {
    controllerSession = {
      ...controllerSession,
      laneIds: [...new Set([...controllerSession.laneIds, routeParams.laneId])]
    }
  }

  writeAutomationCompanionSession(controllerSession)
  stripAutomationCompanionRouteParams()
  return controllerSession
}

function getAutomationCompanionRouteParams(locationHref = getCurrentLocationHref()) {
  const locationUrl = safeCreateUrl(locationHref)

  if (!locationUrl || locationUrl.searchParams.get(COMPANION_MODE_PARAM) !== COMPANION_MODE) {
    return {
      hostPeerId: '',
      laneId: ''
    }
  }

  return {
    hostPeerId: normalizeNonEmptyString(locationUrl.searchParams.get(HOST_PEER_ID_PARAM)),
    laneId: normalizeNonEmptyString(locationUrl.searchParams.get(LANE_ID_PARAM))
  }
}

function stripAutomationCompanionRouteParams() {
  if (typeof window === 'undefined' || typeof window.history?.replaceState !== 'function') {
    return
  }

  const locationUrl = safeCreateUrl(window.location.href)

  if (!locationUrl || locationUrl.searchParams.get(COMPANION_MODE_PARAM) !== COMPANION_MODE) {
    return
  }

  locationUrl.searchParams.delete(HOST_PEER_ID_PARAM)
  locationUrl.searchParams.delete(LANE_ID_PARAM)
  window.history.replaceState({}, '', locationUrl.toString())
}

function readAutomationCompanionSession() {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const rawSession = localStorage.getItem(COMPANION_SESSION_STORAGE_KEY)

  if (!rawSession) {
    return null
  }

  try {
    return normalizeAutomationCompanionSession(JSON.parse(rawSession))
  } catch {
    return null
  }
}

function writeAutomationCompanionSession(session) {
  if (typeof localStorage === 'undefined') {
    return null
  }

  const nextSession = normalizeAutomationCompanionSession(session)

  localStorage.setItem(COMPANION_SESSION_STORAGE_KEY, JSON.stringify(nextSession))
  return nextSession
}

function removeAutomationCompanionSession() {
  if (typeof localStorage === 'undefined') {
    return
  }

  localStorage.removeItem(COMPANION_SESSION_STORAGE_KEY)
}

function createAutomationCompanionSession() {
  return {
    controllerId: createAutomationCompanionControllerId(),
    hostPeerId: '',
    laneIds: []
  }
}

function normalizeAutomationCompanionSession(session = {}) {
  const laneIds = Array.isArray(session.laneIds)
    ? [...new Set(session.laneIds.filter((laneId) => typeof laneId === 'string' && laneId))]
    : []

  return {
    controllerId: normalizeNonEmptyString(session.controllerId) || createAutomationCompanionControllerId(),
    hostPeerId: normalizeNonEmptyString(session.hostPeerId) || '',
    laneIds
  }
}

function partitionAutomationLaneIds(laneIds) {
  const normalizedLaneIds = Array.isArray(laneIds)
    ? [...new Set(laneIds.filter((laneId) => typeof laneId === 'string' && laneId))]
    : []

  return normalizedLaneIds.reduce(
    (result, laneId) => {
      if (hostStore?.getAutomationLaneById(laneId)) {
        result.laneIds.push(laneId)
      } else {
        result.missingLaneIds.push(laneId)
      }

      return result
    },
    {
      laneIds: [],
      missingLaneIds: []
    }
  )
}

function isHostControllerLaneAllowed(controller, laneId) {
  return typeof laneId === 'string' && laneId && controller?.laneIds?.has(laneId)
}

function getRemoteInteractionKey(controllerId, laneId) {
  return `${controllerId}:${laneId}`
}

function createAutomationCompanionControllerId() {
  if (globalThis.crypto?.randomUUID) {
    return `automation-controller:${globalThis.crypto.randomUUID()}`
  }

  return `automation-controller:${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

function normalizePeerErrorMessage(error) {
  if (typeof error === 'string' && error) {
    return error
  }

  if (typeof error?.message === 'string' && error.message) {
    return error.message
  }

  return 'PeerJS connection failed.'
}

async function loadPeerConstructor() {
  if (!peerModulePromise) {
    peerModulePromise = import('peerjs')
  }

  const peerModule = await peerModulePromise
  return peerModule.Peer ?? peerModule.default?.Peer ?? peerModule.default
}

function safeCreateUrl(locationHref) {
  const href = typeof locationHref === 'string' && locationHref
    ? locationHref
    : getCurrentLocationHref()

  if (!href) {
    return null
  }

  try {
    return new URL(href)
  } catch {
    return null
  }
}

function getCurrentLocationHref() {
  if (typeof window === 'undefined') {
    return ''
  }

  return window.location.href
}

function normalizeNonEmptyString(value) {
  return typeof value === 'string' && value.trim() ? value.trim() : ''
}

function isRecord(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}
