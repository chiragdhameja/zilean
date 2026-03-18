import { contextBridge, ipcRenderer } from 'electron'
import { AppSettings, CoachingUpdate, EventsUpdate } from '../../shared/types'

contextBridge.exposeInMainWorld('electronAPI', {
  getSettings: (): Promise<AppSettings> => ipcRenderer.invoke('get-settings'),

  saveSettings: (settings: AppSettings): Promise<{ success: boolean }> =>
    ipcRenderer.invoke('save-settings', settings),

  toggleOverlay: (): Promise<void> => ipcRenderer.invoke('toggle-overlay'),

  onCoachingUpdate: (callback: (update: CoachingUpdate) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, update: CoachingUpdate): void =>
      callback(update)
    ipcRenderer.on('coaching-update', handler)
    return () => ipcRenderer.removeListener('coaching-update', handler)
  },

  resizeOverlay: (height: number): void => ipcRenderer.send('resize-overlay', height),

  onEventsUpdate: (callback: (update: EventsUpdate) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, update: EventsUpdate): void =>
      callback(update)
    ipcRenderer.on('events-update', handler)
    return () => ipcRenderer.removeListener('events-update', handler)
  },

  dumpSwagger: (): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('dump-swagger')
})
