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

      <div class="min-h-0 flex-1 overflow-y-auto overflow-x-hidden pr-1">
        <div class="grid gap-2">
          <div
            v-for="item in items"
            :key="item.id"
            class="group flex flex-col gap-1 border border-zinc-800 bg-zinc-950/50 px-3 py-2 transition-colors hover:border-zinc-700"
          >
            <div class="flex items-center gap-2">
              <span class="min-w-0 flex-1 truncate text-xs font-medium text-zinc-200">{{ item.name }}</span>
              <span
                class="shrink-0 text-[9px] uppercase tracking-[0.2em]"
                :class="item.formulaStereo ? 'text-sky-500' : 'text-zinc-600'"
              >{{ item.formulaStereo ? 'St' : 'Mo' }}</span>
            </div>

            <span class="truncate text-[10px] text-zinc-600">
              {{ item.formulaStereo ? `L: ${item.leftFormula} | R: ${item.rightFormula}` : item.formula }}
            </span>

            <span class="text-[9px] uppercase tracking-[0.2em] text-zinc-700">
              dur {{ item.duration }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </Panel>
</template>

<script setup>
import { computed } from 'vue'
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-vue-next'
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
