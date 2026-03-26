<template>
  <Panel
    v-if="collapsed"
    class="flex min-h-0 w-[56px] max-w-[56px] min-w-[56px] flex-col items-center gap-2 overflow-hidden py-2"
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
      <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-600">{{ items.length }}</span>
    </div>
  </Panel>

  <Panel v-else class="flex h-full min-h-0 w-[280px] max-w-[280px] min-w-[280px] flex-col overflow-hidden">
    <div class="flex items-start justify-between gap-4">
      <div>
        <p class="text-xs uppercase tracking-[0.3em] text-zinc-500">Library</p>
      </div>

      <IconButton
        :icon="ChevronLeft"
        label="Collapse Library"
        size="sm"
        variant="plain"
        @click="emit('toggle-collapse')"
      />
    </div>

    <div
      v-if="items.length === 0"
      class="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center"
    >
      <BookOpen class="mb-3 h-8 w-8 text-zinc-700" />
      <p class="text-xs uppercase tracking-[0.3em] text-zinc-600">Formula Library</p>
      <p class="mt-2 text-center text-[11px] leading-5 text-zinc-700">
        Right-click a clip to add it here
      </p>
    </div>

    <div v-else class="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden">
      <div class="px-1 pb-2">
        <input
          v-model.trim="searchQuery"
          class="w-full border border-zinc-800 bg-zinc-950 px-2 py-1.5 text-xs text-zinc-100 outline-none placeholder:text-zinc-600 focus:border-zinc-600"
          placeholder="Search by name or formula"
          type="text"
        >
      </div>

      <div class="flex items-center justify-between px-1 pb-2">
        <p class="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
          {{ filteredItems.length }} / {{ items.length }} formula{{ filteredItems.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950/70">
        <div
          v-if="filteredItems.length === 0"
          class="flex h-full min-h-[120px] items-center justify-center px-4 text-center text-xs text-zinc-600"
        >
          No formulas match your search.
        </div>

        <article
          v-for="item in filteredItems"
          :key="item.id"
          class="group flex w-full items-start gap-2 border-b border-zinc-800 px-4 py-2 transition-colors bg-zinc-900 text-zinc-100"
        >
          <div
            class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
            title="Drag formula to timeline to create a clip"
            draggable="true"
            @dragstart="handleLibraryFormulaDragStart($event, item)"
            @dragend="handleLibraryFormulaDragEnd"
          >
            <GripVertical class="h-3.5 w-3.5" />
          </div>
          <div class="flex min-w-0 flex-1 items-start gap-2">
            <button class="min-w-0 flex-1 text-left" type="button">
              <span
                :ref="(element) => setNameViewportRef(item.id, element)"
                class="library-item-name-marquee block overflow-hidden text-sm text-white"
                :class="isNameMarqueeActive(item.id) ? 'is-overflowing' : ''"
                :style="getNameMarqueeStyle(item.id)"
                @mouseenter="handleNameMouseEnter(item.id)"
                @mouseleave="handleNameMouseLeave(item.id)"
              >
                <span class="library-item-name-track">
                  <span
                    :ref="(element) => setNameContentRef(item.id, element)"
                    class="library-item-name-copy"
                  >
                    <template v-for="(part, index) in getHighlightedParts(item.name)" :key="`${item.id}-name-${index}`">
                      <span
                        :class="part.match
                          ? 'rounded-[3px] bg-zinc-700/35 px-0.5 font-medium text-zinc-100 ring-1 ring-zinc-500/30 transition-colors duration-150'
                          : ''"
                      >
                        {{ part.text }}
                      </span>
                    </template>
                  </span>

                  <span
                    v-if="isNameMarqueeActive(item.id)"
                    aria-hidden="true"
                    class="library-item-name-copy"
                  >
                    <template v-for="(part, index) in getHighlightedParts(item.name)" :key="`${item.id}-name-duplicate-${index}`">
                      <span
                        :class="part.match
                          ? 'rounded-[3px] bg-zinc-700/35 px-0.5 font-medium text-zinc-100 ring-1 ring-zinc-500/30 transition-colors duration-150'
                          : ''"
                      >
                        {{ part.text }}
                      </span>
                    </template>
                  </span>
                </span>
              </span>
              <span class="mt-1 block truncate text-xs text-zinc-500">
                <template v-for="(part, index) in getHighlightedParts(getItemFormulaText(item))" :key="`${item.id}-formula-${index}`">
                  <span
                    :class="part.match
                      ? 'rounded-[3px] bg-zinc-700/30 px-0.5 text-zinc-300 ring-1 ring-zinc-500/25 transition-colors duration-150'
                      : ''"
                  >
                    {{ part.text }}
                  </span>
                </template>
              </span>
            </button>
            <div class="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <button
                class="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                type="button"
                title="Delete formula"
                @click="deleteFormula(item.id)"
              >
                <Trash2 class="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-vue-next'
import Panel from '@/components/ui/Panel.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useDawStore } from '@/stores/dawStore'

const NAME_MARQUEE_GAP_PX = 24
const NAME_MARQUEE_MIN_DURATION_SECONDS = 5
const NAME_MARQUEE_PIXELS_PER_SECOND = 32

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])

const libraryStore = useLibraryStore()
const dawStore = useDawStore()
const items = computed(() => libraryStore.items)
const searchQuery = ref('')
const normalizedSearchQuery = computed(() => searchQuery.value.trim().toLowerCase())
const nameCollator = new Intl.Collator(undefined, { sensitivity: 'base', numeric: true })
const nameViewportElements = new Map()
const nameContentElements = new Map()
const nameMarqueeStyles = reactive({})
const activeNameMarqueeId = ref(null)
const filteredItems = computed(() => {
  const query = normalizedSearchQuery.value
  const sourceItems = query
    ? items.value.filter((item) => {
      const searchableText = [
        item.name,
        item.formula,
        item.leftFormula,
        item.rightFormula
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return searchableText.includes(query)
    })
    : items.value

  return [...sourceItems].sort((a, b) => {
    const leftName = String(a?.name ?? '')
    const rightName = String(b?.name ?? '')
    return nameCollator.compare(leftName, rightName)
  })
})

function setNameViewportRef(id, element) {
  if (element) {
    nameViewportElements.set(id, element)
    return
  }

  nameViewportElements.delete(id)
  delete nameMarqueeStyles[id]

  if (activeNameMarqueeId.value === id) {
    activeNameMarqueeId.value = null
  }
}

function setNameContentRef(id, element) {
  if (element) {
    nameContentElements.set(id, element)
    return
  }

  nameContentElements.delete(id)
  delete nameMarqueeStyles[id]
}

function getNameMarqueeStyle(id) {
  return nameMarqueeStyles[id] ?? null
}

function isNameMarqueeActive(id) {
  return activeNameMarqueeId.value === id
}

function handleNameMouseEnter(id) {
  const viewportElement = nameViewportElements.get(id)
  const contentElement = nameContentElements.get(id)

  if (!viewportElement || !contentElement) {
    return
  }

  const viewportWidth = Math.ceil(viewportElement.clientWidth)
  const contentWidth = Math.ceil(contentElement.scrollWidth)

  if (contentWidth <= viewportWidth) {
    delete nameMarqueeStyles[id]
    activeNameMarqueeId.value = null
    return
  }

  const distance = contentWidth + NAME_MARQUEE_GAP_PX
  const durationSeconds = Math.max(
    NAME_MARQUEE_MIN_DURATION_SECONDS,
    distance / NAME_MARQUEE_PIXELS_PER_SECOND
  )

  nameMarqueeStyles[id] = {
    '--library-name-marquee-distance': `${distance}px`,
    '--library-name-marquee-duration': `${durationSeconds}s`
  }
  activeNameMarqueeId.value = id
}

function handleNameMouseLeave(id) {
  if (activeNameMarqueeId.value === id) {
    activeNameMarqueeId.value = null
  }
}

function deleteFormula(id) {
  libraryStore.removeItem(id)
}

function getItemFormulaText(item) {
  return item.formulaStereo ? `L: ${item.leftFormula} | R: ${item.rightFormula}` : (item.formula ?? '')
}

function getHighlightedParts(text) {
  const sourceText = String(text ?? '')
  const query = normalizedSearchQuery.value

  if (!query) {
    return [{ text: sourceText, match: false }]
  }

  const lowerSource = sourceText.toLowerCase()
  const parts = []
  let startIndex = 0

  while (startIndex < sourceText.length) {
    const matchIndex = lowerSource.indexOf(query, startIndex)

    if (matchIndex === -1) {
      parts.push({ text: sourceText.slice(startIndex), match: false })
      break
    }

    if (matchIndex > startIndex) {
      parts.push({ text: sourceText.slice(startIndex, matchIndex), match: false })
    }

    const matchEndIndex = matchIndex + query.length
    parts.push({ text: sourceText.slice(matchIndex, matchEndIndex), match: true })
    startIndex = matchEndIndex
  }

  return parts.length ? parts : [{ text: sourceText, match: false }]
}

function handleLibraryFormulaDragStart(event, item) {
  if (!event.dataTransfer) {
    return
  }

  event.dataTransfer.effectAllowed = 'copy'
  event.dataTransfer.setData('application/x-dawbeat-library-formula-item', JSON.stringify(item))

  // Mark drag as active so timeline lanes can render ghost preview
  // even when browsers hide custom drag data during dragover.
  dawStore.setClipDragPreview({
    start: 0,
    duration: item.duration ?? 4,
    targetLaneId: '__library-drag__'
  })
}

function handleLibraryFormulaDragEnd() {
  dawStore.clearClipDragPreview()
}
</script>

<style scoped>
.library-item-name-marquee {
  --library-name-marquee-gap: 24px;
}

.library-item-name-track {
  display: inline-flex;
  min-width: max-content;
  max-width: none;
  align-items: center;
  column-gap: var(--library-name-marquee-gap);
  will-change: transform;
}

.library-item-name-copy {
  display: inline-flex;
  min-width: max-content;
  white-space: nowrap;
}

.library-item-name-marquee.is-overflowing:hover .library-item-name-track {
  animation: library-item-name-marquee-scroll var(--library-name-marquee-duration, 7s) linear infinite;
}

@keyframes library-item-name-marquee-scroll {
  from {
    transform: translateX(0);
  }

  to {
    transform: translateX(calc(-1 * var(--library-name-marquee-distance, 0px)));
  }
}
</style>