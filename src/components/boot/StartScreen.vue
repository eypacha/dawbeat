<template>
  <section
    class="flex min-h-screen items-center justify-center bg-zinc-950 px-6 text-zinc-100 text-center"
  >
    <div class="w-full max-w-xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-lg shadow-black/20">
      <h1 class="text-4xl font-semibold text-zinc-50 sm:text-5xl">DawBeat</h1>
      <p class="mt-3 text-sm uppercase tracking-[0.3em] text-zinc-500">bytebeat workstation</p>

      <button
        class="mt-10 border border-emerald-500/60 bg-emerald-500/10 px-6 py-3 text-sm font-semibold uppercase tracking-[0.35em] text-emerald-300 transition hover:bg-emerald-500/20"
        type="button"
        @click="$emit('start')"
      >
        START
      </button>
    </div>
  </section>
</template>

<script setup>
defineEmits(['start'])
</script>
