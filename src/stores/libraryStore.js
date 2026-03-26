import { defineStore } from 'pinia'
import { ref } from 'vue'
import { nanoid } from 'nanoid'
import { createDefaultLibraryItems } from '@/data/defaultLibraryItems'

const STORAGE_KEY = 'dawbeat-library'

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return createDefaultLibraryItems()
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : createDefaultLibraryItems()
  } catch {
    return createDefaultLibraryItems()
  }
}

function saveToStorage(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore
  }
}

export const useLibraryStore = defineStore('libraryStore', () => {
  const items = ref(loadFromStorage())

  function persist() {
    saveToStorage(items.value)
  }

  function normalizeText(value) {
    return String(value ?? '').trim()
  }

  function normalizeName(value) {
    return normalizeText(value).toLowerCase()
  }

  function getFormulaFingerprint({ formula, leftFormula, rightFormula, formulaStereo }) {
    if (formulaStereo) {
      return `stereo:${normalizeText(leftFormula)}|${normalizeText(rightFormula)}`
    }

    return `mono:${normalizeText(formula)}`
  }

  function addItem({ name, formula, leftFormula, rightFormula, formulaStereo, duration }) {
    const normalizedName = normalizeName(name || formula || leftFormula || 'Unnamed')
    const nextFormulaFingerprint = getFormulaFingerprint({
      formula,
      leftFormula,
      rightFormula,
      formulaStereo: Boolean(formulaStereo)
    })

    const hasDuplicateName = items.value.some((item) => normalizeName(item.name) === normalizedName)
    if (hasDuplicateName) {
      return { added: false, reason: 'duplicate-name' }
    }

    const hasDuplicateFormula = items.value.some((item) => {
      return getFormulaFingerprint(item) === nextFormulaFingerprint
    })

    if (hasDuplicateFormula) {
      return { added: false, reason: 'duplicate-formula' }
    }

    const item = {
      id: nanoid(),
      name: name || formula || leftFormula || 'Unnamed',
      formula: formula || '',
      leftFormula: leftFormula || '',
      rightFormula: rightFormula || '',
      formulaStereo: Boolean(formulaStereo),
      duration: duration ?? 4
    }

    items.value.unshift(item)
    persist()

    return { added: true, item }
  }

  function removeItem(id) {
    const idx = items.value.findIndex((item) => item.id === id)
    if (idx !== -1) {
      items.value.splice(idx, 1)
      persist()
    }
  }

  function renameItem(id, name) {
    const item = items.value.find((entry) => entry.id === id)
    if (item) {
      item.name = name
      persist()
    }
  }

  function updateItemFormula(id, formula) {
    const item = items.value.find((entry) => entry.id === id)
    if (item) {
      item.formula = formula
      persist()
    }
  }

  function updateItem(id, updates) {
    const item = items.value.find((entry) => entry.id === id)
    if (!item) {
      return { updated: false, reason: 'not-found' }
    }

    const nextName = normalizeText(updates?.name ?? item.name) || 'Unnamed'
    const nextFormulaStereo = Boolean(updates?.formulaStereo ?? item.formulaStereo)
    const nextFormula = normalizeText(updates?.formula ?? item.formula)
    const nextLeftFormula = normalizeText(updates?.leftFormula ?? item.leftFormula)
    const nextRightFormula = normalizeText(updates?.rightFormula ?? item.rightFormula)
    const nextNameKey = normalizeName(nextName)
    const nextFormulaFingerprint = getFormulaFingerprint({
      formula: nextFormula,
      leftFormula: nextLeftFormula,
      rightFormula: nextRightFormula,
      formulaStereo: nextFormulaStereo
    })

    const hasDuplicateName = items.value.some((entry) => {
      return entry.id !== id && normalizeName(entry.name) === nextNameKey
    })
    if (hasDuplicateName) {
      return { updated: false, reason: 'duplicate-name' }
    }

    const hasDuplicateFormula = items.value.some((entry) => {
      return entry.id !== id && getFormulaFingerprint(entry) === nextFormulaFingerprint
    })
    if (hasDuplicateFormula) {
      return { updated: false, reason: 'duplicate-formula' }
    }

    item.name = nextName
    item.formulaStereo = nextFormulaStereo
    item.formula = nextFormulaStereo ? '' : nextFormula
    item.leftFormula = nextFormulaStereo ? nextLeftFormula : ''
    item.rightFormula = nextFormulaStereo ? nextRightFormula : ''
    persist()

    return { updated: true, item }
  }

  function replaceItems(nextItems) {
    if (!Array.isArray(nextItems)) {
      return
    }

    items.value = nextItems.map((item) => ({
      id: item?.id || nanoid(),
      name: item?.name || item?.formula || item?.leftFormula || 'Unnamed',
      formula: item?.formula || '',
      leftFormula: item?.leftFormula || '',
      rightFormula: item?.rightFormula || '',
      formulaStereo: Boolean(item?.formulaStereo),
      duration: Number.isFinite(Number(item?.duration)) && Number(item.duration) > 0
        ? Number(item.duration)
        : 4
    }))
    persist()
  }

  function clearItems() {
    items.value = []
    persist()
  }

  function resetToDefaultItems() {
    items.value = createDefaultLibraryItems()
    persist()
  }

  return {
    items,
    addItem,
    removeItem,
    renameItem,
    updateItemFormula,
    updateItem,
    replaceItems,
    clearItems,
    resetToDefaultItems
  }
})
