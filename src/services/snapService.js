import { maybeSnapTicks } from '@/utils/timeUtils'

export function shouldSnapFromPointerEvent(event) {
  return !event.shiftKey
}

export function resolvePointerEventSnap(event, snapEnabled = true) {
  return Boolean(snapEnabled) && shouldSnapFromPointerEvent(event)
}

export function getDraggedTick(nextTick, shouldSnap = true) {
  return maybeSnapTicks(Math.max(0, nextTick), shouldSnap)
}
