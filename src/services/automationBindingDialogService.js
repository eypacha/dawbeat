import { reactive } from 'vue'

export const automationBindingDialogState = reactive({
  laneId: null,
  open: false
})

export function openAutomationBindingDialog(laneId) {
  automationBindingDialogState.laneId = typeof laneId === 'string' && laneId ? laneId : null
  automationBindingDialogState.open = Boolean(automationBindingDialogState.laneId)
}

export function closeAutomationBindingDialog() {
  automationBindingDialogState.laneId = null
  automationBindingDialogState.open = false
}
