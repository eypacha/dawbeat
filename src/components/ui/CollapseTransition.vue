<template>
  <Transition
    @after-enter="handleAfterEnter"
    @after-leave="handleAfterLeave"
    @before-enter="handleBeforeEnter"
    @before-leave="handleBeforeLeave"
    @enter="handleEnter"
    @leave="handleLeave"
  >
    <slot />
  </Transition>
</template>

<script setup>
const TRANSITION_MS = 200
const TRANSITION_EASING = 'cubic-bezier(0.22, 1, 0.36, 1)'

function setTransitionStyles(element) {
  element.style.overflow = 'hidden'
  element.style.willChange = 'height, opacity'
  element.style.transition = [
    `height ${TRANSITION_MS}ms ${TRANSITION_EASING}`,
    `opacity ${TRANSITION_MS}ms ease`
  ].join(', ')
}

function clearPendingTimer(element) {
  if (element.__collapseTransitionTimer) {
    window.clearTimeout(element.__collapseTransitionTimer)
    element.__collapseTransitionTimer = null
  }
}

function clearStyles(element) {
  clearPendingTimer(element)
  element.style.height = ''
  element.style.opacity = ''
  element.style.overflow = ''
  element.style.willChange = ''
  element.style.transition = ''
}

function scheduleDone(element, done) {
  clearPendingTimer(element)
  element.__collapseTransitionTimer = window.setTimeout(() => {
    element.__collapseTransitionTimer = null
    done()
  }, TRANSITION_MS)
}

function handleBeforeEnter(element) {
  clearPendingTimer(element)
  setTransitionStyles(element)
  element.style.height = '0px'
  element.style.opacity = '0'
}

function handleEnter(element, done) {
  setTransitionStyles(element)
  void element.offsetHeight

  requestAnimationFrame(() => {
    element.style.height = `${element.scrollHeight}px`
    element.style.opacity = '1'
  })

  scheduleDone(element, done)
}

function handleAfterEnter(element) {
  clearStyles(element)
}

function handleBeforeLeave(element) {
  clearPendingTimer(element)
  setTransitionStyles(element)
  element.style.height = `${element.scrollHeight}px`
  element.style.opacity = '1'
}

function handleLeave(element, done) {
  setTransitionStyles(element)
  void element.offsetHeight

  requestAnimationFrame(() => {
    element.style.height = '0px'
    element.style.opacity = '0'
  })

  scheduleDone(element, done)
}

function handleAfterLeave(element) {
  clearStyles(element)
}
</script>
