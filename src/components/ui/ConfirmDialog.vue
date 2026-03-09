<template>
  <Modal :open="visible" size="sm" :title="title" @close="emit('cancel')">
    <p class="text-sm text-zinc-200">{{ message }}</p>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button variant="ghost" @click="emit('cancel')">Cancel</Button>
        <Button variant="danger" @click="emit('confirm')">Delete Track</Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps({
  message: {
    type: String,
    required: true
  },
  title: {
    type: String,
    default: 'Confirm'
  },
  visible: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['cancel', 'confirm'])
</script>
