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

    <div class="flex min-h-0 flex-1 flex-col gap-4">
      <div class="min-h-0 overflow-auto border border-zinc-800 bg-zinc-950/70">
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
          @dragstart="handleDragStart($event, formula.id)"
        >
          <span class="truncate text-sm text-white">{{ getFormulaDisplayName(formula) }}</span>
          <span class="mt-1 truncate text-xs text-zinc-500">{{ formula.code }}</span>
        </button>
      </div>

      <div class="border border-zinc-800 bg-zinc-950/70 p-4">
        <template v-if="selectedFormula">
          <div class="mb-4">
            <p class="text-xs uppercase tracking-[0.24em] text-zinc-500">Editor</p>
          </div>

          <div class="flex flex-col gap-3">
            <label class="flex flex-col gap-2">
              <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Name</span>
              <input
                class="border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-500 focus:border-zinc-600"
                :placeholder="selectedFormula.code"
                :value="selectedFormula.name"
                type="text"
                @input="handleNameInput"
              />
            </label>

            <label class="flex flex-col gap-2">
              <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Formula</span>
              <textarea
                ref="formulaCodeInput"
                class="min-h-32 w-full resize-y border border-zinc-800 bg-zinc-900 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition-colors focus:border-zinc-600"
                :value="selectedFormula.code"
                spellcheck="false"
                @input="handleCodeInput"
              />
            </label>
          </div>
        </template>

        <div v-else class="flex min-h-32 items-center justify-center text-sm text-zinc-500">
          Select a formula to edit it.
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { computed, nextTick, ref } from 'vue'
import { storeToRefs } from 'pinia'
import { getFormulaById, getFormulaDisplayName } from '@/services/formulaService'
import { useDawStore } from '@/stores/dawStore'

const dawStore = useDawStore()
const { formulas, selectedFormulaId } = storeToRefs(dawStore)
const formulaCodeInput = ref(null)

const selectedFormula = computed(() => getFormulaById(formulas.value, selectedFormulaId.value))

async function handleNewFormula() {
  dawStore.addFormula()
  await nextTick()
  formulaCodeInput.value?.focus()
  formulaCodeInput.value?.select()
}

function handleSelectFormula(formulaId) {
  dawStore.selectFormula(formulaId)
}

function handleNameInput(event) {
  if (!selectedFormula.value) {
    return
  }

  dawStore.updateFormula(selectedFormula.value.id, {
    name: event.target.value
  })
}

function handleCodeInput(event) {
  if (!selectedFormula.value) {
    return
  }

  dawStore.updateFormula(selectedFormula.value.id, {
    code: event.target.value
  })
}

function handleDragStart(event, formulaId) {
  dawStore.selectFormula(formulaId)
  event.dataTransfer?.setData('formulaId', formulaId)
  event.dataTransfer?.setData('text/plain', formulaId)
  event.dataTransfer.effectAllowed = 'copy'
}
</script>
