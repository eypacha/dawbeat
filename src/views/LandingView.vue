<template>
  <main class="min-h-screen bg-zinc-950 text-zinc-100">
    <div class="relative mx-auto w-full max-w-[1180px] px-6 py-10 sm:py-14 lg:py-20">
      <section
        class="grid gap-10 border border-zinc-800/80 bg-linear-to-br from-zinc-900/90 via-zinc-900/70 to-zinc-950 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-10"
      >
        <div>
          <p class="text-xs uppercase tracking-[0.28em] text-zinc-500">DawBeat</p>
          <h1 class="mt-4 max-w-3xl text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">
            Compose bytebeat like a DAW.
          </h1>
          <p class="mt-3 text-base uppercase tracking-[0.16em] text-cyan-300/80">
            timeline composition, modulation, automation, and export
          </p>
          <p class="mt-6 max-w-2xl text-sm leading-7 text-zinc-300 sm:text-base">
            Arrange formulas on a timeline, drive them with variables and value trackers, automate audio effects,
            record live gestures, and export the result without leaving the browser.
          </p>

          <div class="mt-8 flex flex-wrap items-center gap-4">
            <a
              href="#/app"
              class="inline-flex items-center justify-center border border-cyan-400/70 bg-cyan-500/15 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25"
            >
              Open App
            </a>
            <a
              href="https://github.com/eypacha/dawbeat"
              target="_blank"
              rel="noopener noreferrer"
              class="inline-flex items-center justify-center border border-zinc-700 bg-zinc-950 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50"
            >
              View GitHub
            </a>
          </div>

        </div>

        <div class="w-full">
          <img
            src="/images/main-ui.png"
            alt="DawBeat timeline UI with tracks, clips, effects, and playhead"
            class="w-full border-4 border-zinc-800 object-contain"
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
              DawBeat turns those formulas into a composition workflow with tracks, looping, modulation, playback,
              effects, and export.
            </p>
          </div>
        </div>

        <div
          class="landing-formula flex h-52 w-full items-center justify-center border border-zinc-800 bg-zinc-950/80 px-5 text-center sm:h-56"
          aria-label="Bytebeat formula example"
        >
          <pre class="w-full overflow-x-auto text-3xl leading-tight sm:text-4xl"><code v-html="highlightedLandingFormulaHtml" /></pre>
        </div>
      </section>

      <section class="mt-14">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
          <article
            v-for="card in overviewCards"
            :key="card.title"
            class="border border-zinc-800 bg-zinc-900/70 p-5"
          >
            <component :is="card.icon" class="h-5 w-5 text-cyan-300/80" />
            <p class="mt-4 text-[10px] uppercase tracking-[0.24em] text-zinc-500">{{ card.eyebrow }}</p>
            <h3 class="mt-2 text-base font-medium text-zinc-100">{{ card.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-zinc-300">{{ card.description }}</p>
          </article>
        </div>
      </section>

      <section class="mt-14">
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">What DawBeat Does</h2>
        <div class="mt-5 grid gap-4 lg:grid-cols-3">
          <article
            v-for="workflow in workflows"
            :key="workflow.title"
            class="border border-zinc-800 bg-zinc-900/70 p-5"
          >
            <component :is="workflow.icon" class="h-5 w-5 text-cyan-300/80" />
            <h3 class="mt-4 text-base font-medium text-zinc-100">{{ workflow.title }}</h3>
            <p class="mt-3 text-sm leading-6 text-zinc-300">{{ workflow.description }}</p>
          </article>
        </div>
      </section>

      <section class="mt-14">
        <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Features</h2>
        <div class="mt-6 grid gap-4 lg:grid-cols-2">
          <article
            v-for="feature in features"
            :key="feature.title"
            class="group border border-zinc-800 bg-zinc-900/70 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
          >
            <div class="flex items-start gap-4">
              <div class="border border-zinc-800 bg-zinc-950 p-3">
                <component :is="feature.icon" class="h-5 w-5 text-cyan-300/80 transition group-hover:text-cyan-200" />
              </div>
              <div>
                <h3 class="text-base font-medium text-zinc-100">{{ feature.title }}</h3>
                <p class="mt-2 text-sm leading-6 text-zinc-300">{{ feature.description }}</p>
              </div>
            </div>
          </article>
        </div>
      </section>

      <section class="mt-14 border border-zinc-800 bg-zinc-900/70 p-6 sm:p-8">
        <div class="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
          <div>
            <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Start composing</h2>
            <div class="mt-4 space-y-3 text-sm leading-7 text-zinc-300 sm:text-base">
              <p>The main app is desktop-oriented and runs entirely in the browser after the audio unlock screen.</p>
              <p>
                On phones and tablets, DawBeat exposes a dedicated automation companion route instead of the full DAW
                layout.
              </p>
            </div>
          </div>

          <a
            href="#/app"
            class="inline-flex items-center justify-center border border-cyan-400/70 bg-cyan-500/15 px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25"
          >
            Open App
          </a>
        </div>
      </section>

      <footer
        class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs uppercase tracking-[0.14em] text-zinc-500 sm:flex-row"
      >
        <p>DawBeat - Bytebeat DAW</p>
        <a
          href="https://github.com/eypacha/dawbeat"
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
import {
  Activity,
  Gauge,
  Keyboard,
  Share2,
  SlidersHorizontal,
  Smartphone,
  Workflow
} from 'lucide-vue-next'
import { renderFormulaTokensToHtml } from '@/utils/formulaTokenizer'

const landingFormula = 't*(42&t>>10)'
const highlightedLandingFormulaHtml = renderFormulaTokensToHtml(landingFormula)

const overviewCards = [
  {
    eyebrow: 'Compose',
    title: 'Timeline workflow',
    description: 'Formula clips, variables, value trackers, and automation in one timeline.',
    icon: Workflow
  },
  {
    eyebrow: 'Control',
    title: 'Keyboard and MIDI',
    description: 'Bindings, MIDI learn, live input, and external MIDI Clock sync.',
    icon: Keyboard
  },
  {
    eyebrow: 'Ship',
    title: 'Export and share',
    description: 'Auto-save, JSON exchange, shared links, and WAV/MP3 export.',
    icon: Share2
  },
  {
    eyebrow: 'Desktop',
    title: 'Full DAW layout',
    description: 'Library, timeline, effects panel, evaluated formulas, and transport workflow.',
    icon: Gauge
  },
  {
    eyebrow: 'Mobile',
    title: 'Phone companion',
    description: 'Scan a QR from an automation lane and use your phone as a live controller.',
    icon: Smartphone
  }
]

const workflows = [
  {
    title: 'Compose over time',
    description: 'Build songs from formula clips on a real timeline with looping, scrubbing, clip edits, and history.',
    icon: Workflow
  },
  {
    title: 'Modulate everything',
    description: 'Use variable tracks, step-based value trackers, and automation curves to shape motion and control.',
    icon: SlidersHorizontal
  },
  {
    title: 'Perform and capture',
    description: 'Drive playback live, record modulation, and hand automation lanes to a phone companion over QR.',
    icon: Smartphone
  }
]

const features = [
  {
    title: 'Timeline composition',
    description: 'Formula tracks, variable tracks, value tracker tracks, automation lanes, section labels, and clip editing.',
    icon: Workflow
  },
  {
    title: 'Value trackers and modulation',
    description: 'Step-based tracker clips, live input, bindings to variables, and recording into the arrangement.',
    icon: Activity
  },
  {
    title: 'Automation and effects',
    description: 'Automate master gain and audio effect parameters with curve segments, live overrides, and recording.',
    icon: SlidersHorizontal
  },
  {
    title: 'Keyboard and MIDI control',
    description: 'Keyboard override, MIDI CC, MIDI Keyboard, MIDI Learn, and external MIDI Clock transport sync.',
    icon: Keyboard
  },
  {
    title: 'Evaluation, playback, and export',
    description: 'Real browser playback, evaluated formulas, waveform previews, WAV/MP3 export, and loop renders.',
    icon: Gauge
  },
  {
    title: 'Sharing and remote control',
    description: 'JSON import/export, immutable shared snapshots, and QR links for the mobile automation companion.',
    icon: Share2
  },
]
</script>

<style scoped>
.landing-formula pre {
    margin: 0;
}

:deep(.landing-formula .token-var) {
    color: #67e8f9;
}

:deep(.landing-formula .token-number) {
    color: #fde047;
}

:deep(.landing-formula .token-operator) {
    color: #c084fc;
}

:deep(.landing-formula .token-paren) {
    color: #60a5fa;
}

:deep(.landing-formula .token-bracket),
:deep(.landing-formula .token-member) {
    color: #a1a1aa;
}

:deep(.landing-formula .token-function) {
    color: #38bdf8;
}

:deep(.landing-formula .token-identifier) {
    color: rgb(244 244 245);
}

:deep(.landing-formula .token-invalid) {
    color: #ef4444;
}
</style>
