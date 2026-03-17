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

  <Panel v-else class="flex min-h-0 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Effects</p>
      </div>

      <IconButton
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
        <div class="flex items-center justify-between gap-3 px-4 py-3">
          <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">
            {{ activeSection === 'formula' ? 'Formula Effects' : 'Audio Effects' }}
          </p>
          <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-600">
            {{ activeSection === 'formula' ? evalEffects.length : audioEffects.length }} total
          </span>
        </div>

        <Divider orientation="horizontal" />

        <div class="flex min-h-0 flex-1 flex-col p-4 pt-4">
          <div class="relative shrink-0" :data-effects-add-menu="activeSection">
            <Button
              block
              variant="ghost"
              @click="toggleAddMenu(activeSection)"
            >
              + Add
            </Button>

            <div
              v-if="activeAddMenu === activeSection"
              class="absolute left-0 right-0 top-full z-30 mt-2 rounded border border-zinc-700 bg-zinc-900 p-3 shadow-lg shadow-black/40"
            >
              <div class="grid gap-2">
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
            </div>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div class="grid gap-3">
	              <template v-if="activeSection === 'audio'">
	                <div
	                  v-for="effect in audioEffects"
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

                <AudioMasterGainItem
                  :gain="masterGain"
                  @interaction-end="handleContinuousInteractionEnd"
                  @interaction-start="handleMasterGainInteractionStart"
                  @reset="dawStore.resetMasterGain()"
                  @update:gain="dawStore.setMasterGain($event)"
                />
              </template>

              <template v-else>
                <div
                  v-for="effect in evalEffects"
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-vue-next'
import AudioCompressorItem from '@/components/effects/AudioCompressorItem.vue'
import AudioEqItem from '@/components/effects/AudioEqItem.vue'
import AudioLimiterItem from '@/components/effects/AudioLimiterItem.vue'
import AudioMasterGainItem from '@/components/effects/AudioMasterGainItem.vue'
import AudioReverbItem from '@/components/effects/AudioReverbItem.vue'
import EvalEffectItem from '@/components/effects/EvalEffectItem.vue'
import Button from '@/components/ui/Button.vue'
import Divider from '@/components/ui/Divider.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import { useDawStore } from '@/stores/dawStore'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])

const dawStore = useDawStore()
const { audioEffects, evalEffects, masterGain } = storeToRefs(dawStore)
const effectId = ref(5)
const activeSection = ref('formula')
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
    name: 'EQ3',
    type: 'eq'
  },
  {
    name: 'Compressor',
    type: 'compressor'
  },
  {
    name: 'Limiter',
    type: 'limiter'
  },
  {
    name: 'Reverb',
    type: 'reverb'
  }
]
const totalEffects = computed(() => audioEffects.value.length + evalEffects.value.length)

function getEffectsBySection(section) {
  return section === 'formula' ? evalEffects.value : audioEffects.value
}

function getAudioEffectComponent(effectType) {
  if (effectType === 'compressor') {
    return AudioCompressorItem
  }

  if (effectType === 'limiter') {
    return AudioLimiterItem
  }

  if (effectType === 'reverb') {
    return AudioReverbItem
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
    dawStore.reorderEvalEffect(draggingEffectId.value, effectIdToTarget)
  } else {
    dawStore.reorderAudioEffect(draggingEffectId.value, effectIdToTarget)
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

function handleWindowPointerDown(event) {
  if (!(event.target instanceof Node)) {
    return
  }

  if (event.target.closest('[data-effects-add-menu]')) {
    return
  }

  activeAddMenu.value = null
}

onMounted(() => {
  window.addEventListener('pointerdown', handleWindowPointerDown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handleWindowPointerDown)
  cleanupContinuousInteraction()
  handleDragEnd()
})

</script>
