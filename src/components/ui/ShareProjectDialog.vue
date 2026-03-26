<template>
  <Modal :open="open" title="Share Project" @update:open="handleClose">
    <div class="space-y-4">
      <p class="text-sm leading-6 text-zinc-300">
        Sharing creates a public snapshot of the current project. Anyone with the link can open that exact version.
      </p>

      <div
        v-if="currentShareUrl"
        class="space-y-2"
      >
        <label class="block text-xs uppercase tracking-[0.1em] text-zinc-400">
          Current Share Link
        </label>
        <div class="flex items-stretch gap-2">
          <input
            ref="shareUrlInput"
            class="min-w-0 flex-1 border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm text-zinc-100 outline-none"
            :value="currentShareUrl"
            readonly
            @click="selectShareUrl"
            @focus="selectShareUrl"
          />
          <IconButton
            :icon="shareUrlCopied ? Check : Copy"
            :disabled="!currentShareUrl"
            :label="shareUrlCopied ? 'Share link copied' : 'Copy share link'"
            size="md"
            title="Copy share link"
            @click="handleCopyShareUrl"
          />
        </div>
      </div>

      <div
        v-else
        class="border border-zinc-800 bg-zinc-950/70 px-3 py-3 text-sm leading-6 text-zinc-300"
      >
        <p v-if="hasStaleShareLink">
          This project changed since the last shared snapshot. Generate a new link to share the latest version.
        </p>
        <p v-else>
          Generate a public link for the current project snapshot.
        </p>
      </div>

      <div class="flex justify-end gap-2 pt-2">
        <button
          class="border border-zinc-700 bg-zinc-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-zinc-300 transition hover:border-zinc-600 hover:text-zinc-100"
          type="button"
          @click="handleClose"
        >
          Close
        </button>
        <button
          v-if="showShareAction"
          class="inline-flex items-center gap-2 border border-blue-700 bg-blue-900 px-3 py-2 text-xs uppercase tracking-[0.18em] text-blue-100 transition hover:border-blue-500 hover:bg-blue-700 disabled:cursor-default disabled:opacity-40"
          :disabled="sharing"
          type="button"
          @click="handleShare"
        >
          <LoaderCircle v-if="sharing" class="h-3.5 w-3.5 animate-spin" :stroke-width="2.25" />
          <span>{{ shareActionLabel }}</span>
        </button>
      </div>
    </div>
  </Modal>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { Check, Copy, LoaderCircle } from 'lucide-vue-next'
import { copyTextToClipboard } from '@/services/clipboard'
import IconButton from '@/components/ui/IconButton.vue'
import Modal from '@/components/ui/Modal.vue'

const props = defineProps({
  open: Boolean,
  shared: Boolean,
  shareUrl: {
    type: String,
    default: ''
  },
  sharing: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:open', 'share'])

const shareUrlInput = ref(null)
const shareUrlCopied = ref(false)
const currentShareUrl = computed(() => (props.shared ? props.shareUrl : ''))
const hasStaleShareLink = computed(() => !props.shared && Boolean(props.shareUrl))
const showShareAction = computed(() => !currentShareUrl.value)
const shareActionLabel = computed(() => (hasStaleShareLink.value ? 'Generate New Link' : 'Generate Link'))

let shareUrlCopiedTimeoutId = null

function clearShareUrlCopiedTimeout() {
  if (shareUrlCopiedTimeoutId === null) {
    return
  }

  window.clearTimeout(shareUrlCopiedTimeoutId)
  shareUrlCopiedTimeoutId = null
}

function resetShareUrlCopiedState() {
  clearShareUrlCopiedTimeout()
  shareUrlCopied.value = false
}

watch(() => props.open, () => {
  resetShareUrlCopiedState()
})

watch(() => props.shareUrl, () => {
  resetShareUrlCopiedState()
})

watch(() => props.shared, () => {
  resetShareUrlCopiedState()
})

function selectShareUrl(event) {
  const input = event?.target instanceof HTMLInputElement ? event.target : shareUrlInput.value
  input?.select()
}

async function handleCopyShareUrl() {
  if (!currentShareUrl.value) {
    return
  }

  try {
    await copyTextToClipboard(currentShareUrl.value)
    selectShareUrl()
    shareUrlCopied.value = true
    clearShareUrlCopiedTimeout()
    shareUrlCopiedTimeoutId = window.setTimeout(() => {
      shareUrlCopied.value = false
      shareUrlCopiedTimeoutId = null
    }, 2000)
  } catch {
    resetShareUrlCopiedState()
  }
}

function handleShare() {
  emit('share')
}

function handleClose() {
  emit('update:open', false)
}

onBeforeUnmount(() => {
  clearShareUrlCopiedTimeout()
})
</script>
