<template>
    <Modal :open="open" size="sm" title="Formula Inspector" @close="emit('close')">
        <div class="space-y-3 text-xs text-zinc-200">
            <p v-if="!hasInspectionTarget" class="text-zinc-400">
                Select a formula clip or inspect a formula from the evaluated output panel.
            </p>

            <p v-else-if="!hasExpressionInput" class="text-zinc-400">
                Could not resolve a renderable formula for analysis.
            </p>

            <p v-else-if="targetClipRecord && targetClipRecord.laneType !== 'track'" class="text-zinc-400">
                Period analysis is available for formula clips.
            </p>

            <template v-else>
                <div class="grid grid-cols-3 gap-3">
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

                    <div class="space-y-1">
                        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Pitch</p>
                        <p class="text-sm font-medium text-zinc-100">
                            <template v-if="isAnalyzing">analyzing</template>
                            <template v-else>{{ pitchLabel }}</template>
                        </p>
                        <p class="text-[11px]" :class="pitchConfidenceClassName">
                            <template v-if="isAnalyzing">analyzing</template>
                            <template v-else>{{ pitchConfidenceLabel }}</template>
                        </p>
                        <p class="text-[11px] text-zinc-400">
                            <template v-if="isAnalyzing">analyzing</template>
                            <template v-else>Stability: {{ pitchStabilityLabel }}</template>
                        </p>
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
                        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Values</p>
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

                <div class="space-y-1">
                    <div class="space-y-1">
                        <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Activity</p>
                        <p class="text-sm font-medium text-zinc-100">
                            <template v-if="isAnalyzing">analyzing</template>
                            <template v-else>{{ activityLabel }}</template>
                        </p>
                        <p class="text-[11px] text-zinc-400">
                            <template v-if="isAnalyzing">analyzing</template>
                            <template v-else>Change rate: {{ activityValueLabel }}</template>
                        </p>
                    </div>
                </div>

                <div class="space-y-2">
                    <p class="text-[10px] uppercase tracking-[0.2em] text-zinc-500">Bit Activity</p>
                    <div class="space-y-0.5">
                        <div
                            v-for="entry in bitplaneRows"
                            :key="entry.bit"
                            class="flex items-center gap-2"
                        >
                            <p class="w-4 shrink-0 text-right text-[11px] font-semibold text-zinc-400">{{ entry.bit }}</p>
                            <div class="h-1.5 min-w-0 flex-1 rounded bg-zinc-800">
                                <div
                                    class="h-1.5 rounded bg-zinc-300"
                                    :style="{ width: `${entry.percent}%` }"
                                />
                            </div>
                            <p class="w-10 shrink-0 text-right text-[11px] text-zinc-400">{{ entry.percentLabel }}</p>
                        </div>
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
import { normalizeExpressionList, resolveClipFormulaExpressions } from '@/services/formulaService'
import { useDawStore } from '@/stores/dawStore'

const props = defineProps({
    clipId: {
        type: String,
        default: null
    },
    expressions: {
        type: Array,
        default: () => []
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
    sampleRate,
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
    width: null,
    normalizedRange: null,
    pitch: {
        freq: null,
        note: null,
        confidence: 0
    },
    pitchStability: {
        stability: 'low',
        variance: 0,
        samplesAnalyzed: 0
    },
    activity: {
        value: 0,
        normalized: 0,
        level: 'low'
    },
    bitplanes: {
        bits: Array.from({ length: 8 }, (_, offset) => ({
            bit: 7 - offset,
            activity: 0
        }))
    }
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

const externalExpressions = computed(() => normalizeExpressionList(props.expressions))

const hasInspectionTarget = computed(() =>
    externalExpressions.value.length > 0 || Boolean(targetClipRecord.value)
)

const renderableExpressions = computed(() => {
    if (!props.open) {
        return []
    }

    if (externalExpressions.value.length) {
        return externalExpressions.value
    }

    if (!targetClipRecord.value?.clip || targetClipRecord.value.laneType !== 'track') {
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

const hasExpressionInput = computed(() => renderableExpressions.value.length > 0)

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

const pitchConfidenceLabel = computed(() => {
    const pitchConfidence = Number(analysisResult.value?.pitch?.confidence)

    if (pitchConfidence < 0.25) {
        return 'none'
    }

    if (pitchConfidence >= 0.95) {
        return 'high'
    }

    if (pitchConfidence >= 0.8) {
        return 'medium'
    }

    return 'low'
})

const pitchConfidenceClassName = computed(() => {
    if (pitchConfidenceLabel.value === 'high') {
        return 'text-emerald-300'
    }

    if (pitchConfidenceLabel.value === 'medium') {
        return 'text-amber-300'
    }

    if (pitchConfidenceLabel.value === 'low') {
        return 'text-rose-300'
    }

    return 'text-zinc-400'
})

const pitchLabel = computed(() => {
    const pitch = analysisResult.value?.pitch

    if (!pitch?.note || !Number.isFinite(pitch?.freq)) {
        return 'none detected'
    }

    const roundedFrequency = pitch.freq >= 100 ? Math.round(pitch.freq) : Number(pitch.freq.toFixed(1))

    return `${pitch.note} (${roundedFrequency} Hz)`
})

const pitchStabilityLabel = computed(() => {
    const stability = analysisResult.value?.pitchStability?.stability

    if (stability === 'high' || stability === 'medium' || stability === 'low') {
        return stability
    }

    return 'low'
})

const activityLabel = computed(() => {
    const level = analysisResult.value?.activity?.level

    if (typeof level !== 'string') {
        return 'none'
    }

    return level
})

const activityValueLabel = computed(() => {
    const value = Number(analysisResult.value?.activity?.value)

    if (!Number.isFinite(value)) {
        return '0'
    }

    return `${value.toFixed(1).replace(/\.0$/, '')}`
})

const bitplaneRows = computed(() => {
    const bits = Array.isArray(analysisResult.value?.bitplanes?.bits)
        ? analysisResult.value.bitplanes.bits
        : []

    if (!bits.length) {
        return Array.from({ length: 8 }, (_, offset) => ({
            bit: 7 - offset,
            percent: 0,
            percentLabel: '0%'
        }))
    }

    return bits.map((entry) => {
        const normalizedActivity = Number(entry?.activity)
        const percent = Number.isFinite(normalizedActivity)
            ? Math.max(0, Math.min(100, normalizedActivity * 100))
            : 0

        return {
            bit: entry?.bit ?? 0,
            percent,
            percentLabel: `${percent.toFixed(0)}%`
        }
    })
})

const hasRangeMetrics = computed(() =>
    Number.isFinite(analysisResult.value?.min) &&
    Number.isFinite(analysisResult.value?.max) &&
    Number.isFinite(analysisResult.value?.width) &&
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

    return String(analysisResult.value.width)
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
        open: props.open,
        sampleRate: sampleRate.value
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
                width: null,
                normalizedRange: null,
                pitch: {
                    freq: null,
                    note: null,
                    confidence: 0
                },
                pitchStability: {
                    stability: 'low',
                    variance: 0,
                    samplesAnalyzed: 0
                },
                activity: {
                    value: 0,
                    normalized: 0,
                    level: 'low'
                },
                bitplanes: {
                    bits: Array.from({ length: 8 }, (_, offset) => ({
                        bit: 7 - offset,
                        activity: 0
                    }))
                }
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
                width: null,
                normalizedRange: null,
                pitch: {
                    freq: null,
                    note: null,
                    confidence: 0
                },
                pitchStability: {
                    stability: 'low',
                    variance: 0,
                    samplesAnalyzed: 0
                },
                activity: {
                    value: 0,
                    normalized: 0,
                    level: 'low'
                },
                bitplanes: {
                    bits: Array.from({ length: 8 }, (_, offset) => ({
                        bit: 7 - offset,
                        activity: 0
                    }))
                }
            }
            return
        }

        const cachedResult = dawStore.getFormulaAnalysisByKey(nextAnalysisCacheKey)
        const hasCachedRangeMetrics =
            cachedResult &&
            Object.hasOwn(cachedResult, 'min') &&
            Object.hasOwn(cachedResult, 'max') &&
            Object.hasOwn(cachedResult, 'range') &&
            Object.hasOwn(cachedResult, 'width') &&
            Object.hasOwn(cachedResult, 'normalizedRange') &&
            Object.hasOwn(cachedResult, 'pitch') &&
            Object.hasOwn(cachedResult, 'pitchStability') &&
            Object.hasOwn(cachedResult, 'activity') &&
            Object.hasOwn(cachedResult, 'bitplanes')

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
        const nextAnalysisResult = analyzeFormula(evaluator, {
            sampleRate: sampleRate.value
        })

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
