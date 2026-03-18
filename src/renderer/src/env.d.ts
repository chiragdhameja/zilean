/// <reference types="vite/client" />

import { AppSettings, CoachingUpdate, EventsUpdate } from '../../../shared/types'

interface ElectronAPI {
  getSettings: () => Promise<AppSettings>
  saveSettings: (settings: AppSettings) => Promise<{ success: boolean }>
  toggleOverlay: () => Promise<void>
  onCoachingUpdate: (callback: (update: CoachingUpdate) => void) => () => void
  resizeOverlay: (height: number) => void
  onEventsUpdate: (callback: (update: EventsUpdate) => void) => () => void
  dumpSwagger: () => Promise<{ success: boolean; error?: string }>
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
  }
}
