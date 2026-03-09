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
              :disabled="activeSection === 'formula' && !canAddFormulaEffect"
              variant="ghost"
              @click="toggleAddMenu(activeSection)"
            >
              {{ activeSection === 'formula' ? '+ Add Formula Effect' : '+ Add Audio Effect' }}
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
                  <span
                    class="rounded border px-2 py-0.5 text-[10px] uppercase tracking-[0.2em]"
                    :class="activeSection === 'formula'
                      ? 'border-sky-500/30 bg-sky-500/10 text-sky-200'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-200'"
                  >
                    {{ activeSection }}
                  </span>
                </button>
              </div>
            </div>
          </div>

          <div class="mt-4 min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
            <div class="grid gap-3">
              <template v-if="activeSection === 'audio'">
                <EffectItem
                  v-for="effect in audioEffects"
                  :key="effect.id"
                  :dragging="draggingEffectId === effect.id && draggingSection === 'audio'"
                  :effect="effect"
                  @drag-end="handleDragEnd"
                  @drag-start="handleDragStart('audio', $event)"
                  @toggle-enabled="handleToggleEnabled('audio', $event)"
                  @toggle-expanded="handleToggleExpanded('audio', $event)"
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
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { storeToRefs } from 'pinia'
import EvalEffectItem from '@/components/effects/EvalEffectItem.vue'
import Button from '@/components/ui/Button.vue'
import Divider from '@/components/ui/Divider.vue'
import Panel from '@/components/ui/Panel.vue'
import EffectItem from '@/components/effects/EffectItem.vue'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { evalEffects } = storeToRefs(dawStore)
const effectId = ref(5)
const activeSection = ref('formula')
const activeAddMenu = ref(null)
const draggingEffectId = ref(null)
const draggingSection = ref(null)
const audioEffects = ref([
  {
    id: 'fx2',
    name: 'Reverb',
    type: 'audio',
    enabled: true,
    expanded: false,
    parameters: [
      { label: 'Room Size', value: '0.72', fill: '72%' },
      { label: 'Wet', value: '0.30', fill: '30%' },
      { label: 'Dry', value: '0.84', fill: '84%' }
    ]
  },
  {
    id: 'fx3',
    name: 'EQ',
    type: 'audio',
    enabled: false,
    expanded: false,
    parameters: [
      { label: 'Low', value: '+2 dB', fill: '58%' },
      { label: 'Mid', value: '-1 dB', fill: '44%' },
      { label: 'High', value: '+3 dB', fill: '64%' }
    ]
  }
])

const availableFormulaEffects = [
  {
    name: 'Stereo Offset',
    type: 'stereoOffset'
  }
]
const availableAudioEffects = [
  {
    name: 'Reverb',
    type: 'audio',
    parameters: [
      { label: 'Room Size', value: '0.72', fill: '72%' },
      { label: 'Wet', value: '0.30', fill: '30%' },
      { label: 'Dry', value: '0.84', fill: '84%' }
    ]
  },
  {
    name: 'Delay',
    type: 'audio',
    parameters: [
      { label: 'Time', value: '1/8', fill: '52%' },
      { label: 'Feedback', value: '0.36', fill: '36%' }
    ]
  },
  {
    name: 'EQ',
    type: 'audio',
    parameters: [
      { label: 'Low', value: '+2 dB', fill: '58%' },
      { label: 'Mid', value: '-1 dB', fill: '44%' },
      { label: 'High', value: '+3 dB', fill: '64%' }
    ]
  },
  {
    name: 'Filter',
    type: 'audio',
    parameters: [
      { label: 'Cutoff', value: '2.4 kHz', fill: '66%' },
      { label: 'Resonance', value: '0.21', fill: '21%' }
    ]
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

  getEffectsBySection(section).push({
    id: `fx${effectId.value}`,
    name: template.name,
    type: template.type,
    enabled: true,
    expanded: true,
    parameters: template.parameters.map((parameter) => ({ ...parameter }))
  })
  effectId.value += 1
  activeAddMenu.value = null
}

function handleToggleEnabled(section, effectIdToToggle) {
  if (section === 'formula') {
    dawStore.toggleEvalEffect(effectIdToToggle)
    return
  }

  const effect = getEffectsBySection(section).find((entry) => entry.id === effectIdToToggle)

  if (!effect) {
    return
  }

  effect.enabled = !effect.enabled
}

function handleToggleExpanded(section, effectIdToToggle) {
  if (section === 'formula') {
    dawStore.toggleEvalEffectExpanded(effectIdToToggle)
    return
  }

  const effect = getEffectsBySection(section).find((entry) => entry.id === effectIdToToggle)

  if (!effect) {
    return
  }

  effect.expanded = !effect.expanded
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

const canAddFormulaEffect = computed(
  () => !evalEffects.value.some((effect) => effect.type === 'stereoOffset')
)
</script>
