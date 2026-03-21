<template>
  <section class="min-h-screen bg-zinc-950 px-4 py-6 text-zinc-100">
    <div class="mx-auto flex w-full max-w-3xl flex-col gap-5">
      <header class="border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg shadow-black/20">
        <div class="flex flex-wrap items-center justify-between gap-4">
          <div class="flex items-center gap-3">
            <span
              class="h-3 w-3 rounded-full border"
              :class="statusDotClassName"
              :title="statusLabel"
            />
            <h1 class="text-xl text-zinc-50">DawBeat Companion</h1>
          </div>

          <div class="flex flex-wrap gap-2">
            <Button variant="ghost" @click="reconnectAutomationCompanionClient">
              Reconnect
            </Button>
            <Button variant="ghost" @click="clearAutomationCompanionSession">
              Forget Session
            </Button>
          </div>
        </div>

        <div
          v-if="clientState.error"
          class="mt-5 border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm leading-6 text-red-100"
        >
          {{ clientState.error }}
        </div>
      </header>

      <div
        v-if="!clientState.lanes.length"
        class="border border-zinc-800 bg-zinc-900/80 px-5 py-12 text-center text-sm leading-6 text-zinc-400 shadow-lg shadow-black/20"
      >
        No controls added yet. Scan a QR from an automation lane header.
      </div>

      <div v-else class="grid gap-4 md:grid-cols-2">
        <article
          v-for="lane in clientState.lanes"
          :key="lane.laneId"
          class="border border-zinc-800 bg-zinc-900/80 p-5 shadow-lg shadow-black/20"
        >
          <div class="flex items-start justify-between gap-3">
            <h2 class="text-2xl text-zinc-50">{{ lane.label }}</h2>

            <Button size="sm" variant="ghost" @click="removeAutomationCompanionLane(lane.laneId)">
              Remove
            </Button>
          </div>

          <div class="mt-6">
            <div class="flex items-end justify-between gap-3">
              <p class="text-4xl text-amber-300">{{ formatLaneValue(lane.value) }}</p>

              <div class="text-right text-[11px] leading-5 text-zinc-400">
                <p>{{ formatLaneValue(lane.min) }}</p>
                <p>{{ formatLaneValue(lane.max) }}</p>
              </div>
            </div>

            <div class="mt-6">
              <input
                class="automation-slider min-w-0 flex-1 accent-amber-300"
                :max="lane.max"
                :min="lane.min"
                :step="getLaneSliderStep(lane)"
                :value="lane.value"
                type="range"
                @blur="handleLaneGestureEnd(lane.laneId)"
                @change="handleLaneGestureEnd(lane.laneId)"
                @input="handleLaneInput(lane.laneId, $event)"
                @pointercancel="handleLaneGestureEnd(lane.laneId)"
                @pointerdown="handleLaneGestureStart(lane.laneId)"
                @pointerup="handleLaneGestureEnd(lane.laneId)"
              />
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted } from 'vue'
import Button from '@/components/ui/Button.vue'
import {
  automationCompanionClientState as clientState,
  beginAutomationCompanionLaneGesture,
  clearAutomationCompanionSession,
  disposeAutomationCompanionClient,
  endAutomationCompanionLaneGesture,
  initializeAutomationCompanionClient,
  reconnectAutomationCompanionClient,
  removeAutomationCompanionLane,
  setAutomationCompanionLaneValue
} from '@/services/automationCompanionService'

const activeGestureLaneIds = new Set()

const statusLabel = computed(() => {
  if (clientState.status === 'connecting') {
    return 'Connecting...'
  }

  if (clientState.connected) {
    return 'Connected'
  }

  if (clientState.status === 'error') {
    return 'Connection Error'
  }

  return 'Idle'
})

const statusDotClassName = computed(() => {
  if (clientState.status === 'connecting') {
    return 'border-amber-300 bg-amber-400/80'
  }

  if (clientState.connected) {
    return 'border-emerald-200 bg-emerald-400/90'
  }

  if (clientState.status === 'error') {
    return 'border-red-200 bg-red-400/90'
  }

  return 'border-zinc-500 bg-zinc-700'
})

function handleLaneGestureStart(laneId) {
  if (activeGestureLaneIds.has(laneId)) {
    return
  }

  activeGestureLaneIds.add(laneId)
  beginAutomationCompanionLaneGesture(laneId)
}

function handleLaneGestureEnd(laneId) {
  if (!activeGestureLaneIds.has(laneId)) {
    return
  }

  activeGestureLaneIds.delete(laneId)
  endAutomationCompanionLaneGesture(laneId)
}

function handleLaneInput(laneId, event) {
  handleLaneGestureStart(laneId)
  setAutomationCompanionLaneValue(laneId, event?.target?.value)
}

function getLaneSliderStep(lane) {
  const range = Math.abs((Number(lane.max) || 0) - (Number(lane.min) || 0))

  if (!Number.isFinite(range) || range <= 0) {
    return 0.001
  }

  return Math.max(range / 512, 0.001)
}

function formatLaneValue(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue)) {
    return '0'
  }

  if (Math.abs(numericValue) >= 100 || Number.isInteger(numericValue)) {
    return String(Math.round(numericValue * 100) / 100)
  }

  return numericValue.toFixed(3)
}

onMounted(() => {
  void initializeAutomationCompanionClient()
})

onBeforeUnmount(() => {
  activeGestureLaneIds.clear()
  disposeAutomationCompanionClient()
})
</script>
