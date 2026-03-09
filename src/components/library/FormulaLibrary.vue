<template>
  <section class="flex min-h-[320px] flex-col border border-zinc-800 bg-zinc-900/80 p-4 shadow-lg shadow-black/20">
    <div class="mb-4 flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Library</p>
      </div>

      <button
        class="shrink-0 border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.24em] text-zinc-300 transition-colors hover:border-zinc-500 hover:text-zinc-100"
        type="button"
        @click="handleNewFormula"
      >
        + New Formula
      </button>
    </div>

    <div class="min-h-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950/70">
      <div
        v-if="!formulas.length"
        class="flex min-h-40 items-center justify-center px-4 text-sm text-zinc-500"
      >
        Library is empty.
      </div>

      <button
        v-for="formula in formulas"
        :key="formula.id"
        class="flex w-full cursor-grab flex-col border-b border-zinc-800 px-4 py-2 text-left transition-colors last:border-b-0"
        :class="formula.id === selectedFormulaId ? 'bg-zinc-900 text-zinc-100' : 'bg-transparent text-zinc-300 hover:bg-zinc-900/70'"
        draggable="true"
        type="button"
        @click="handleSelectFormula(formula.id)"
        @dblclick="handleEditFormula(formula.id)"
        @dragstart="handleDragStart($event, formula.id)"
      >
        <span class="truncate text-sm text-white">{{ getFormulaDisplayName(formula) }}</span>
        <span class="mt-1 truncate text-xs text-zinc-500">{{ formula.code }}</span>
      </button>
    </div>
  </section>
</template>

<script setup>
import { storeToRefs } from 'pinia'
import { getFormulaDisplayName } from '@/services/formulaService'
import { useDawStore } from '@/stores/dawStore'
import { ticksToPixels } from '@/utils/timeUtils'

const dawStore = useDawStore()
const { formulas, pixelsPerTick, selectedFormulaId } = storeToRefs(dawStore)
const FORMULA_DRAG_DURATION = 1
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
    ticksToPixels(FORMULA_DRAG_DURATION, pixelsPerTick.value),
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
