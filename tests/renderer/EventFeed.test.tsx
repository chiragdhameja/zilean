import React from 'react'
import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import { EventFeed } from '../../src/renderer/src/components/EventFeed'
import type { GameEvent } from '../../shared/types'

const makeEvent = (name: string, category: GameEvent['category'], relativeTime = '5s ago'): GameEvent => ({
  name,
  time: 300,
  relativeTime,
  category
})

describe('EventFeed', () => {
  it('renders empty state when no events', () => {
    render(<EventFeed events={[]} />)
    expect(screen.getByText('No events yet')).toBeInTheDocument()
  })

  it('renders event names', () => {
    const events = [
      makeEvent('DragonKill', 'objective', '20s ago'),
      makeEvent('ChampionKill', 'kill', '5s ago')
    ]
    render(<EventFeed events={events} />)
    expect(screen.getByText('DragonKill')).toBeInTheDocument()
    expect(screen.getByText('ChampionKill')).toBeInTheDocument()
  })

  it('renders relativeTime for each event', () => {
    const events = [makeEvent('TurretKilled', 'structure', '12s ago')]
    const { container } = render(<EventFeed events={events} />)
    // relativeTime is rendered as a sibling text node in the event-time span
    const timeSpan = container.querySelector('.event-time')
    expect(timeSpan?.textContent).toContain('12s ago')
  })

  it('shows newest events first (reverse order)', () => {
    const events = [
      makeEvent('DragonKill', 'objective', '30s ago'),
      makeEvent('BaronKill', 'objective', '10s ago')
    ]
    render(<EventFeed events={events} />)
    const items = screen.getAllByText(/Kill/)
    // BaronKill (newer, "10s ago") should appear before DragonKill ("30s ago")
    expect(items[0].textContent).toContain('BaronKill')
    expect(items[1].textContent).toContain('DragonKill')
  })

  it('respects maxDisplay limit', () => {
    const events = Array.from({ length: 10 }, (_, i) =>
      makeEvent(`Event${i}`, 'game', `${i}s ago`)
    )
    render(<EventFeed events={events} maxDisplay={3} />)
    // Only 3 events shown (the last 3, displayed in reverse)
    const items = screen.getAllByText(/Event\d/)
    expect(items).toHaveLength(3)
  })

  it('shows last N events when more than maxDisplay exist', () => {
    const events = Array.from({ length: 8 }, (_, i) =>
      makeEvent(`Event${i}`, 'game', `${i * 10}s ago`)
    )
    render(<EventFeed events={events} maxDisplay={5} />)
    // Should show events 3-7 (the last 5), newest (Event7) first
    expect(screen.getByText('Event7')).toBeInTheDocument()
    expect(screen.getByText('Event3')).toBeInTheDocument()
    expect(screen.queryByText('Event2')).not.toBeInTheDocument()
  })

  it('renders category icons for kill events', () => {
    render(<EventFeed events={[makeEvent('ChampionKill', 'kill')]} />)
    expect(screen.getByText('⚔')).toBeInTheDocument()
  })

  it('renders category icons for objective events', () => {
    render(<EventFeed events={[makeEvent('DragonKill', 'objective')]} />)
    expect(screen.getByText('🐉')).toBeInTheDocument()
  })

  it('renders category icons for structure events', () => {
    render(<EventFeed events={[makeEvent('TurretKilled', 'structure')]} />)
    expect(screen.getByText('🏰')).toBeInTheDocument()
  })

  it('shows detail string instead of event name when detail is present', () => {
    const event: GameEvent = {
      name: 'DragonKill',
      time: 300,
      relativeTime: '5s ago',
      category: 'objective',
      detail: 'Enemy team took Fire Dragon'
    }
    render(<EventFeed events={[event]} />)
    expect(screen.getByText('Enemy team took Fire Dragon')).toBeInTheDocument()
    expect(screen.queryByText('DragonKill')).not.toBeInTheDocument()
  })

  it('falls back to event name when detail is absent', () => {
    render(<EventFeed events={[makeEvent('ChampionKill', 'kill')]} />)
    expect(screen.getByText('ChampionKill')).toBeInTheDocument()
  })
})
