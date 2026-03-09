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

const dawStore = useDawStore()
const { formulas, selectedFormulaId } = storeToRefs(dawStore)

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
  dawStore.selectFormula(formulaId)
  event.dataTransfer?.setData('formulaId', formulaId)
  event.dataTransfer?.setData('text/plain', formulaId)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>
