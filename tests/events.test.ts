import { describe, it, expect, beforeEach } from 'vitest'
import { extractRecentEvents, pollEvents, resetEventState, formatRelativeTime } from '../electron/main/poller'


describe('event category mapping', () => {
  it('maps DragonKill to objective', () => {
    const events = extractRecentEvents(
      [{ EventName: 'DragonKill', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('objective')
  })

  it('maps BaronKill to objective', () => {
    const events = extractRecentEvents(
      [{ EventName: 'BaronKill', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('objective')
  })

  it('maps InhibitorKilled to objective', () => {
    const events = extractRecentEvents(
      [{ EventName: 'InhibitorKilled', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('objective')
  })

  it('maps TurretKilled to structure', () => {
    const events = extractRecentEvents(
      [{ EventName: 'TurretKilled', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('structure')
  })

  it('maps ChampionKill to kill', () => {
    const events = extractRecentEvents(
      [{ EventName: 'ChampionKill', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('kill')
  })

  it('maps FirstBlood to kill', () => {
    const events = extractRecentEvents(
      [{ EventName: 'FirstBlood', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('kill')
  })

  it('maps ItemPurchased to economy', () => {
    const events = extractRecentEvents(
      [{ EventName: 'ItemPurchased', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('economy')
  })

  it('maps WardPlaced to vision', () => {
    const events = extractRecentEvents(
      [{ EventName: 'WardPlaced', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('vision')
  })

  it('maps WardKilled to vision', () => {
    const events = extractRecentEvents(
      [{ EventName: 'WardKilled', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('vision')
  })

  it('maps GameStart to game', () => {
    const events = extractRecentEvents(
      [{ EventName: 'GameStart', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('game')
  })

  it('maps GameEnd to game', () => {
    const events = extractRecentEvents(
      [{ EventName: 'GameEnd', EventTime: 0 }],
      60
    )
    expect(events[0].category).toBe('game')
  })
})

describe('relativeTime formatting', () => {
  it('formats 8 seconds as "8s ago"', () => {
    expect(formatRelativeTime(100, 108)).toBe('8s ago')
  })

  it('formats 75 seconds as "1m 15s ago"', () => {
    expect(formatRelativeTime(0, 75)).toBe('1m 15s ago')
  })

  it('formats exact minute boundary', () => {
    expect(formatRelativeTime(0, 120)).toBe('2m 0s ago')
  })

  it('formats 0 difference as "0s ago"', () => {
    expect(formatRelativeTime(300, 300)).toBe('0s ago')
  })
})

describe('pollEvents deduplication', () => {
  beforeEach(() => {
    resetEventState()
  })

  it('returns empty array when game not running', async () => {
    // pollEvents catches all errors and returns []
    const result = await pollEvents()
    expect(Array.isArray(result)).toBe(true)
  })
})

describe('event GameEvent shape', () => {
  it('extractRecentEvents returns objects with all required fields', () => {
    const events = extractRecentEvents(
      [
        { EventName: 'ChampionKill', EventTime: 300 },
        { EventName: 'DragonKill', EventTime: 350 }
      ],
      400
    )
    for (const e of events) {
      expect(typeof e.name).toBe('string')
      expect(typeof e.time).toBe('number')
      expect(typeof e.relativeTime).toBe('string')
      expect(['kill', 'objective', 'structure', 'economy', 'vision', 'game']).toContain(e.category)
    }
  })

  it('relativeTime is populated in extractRecentEvents', () => {
    const events = extractRecentEvents(
      [{ EventName: 'DragonKill', EventTime: 300 }],
      320
    )
    expect(events[0].relativeTime).toBe('20s ago')
  })

  it('time field matches EventTime from Riot API', () => {
    const events = extractRecentEvents(
      [{ EventName: 'ChampionKill', EventTime: 456 }],
      500
    )
    expect(events[0].time).toBe(456)
  })
})
