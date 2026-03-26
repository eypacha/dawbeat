<template>
    <main class="min-h-screen bg-zinc-950 text-zinc-100">
        <div class="relative mx-auto w-full max-w-[1100px] px-6 py-10 sm:py-14 lg:py-20">
            <section
                class="grid gap-10 border border-zinc-800/80 bg-zinc-900/55 p-6 shadow-2xl shadow-black/30 backdrop-blur sm:p-8 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:gap-12 lg:p-10">
                <div>
                    <p class="text-xs uppercase tracking-[0.28em] text-zinc-500">DawBeat</p>
                    <h1 class="mt-4 text-4xl font-semibold tracking-tight text-zinc-100 sm:text-5xl lg:text-6xl">DawBeat
                    </h1>
                    <p class="mt-3 text-base uppercase tracking-[0.16em] text-zinc-400">A DAW for bytebeat music</p>
                    <p class="mt-6 max-w-xl text-sm leading-7 text-zinc-300 sm:text-base">
                        Compose algorithmic music with tiny formulas arranged on a timeline.
                    </p>

                    <div class="mt-8 flex flex-wrap items-center gap-4">
                        <a href="/#/app"
                            class="inline-flex items-center justify-center border border-indigo-400/70 bg-indigo-500/15 px-5 py-3 text-xs font-medium uppercase tracking-[0.2em] text-indigo-100 transition hover:border-indigo-300 hover:bg-indigo-500/25">
                            Open App
                        </a>
                        <div class="grid gap-1 text-xs uppercase tracking-[0.15em] text-zinc-400">
                            <span>No install</span>
                            <span>No account</span>
                            <span>Runs in your browser</span>
                        </div>
                    </div>

                    <div
                        class="mt-8 border border-zinc-800 bg-zinc-950/80 px-4 py-3 text-xl text-indigo-300/70 sm:text-2xl">
                        t*(t&gt;&gt;5 | t&gt;&gt;8)
                    </div>
                </div>

                <div class="w-full">
                    <img src="/images/main-ui.png" alt="DawBeat timeline UI with tracks, clips, and playhead"
                        class="h-64 w-full border border-4 border-zinc-800 object-contain" loading="eager" />
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

                <div class="landing-formula flex h-52 w-full items-center justify-center border border-zinc-800 bg-zinc-950/80 px-5 text-center sm:h-56"
                    aria-label="Bytebeat formula example">
                    <pre
                        class="w-full overflow-x-auto text-3xl leading-tight sm:text-4xl"><code v-html="highlightedLandingFormulaHtml" /></pre>
                </div>
            </section>

            <section class="mt-14">
                <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">What DawBeat Does</h2>
                <div class="mt-5 space-y-4 text-sm leading-7 text-zinc-300 sm:text-base">
                    <p>Instead of writing a single expression, DawBeat lets you compose bytebeat over time.</p>
                    <p>
                        Arrange formulas as clips on tracks, combine them with variables and automation,
                        and shape algorithmic music like in a traditional DAW.
                    </p>
                </div>
            </section>

            <section class="mt-14">
                <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Features</h2>
                <ul class="mt-6 text-sm text-zinc-300 sm:text-base pl-10">
                    <li v-for="feature in features" :key="feature.label"
                        class="group text-center flex items-center gap-3 py-3 transition hover:text-zinc-100">
                        <component :is="feature.icon" class="h-4 w-4 shrink-0 text-cyan-300/80 transition group-hover:text-cyan-200" />
                        <span>{{ feature.label }}</span>
                    </li>
                </ul>
            </section>

            <section v-if="exampleCards.length" class="mt-14">
                <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Example compositions</h2>
                <div class="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    <article v-for="example in exampleCards" :key="example.id"
                        class="border border-zinc-800 bg-zinc-900/80 p-4">
        
                        <h3 class="mt-4 text-base font-medium text-zinc-100">{{ example.title }}</h3>
                        <a :href="`/#/p/${example.id}`"
                            class="mt-4 inline-flex items-center border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs uppercase tracking-[0.16em] text-zinc-200 transition hover:border-zinc-500 hover:text-zinc-50">
                            Open in DawBeat
                        </a>
                    </article>
                </div>
            </section>

            <section class="mt-16 border border-zinc-800 bg-zinc-900/70 px-6 py-10 text-center sm:px-10">
                <h2 class="text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">Start composing</h2>
                <a href="/#/app"
                    class="mt-6 inline-flex items-center justify-center border border-cyan-400/70 bg-cyan-500/15 px-6 py-3 text-xs font-medium uppercase tracking-[0.2em] text-cyan-100 transition hover:border-cyan-300 hover:bg-cyan-500/25">
                    Open App
                </a>
            </section>

            <footer
                class="mt-12 flex flex-col items-center justify-between gap-3 border-t border-zinc-800 pt-6 text-xs uppercase tracking-[0.14em] text-zinc-500 sm:flex-row">
                <p>DawBeat - Bytebeat DAW</p>
                <a href="https://github.com/eypacha/dawbeat" target="_blank" rel="noopener noreferrer"
                    class="text-zinc-400 transition hover:text-zinc-200">
                    GitHub
                </a>
            </footer>
        </div>
    </main>
</template>

<script setup>
import { Activity, BookOpen, Download, Keyboard, Pencil, SlidersHorizontal, Waves, Workflow } from 'lucide-vue-next'
import { renderFormulaTokensToHtml } from '@/utils/formulaTokenizer'

const previewImages = ['/images/main-ui.png', '/preview.png']
const landingFormula = 't*(42&t>>10)'
const highlightedLandingFormulaHtml = renderFormulaTokensToHtml(landingFormula)

const features = [
    { label: 'timeline with tracks and clips', icon: Workflow },
    { label: 'formula clips', icon: BookOpen },
    { label: 'variable tracks', icon: Activity },
    { label: 'automation lanes', icon: SlidersHorizontal },
    { label: 'live editing in the browser', icon: Pencil },
    { label: 'MIDI input support', icon: Keyboard },
    { label: 'export to WAV or MP3', icon: Download },
    { label: 'share projects with a link', icon: Waves },
]

const exampleCards = [
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
