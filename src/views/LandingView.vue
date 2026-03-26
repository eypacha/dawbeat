<template>
  <main class="min-h-screen bg-zinc-950 text-zinc-100">
    <div class="mx-auto flex min-h-screen w-full max-w-5xl flex-col justify-center px-6 py-16">
      <p class="text-xs uppercase tracking-[0.28em] text-zinc-500">DawBeat</p>
      <h1 class="mt-4 text-4xl font-semibold tracking-tight text-zinc-100 sm:text-6xl">Bytebeat DAW in your browser</h1>
      <p class="mt-6 max-w-2xl text-sm text-zinc-400 sm:text-base">
        Compose formulas, automate effects, record value trackers, and share!
      </p>

      <div class="mt-10 flex flex-wrap items-center gap-3">
        <RouterLink
          to="/app"
          class="border border-zinc-700 bg-zinc-900 px-4 py-2 text-xs uppercase tracking-[0.18em] text-zinc-100 transition hover:border-zinc-500 hover:bg-zinc-800"
        >
          Open App
        </RouterLink>
      </div>
    </div>
  </main>
</template>
