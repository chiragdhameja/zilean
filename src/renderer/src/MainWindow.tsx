import React, { useEffect, useState } from 'react'
import { GameEvent } from '../../../shared/types'
import { EventFeed } from './components/EventFeed'
import './styles/main.css'

export function MainWindow(): JSX.Element {
  const [events, setEvents] = useState<GameEvent[]>([])

  useEffect(() => {
    if (!window.electronAPI?.onEventsUpdate) return
    const cleanup = window.electronAPI.onEventsUpdate((update) => {
      setEvents(update.events)
    })
    return cleanup
  }, [])

  return (
    <div className="main-window">
      <div className="main-header">
        <h1>Zilean</h1>
        <p className="subtitle">Real-time LoL AI Coach</p>
      </div>

      <div className="main-status">
        <div className="status-item">
          <span className="status-label">Status</span>
          <span className="status-value">Running</span>
        </div>
        <div className="status-item">
          <span className="status-label">Overlay</span>
          <span className="status-value">Alt+C to toggle</span>
        </div>
        <div className="status-item">
          <span className="status-label">Settings</span>
          <span className="status-value">Alt+, to open</span>
        </div>
      </div>

      <div className="events-panel">
        <h2>Live Events</h2>
        {events.length === 0 ? (
          <p className="no-events">No events — waiting for game...</p>
        ) : (
          <EventFeed events={events} maxDisplay={20} className="events-list" />
        )}
      </div>
    </div>
  )
}
