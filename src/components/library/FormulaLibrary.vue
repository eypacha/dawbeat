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
      <div class="flex items-center justify-between px-1 pb-2">
        <p class="text-[10px] uppercase tracking-[0.3em] text-zinc-600">
          {{ items.length }} formula{{ items.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div class="min-h-0 flex-1 overflow-auto border border-zinc-800 bg-zinc-950/70">
        <article
          v-for="item in items"
          :key="item.id"
          class="group flex w-full items-start gap-2 border-b border-zinc-800 px-4 py-2 transition-colors bg-zinc-900 text-zinc-100"
        >
          <div
            class="-ml-1 mt-0.5 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500 transition group-hover:text-zinc-300"
            title="Drag formula"
            draggable="true"
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
                class="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
                type="button"
                title="Edit formula"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M21.174 6.812a1 1 0 0 0-3.986-3.987L3.842 16.174a2 2 0 0 0-.5.83l-1.321 4.352a.5.5 0 0 0 .623.622l4.353-1.32a2 2 0 0 0 .83-.497z"></path><path d="m15 5 4 4"></path></svg>
              </button>
              <button
                class="flex h-6 w-6 items-center justify-center rounded border border-zinc-700 bg-zinc-950/80 text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                type="button"
                title="Delete formula"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="h-3.5 w-3.5"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" x2="10" y1="11" y2="17"></line><line x1="14" x2="14" y1="11" y2="17"></line></svg>
              </button>
            </div>
          </div>
        </article>
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight, GripVertical } from 'lucide-vue-next'
import Panel from '@/components/ui/Panel.vue'
import IconButton from '@/components/ui/IconButton.vue'
import { useLibraryStore } from '@/stores/libraryStore'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])

const libraryStore = useLibraryStore()
const items = computed(() => libraryStore.items)
</script>