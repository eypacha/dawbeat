import { defineStore } from 'pinia'

export const useDawStore = defineStore('dawStore', {
  state: () => ({
    playing: false,
    time: 0,
    zoom: 1,
    clips: [],
    selectedClipId: null
  })
})
