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
      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-600">{{ formulas.length }}</span>
    </div>
  </Panel>

  <Panel v-else class="flex min-h-[320px] flex-col">
    <div class="mb-4 flex items-center gap-3">
      <IconButton
        :icon="ChevronLeft"
        label="Collapse Library"
        size="sm"
        variant="plain"
        @click="emit('toggle-collapse')"
      />

      <div class="min-w-0">
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Library</p>
      </div>

      <div class="min-w-0 flex-1" />

      <Button class="shrink-0" type="button" variant="ghost" @click="handleNewFormula">
        + New Formula
      </Button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950/70">
      <div
        v-if="!formulas.length"
        class="flex min-h-40 items-center justify-center px-4 text-sm text-zinc-500"
      >
        Library is empty.
      </div>

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
          @dragstart="handleDragStart($event, formula.id)"
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
            <span class="mt-1 block truncate text-xs text-zinc-500">{{ formula.code }}</span>
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
    </div>
  </Panel>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, Pencil, Trash2 } from 'lucide-vue-next'
import Button from '@/components/ui/Button.vue'
import IconButton from '@/components/ui/IconButton.vue'
import Panel from '@/components/ui/Panel.vue'
import { getFormulaDisplayName } from '@/services/formulaService'
import { DEFAULT_FORMULA_DROP_DURATION } from '@/services/timelineService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])

const dawStore = useDawStore()
const { formulas, pixelsPerTick, selectedFormulaId } = storeToRefs(dawStore)
const MIN_CLIP_RENDER_TICKS = 0.5

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

function handleDragStart(event, formulaId) {
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
    code.textContent = formula.code
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
</script>
