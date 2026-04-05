<template>
  <Panel
    v-if="collapsed"
    class="flex min-h-0 w-[56px] max-w-[56px] min-w-[56px] flex-col items-center gap-2 overflow-hidden py-2"
    padding="none"
  >
    <IconButton
      :icon="ChevronLeft"
      label="Expand Effects"
      size="sm"
      variant="plain"
      @click="emit('toggle-collapse')"
    />

    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-zinc-500">
      <SlidersHorizontal class="h-4 w-4" />
      <span
        class="text-[10px] uppercase tracking-[0.3em]"
        style="writing-mode: vertical-rl; transform: rotate(180deg);"
      >
        Effects
      </span>
      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-600">{{ totalEffects }}</span>
    </div>
  </Panel>

  <Panel v-else :opaque="!showCollapseToggle" class="flex h-full min-h-0 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Effects</p>
      </div>

      <IconButton
        v-if="showCollapseToggle"
        :icon="ChevronRight"
        label="Collapse Effects"
        size="sm"
        variant="plain"
        @click="emit('toggle-collapse')"
      />
    </div>

    <div class="mt-4 flex min-h-0 flex-1 flex-col">
      <div class="grid grid-cols-2 gap-2">
        <button
          class="flex items-center justify-between gap-3 border px-4 py-3 text-left transition-colors"
          :class="activeSection === 'formula'
            ? 'border-sky-500/40 bg-sky-500/10 text-zinc-100'
            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
          type="button"
          @click="setActiveSection('formula')"
        >
          <span class="text-xs uppercase tracking-[0.24em]">Formula</span>
          <span class="text-[10px] uppercase tracking-[0.2em]">{{ evalEffects.length }}</span>
        </button>

        <button
          class="flex items-center justify-between gap-3 border px-4 py-3 text-left transition-colors"
          :class="activeSection === 'audio'
            ? 'border-amber-500/40 bg-amber-500/10 text-zinc-100'
            : 'border-zinc-800 bg-zinc-950/50 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'"
          type="button"
          @click="setActiveSection('audio')"
        >
          <span class="text-xs uppercase tracking-[0.24em]">Audio</span>
          <span class="text-[10px] uppercase tracking-[0.2em]">{{ audioEffects.length }}</span>
        </button>
      </div>

      <section class="mt-3 flex min-h-0 flex-1 flex-col border border-zinc-800 bg-zinc-950/50">

        <div class="flex min-h-0 flex-1 flex-col p-4 pt-4">
          <div class="shrink-0">
            <Button
              block
              variant="ghost"
              @click="toggleAddMenu(activeSection)"
            >
              {{ activeAddMenu === activeSection ? '← Back' : '+ Add' }}
            </Button>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div v-if="activeAddMenu === activeSection" class="grid gap-2">
              <button
                v-for="effect in activeSection === 'formula' ? availableFormulaEffects : availableAudioEffects"
                :key="effect.name"
                class="flex w-full items-center justify-between rounded border border-zinc-800 bg-zinc-950 px-3 py-2 text-left text-sm text-zinc-200 transition hover:border-zinc-700 hover:bg-zinc-800"
                type="button"
                @click="handleAddEffect(activeSection, effect)"
              >
                <span>{{ effect.name }}</span>
              </button>
            </div>

            <div v-else class="grid gap-3">
	              <template v-if="activeSection === 'audio'">
                <AudioMasterGainItem
                  :gain="displayMasterGain"
                  @create-automation="dawStore.enableMasterGainAutomationLane()"
                  @interaction-end="handleContinuousInteractionEnd"
                  @interaction-start="handleMasterGainInteractionStart"
                  @update:gain="dawStore.setMasterGain($event)"
                />

	                <div
	                  v-for="effect in displayAudioEffectsByVisualOrder"
                  :key="effect.id"
                  class="rounded transition-shadow"
                  :class="dropTargetSection === 'audio' && dropTargetEffectId === effect.id
                    ? 'shadow-[0_0_0_1px_rgba(251,191,36,0.55)]'
                    : ''"
                  @dragover.prevent="handleDragOver('audio', effect.id)"
                  @drop.prevent="handleDrop('audio', effect.id)"
                >
                  <component
                    :is="getAudioEffectComponent(effect.type)"
                    :dragging="draggingEffectId === effect.id && draggingSection === 'audio'"
                    :effect="effect"
                    @create-automation="handleCreateAudioEffectAutomation"
                    @drag-end="handleDragEnd"
                    @drag-start="handleDragStart('audio', $event)"
                    @interaction-end="handleContinuousInteractionEnd"
                    @interaction-start="handleAudioEffectInteractionStart(effect.id)"
                    @remove="handleRemoveEffect('audio', $event)"
                    @reset="handleResetEffect('audio', $event)"
                    @toggle-enabled="handleToggleEnabled('audio', $event)"
                    @toggle-expanded="handleToggleExpanded('audio', $event)"
                    @update-param="handleUpdateAudioEffectParam"
                  />
                </div>
              </template>

              <template v-else>
                <div
                  v-for="effect in displayEvalEffectsByVisualOrder"
                  :key="effect.id"
                  class="rounded transition-shadow"
                  :class="dropTargetSection === 'formula' && dropTargetEffectId === effect.id
                    ? 'shadow-[0_0_0_1px_rgba(56,189,248,0.55)]'
                    : ''"
                  @dragover.prevent="handleDragOver('formula', effect.id)"
                  @drop.prevent="handleDrop('formula', effect.id)"
                >
                  <EvalEffectItem
                    :dragging="draggingEffectId === effect.id && draggingSection === 'formula'"
                    :effect="effect"
                    @drag-end="handleDragEnd"
                    @drag-start="handleDragStart('formula', $event)"
                    @remove="handleRemoveEffect('formula', $event)"
                    @reset="handleResetEffect('formula', $event)"
                    @toggle-enabled="handleToggleEnabled('formula', $event)"
                    @toggle-expanded="handleToggleExpanded('formula', $event)"
                    @update-param="handleUpdateEvalEffectParam"
                  />
                </div>
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Panel>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-vue-next'
import AudioAutoWahItem from '@/components/effects/AudioAutoWahItem.vue'
import AudioBitCrusherItem from '@/components/effects/AudioBitCrusherItem.vue'
import AudioCompressorItem from '@/components/effects/AudioCompressorItem.vue'
import AudioDelayItem from '@/components/effects/AudioDelayItem.vue'
import AudioDistortionItem from '@/components/effects/AudioDistortionItem.vue'
import AudioEqItem from '@/components/effects/AudioEqItem.vue'
import AudioLimiterItem from '@/components/effects/AudioLimiterItem.vue'
import AudioMasterGainItem from '@/components/effects/AudioMasterGainItem.vue'
import AudioReverbItem from '@/components/effects/AudioReverbItem.vue'
import AudioStereoWidenerItem from '@/components/effects/AudioStereoWidenerItem.vue'
import AudioChorusItem from '@/components/effects/AudioChorusItem.vue'
import AudioChebyshevItem from '@/components/effects/AudioChebyshevItem.vue'
import AudioVibratoItem from '@/components/effects/AudioVibratoItem.vue'
import EvalEffectItem from '@/components/effects/EvalEffectItem.vue'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import { resolveAudioEffectAtTime } from '@/services/automationService'
import { useDawStore } from '@/stores/dawStore'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  showCollapseToggle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['toggle-collapse'])

const dawStore = useDawStore()
const { audioEffects, evalEffects, masterGain, time } = storeToRefs(dawStore)
const effectId = ref(5)
const activeSection = ref('audio')
const activeAddMenu = ref(null)
const draggingEffectId = ref(null)
const draggingSection = ref(null)
const dropTargetEffectId = ref(null)
const dropTargetSection = ref(null)
const activeContinuousInteractionLabel = ref(null)
const reorderTransactionActive = ref(false)

const availableFormulaEffects = [
  {
    name: 'Stereo Offset',
    type: 'stereoOffset'
  },
  {
    name: 'T Replacement',
    type: 'tReplacement'
  }
]
const availableAudioEffects = [
  {
    name: 'Auto Wah',
    type: 'autoWah'
  },
  {
    name: 'BitCrusher',
    type: 'bitCrusher'
  },
  {
    name: 'Chebyshev',
    type: 'chebyshev'
  },
  {
    name: 'Chorus',
    type: 'chorus'
  },
  {
    name: 'Compressor',
    type: 'compressor'
  },
  {
    name: 'Distortion',
    type: 'distortion'
  },
  {
    name: 'EQ3',
    type: 'eq'
  },
  {
    name: 'Feedback Delay',
    type: 'delay'
  },
  {
    name: 'Limiter',
    type: 'limiter'
  },
  {
    name: 'Reverb',
    type: 'reverb'
  },
  {
    name: 'Stereo Widener',
    type: 'stereoWidener'
  },
  {
    name: 'Vibrato',
    type: 'vibrato'
  }
]
const totalEffects = computed(() => audioEffects.value.length + evalEffects.value.length)
const displayEvalEffectsByVisualOrder = computed(() => [...evalEffects.value].reverse())
const displayAudioEffects = computed(() => audioEffects.value.map((effect) => {
  if (activeContinuousInteractionLabel.value === `update-audio-effect-${effect.id}`) {
    return effect
  }

  const resolvedEffect = resolveAudioEffectAtTime(time.value, dawStore.automationLanes, effect)

  if (!resolvedEffect?.params || typeof resolvedEffect.params !== 'object') {
    return resolvedEffect
  }

  const nextParams = {
    ...resolvedEffect.params
  }

  for (const paramKey of Object.keys(nextParams)) {
    const lane = dawStore.getAutomationLaneByAudioEffectParam(effect.id, paramKey)

    if (!lane?.id) {
      continue
    }

    const liveOrAutomationValue = dawStore.getAutomationValueAt(time.value, lane.id)

    if (Number.isFinite(Number(liveOrAutomationValue))) {
      nextParams[paramKey] = Number(liveOrAutomationValue)
    }
  }

  return {
    ...resolvedEffect,
    params: nextParams
  }
}))
const displayAudioEffectsByVisualOrder = computed(() => [...displayAudioEffects.value].reverse())
const displayMasterGain = computed(() => {
  if (activeContinuousInteractionLabel.value === 'update-master-gain') {
    return masterGain.value
  }

  return dawStore.getAutomationValueAt(time.value, 'masterGain') ?? masterGain.value
})

function getEffectsBySection(section) {
  return section === 'formula' ? evalEffects.value : audioEffects.value
}

function getAudioEffectComponent(effectType) {
  if (effectType === 'autoWah') {
    return AudioAutoWahItem
  }

  if (effectType === 'bitCrusher') {
    return AudioBitCrusherItem
  }

  if (effectType === 'distortion') {
    return AudioDistortionItem
  }

  if (effectType === 'stereoWidener') {
    return AudioStereoWidenerItem
  }

  if (effectType === 'delay') {
    return AudioDelayItem
  }

  if (effectType === 'compressor') {
    return AudioCompressorItem
  }

  if (effectType === 'limiter') {
    return AudioLimiterItem
  }

  if (effectType === 'reverb') {
    return AudioReverbItem
  }

  if (effectType === 'vibrato') {
    return AudioVibratoItem
  }

  if (effectType === 'chorus') {
    return AudioChorusItem
  }

  if (effectType === 'chebyshev') {
    return AudioChebyshevItem
  }

  return AudioEqItem
}

function setActiveSection(section) {
  activeSection.value = section

  if (activeAddMenu.value && activeAddMenu.value !== section) {
    activeAddMenu.value = null
  }
}

function toggleAddMenu(section) {
  activeAddMenu.value = activeAddMenu.value === section ? null : section
}

function handleAddEffect(section, template) {
  if (section === 'formula') {
    const nextEffectId = dawStore.addEvalEffect({
      id: `fx${effectId.value}`,
      type: template.type
    })

    if (nextEffectId) {
      effectId.value += 1
    }

    activeAddMenu.value = null
    return
  }

  dawStore.addAudioEffect({
    type: template.type
  })
  activeAddMenu.value = null
}

function handleToggleEnabled(section, effectIdToToggle) {
  if (section === 'formula') {
    dawStore.toggleEvalEffect(effectIdToToggle)
    return
  }

  dawStore.toggleAudioEffect(effectIdToToggle)
}

function handleToggleExpanded(section, effectIdToToggle) {
  if (section === 'formula') {
    dawStore.toggleEvalEffectExpanded(effectIdToToggle)
    return
  }

  dawStore.toggleAudioEffectExpanded(effectIdToToggle)
}

function handleRemoveEffect(section, effectIdToRemove) {
  if (section === 'formula') {
    dawStore.removeEvalEffect(effectIdToRemove)
    return
  }

  dawStore.removeAudioEffect(effectIdToRemove)
}

function handleResetEffect(section, effectIdToReset) {
  if (section === 'formula') {
    dawStore.resetEvalEffect(effectIdToReset)
    return
  }

  dawStore.resetAudioEffect(effectIdToReset)
}

function handleDragStart(section, effectIdToDrag) {
  dawStore.beginHistoryTransaction(`reorder-${section}-effect`)
  reorderTransactionActive.value = Boolean(dawStore.historyTransaction)
  draggingSection.value = section
  draggingEffectId.value = effectIdToDrag
}

function handleDragOver(section, effectIdToTarget) {
  if (!draggingEffectId.value || draggingSection.value !== section) {
    return
  }

  if (draggingEffectId.value === effectIdToTarget) {
    dropTargetEffectId.value = null
    dropTargetSection.value = null
    return
  }

  dropTargetSection.value = section
  dropTargetEffectId.value = effectIdToTarget
}

function handleDrop(section, effectIdToTarget) {
  if (!draggingEffectId.value || draggingSection.value !== section) {
    return
  }

  if (section === 'formula') {
    dawStore.reorderEvalEffect(draggingEffectId.value, effectIdToTarget, 'after')
  } else {
    dawStore.reorderAudioEffect(draggingEffectId.value, effectIdToTarget, 'after')
  }

  if (reorderTransactionActive.value) {
    dawStore.commitHistoryTransaction()
    reorderTransactionActive.value = false
  }

  handleDragEnd()
}

function handleDragEnd() {
  if (reorderTransactionActive.value) {
    dawStore.cancelHistoryTransaction()
    reorderTransactionActive.value = false
  }

  draggingSection.value = null
  draggingEffectId.value = null
  dropTargetSection.value = null
  dropTargetEffectId.value = null
}

function handleUpdateEvalEffectParam(effectIdToUpdate, key, value) {
  dawStore.recordHistoryStep('update-eval-effect-param', () => {
    dawStore.updateEvalEffectParams(effectIdToUpdate, {
      [key]: value
    })
  })
}

function handleUpdateAudioEffectParam(effectIdToUpdate, key, value) {
  dawStore.updateAudioEffectParams(effectIdToUpdate, {
    [key]: value
  })
}

function handleCreateAudioEffectAutomation(effectId, paramKey) {
  dawStore.enableAudioEffectParamAutomationLane(effectId, paramKey)
}

function handleAudioEffectInteractionStart(effectIdToStart) {
  beginContinuousInteraction(`update-audio-effect-${effectIdToStart}`)
}

function handleMasterGainInteractionStart() {
  beginContinuousInteraction('update-master-gain')
}

function beginContinuousInteraction(label) {
  if (activeContinuousInteractionLabel.value) {
    return
  }

  dawStore.beginHistoryTransaction(label)
  if (!dawStore.historyTransaction) {
    return
  }

  activeContinuousInteractionLabel.value = label
  window.addEventListener('pointerup', handleContinuousInteractionWindowEnd)
  window.addEventListener('pointercancel', handleContinuousInteractionWindowEnd)
}

function handleContinuousInteractionEnd() {
  if (!activeContinuousInteractionLabel.value) {
    return
  }

  dawStore.commitHistoryTransaction()
  cleanupContinuousInteraction()
}

function handleContinuousInteractionWindowEnd() {
  handleContinuousInteractionEnd()
}

function cleanupContinuousInteraction() {
  activeContinuousInteractionLabel.value = null
  window.removeEventListener('pointerup', handleContinuousInteractionWindowEnd)
  window.removeEventListener('pointercancel', handleContinuousInteractionWindowEnd)
}

onBeforeUnmount(() => {
  cleanupContinuousInteraction()
  handleDragEnd()
})

</script>
