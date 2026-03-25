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
        <div class="space-y-1">
          <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Period</p>
          <p class="text-sm font-medium text-zinc-100">
            <template v-if="analysisResult?.period">{{ analysisResult.period }} samples</template>
            <template v-else>none detected</template>
          </p>
        </div>

        <div class="space-y-1">
          <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Confidence</p>
          <p class="text-sm font-medium" :class="confidenceClassName">{{ confidenceLabel }}</p>
        </div>
      </template>
    </div>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import Modal from '@/components/ui/Modal.vue'
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
const { analyzeFormulaPeriod } = useFormulaInspector()
const {
  evalEffects,
  tracks,
  valueTrackerTracks,
  variableTracks
} = storeToRefs(dawStore)
const requestVersion = ref(0)
const analysisResult = ref({
  period: null,
  confidence: 0
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

watch(
  () => ({
    analysisCacheKey: analysisCacheKey.value,
    open: props.open
  }),
  async ({ analysisCacheKey: nextAnalysisCacheKey, open }) => {
    const nextRequestVersion = requestVersion.value + 1
    requestVersion.value = nextRequestVersion

    if (!open) {
      analysisResult.value = {
        period: null,
        confidence: 0
      }
      return
    }

    if (!nextAnalysisCacheKey) {
      analysisResult.value = {
        period: null,
        confidence: 0
      }
      return
    }

    const cachedResult = dawStore.getFormulaAnalysisByKey(nextAnalysisCacheKey)

    if (cachedResult) {
      analysisResult.value = cachedResult
      return
    }

    await Promise.resolve()

    if (requestVersion.value !== nextRequestVersion) {
      return
    }

    const evaluator = createFormulaEvaluatorFromExpressions(renderableExpressions.value)
    const nextAnalysisResult = analyzeFormulaPeriod(evaluator)

    if (requestVersion.value !== nextRequestVersion) {
      return
    }

    dawStore.setFormulaAnalysisByKey(nextAnalysisCacheKey, nextAnalysisResult)
    analysisResult.value = nextAnalysisResult
  },
  { immediate: true }
)
</script>
