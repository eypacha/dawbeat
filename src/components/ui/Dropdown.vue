<template>
  <div ref="rootElement" class="relative inline-flex">
    <div @click="toggle">
      <slot name="trigger" :open="open" />
    </div>

    <div
      v-if="open"
      class="absolute right-0 top-full z-40 mt-2 min-w-40 rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
    >
      <div
        v-for="item in items"
        :key="itemKey(item)"
        class="relative"
        @mouseenter="handleParentHover(item)"
        @mouseleave="handleParentLeave(item)"
      >
        <button
          class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-zinc-700"
          type="button"
          @click="handleParentClick(item)"
        >
          <span class="inline-flex h-4 w-4 items-center justify-center">
            <Check
              v-if="item.checked"
              class="h-3.5 w-3.5 text-emerald-300"
              :stroke-width="2.5"
            />
          </span>
          <span class="min-w-0 flex-1">{{ item.label }}</span>
          <ChevronRight
            v-if="hasChildren(item)"
            class="h-3.5 w-3.5 text-zinc-400"
            :stroke-width="2.5"
          />
        </button>

        <div
          v-if="hasChildren(item) && openSubmenuKey === itemKey(item)"
          class="absolute left-full top-0 z-50 ml-1 min-w-40 rounded border border-zinc-700 bg-zinc-800 py-1 text-sm text-zinc-100 shadow-lg shadow-black/40"
        >
          <button
            v-for="child in item.children"
            :key="itemKey(child)"
            class="flex w-full items-center gap-2 px-3 py-1.5 text-left transition hover:bg-zinc-700"
            type="button"
            @click="handleSelect(child)"
          >
            <span class="inline-flex h-4 w-4 items-center justify-center">
              <Check
                v-if="child.checked"
                class="h-3.5 w-3.5 text-emerald-300"
                :stroke-width="2.5"
              />
            </span>
            <span>{{ child.label }}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'
import { Check, ChevronRight } from 'lucide-vue-next'

const props = defineProps({
  items: {
    type: Array,
    default: () => []
  }
})

const emit = defineEmits(['select'])

const open = ref(false)
const openSubmenuKey = ref(null)
const rootElement = ref(null)

function close() {
  open.value = false
  openSubmenuKey.value = null
}

function toggle() {
  open.value = !open.value
}

function handleSelect(item) {
  emit('select', item)
  close()
}

function itemKey(item) {
  return `${item?.action ?? 'item'}-${item?.label ?? 'option'}-${item?.subdivision ?? ''}`
}

function hasChildren(item) {
  return Array.isArray(item?.children) && item.children.length > 0
}

function handleParentClick(item) {
  if (!hasChildren(item)) {
    handleSelect(item)
    return
  }

  const key = itemKey(item)
  openSubmenuKey.value = openSubmenuKey.value === key ? null : key
}

function handleParentHover(item) {
  if (!hasChildren(item)) {
    return
  }

  openSubmenuKey.value = itemKey(item)
}

function handleParentLeave(item) {
  if (!hasChildren(item)) {
    return
  }

  const key = itemKey(item)

  if (openSubmenuKey.value === key) {
    openSubmenuKey.value = null
  }
}

function handlePointerDown(event) {
  if (rootElement.value?.contains(event.target)) {
    return
  }

  close()
}

function handleKeydown(event) {
  if (event.key !== 'Escape') {
    return
  }

  close()
}

watch(open, (value) => {
  if (value) {
    window.addEventListener('pointerdown', handlePointerDown)
    window.addEventListener('keydown', handleKeydown)
    return
  }

  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('pointerdown', handlePointerDown)
  window.removeEventListener('keydown', handleKeydown)
})
</script>
