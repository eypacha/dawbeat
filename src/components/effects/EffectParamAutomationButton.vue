<template>
  <button
    class="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded border transition"
    :class="enabled
      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300'
      : 'border-zinc-700 bg-zinc-950 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
    :disabled="enabled"
    :title="`Automate ${label}`"
    type="button"
    @click.stop="emit('create')"
  >
    <Activity class="h-3 w-3" />
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { Activity } from 'lucide-vue-next'
import { useDawStore } from '@/stores/dawStore'

const props = defineProps({
  effectId: {
    type: String,
    default: null
  },
  laneId: {
    type: String,
    default: null
  },
  label: {
    type: String,
    required: true
  },
  paramKey: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['create'])

const dawStore = useDawStore()
const enabled = computed(() => {
  if (props.laneId) {
    return Boolean(dawStore.getAutomationLaneById(props.laneId))
  }

  if (props.effectId && props.paramKey) {
    return Boolean(dawStore.getAutomationLaneByAudioEffectParam(props.effectId, props.paramKey))
  }

  return false
})
</script>
