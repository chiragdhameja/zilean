import React from 'react'
import { GameEvent } from '../../../../shared/types'

const EVENT_ICONS: Record<GameEvent['category'], string> = {
  kill: '⚔',
  objective: '🐉',
  structure: '🏰',
  economy: '💰',
  vision: '👁',
  game: '🎮'
}

interface EventFeedProps {
  events: GameEvent[]
  maxDisplay?: number
  className?: string
}

export function EventFeed({ events, maxDisplay = 5, className = 'event-feed' }: EventFeedProps): JSX.Element {
  if (events.length === 0) {
    return <div className="event-feed-empty">No events yet</div>
  }

  const displayed = events.slice(-maxDisplay).reverse()

  return (
    <div className={className}>
      {displayed.map((e, i) => (
        <div key={i} className="event-item">
          <span className="event-icon">{EVENT_ICONS[e.category]}</span>
          <span className="event-name">{e.detail ?? e.name}</span>
          <span className="event-time"> — {e.relativeTime}</span>
        </div>
      ))}
    </div>
  )
}
