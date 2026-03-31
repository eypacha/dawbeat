export function createTimelineContextMenuItems(time) {
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
      label: 'Add Bar',
      time
    }
  ]
}
