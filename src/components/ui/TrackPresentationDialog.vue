<template>
  <Modal :open="visible" size="sm" title="Name and Color" @close="emit('cancel')">
    <label class="block text-xs uppercase tracking-[0.18em] text-zinc-500">
      Track Name
    </label>

    <Input
      ref="inputElement"
      v-model="draftName"
      class="mt-2"
      @keydown.enter.prevent="emitConfirm()"
      @keydown.esc.prevent="emit('cancel')"
    />

    <div class="mt-4">
      <label class="block text-xs uppercase tracking-[0.18em] text-zinc-500">
        Track Color
      </label>

      <div class="mt-2">
        <TrackColorPalette
          :colors="colors"
          :selected-color="draftColor"
          @select="draftColor = $event"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('cancel')">Cancel</Button>
        <Button @click="emitConfirm()">Save</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import TrackColorPalette from '@/components/timeline/TrackColorPalette.vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps({
  colors: {
    type: Array,
    required: true
  },
  initialColor: {
    type: String,
    required: true
  },
  initialName: {
    type: String,
    default: ''
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const draftColor = ref(props.initialColor)
const draftName = ref(props.initialName)
const inputElement = ref(null)

function syncDraftValues() {
  draftName.value = props.initialName
  draftColor.value = props.initialColor
}

function emitConfirm() {
  emit('confirm', {
    color: draftColor.value,
    name: draftName.value
  })
}

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    syncDraftValues()
    await nextTick()
    inputElement.value?.focus()
    inputElement.value?.select()
  },
  { immediate: true }
)

watch(
  () => [props.initialColor, props.initialName],
  () => {
    if (!props.visible) {
      syncDraftValues()
    }
  }
)
</script>
