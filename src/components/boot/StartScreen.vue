<template>
  <section
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100 text-center"
  >
    <Panel class="w-full max-w-xl" padding="lg">
      <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">DawBeat</h1>
      <p class="mt-3 text-sm uppercase tracking-[0.3em] text-zinc-500">bytebeat workstation</p>

      <Button
        class="mt-10"
        size="lg"
        type="button"
        variant="primary"
        @click="$emit('start')"
      >
        START
      </Button>
    </Panel>
  </section>
</template>

<script setup>
import Button from '@/components/ui/Button.vue'
import Panel from '@/components/ui/Panel.vue'

defineEmits(['start'])
</script>
