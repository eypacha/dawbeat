<template>
  <Modal
    :open="open"
    size="sm"
    title="Formula Inspector"
    @close="emit('close')"
  >
    <div class="space-y-3 text-xs text-zinc-200">
      <p v-if="!targetClipRecord" class="text-zinc-400">
        Select a formula clip to analyze its period.
      </p>

      <p v-else-if="targetClipRecord.laneType !== 'track'" class="text-zinc-400">
        Period analysis is available for formula clips.
      </p>

      <template v-else>
        <div class="grid grid-cols-2 gap-3">
          <div class="space-y-1">
            <p class="text-sm font-medium text-zinc-100">
              <template v-if="isAnalyzing">ANALYZING...</template>
              <template v-else-if="analysisResult?.period">PERIOD {{ periodTicksLabel }}</template>
              <template v-else>PERIOD</template>
            </p>

            <p class="text-sm font-medium text-zinc-100">
              <template v-if="isAnalyzing">analyzing</template>
              <template v-else-if="analysisResult?.period">{{ analysisResult.period }} samples</template>
              <template v-else>none detected</template>
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Confidence</p>
            <p class="text-sm font-medium" :class="confidenceClassName">{{ confidenceLabel }}</p>
          </div>
        </div>

        <div class="grid grid-cols-3 gap-3">
          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Range</p>
            <p class="text-sm font-medium text-zinc-100">
              <template v-if="isAnalyzing">analyzing</template>
              <template v-else>{{ rangeLabel }}</template>
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Width</p>
            <p class="text-sm font-medium text-zinc-100">
              <template v-if="isAnalyzing">analyzing</template>
              <template v-else>{{ widthLabel }}</template>
            </p>
          </div>

          <div class="space-y-1">
            <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Coverage</p>
            <p class="text-sm font-medium text-zinc-100">
              <template v-if="isAnalyzing">analyzing</template>
              <template v-else>{{ coverageLabel }}</template>
            </p>
          </div>
        </div>
      </template>
    </div>
  </Modal>
</template>

<script setup>
import { computed, nextTick, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from '@/components/ui/Modal.vue'
import { ANALYSIS_SAMPLES_PER_TICK } from '@/services/formulaAnalysis/analysisConfig'
import {
  buildRenderableFormulaExpressions,
  createFormulaAnalysisCacheKey,
  createFormulaEvaluatorFromExpressions,
  useFormulaInspector
} from '@/composables/useFormulaInspector'
import { findTimelineClip } from '@/services/dawStoreService'
import { resolveClipFormulaExpressions } from '@/services/formulaService'
import { useDawStore } from '@/stores/dawStore'

const props = defineProps({
  clipId: {
    type: String,
    default: null
  },
  open: {
    type: Boolean,
    default: false
  }
})
const emit = defineEmits(['close'])

const dawStore = useDawStore()
const { analyzeFormula } = useFormulaInspector()
const {
  evalEffects,
  tracks,
  valueTrackerTracks,
  variableTracks
} = storeToRefs(dawStore)
const requestVersion = ref(0)
const isAnalyzing = ref(false)
const analysisResult = ref({
  period: null,
  confidence: 0,
  min: null,
  max: null,
  range: null,
  normalizedRange: null
})

const targetClipRecord = computed(() => {
  if (!props.clipId) {
    return null
  }

  return findTimelineClip(
    tracks.value,
    variableTracks.value,
    valueTrackerTracks.value,
    props.clipId
  )
})

const renderableExpressions = computed(() => {
  if (!props.open || !targetClipRecord.value?.clip || targetClipRecord.value.laneType !== 'track') {
    return []
  }

  return buildRenderableFormulaExpressions({
    expressions: resolveClipFormulaExpressions(targetClipRecord.value.clip),
    evalEffects: evalEffects.value,
    referenceTick: targetClipRecord.value.clip.start,
    valueTrackerTracks: valueTrackerTracks.value,
    variableTracks: variableTracks.value
  })
})

const analysisCacheKey = computed(() => createFormulaAnalysisCacheKey(renderableExpressions.value))

const confidenceLabel = computed(() => {
  if (!analysisResult.value?.period) {
    return 'none'
  }

  if (analysisResult.value.confidence >= 0.995) {
    return 'high'
  }

  if (analysisResult.value.confidence >= 0.99) {
    return 'medium'
  }

  return 'low'
})

const confidenceClassName = computed(() => {
  if (confidenceLabel.value === 'high') {
    return 'text-emerald-300'
  }

  if (confidenceLabel.value === 'medium') {
    return 'text-amber-300'
  }

  if (confidenceLabel.value === 'low') {
    return 'text-rose-300'
  }

  return 'text-zinc-400'
})

const hasRangeMetrics = computed(() =>
  Number.isFinite(analysisResult.value?.min) &&
  Number.isFinite(analysisResult.value?.max) &&
  Number.isFinite(analysisResult.value?.range) &&
  Number.isFinite(analysisResult.value?.normalizedRange)
)

const rangeLabel = computed(() => {
  if (!hasRangeMetrics.value) {
    return 'none'
  }

  return `${analysisResult.value.min} - ${analysisResult.value.max}`
})

const widthLabel = computed(() => {
  if (!hasRangeMetrics.value) {
    return 'none'
  }

  return String(analysisResult.value.range)
})

const coverageLabel = computed(() => {
  if (!hasRangeMetrics.value) {
    return 'none'
  }

  const coverage = analysisResult.value.normalizedRange * 100

  if (Number.isInteger(coverage)) {
    return `${coverage}%`
  }

  return `${coverage.toFixed(1).replace(/\.0$/, '')}%`
})

const periodTicksLabel = computed(() => {
  const periodSamples = Number(analysisResult.value?.period)

  if (!Number.isFinite(periodSamples) || periodSamples <= 0) {
    return '-'
  }

  const periodTicks = periodSamples / ANALYSIS_SAMPLES_PER_TICK

  if (Number.isInteger(periodTicks)) {
    return String(periodTicks)
  }

  return periodTicks.toFixed(3).replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1')
})

function waitForPaint() {
  return new Promise((resolve) => {
    if (typeof requestAnimationFrame !== 'function') {
      resolve()
      return
    }

    requestAnimationFrame(() => resolve())
  })
}

async function waitUntilModalIsVisible() {
  await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await waitForPaint()
}

watch(
  () => ({
    analysisCacheKey: analysisCacheKey.value,
    open: props.open
  }),
  async ({ analysisCacheKey: nextAnalysisCacheKey, open }) => {
    const nextRequestVersion = requestVersion.value + 1
    requestVersion.value = nextRequestVersion

    if (!open) {
      isAnalyzing.value = false
      analysisResult.value = {
        period: null,
        confidence: 0,
        min: null,
        max: null,
        range: null,
        normalizedRange: null
      }
      return
    }

    if (!nextAnalysisCacheKey) {
      isAnalyzing.value = false
      analysisResult.value = {
        period: null,
        confidence: 0,
        min: null,
        max: null,
        range: null,
        normalizedRange: null
      }
      return
    }

    const cachedResult = dawStore.getFormulaAnalysisByKey(nextAnalysisCacheKey)
    const hasCachedRangeMetrics =
      cachedResult &&
      Object.hasOwn(cachedResult, 'min') &&
      Object.hasOwn(cachedResult, 'max') &&
      Object.hasOwn(cachedResult, 'range') &&
      Object.hasOwn(cachedResult, 'normalizedRange')

    if (cachedResult && hasCachedRangeMetrics) {
      analysisResult.value = cachedResult
      isAnalyzing.value = false
      return
    }

    isAnalyzing.value = true
    await waitUntilModalIsVisible()

    if (requestVersion.value !== nextRequestVersion) {
      isAnalyzing.value = false
      return
    }

    const evaluator = createFormulaEvaluatorFromExpressions(renderableExpressions.value)
    const nextAnalysisResult = analyzeFormula(evaluator)

    if (requestVersion.value !== nextRequestVersion) {
      isAnalyzing.value = false
      return
    }

    dawStore.setFormulaAnalysisByKey(nextAnalysisCacheKey, nextAnalysisResult)
    analysisResult.value = nextAnalysisResult
    isAnalyzing.value = false
  },
  {
    immediate: true,
    flush: 'post'
  }
)
</script>
