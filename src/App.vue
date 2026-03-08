<template>
  <div class="min-h-screen bg-zinc-950 text-zinc-200 font-mono">
    <div class="flex min-h-screen w-full flex-col gap-4 p-4">
      <TransportBar />

      <main class="grid flex-1 gap-4 lg:grid-cols-[320px_minmax(0,1fr)]">
        <FormulaLibrary />
        <Timeline />
      </main>
    </div>
  </div>
</template>

<script setup>
import FormulaLibrary from '@/components/library/FormulaLibrary.vue'
import Timeline from '@/components/timeline/Timeline.vue'
import TransportBar from '@/components/transport/TransportBar.vue'
</script>
