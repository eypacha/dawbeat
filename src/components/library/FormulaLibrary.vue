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

    <div class="mt-4 flex min-h-0 flex-1 flex-col items-center justify-center">
      <BookOpen class="mb-3 h-8 w-8 text-zinc-700" />
      <p class="text-xs uppercase tracking-[0.3em] text-zinc-600">Formula Library</p>
    </div>
  </Panel>
</template>

<script setup>
import { BookOpen, ChevronLeft, ChevronRight } from 'lucide-vue-next'
import Panel from '@/components/ui/Panel.vue'
import IconButton from '@/components/ui/IconButton.vue'

defineProps({
  collapsed: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggle-collapse'])
</script>