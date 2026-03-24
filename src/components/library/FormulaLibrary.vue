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
              <span class="block truncate text-sm text-white">{{ item.name }}</span>
              <span class="mt-1 block truncate text-xs text-zinc-500">
                {{ item.formulaStereo ? `L: ${item.leftFormula} | R: ${item.rightFormula}` : item.formula }}
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
import { computed, ref } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, GripVertical, Trash2 } from 'lucide-vue-next'
import Panel from '@/components/ui/Panel.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { useLibraryStore } from '@/stores/libraryStore'
import { useDawStore } from '@/stores/dawStore'

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
const filteredItems = computed(() => {
  const query = searchQuery.value.toLowerCase()

  if (!query) {
    return items.value
  }

  return items.value.filter((item) => {
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
})

function deleteFormula(id) {
  libraryStore.removeItem(id)
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