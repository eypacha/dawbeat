export async function copyTextToClipboard(value) {
  const text = typeof value === 'string' ? value : String(value ?? '')

  if (navigator?.clipboard?.writeText) {
    await navigator.clipboard.writeText(text)
    return
  }

  const textarea = document.createElement('textarea')
  textarea.value = text
  textarea.setAttribute('readonly', '')
  textarea.style.position = 'fixed'
  textarea.style.top = '-9999px'
  textarea.style.left = '-9999px'

  document.body.appendChild(textarea)
  textarea.select()

  try {
    const copied = document.execCommand('copy')

    if (!copied) {
      throw new Error('Clipboard API no disponible')
    }
  } finally {
    document.body.removeChild(textarea)
  }
}
