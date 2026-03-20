<template>
  <Panel class="flex shrink-0 flex-col" padding="none">
    <div
      class="grid gap-px bg-zinc-800"
      :class="displayExpressions.length > 1 ? 'lg:grid-cols-2' : 'grid-cols-1'"
    >
      <section
        v-for="expression in displayExpressions"
        :key="expression.id"
        class="min-w-0 bg-zinc-950/70"
      >
        <div class="border-b border-zinc-800 px-4 py-2 text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {{ expression.label }}
        </div>

        <pre class="min-h-[4.5rem] overflow-auto px-4 py-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words">{{ expression.code }}</pre>
      </section>
    </div>
  </Panel>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { getActiveFormula } from '@/engine/timelineEngine'
import { applyEvalEffects } from '@/services/evalEffectService'
import { useDawStore } from '@/stores/dawStore'
import Panel from '@/components/ui/Panel.vue'

const dawStore = useDawStore()
const { evalEffects, formulas, time, tracks, valueRollTracks, variableTracks } = storeToRefs(dawStore)

const activeFormula = computed(() =>
  getActiveFormula(time.value, tracks.value, formulas.value, variableTracks.value, valueRollTracks.value)
)
const evaluatedExpressions = computed(() => {
  if (typeof activeFormula.value !== 'string' || !activeFormula.value.trim()) {
    return []
  }

  return applyEvalEffects(activeFormula.value, evalEffects.value)
    .filter((expression) => typeof expression === 'string' && expression.trim())
})

const displayExpressions = computed(() => {
  if (!evaluatedExpressions.value.length) {
    return [
      {
        id: 'mono',
        label: 'Channel',
        code: '0'
      }
    ]
  }

  const [leftExpression = '', rightExpression = leftExpression] = evaluatedExpressions.value

  if (rightExpression === leftExpression) {
    return [
      {
        id: 'mono',
        label: 'Channel',
        code: leftExpression
      }
    ]
  }

  return [
    {
      id: 'left',
      label: 'Left Channel',
      code: leftExpression
    },
    {
      id: 'right',
      label: 'Right Channel',
      code: rightExpression
    }
  ]
})

const formattedTime = computed(() => {
  const normalizedTime = Number(time.value)

  if (!Number.isFinite(normalizedTime)) {
    return '0'
  }

  return normalizedTime.toFixed(2).replace(/\.00$/, '')
})

const channelSummary = computed(() => {
  return displayExpressions.value.length > 1 ? 'Stereo' : 'Mono'
})
</script>
