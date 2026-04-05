<template>
  <article
    class="w-full max-w-full min-w-0 overflow-hidden rounded border border-zinc-700 bg-zinc-800/90 p-3 text-zinc-100 transition-colors"
    :class="dragging ? 'opacity-70' : ''"
  >
    <div class="min-w-0">
      <div class="flex items-center justify-between gap-3">
        <div class="flex min-w-0 flex-1 items-center gap-2">
          <div
            class="-ml-1 flex h-5 w-4 shrink-0 cursor-grab items-center justify-center text-zinc-500"
            :class="dragging ? 'cursor-grabbing' : ''"
            draggable="true"
            title="Drag effect"
            @dragstart="emit('drag-start', effect.id)"
            @dragend="emit('drag-end')"
          >
            <GripVertical class="h-3.5 w-3.5" />
          </div>

          <div class="min-w-0 flex-1">
            <p class="truncate text-[13px] font-medium leading-tight text-zinc-50">{{ effectTitle }}</p>
          </div>
        </div>

        <div class="flex shrink-0 items-center gap-1.5">
          <button
            class="flex h-7 w-7 items-center justify-center rounded border border-zinc-700 bg-zinc-900 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-100"
            type="button"
            @click="emit('toggle-expanded', effect.id)"
          >
            <SlidersHorizontal class="h-3.5 w-3.5" />
          </button>

          <button
            class="flex h-7 w-7 items-center justify-center rounded border transition"
            :class="effect.enabled
              ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200 hover:bg-emerald-500/20'
              : 'border-zinc-700 bg-zinc-900 text-zinc-500 hover:border-zinc-500 hover:text-zinc-300'"
            type="button"
            @click="emit('toggle-enabled', effect.id)"
          >
            <Power class="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      <CollapseTransition>
        <div v-if="effect.expanded">
          <div class="grid gap-3 pt-4">
              <template v-if="effect.type === 'stereoOffset'">
                <div class="grid gap-2">
                  <div class="flex items-center justify-between gap-3">
                    <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Offset</span>
                    <span class="text-[10px] text-zinc-500">Number or variable</span>
                  </div>
                  <input
                    class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                    v-model="offsetDraft"
                    placeholder="128 or myVar"
                    type="text"
                    @blur="commitOffsetDraft"
                    @keydown.enter.prevent="commitOffsetDraft"
                    @keydown.esc.prevent="resetOffsetDraft"
                  />
                </div>
              </template>

              <template v-else-if="effect.type === 'tReplacement'">
                <div class="grid gap-2">
                  <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Mode</span>
                  <div class="grid grid-cols-2 gap-2">
                    <button
                      class="rounded border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition"
                      :class="!effect.params.stereo
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
                      type="button"
                      @click="handleStereoToggle(false)"
                    >
                      Mono
                    </button>

                    <button
                      class="rounded border px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] transition"
                      :class="effect.params.stereo
                        ? 'border-sky-500/40 bg-sky-500/10 text-sky-100'
                        : 'border-zinc-700 bg-zinc-900 text-zinc-400 hover:border-zinc-500 hover:text-zinc-100'"
                      type="button"
                      @click="handleStereoToggle(true)"
                    >
                      Stereo
                    </button>
                  </div>
                </div>

                <template v-if="effect.params.stereo">
                  <div class="grid gap-2">
                    <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Left</span>
                    <input
                      class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                      v-model="leftExpressionDraft"
                      type="text"
                      @blur="commitExpressionDraft('leftExpression')"
                      @keydown.enter.prevent="commitExpressionDraft('leftExpression')"
                      @keydown.esc.prevent="resetExpressionDraft('leftExpression')"
                    />
                  </div>

                  <div class="grid gap-2">
                    <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Right</span>
                    <input
                      class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                      v-model="rightExpressionDraft"
                      type="text"
                      @blur="commitExpressionDraft('rightExpression')"
                      @keydown.enter.prevent="commitExpressionDraft('rightExpression')"
                      @keydown.esc.prevent="resetExpressionDraft('rightExpression')"
                    />
                  </div>
                </template>

                <div v-else class="grid gap-2">
                  <span class="text-[10px] uppercase tracking-[0.24em] text-zinc-500">Replacement</span>
                  <input
                    class="w-full rounded border border-zinc-700 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition focus:border-zinc-500"
                    v-model="expressionDraft"
                    type="text"
                    @blur="commitExpressionDraft('expression')"
                    @keydown.enter.prevent="commitExpressionDraft('expression')"
                    @keydown.esc.prevent="resetExpressionDraft('expression')"
                  />
                </div>
              </template>

              <div class="flex items-center gap-2">
                <button
                  class="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-500 hover:text-zinc-100"
                  type="button"
                  @click="emit('reset', effect.id)"
                >
                  Reset
                </button>

                <button
                  class="rounded border border-zinc-700 bg-zinc-900 px-2.5 py-1 text-[10px] uppercase tracking-[0.18em] text-zinc-400 transition hover:border-red-500/50 hover:text-red-200"
                  type="button"
                  @click="emit('remove', effect.id)"
                >
                  Delete
                </button>
              </div>
          </div>
        </div>
      </CollapseTransition>
    </div>
  </article>
</template>

<script setup>
import { computed, ref, watch } from 'vue'
import { GripVertical, Power, SlidersHorizontal } from 'lucide-vue-next'
import CollapseTransition from '../ui/CollapseTransition.vue'

const props = defineProps({
  dragging: {
    type: Boolean,
    default: false
  },
  effect: {
    type: Object,
    required: true
  }
})

const emit = defineEmits([
  'drag-end',
  'drag-start',
  'remove',
  'reset',
  'toggle-enabled',
  'toggle-expanded',
  'update-param'
])

const effectTitle = computed(() => {
  if (props.effect.type === 'tReplacement') {
    return 'T Replacement'
  }

  return 'Stereo Offset'
})

const offsetDraft = ref('0')
const expressionDraft = ref('')
const leftExpressionDraft = ref('')
const rightExpressionDraft = ref('')

watch(
  () => [
    props.effect.type,
    props.effect.params.offset,
    props.effect.params.expression,
    props.effect.params.leftExpression,
    props.effect.params.rightExpression
  ],
  () => {
    offsetDraft.value = String(props.effect.params.offset ?? 0)
    expressionDraft.value = props.effect.params.expression ?? ''
    leftExpressionDraft.value = props.effect.params.leftExpression ?? ''
    rightExpressionDraft.value = props.effect.params.rightExpression ?? ''
  },
  { immediate: true }
)

function handleStereoToggle(nextStereo) {
  emit('update-param', props.effect.id, 'stereo', nextStereo)
}

function commitOffsetDraft() {
  const normalizedOffset = offsetDraft.value.trim()

  if (!normalizedOffset || normalizedOffset === String(props.effect.params.offset ?? '')) {
    offsetDraft.value = String(props.effect.params.offset ?? '')
    return
  }

  emit('update-param', props.effect.id, 'offset', normalizedOffset)
}

function resetOffsetDraft() {
  offsetDraft.value = String(props.effect.params.offset ?? 0)
}

function commitExpressionDraft(key) {
  const nextValue = getExpressionDraftValue(key)

  if (nextValue === String(props.effect.params[key] ?? '')) {
    return
  }

  emit('update-param', props.effect.id, key, nextValue)
}

function resetExpressionDraft(key) {
  const currentValue = String(props.effect.params[key] ?? '')

  if (key === 'leftExpression') {
    leftExpressionDraft.value = currentValue
    return
  }

  if (key === 'rightExpression') {
    rightExpressionDraft.value = currentValue
    return
  }

  expressionDraft.value = currentValue
}

function getExpressionDraftValue(key) {
  if (key === 'leftExpression') {
    return leftExpressionDraft.value
  }

  if (key === 'rightExpression') {
    return rightExpressionDraft.value
  }

  return expressionDraft.value
}
</script>
