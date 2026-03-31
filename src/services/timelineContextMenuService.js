export function createTimelineContextMenuItems(time, barDuration = 1) {
  const normalizedBarDuration = Number.isFinite(Number(barDuration)) && Number(barDuration) > 1
    ? Math.round(Number(barDuration))
    : 1

  return [
    {
      action: 'create-timeline-section-label',
      label: 'Add Section Label',
      time
    },
    {
      action: 'split-all',
      label: 'Split All',
      time
    },
    {
      action: 'add-bar',
      duration: normalizedBarDuration,
      label: normalizedBarDuration > 1 ? 'Add Bars' : 'Add Bar',
      time
    }
  ]
}
