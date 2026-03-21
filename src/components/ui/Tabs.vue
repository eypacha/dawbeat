<template>
  <div class="flex min-w-0 flex-col">
    <div
      class="shrink-0 flex flex-wrap items-end gap-1 border-b border-zinc-800 px-1"
      role="tablist"
      @keydown="handleTablistKeydown"
    >
      <button
        v-for="item in normalizedItems"
        :id="getTabId(item.id)"
        :key="item.id"
        :aria-controls="getPanelId(item.id)"
        :aria-selected="item.id === activeTabId"
        :class="item.id === activeTabId
          ? 'z-10 border-zinc-700 border-b-zinc-900 bg-zinc-900 text-zinc-100'
          : 'border-transparent bg-transparent text-zinc-500 hover:border-zinc-800 hover:bg-zinc-950/60 hover:text-zinc-100'"
        role="tab"
        class="relative min-w-[8.5rem] rounded-t-md border px-3 py-2 text-left transition-colors sm:flex-none"
        type="button"
        @click="selectTab(item.id)"
      >
        <p class="text-[10px] uppercase tracking-[0.22em]">{{ item.label }}</p>
        <p
          v-if="item.description"
          class="mt-1 text-[11px] normal-case tracking-normal text-zinc-500"
        >
          {{ item.description }}
        </p>
      </button>
    </div>

    <div
      :id="getPanelId(activeTabId)"
      :aria-labelledby="getTabId(activeTabId)"
      class="min-h-0 flex-1 overflow-y-auto rounded-b-md rounded-tr-md border border-t-0 border-zinc-800 bg-zinc-900/60 p-4 shadow-lg shadow-black/20"
      role="tabpanel"
    >
      <slot :active-tab-id="activeTabId" :active-tab-item="activeTabItem" />
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'

const props = defineProps({
  items: {
    type: Array,
    required: true
  },
  modelValue: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue'])

const normalizedItems = computed(() =>
  props.items
    .filter((item) => item && typeof item.id === 'string' && item.id)
    .map((item) => ({
      description: typeof item.description === 'string' ? item.description : '',
      id: item.id,
      label: typeof item.label === 'string' && item.label ? item.label : item.id
    }))
)
const activeTabId = computed(() => {
  if (normalizedItems.value.some((item) => item.id === props.modelValue)) {
    return props.modelValue
  }

  return normalizedItems.value[0]?.id ?? ''
})
const activeTabItem = computed(() =>
  normalizedItems.value.find((item) => item.id === activeTabId.value) ?? null
)

function selectTab(tabId) {
  if (!tabId || tabId === activeTabId.value) {
    return
  }

  emit('update:modelValue', tabId)
}

function handleTablistKeydown(event) {
  if (!normalizedItems.value.length) {
    return
  }

  const activeIndex = normalizedItems.value.findIndex((item) => item.id === activeTabId.value)

  if (event.key === 'ArrowRight') {
    event.preventDefault()
    selectTab(normalizedItems.value[(activeIndex + 1) % normalizedItems.value.length].id)
    return
  }

  if (event.key === 'ArrowLeft') {
    event.preventDefault()
    selectTab(normalizedItems.value[(activeIndex - 1 + normalizedItems.value.length) % normalizedItems.value.length].id)
    return
  }

  if (event.key === 'Home') {
    event.preventDefault()
    selectTab(normalizedItems.value[0].id)
    return
  }

  if (event.key === 'End') {
    event.preventDefault()
    selectTab(normalizedItems.value[normalizedItems.value.length - 1].id)
  }
}

function getTabId(tabId) {
  return `ui-tab-${tabId}`
}

function getPanelId(tabId) {
  return `ui-tabpanel-${tabId}`
}
</script>
