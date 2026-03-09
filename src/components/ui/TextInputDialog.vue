<template>
  <Modal :open="visible" size="sm" :title="title" @close="emit('cancel')">
    <label class="block text-xs uppercase tracking-[0.18em] text-zinc-500">
      {{ label }}
    </label>

    <Input
      ref="inputElement"
      v-model="draftValue"
      class="mt-2"
      @keydown.enter.prevent="emit('confirm', draftValue)"
      @keydown.esc.prevent="emit('cancel')"
    />

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('cancel')">Cancel</Button>
        <Button @click="emit('confirm', draftValue)">Save</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { nextTick, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Input from '@/components/ui/Input.vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps({
  initialValue: {
    type: String,
    default: ''
  },
  label: {
    type: String,
    default: 'Name'
  },
  title: {
    type: String,
    default: 'Edit'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])

const draftValue = ref(props.initialValue)
const inputElement = ref(null)

watch(
  () => props.visible,
  async (visible) => {
    if (!visible) {
      return
    }

    draftValue.value = props.initialValue
    await nextTick()
    inputElement.value?.focus()
    inputElement.value?.select()
  },
  { immediate: true }
)

watch(
  () => props.initialValue,
  (value) => {
    if (!props.visible) {
      draftValue.value = value
    }
  }
)
</script>
