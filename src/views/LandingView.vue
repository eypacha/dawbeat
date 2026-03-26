<template>
  <main class="min-h-screen bg-zinc-950 text-zinc-100">
    <div class="pointer-events-none absolute inset-0 overflow-hidden">
      <div class="absolute -top-40 left-1/2 h-96 w-96 -translate-x-1/2 bg-indigo-500/10 blur-3xl" />
      <div class="absolute bottom-10 left-0 h-80 w-80 bg-cyan-500/10 blur-3xl" />
      <div class="absolute right-0 top-1/3 h-80 w-80 bg-pink-500/10 blur-3xl" />
    </div>

    <div class="relative mx-auto w-full max-w-[1100px] px-6 py-10 sm:py-14 lg:py-20">
      <section class="grid gap-10 border border-zinc-800/80 bg-zinc-900/55 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-10">
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-zinc-500">DawBeat</p>
          <h1 class="mt-4 text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">DawBeat</h1>
          <p class="mt-3 text-base uppercase tracking-[0.16em] text-zinc-400">A DAW for bytebeat music</p>
          <p class="mt-6 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
            Compose algorithmic music with tiny formulas arranged on a timeline.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="/#/app"
              class="inline-flex items-center justify-center border border-indigo-400/70 bg-indigo-500/15 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/25"
            >
              Open App
            </a>
            <div class="grid gap-1 text-xs uppercase tracking-[0.15em] text-zinc-400">
              <span>No install</span>
              <span>No account</span>
              <span>Runs in your browser</span>
            </div>
          </div>

          <div class="mt-8 border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xl text-indigo-300/70 sm:text-2xl">
            t*(t&gt;&gt;5 | t&gt;&gt;8)
          </div>
        </div>

        <div class="w-full">
          <img
            src="/images/main-ui.png"
            alt="DawBeat timeline UI with tracks, clips, and playhead"
            class="h-64 w-full border border-4 border-zinc-800 object-contain"
            loading="eager"
          />
        </div>
      </section>

      <section class="mt-14 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">What is bytebeat?</h2>
          <div class="mt-5 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
            <p>Bytebeat is music generated from mathematical expressions.</p>
            <p>Tiny formulas can produce complex rhythmic and melodic patterns.</p>
            <p>
              A definition we like describes bytebeat as a kind of
              "digital haiku": extremely small pieces of code that
              generate surprisingly rich sound.
            </p>
          </div>
        </div>

        <img
          src="/preview.png"
          alt="Bytebeat concept visual linking formula and waveform"
          class="h-40 w-full border border-zinc-800 object-cover"
          loading="lazy"
        />
      </section>

      <section class="mt-14 grid gap-6 lg:grid-cols-[1fr_1fr] lg:items-center">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">What DawBeat Does</h2>
          <div class="mt-5 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
            <p>Instead of writing a single expression, DawBeat lets you compose bytebeat over time.</p>
            <p>
              Arrange formulas as clips on tracks, combine them with variables and automation,
              and shape algorithmic music like in a traditional DAW.
            </p>
          </div>
        </div>

        <img
          src="/images/main-ui.png"
          alt="Timeline detail showing clips composition over time"
          class="h-48 w-full border border-zinc-800 object-cover"
          loading="lazy"
        />
      </section>

      <section class="mt-14">
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Features</h2>
        <ul class="mt-6 grid gap-3 text-sm text-zinc-300 sm:grid-cols-2 sm:text-base">
          <li v-for="feature in features" :key="feature" class="border border-zinc-800 bg-zinc-900/70 px-4 py-3">
            {{ feature }}
          </li>
        </ul>
      </section>

      <section class="mt-14">
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Example compositions</h2>
        <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <article
            v-for="example in exampleCards"
            :key="example.id"
            class="border border-zinc-800 bg-zinc-900/80 p-4"
          >
            <img
              :src="example.image"
              :alt="`${example.title} project preview`"
              class="h-32 w-full border border-zinc-800 object-cover"
              loading="lazy"
            />
            <h3 class="mt-4 text-base font-medium text-zinc-100">{{ example.title }}</h3>
            <p class="mt-2 text-sm text-zinc-400">{{ example.description }}</p>
            <a
              :href="`/#/p/${example.id}`"
              class="mt-4 inline-flex items-center border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50"
            >
              Open in DawBeat
            </a>
          </article>
        </div>
      </section>

      <section class="mt-16 border border-zinc-800 bg-zinc-900/70 px-6 py-10 text-center sm:px-10">
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Start composing</h2>
        <a
          href="/#/app"
          class="mt-6 inline-flex items-center justify-center border border-cyan-400/70 bg-cyan-500/15 px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25"
        >
          Open App
        </a>
      </section>

      <footer class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs uppercase tracking-[0.14em] text-zinc-500 sm:flex-row">
        <p>DawBeat - Bytebeat DAW</p>
        <a
          href="https://github.com"
          target="_blank"
          rel="noopener noreferrer"
          class="text-zinc-400 transition hover:text-zinc-200"
        >
          GitHub
        </a>
      </footer>
    </div>
  </main>
</template>

<script setup>
import { computed } from 'vue'
import { getDemoProjectEntries } from '@/services/demoProjectService'
import { TRACK_COLOR_PALETTE } from '@/utils/colorUtils'

const previewImages = ['/images/main-ui.png', '/preview.png']

const features = [
  'timeline with tracks and clips',
  'formula clips',
  'variable tracks',
  'automation lanes',
  'live editing in the browser',
  'MIDI input support',
  'export to WAV or MP3'
]

const exampleCards = computed(() => {
  const entries = getDemoProjectEntries().slice(0, 6)

  return entries.map((entry, index) => {
    return {
      id: entry.id,
      title: entry.name,
      description: 'Open this bundled project and start tweaking formulas on the timeline.',
      image: previewImages[index % previewImages.length]
    }
  })
})
</script>
