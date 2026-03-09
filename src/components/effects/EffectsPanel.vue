<template>
  <Panel class="flex min-h-0 flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Effects</p>
      </div>
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
                <AudioDelayItem
                  v-for="effect in audioEffects"
                  :key="effect.id"
                  :dragging="draggingEffectId === effect.id && draggingSection === 'audio'"
                  :effect="effect"
                  @drag-end="handleDragEnd"
                  @drag-start="handleDragStart('audio', $event)"
                  @remove="handleRemoveEffect('audio', $event)"
                  @reset="handleResetEffect('audio', $event)"
                  @toggle-enabled="handleToggleEnabled('audio', $event)"
                  @toggle-expanded="handleToggleExpanded('audio', $event)"
                  @update-param="handleUpdateAudioEffectParam"
                />
              </template>

              <template v-else>
                <EvalEffectItem
                  v-for="effect in evalEffects"
                  :key="effect.id"
                  :dragging="draggingEffectId === effect.id && draggingSection === 'formula'"
                  :effect="effect"
                  @drag-end="handleDragEnd"
                  @drag-start="handleDragStart('formula', $event)"
                  @remove="handleRemoveEffect('formula', $event)"
                  @reset="handleResetEffect('formula', $event)"
                  @toggle-enabled="handleToggleEnabled('formula', $event)"
                  @toggle-expanded="handleToggleExpanded('formula', $event)"
                  @update-offset="handleUpdateEvalEffectOffset"
                />
              </template>
            </div>
          </div>
        </div>
      </section>
    </div>
  </Panel>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import AudioDelayItem from '@/components/effects/AudioDelayItem.vue'
import EvalEffectItem from '@/components/effects/EvalEffectItem.vue'
import Button from '@/components/ui/Button.vue'
import Divider from '@/components/ui/Divider.vue'
import Panel from '@/components/ui/Panel.vue'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { audioEffects, evalEffects } = storeToRefs(dawStore)
const effectId = ref(5)
const activeSection = ref('formula')
const activeAddMenu = ref(null)
const draggingEffectId = ref(null)
const draggingSection = ref(null)

const availableFormulaEffects = [
  {
    name: 'Stereo Offset',
    type: 'stereoOffset'
  }
]
const availableAudioEffects = [
  {
    name: 'Delay',
    type: 'delay'
  }
]

function getEffectsBySection(section) {
  return section === 'formula' ? evalEffects.value : audioEffects.value
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
  draggingSection.value = section
  draggingEffectId.value = effectIdToDrag
}

function handleDragEnd() {
  draggingSection.value = null
  draggingEffectId.value = null
}

function handleUpdateEvalEffectOffset(effectIdToUpdate, nextOffset) {
  dawStore.updateEvalEffectParams(effectIdToUpdate, {
    offset: nextOffset
  })
}

function handleUpdateAudioEffectParam(effectIdToUpdate, key, value) {
  dawStore.updateAudioEffectParams(effectIdToUpdate, {
    [key]: value
  })
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
})

</script>
