import { DEFAULT_SAMPLE_RATE } from '@/utils/audioSettings'

export const EXPORT_SAMPLE_RATE_AUTO = 'auto'
export const DEFAULT_EXPORT_AUTO_MIN_SAMPLE_RATE = 44100

export const WAV_EXPORT_SAMPLE_RATE_OPTIONS = [
  {
    label: 'Auto (min 44.1 kHz)',
    value: EXPORT_SAMPLE_RATE_AUTO
  },
  {
    label: '22.05 kHz',
    value: 22050
  },
  {
    label: '32 kHz',
    value: 32000
  },
  {
    label: '44.1 kHz',
    value: 44100
  },
  {
    label: '48 kHz',
    value: 48000
  }
]

export const MP3_EXPORT_SAMPLE_RATE_OPTIONS = [
  {
    label: 'Auto (min 44.1 kHz)',
    value: EXPORT_SAMPLE_RATE_AUTO
  },
  {
    label: '32 kHz',
    value: 32000
  },
  {
    label: '44.1 kHz',
    value: 44100
  },
  {
    label: '48 kHz',
    value: 48000
  }
]

export const WAV_EXPORT_BIT_DEPTH_OPTIONS = [
  {
    label: '16-bit PCM',
    value: 16
  },
  {
    label: '24-bit PCM',
    value: 24
  },
  {
    label: '32-bit float',
    value: 32
  }
]

export const MP3_EXPORT_BITRATE_OPTIONS = [
  {
    label: '128 kbps',
    value: 128
  },
  {
    label: '192 kbps',
    value: 192
  },
  {
    label: '256 kbps',
    value: 256
  },
  {
    label: '320 kbps',
    value: 320
  }
]

export const DEFAULT_WAV_EXPORT_OPTIONS = {
  bitDepth: 16,
  sampleRate: EXPORT_SAMPLE_RATE_AUTO
}

export const DEFAULT_MP3_EXPORT_OPTIONS = {
  bitrate: 128,
  sampleRate: EXPORT_SAMPLE_RATE_AUTO
}

export function normalizeWavExportOptions(options = {}) {
  return {
    bitDepth: normalizeOptionValue(
      options.bitDepth,
      WAV_EXPORT_BIT_DEPTH_OPTIONS,
      DEFAULT_WAV_EXPORT_OPTIONS.bitDepth
    ),
    sampleRate: normalizeOptionValue(
      options.sampleRate,
      WAV_EXPORT_SAMPLE_RATE_OPTIONS,
      DEFAULT_WAV_EXPORT_OPTIONS.sampleRate
    )
  }
}

export function normalizeMp3ExportOptions(options = {}) {
  return {
    bitrate: normalizeOptionValue(
      options.bitrate,
      MP3_EXPORT_BITRATE_OPTIONS,
      DEFAULT_MP3_EXPORT_OPTIONS.bitrate
    ),
    sampleRate: normalizeOptionValue(
      options.sampleRate,
      MP3_EXPORT_SAMPLE_RATE_OPTIONS,
      DEFAULT_MP3_EXPORT_OPTIONS.sampleRate
    )
  }
}

export function resolveExportSampleRate(
  sourceSampleRate,
  sampleRateOption,
  { autoMinimumSampleRate = DEFAULT_EXPORT_AUTO_MIN_SAMPLE_RATE } = {}
) {
  const normalizedSourceSampleRate = normalizeSourceSampleRate(sourceSampleRate)
  const numericSampleRate = Number(sampleRateOption)

  if (Number.isFinite(numericSampleRate) && numericSampleRate > 0) {
    return Math.round(numericSampleRate)
  }

  return Math.max(autoMinimumSampleRate, normalizedSourceSampleRate)
}

function normalizeOptionValue(value, options, fallback) {
  for (const option of options) {
    if (option.value === value) {
      return option.value
    }

    if (
      typeof option.value === 'number' &&
      Number.isFinite(Number(value)) &&
      option.value === Number(value)
    ) {
      return option.value
    }
  }

  return fallback
}

function normalizeSourceSampleRate(value) {
  const numericValue = Number(value)

  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return DEFAULT_SAMPLE_RATE
  }

  return Math.max(1, Math.floor(numericValue))
}
