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
        <div class="flex items-center justify-between gap-3 border-b border-zinc-800 px-4 py-2">
          <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">
            {{ expression.label }}
          </span>

          <div class="flex items-center gap-1">
            <IconButton
              :icon="Search"
              :label="`Inspect ${expression.label}`"
              size="sm"
              title="Inspect formula"
              variant="plain"
              @click="inspectExpression(expression)"
            />
            <IconButton
              :icon="Copy"
              :label="`Copy ${expression.label}`"
              size="sm"
              title="Copy formula"
              variant="plain"
              @click="copyExpression(expression)"
            />
          </div>
        </div>

        <pre class="min-h-[4.5rem] overflow-auto px-4 py-3 text-xs leading-6 text-zinc-200 whitespace-pre-wrap break-words">{{ expression.code }}</pre>
      </section>
    </div>
  </Panel>
</template>

<script setup>
import { computed } from 'vue'
import { storeToRefs } from 'pinia'
import { Copy, Search } from 'lucide-vue-next'
import { getActiveFormula } from '@/engine/timelineEngine'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import { copyTextToClipboard } from '@/services/clipboard'
import { applyEvalEffects, getEvaluatedDisplayExpressions } from '@/services/evalEffectService'
import { hasRenderableFormulaInput } from '@/services/formulaService'
import { enqueueSnackbar } from '@/services/notifications'
import { useDawStore } from '@/stores/dawStore'

const emit = defineEmits(['inspect-expression'])

const dawStore = useDawStore()
const { evalEffects, time, tracks, valueTrackerLiveInputs, valueTrackerTracks, variableTracks } = storeToRefs(dawStore)

const activeFormula = computed(() =>
  getActiveFormula(
    time.value,
    tracks.value,
    variableTracks.value,
    valueTrackerTracks.value,
    valueTrackerLiveInputs.value
  )
)
const evaluatedExpressions = computed(() => {
  if (!hasRenderableFormulaInput(activeFormula.value)) {
    return []
  }

  return applyEvalEffects(activeFormula.value, evalEffects.value)
    .filter((expression) => typeof expression === 'string' && expression.trim())
})

const displayExpressions = computed(() => getEvaluatedDisplayExpressions(evaluatedExpressions.value))

function inspectExpression(expression) {
  const code = expression?.code ?? ''

  if (!code.trim()) {
    return
  }

  emit('inspect-expression', {
    code,
    label: expression?.label ?? 'Formula'
  })
}

async function copyExpression(expression) {
  try {
    await copyTextToClipboard(expression?.code ?? '')
    enqueueSnackbar(`${expression?.label ?? 'Formula'} copied.`, {
      variant: 'success'
    })
  } catch {
    enqueueSnackbar('Could not copy formula.', {
      variant: 'error'
    })
  }
}
</script>
