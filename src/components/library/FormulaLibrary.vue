<template>
  <Panel
    v-if="collapsed"
    class="flex min-h-[320px] w-[56px] max-w-[56px] min-w-[56px] flex-col items-center gap-2 py-2"
    padding="none"
  >
    <IconButton
      :icon="ChevronRight"
      label="Expand Library"
      size="sm"
      variant="plain"
      @click="emit('toggle-collapse')"
    />

    <div class="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-zinc-500">
      <BookOpen class="h-4 w-4" />
      <span
        class="text-[10px] uppercase tracking-[0.3em]"
        style="writing-mode: vertical-rl; transform: rotate(180deg);"
      >
        Library
      </span>
      <div class="flex flex-col items-center gap-1 text-[9px] uppercase tracking-[0.2em] text-zinc-600">
        <span>F {{ formulas.length }}</span>
        <span>V {{ valueTrackerLibraryItems.length }}</span>
      </div>
    </div>
  </Panel>

  <Panel v-else :opaque="!showCollapseToggle" class="flex h-full min-h-[320px] flex-col">
    <div class="mb-4 flex flex-wrap items-center gap-3">
      <IconButton
        v-if="showCollapseToggle"
        :icon="ChevronLeft"
        label="Collapse Library"
        size="sm"
        variant="plain"
        @click="emit('toggle-collapse')"
      />

      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Library</p>
      </div>

      <div class="inline-flex overflow-hidden border border-zinc-800 bg-zinc-950/70">
        <button
          class="px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] transition-colors"
          :class="activeLibraryTab === 'formulas' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'"
          type="button"
          @click="activeLibraryTab = 'formulas'"
        >
          Formulas
        </button>
        <button
          class="px-3 py-1.5 text-[10px] uppercase tracking-[0.24em] transition-colors"
          :class="activeLibraryTab === 'valueTrackers' ? 'bg-zinc-900 text-zinc-100' : 'text-zinc-500 hover:text-zinc-200'"
          type="button"
          @click="activeLibraryTab = 'valueTrackers'"
        >
          Values
        </button>
      </div>

      <div class="min-w-0 flex-1" />

      <Button class="shrink-0" type="button" variant="ghost" @click="handleNewItem">
        {{ activeLibraryTab === 'formulas' ? '+ New Formula' : '+ New Values' }}
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950/70">
      <div
        v-if="activeLibraryTab === 'formulas' && !formulas.length"
        class="flex min-h-40 items-center justify-center px-4 text-sm text-zinc-500"
      >
        Formula library is empty.
      </div>

      <div
        v-else-if="activeLibraryTab === 'valueTrackers' && !valueTrackerLibraryItems.length"
        class="flex min-h-40 items-center justify-center px-4 text-sm text-zinc-500"
      >
        Value tracker library is empty.
      </div>

      <template v-else-if="activeLibraryTab === 'formulas'">
        <article
          v-for="formula in formulas"
          :key="formula.id"
          class="group flex w-full items-start gap-2 border-b border-zinc-800 px-4 py-2 transition-colors"
          :class="formula.id === selectedFormulaId ? 'bg-zinc-900 text-zinc-100' : 'bg-transparent text-zinc-300 hover:bg-zinc-900/70'"
        >
          <div
            class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
            title="Drag formula"
            draggable="true"
            @dragstart="handleFormulaDragStart($event, formula.id)"
          >
            <GripVertical class="h-3.5 w-3.5" />
          </div>

          <div class="flex min-w-0 flex-1 items-start gap-2">
            <button
              class="min-w-0 flex-1 text-left"
              type="button"
              @click="handleSelectFormula(formula.id)"
              @dblclick="handleEditFormula(formula.id)"
            >
              <span class="block truncate text-sm text-white">{{ getFormulaDisplayName(formula) }}</span>
              <span class="mt-1 block truncate text-xs text-zinc-500">{{ getFormulaDisplayCode(formula) }}</span>
            </button>

            <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                type="button"
                title="Edit formula"
                @click.stop="handleEditFormula(formula.id)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>

              <button
                class="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                type="button"
                title="Delete formula"
                @click.stop="handleRemoveFormula(formula.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </article>
      </template>

      <template v-else>
        <article
          v-for="valueTrackerLibraryItem in valueTrackerLibraryItems"
          :key="valueTrackerLibraryItem.id"
          class="group flex w-full items-start gap-2 border-b border-zinc-800 px-4 py-2 transition-colors"
          :class="valueTrackerLibraryItem.id === selectedValueTrackerLibraryItemId ? 'bg-zinc-900 text-zinc-100' : 'bg-transparent text-zinc-300 hover:bg-zinc-900/70'"
        >
          <div
            class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
            title="Drag value pattern"
            draggable="true"
            @dragstart="handleValueTrackerLibraryItemDragStart($event, valueTrackerLibraryItem.id)"
          >
            <GripVertical class="h-3.5 w-3.5" />
          </div>

          <div class="flex min-w-0 flex-1 items-start gap-2">
            <button
              class="min-w-0 flex-1 text-left"
              type="button"
              @click="handleSelectValueTrackerLibraryItem(valueTrackerLibraryItem.id)"
              @dblclick="handleEditValueTrackerLibraryItem(valueTrackerLibraryItem.id)"
            >
              <span class="block truncate text-sm text-white">{{ valueTrackerLibraryItem.name }}</span>
              <span class="mt-1 block truncate text-xs text-zinc-500">{{ getValueTrackerLibraryItemSummary(valueTrackerLibraryItem) }}</span>
            </button>

            <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                <button
                  class="flex h-6 w-6 items-center justify-center border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                  type="button"
                  title="Rename value pattern"
                  @click.stop="handleRenameValueTrackerLibraryItem(valueTrackerLibraryItem.id)"
                >
                  <TextCursorInput class="h-3.5 w-3.5" />
                </button>

              <button
                class="flex h-6 w-6 items-center justify-center border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                type="button"
                title="Edit value pattern"
                @click.stop="handleEditValueTrackerLibraryItem(valueTrackerLibraryItem.id)"
              >
                <Pencil class="h-3.5 w-3.5" />
              </button>

              <button
                class="flex h-6 w-6 items-center justify-center border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                type="button"
                title="Delete value pattern"
                @click.stop="handleRemoveValueTrackerLibraryItem(valueTrackerLibraryItem.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </article>
      </template>
    </div>

    <ValueTrackerClipEditorDialog
      :duration="editingValueTrackerLibraryItem?.duration ?? 4"
      :initial-held-value="null"
      :initial-values="editingValueTrackerLibraryItem?.values ?? []"
      :step-subdivision="editingValueTrackerLibraryItem?.stepSubdivision ?? 4"
      :title="editingValueTrackerLibraryItem?.name ?? 'Value Pattern'"
      :visible="Boolean(editingValueTrackerLibraryItem)"
      @close="closeValueTrackerLibraryItemEditor"
      @update="handleValueTrackerLibraryItemEditorUpdate"
    />

    <TextInputDialog
      :initial-value="renamingValueTrackerLibraryItem?.name ?? ''"
      label="Name"
      title="Rename Value Pattern"
      :visible="Boolean(renamingValueTrackerLibraryItem)"
      @cancel="closeValueTrackerLibraryItemRenameDialog"
      @confirm="confirmValueTrackerLibraryItemRename"
    />
  </Panel>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { storeToRefs } from 'pinia'
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, Pencil, TextCursorInput, Trash2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import TextInputDialog from '@/components/ui/TextInputDialog.vue'
import ValueTrackerClipEditorDialog from '@/components/ui/ValueTrackerClipEditorDialog.vue'
import { getFormulaDisplayCode, getFormulaDisplayName } from '@/services/formulaService'
import { DEFAULT_FORMULA_DROP_DURATION } from '@/services/timelineService'
import {
  getValueTrackerEventCount,
  getValueTrackerStepCount
} from '@/services/valueTrackerService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const FORMULA_LIBRARY_TAB = 'formulas'
const VALUE_TRACKER_LIBRARY_TAB = 'valueTrackers'
const MIN_CLIP_RENDER_TICKS = 0.5

const props = defineProps({
  collapsed: {
    type: Boolean,
    default: false
  },
  showCollapseToggle: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['formula-drag-start', 'toggle-collapse'])

const dawStore = useDawStore()
const {
  formulas,
  pixelsPerTick,
  selectedFormulaId,
  selectedValueTrackerLibraryItemId,
  valueTrackerLibraryItems
} = storeToRefs(dawStore)

const activeLibraryTab = ref(FORMULA_LIBRARY_TAB)
const editingValueTrackerLibraryItemId = ref(null)
const renamingValueTrackerLibraryItemId = ref(null)

const editingValueTrackerLibraryItem = computed(() =>
  valueTrackerLibraryItems.value.find((item) => item.id === editingValueTrackerLibraryItemId.value) ?? null
)
const renamingValueTrackerLibraryItem = computed(() =>
  valueTrackerLibraryItems.value.find((item) => item.id === renamingValueTrackerLibraryItemId.value) ?? null
)

function handleNewItem() {
  if (activeLibraryTab.value === FORMULA_LIBRARY_TAB) {
    handleNewFormula()
    return
  }

  handleNewValueTrackerLibraryItem()
}

function handleNewFormula() {
  const formulaId = dawStore.addFormula()
  dawStore.setEditingFormula(formulaId)
}

function handleSelectFormula(formulaId) {
  dawStore.selectFormula(formulaId)
}

function handleEditFormula(formulaId) {
  dawStore.selectFormula(formulaId)
  dawStore.setEditingFormula(formulaId)
}

function handleRemoveFormula(formulaId) {
  dawStore.removeFormula(formulaId)
}

function handleNewValueTrackerLibraryItem() {
  const valueTrackerLibraryItemId = dawStore.addValueTrackerLibraryItem()

  activeLibraryTab.value = VALUE_TRACKER_LIBRARY_TAB
  dawStore.selectValueTrackerLibraryItem(valueTrackerLibraryItemId)
  editingValueTrackerLibraryItemId.value = valueTrackerLibraryItemId
}

function handleSelectValueTrackerLibraryItem(valueTrackerLibraryItemId) {
  dawStore.selectValueTrackerLibraryItem(valueTrackerLibraryItemId)
}

function handleEditValueTrackerLibraryItem(valueTrackerLibraryItemId) {
  dawStore.selectValueTrackerLibraryItem(valueTrackerLibraryItemId)
  editingValueTrackerLibraryItemId.value = valueTrackerLibraryItemId
}

function closeValueTrackerLibraryItemEditor() {
  editingValueTrackerLibraryItemId.value = null
}

function handleValueTrackerLibraryItemEditorUpdate(nextDraft) {
  if (!editingValueTrackerLibraryItemId.value) {
    return
  }

  dawStore.updateValueTrackerLibraryItem(editingValueTrackerLibraryItemId.value, {
    values: nextDraft?.values
  })
}

function handleRenameValueTrackerLibraryItem(valueTrackerLibraryItemId) {
  dawStore.selectValueTrackerLibraryItem(valueTrackerLibraryItemId)
  renamingValueTrackerLibraryItemId.value = valueTrackerLibraryItemId
}

function closeValueTrackerLibraryItemRenameDialog() {
  renamingValueTrackerLibraryItemId.value = null
}

function confirmValueTrackerLibraryItemRename(nextName) {
  const valueTrackerLibraryItemId = renamingValueTrackerLibraryItemId.value

  if (!valueTrackerLibraryItemId) {
    return
  }

  dawStore.recordHistoryStep('rename-value-tracker-library-item', () => {
    dawStore.updateValueTrackerLibraryItem(valueTrackerLibraryItemId, {
      name: nextName
    })
  })
  closeValueTrackerLibraryItemRenameDialog()
}

function handleRemoveValueTrackerLibraryItem(valueTrackerLibraryItemId) {
  dawStore.removeValueTrackerLibraryItem(valueTrackerLibraryItemId)

  if (editingValueTrackerLibraryItemId.value === valueTrackerLibraryItemId) {
    editingValueTrackerLibraryItemId.value = null
  }

  if (renamingValueTrackerLibraryItemId.value === valueTrackerLibraryItemId) {
    renamingValueTrackerLibraryItemId.value = null
  }
}

function handleFormulaDragStart(event, formulaId) {
  const formula = formulas.value.find((entry) => entry.id === formulaId)

  if (!formula) {
    return
  }

  dawStore.selectFormula(formulaId)
  event.dataTransfer?.setData('formulaId', formulaId)
  event.dataTransfer?.setData('text/plain', formulaId)
  event.dataTransfer?.setData('formulaDragOffsetPx', String(getFormulaDragOffset(event)))
  event.dataTransfer.effectAllowed = 'copy'

  const dragImage = createFormulaDragImage(formula)

  if (dragImage && event.dataTransfer) {
    const offsetX = getFormulaDragOffset(event)
    event.dataTransfer.setDragImage(dragImage, offsetX, 18)
    requestAnimationFrame(() => {
      dragImage.remove()
    })
  }

  if (!props.showCollapseToggle) {
    emit('formula-drag-start')
  }
}

function handleValueTrackerLibraryItemDragStart(event, valueTrackerLibraryItemId) {
  const valueTrackerLibraryItem = valueTrackerLibraryItems.value.find(
    (item) => item.id === valueTrackerLibraryItemId
  )

  if (!valueTrackerLibraryItem) {
    return
  }

  dawStore.selectValueTrackerLibraryItem(valueTrackerLibraryItemId)
  event.dataTransfer?.setData('valueTrackerLibraryItemId', valueTrackerLibraryItemId)
  event.dataTransfer?.setData(
    'valueTrackerLibraryDragOffsetPx',
    String(getValueTrackerLibraryItemDragOffset(event, valueTrackerLibraryItem))
  )
  event.dataTransfer.effectAllowed = 'copy'

  const dragImage = createValueTrackerLibraryItemDragImage(valueTrackerLibraryItem)

  if (dragImage && event.dataTransfer) {
    const offsetX = getValueTrackerLibraryItemDragOffset(event, valueTrackerLibraryItem)
    event.dataTransfer.setDragImage(dragImage, offsetX, 18)
    requestAnimationFrame(() => {
      dragImage.remove()
    })
  }

  if (!props.showCollapseToggle) {
    emit('formula-drag-start')
  }
}

function getFormulaDragOffset(event) {
  const triggerRect = event.currentTarget?.getBoundingClientRect()
  const clipWidth = getFormulaDragWidth()

  if (!triggerRect) {
    return Math.round(clipWidth / 2)
  }

  const pointerOffset = event.clientX - triggerRect.left
  return Math.round(Math.max(0, Math.min(pointerOffset, clipWidth - 1)))
}

function getFormulaDragWidth() {
  return Math.max(
    ticksToPixels(DEFAULT_FORMULA_DROP_DURATION, pixelsPerTick.value),
    ticksToPixels(MIN_CLIP_RENDER_TICKS, pixelsPerTick.value)
  )
}

function getValueTrackerLibraryItemDragOffset(event, valueTrackerLibraryItem) {
  const triggerRect = event.currentTarget?.getBoundingClientRect()
  const clipWidth = getValueTrackerLibraryItemDragWidth(valueTrackerLibraryItem)

  if (!triggerRect) {
    return Math.round(clipWidth / 2)
  }

  const pointerOffset = event.clientX - triggerRect.left
  return Math.round(Math.max(0, Math.min(pointerOffset, clipWidth - 1)))
}

function getValueTrackerLibraryItemDragWidth(valueTrackerLibraryItem) {
  return Math.max(
    ticksToPixels(valueTrackerLibraryItem.duration, pixelsPerTick.value),
    ticksToPixels(MIN_CLIP_RENDER_TICKS, pixelsPerTick.value)
  )
}

function createFormulaDragImage(formula) {
  if (typeof document === 'undefined') {
    return null
  }

  const element = document.createElement('div')
  element.style.position = 'fixed'
  element.style.top = '-9999px'
  element.style.left = '-9999px'
  element.style.width = `${getFormulaDragWidth()}px`
  element.style.minHeight = '48px'
  element.style.padding = '8px'
  element.style.border = '1px solid rgba(161, 161, 170, 0.7)'
  element.style.background = 'rgba(39, 39, 42, 0.95)'
  element.style.color = 'rgb(244 244 245)'
  element.style.fontFamily = 'monospace'
  element.style.fontSize = '12px'
  element.style.boxSizing = 'border-box'
  element.style.pointerEvents = 'none'
  element.style.borderRadius = '0'
  element.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.35)'
  element.style.overflow = 'hidden'

  const title = document.createElement('div')
  title.textContent = getFormulaDisplayName(formula)
  title.style.whiteSpace = 'nowrap'
  title.style.overflow = 'hidden'
  title.style.textOverflow = 'ellipsis'
  title.style.fontWeight = '600'
  element.appendChild(title)

  if (formula.name.trim()) {
    const code = document.createElement('div')
    code.textContent = getFormulaDisplayCode(formula)
    code.style.marginTop = '4px'
    code.style.whiteSpace = 'nowrap'
    code.style.overflow = 'hidden'
    code.style.textOverflow = 'ellipsis'
    code.style.fontSize = '10px'
    code.style.opacity = '0.7'
    element.appendChild(code)
  }

  document.body.appendChild(element)
  return element
}

function createValueTrackerLibraryItemDragImage(valueTrackerLibraryItem) {
  if (typeof document === 'undefined') {
    return null
  }

  const element = document.createElement('div')
  element.style.position = 'fixed'
  element.style.top = '-9999px'
  element.style.left = '-9999px'
  element.style.width = `${getValueTrackerLibraryItemDragWidth(valueTrackerLibraryItem)}px`
  element.style.minHeight = '48px'
  element.style.padding = '8px'
  element.style.border = '1px solid rgba(251, 191, 36, 0.5)'
  element.style.background = 'rgba(39, 39, 42, 0.95)'
  element.style.color = 'rgb(254 243 199)'
  element.style.fontFamily = 'monospace'
  element.style.fontSize = '12px'
  element.style.boxSizing = 'border-box'
  element.style.pointerEvents = 'none'
  element.style.borderRadius = '0'
  element.style.boxShadow = '0 6px 18px rgba(0, 0, 0, 0.35)'
  element.style.overflow = 'hidden'

  const title = document.createElement('div')
  title.textContent = valueTrackerLibraryItem.name
  title.style.whiteSpace = 'nowrap'
  title.style.overflow = 'hidden'
  title.style.textOverflow = 'ellipsis'
  title.style.fontWeight = '600'
  element.appendChild(title)

  const summary = document.createElement('div')
  summary.textContent = getValueTrackerLibraryItemSummary(valueTrackerLibraryItem)
  summary.style.marginTop = '4px'
  summary.style.whiteSpace = 'nowrap'
  summary.style.overflow = 'hidden'
  summary.style.textOverflow = 'ellipsis'
  summary.style.fontSize = '10px'
  summary.style.opacity = '0.7'
  element.appendChild(summary)

  document.body.appendChild(element)
  return element
}

function getValueTrackerLibraryItemSummary(valueTrackerLibraryItem) {
  const eventCount = getValueTrackerEventCount(valueTrackerLibraryItem.values)
  const stepCount = getValueTrackerStepCount(
    valueTrackerLibraryItem.duration,
    valueTrackerLibraryItem.stepSubdivision
  )

  return `${eventCount} sets · ${stepCount} steps · ${valueTrackerLibraryItem.stepSubdivision} step/tick`
}

watch(selectedValueTrackerLibraryItemId, (valueTrackerLibraryItemId) => {
  if (!valueTrackerLibraryItemId) {
    return
  }

  activeLibraryTab.value = VALUE_TRACKER_LIBRARY_TAB
})
</script>
