import { GameState, GameEvent, LiveStats } from '../../shared/types'

function parseGameTimeSecs(gameTime: string): number {
  if (gameTime.includes(':')) {
    const parts = gameTime.split(':')
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  const asFloat = parseFloat(gameTime)
  return isNaN(asFloat) ? 0 : asFloat
}

function countTeamKills(allEvents: GameEvent[]): number {
  return allEvents.filter(
    (e) =>
      e.category === 'kill' &&
      (e.detail?.startsWith('You killed') || /^Ally .+ killed [A-Z]/.test(e.detail ?? ''))
  ).length
}

function countAllyDragons(allEvents: GameEvent[]): number {
  return allEvents.filter(
    (e) => e.name === 'DragonKill' && e.detail?.startsWith('Ally')
  ).length
}

export function computeLiveStats(state: GameState, allEvents: GameEvent[]): LiveStats {
  const gameTimeSecs = parseGameTimeSecs(state.gameTime)
  const gameTimeMins = Math.max(1, gameTimeSecs / 60)

  const kdaRatio = parseFloat(
    ((state.kills + state.assists) / Math.max(1, state.deaths)).toFixed(1)
  )

  const csPerMin = parseFloat((state.cs / gameTimeMins).toFixed(1))

  const totalGoldInItems = state.items.reduce(
    (sum, item) => sum + item.price * item.count,
    0
  )
  const goldUnspent = state.gold
  const estimatedTotalGold = goldUnspent + totalGoldInItems
  const goldPerMin = Math.round(estimatedTotalGold / gameTimeMins)
  const goldEfficiency =
    estimatedTotalGold > 0
      ? Math.round((totalGoldInItems / estimatedTotalGold) * 100)
      : 0

  const deathsPer10Min = parseFloat(((state.deaths / gameTimeMins) * 10).toFixed(1))

  const teamKills = countTeamKills(allEvents)
  const killParticipation =
    teamKills > 0
      ? Math.min(100, Math.round(((state.kills + state.assists) / teamKills) * 100))
      : 0
  const killShare =
    teamKills > 0 ? Math.min(100, Math.round((state.kills / teamKills) * 100)) : 0
  const assistShare =
    teamKills > 0 ? Math.min(100, Math.round((state.assists / teamKills) * 100)) : 0

  const goldDiffTrend: 'gaining' | 'losing' | 'stable' =
    state.teamGoldDiff > 500
      ? 'gaining'
      : state.teamGoldDiff < -500
        ? 'losing'
        : 'stable'

  const wardsPlaced = allEvents.filter((e) => e.name === 'WardPlaced').length
  const wardsKilled = allEvents.filter((e) => e.name === 'WardKilled').length

  const dragonEvents = allEvents.filter((e) => e.name === 'DragonKill')
  const totalDragons = dragonEvents.length
  const allyDragons = countAllyDragons(allEvents)
  const dragonControl =
    totalDragons > 0 ? Math.round((allyDragons / totalDragons) * 100) : 0

  const turretsDestroyed = allEvents.filter(
    (e) => e.name === 'TurretKilled' && e.detail?.startsWith('Ally')
  ).length

  const inhibitorsDestroyed = allEvents.filter(
    (e) => e.name === 'InhibitorKilled' && e.detail?.startsWith('Ally')
  ).length

  // Rough estimate: average respawn grows with level
  const avgRespawnSecs = 7 + 2.5 * state.level
  const estimatedDeadSecs = state.deaths * avgRespawnSecs
  const timeAlivePercent = Math.max(
    0,
    Math.round((1 - estimatedDeadSecs / Math.max(1, gameTimeSecs)) * 100)
  )

  const myKillStreak = (() => {
    let streak = 0
    const recent = [...allEvents].reverse()
    for (const e of recent) {
      if (e.category !== 'kill') continue
      if (e.detail?.startsWith('You killed')) {
        streak++
      } else if (e.detail?.startsWith('Killed by')) {
        break
      }
    }
    return streak
  })()

  const currentStreak: 'killing' | 'on fire' | 'none' =
    myKillStreak >= 3 ? 'on fire' : myKillStreak >= 1 ? 'killing' : 'none'

  const gamePhase: 'early' | 'mid' | 'late' =
    gameTimeSecs < 900 ? 'early' : gameTimeSecs < 1800 ? 'mid' : 'late'

  const itemSlotsUsed = state.items.length
  const abilityPointsUsed =
    state.abilities.q.level +
    state.abilities.w.level +
    state.abilities.e.level +
    state.abilities.r.level

  return {
    csPerMin,
    goldPerMin,
    kdaRatio,
    deathsPer10Min,
    killParticipation,
    killShare,
    assistShare,
    goldDiffTrend,
    goldUnspent,
    totalGoldInItems,
    goldEfficiency,
    wardsPlaced,
    wardsKilled,
    wardScore: state.wardScore,
    dragonControl,
    turretsDestroyed,
    inhibitorsDestroyed,
    timeAlivePercent,
    currentStreak,
    gamePhase,
    itemSlotsUsed,
    abilityPointsUsed
  }
}
