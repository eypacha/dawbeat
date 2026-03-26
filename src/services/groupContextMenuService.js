export function createGroupContextMenuItems(group) {
  if (!group?.id) {
    return []
  }

  return [
    {
      action: 'edit-group',
      groupId: group.id,
      label: 'Edit'
    },
    {
      action: 'rename-group',
      groupId: group.id,
      groupName: group.name,
      label: 'Rename'
    },
    {
      action: 'ungroup',
      groupId: group.id,
      label: 'Ungroup'
    },
    {
      action: 'copy-group',
      groupId: group.id,
      label: 'Copy'
    },
    {
      action: 'delete-group',
      groupId: group.id,
      label: 'Delete'
    }
  ]
}
