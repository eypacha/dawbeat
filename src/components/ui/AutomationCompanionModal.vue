<template>
  <Modal
    :open="open"
    panel-class="overflow-y-auto rounded-none"
    size="lg"
    title="Automation Companion"
    @close="emit('close')"
  >
    <div class="space-y-5">
      <div class="border border-emerald-500/20 bg-emerald-500/8 p-4">
        <p class="text-[10px] uppercase tracking-[0.3em] text-emerald-300/70">Automation Lane</p>
        <p class="mt-2 text-xl text-zinc-50">{{ laneLabel }}</p>
      </div>

      <div class="grid gap-5 lg:grid-cols-[minmax(0,18rem)_minmax(0,1fr)]">
        <div class="border border-zinc-800 bg-linear-to-br from-zinc-100 to-zinc-300 p-5 shadow-[0_24px_80px_rgba(0,0,0,0.35)] lg:self-start">
          <div class="mx-auto aspect-square w-full max-w-[15rem] bg-white p-4">
            <img
              v-if="qrCodeDataUrl"
              :src="qrCodeDataUrl"
              alt="Automation companion QR"
              class="aspect-square h-full w-full object-contain"
            />
            <div v-else class="flex h-full w-full items-center justify-center border border-zinc-200/80 bg-zinc-100/80">
              <div class="grid h-[72%] w-[72%] grid-cols-3 gap-2 opacity-45" aria-hidden="true">
                <span
                  v-for="index in 9"
                  :key="index"
                  class="border border-zinc-400/60 bg-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div class="space-y-4">
          <div class="border border-zinc-800 bg-zinc-950/80 p-4">
            <p class="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Host Peer</p>
            <p v-if="hostPeerId" class="mt-2 break-all text-sm text-zinc-100">{{ hostPeerId }}</p>
            <div v-else class="mt-2 h-5 w-full max-w-[14rem] border border-zinc-800/70 bg-zinc-900/70" aria-hidden="true" />
          </div>

          <div class="border border-zinc-800 bg-zinc-950/80 p-4">
            <div class="flex items-center justify-between gap-3">
              <div>
                <p class="text-[10px] uppercase tracking-[0.3em] text-zinc-500">Share URL</p>
                <p v-if="shareUrl" class="mt-2 break-all text-xs leading-5 text-zinc-300">{{ shareUrl }}</p>
                <div v-else class="mt-2 space-y-2" aria-hidden="true">
                  <div class="h-4 w-full border border-zinc-800/70 bg-zinc-900/70" />
                  <div class="h-4 w-4/5 border border-zinc-800/70 bg-zinc-900/70" />
                </div>
              </div>

              <Button :disabled="!shareUrl" size="sm" variant="ghost" @click="copyShareUrl">
                Copy
              </Button>
            </div>
          </div>

          <div
            v-if="loopbackWarning"
            class="border border-amber-500/30 bg-amber-500/10 p-4 text-sm leading-6 text-amber-100"
          >
            This URL uses <code>localhost</code> or loopback. Your phone will not be able to open it from another
            device. Open DawBeat using your machine's LAN IP and generate the QR again.
          </div>
        </div>
      </div>

      <div
        v-if="status === 'error'"
        class="border border-red-500/30 bg-red-500/10 p-5 text-sm leading-6 text-red-100"
      >
        {{ errorMessage }}
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end">
        <Button variant="primary" @click="emit('close')">
          Close
        </Button>
      </div>
    </template>
  </Modal>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import Button from '@/components/ui/Button.vue'
import Modal from '@/components/ui/Modal.vue'
import { enqueueSnackbar } from '@/services/notifications'
import {
  automationCompanionHostState,
  getAutomationCompanionShareUrl,
  isAutomationCompanionShareUrlLoopback
} from '@/services/automationCompanionService'
import { getAutomationLaneConfig } from '@/services/automationService'

const props = defineProps({
  lane: {
    type: Object,
    default: null
  },
  open: {
    type: Boolean,
    required: true
  }
})

const emit = defineEmits(['close'])

const qrCodeDataUrl = ref('')
let qrGenerationToken = 0

const laneLabel = computed(() => getAutomationLaneConfig(props.lane)?.label ?? props.lane?.id ?? 'Automation')
const shareUrl = computed(() => getAutomationCompanionShareUrl(props.lane?.id ?? null))
const hostPeerId = computed(() => automationCompanionHostState.hostPeerId)
const status = computed(() => automationCompanionHostState.status)
const errorMessage = computed(() => automationCompanionHostState.error || 'Could not start the automation companion host.')
const loopbackWarning = computed(() => Boolean(shareUrl.value) && isAutomationCompanionShareUrlLoopback())

watch(
  [() => props.open, shareUrl],
  async ([open, nextShareUrl]) => {
    qrGenerationToken += 1
    const currentToken = qrGenerationToken

    if (!open || !nextShareUrl) {
      qrCodeDataUrl.value = ''
      return
    }

    try {
      const qrCodeModule = await import('qrcode')
      const qrCode = qrCodeModule.default ?? qrCodeModule

      if (currentToken !== qrGenerationToken) {
        return
      }

      qrCodeDataUrl.value = await qrCode.toDataURL(nextShareUrl, {
        color: {
          dark: '#111827',
          light: '#ffffff'
        },
        errorCorrectionLevel: 'M',
        margin: 1,
        width: 720
      })
    } catch (error) {
      qrCodeDataUrl.value = ''
      enqueueSnackbar(error?.message ?? 'Could not generate the automation companion QR.', {
        variant: 'error'
      })
    }
  },
  {
    immediate: true
  }
)

async function copyShareUrl() {
  if (!shareUrl.value || typeof globalThis.navigator?.clipboard?.writeText !== 'function') {
    return
  }

  try {
    await globalThis.navigator.clipboard.writeText(shareUrl.value)
    enqueueSnackbar('Automation companion link copied.', {
      variant: 'success'
    })
  } catch {
    enqueueSnackbar('Could not copy the automation companion link.', {
      variant: 'error'
    })
  }
}

onBeforeUnmount(() => {
  qrGenerationToken += 1
})
</script>
