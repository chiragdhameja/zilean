import * as https from 'https'
import { GameState, GameEvent, LaneOpponent, ChampionContext } from '../../shared/types'

const RIOT_LIVE_API = 'https://127.0.0.1:2999/liveclientdata'
const POLL_INTERVAL_MS = 60_000
export const EVENT_POLL_INTERVAL_MS = 5_000
const GOLD_DIFF_THRESHOLD = 500

let pollTimer: NodeJS.Timeout | null = null

// Event deduplication — count of tracked events already sent
let lastSentEventCount = 0

// Cached player context for event enrichment in fast poll (updated on each full poll)
interface PlayerContext {
  summonerName: string
  allyNames: Set<string>
  championMap: Map<string, string>  // summonerName → championName
}
let cachedPlayerContext: PlayerContext | null = null

const TRACKED_EVENTS = new Set([
  'DragonKill', 'BaronKill', 'TurretKilled', 'ChampionKill', 'InhibitorKilled',
  'ItemPurchased', 'WardPlaced', 'WardKilled', 'FirstBlood', 'GameStart', 'GameEnd'
])

const EVENT_CATEGORIES: Record<string, GameEvent['category']> = {
  DragonKill: 'objective',
  BaronKill: 'objective',
  InhibitorKilled: 'objective',
  TurretKilled: 'structure',
  ChampionKill: 'kill',
  FirstBlood: 'kill',
  ItemPurchased: 'economy',
  WardPlaced: 'vision',
  WardKilled: 'vision',
  GameStart: 'game',
  GameEnd: 'game'
}

interface RiotItem {
  displayName: string
  itemID: number
  slot: number
  count: number
  price: number
}

interface RiotPlayerData {
  summonerName: string
  championName: string
  position: string
  scores: { kills: number; deaths: number; assists: number }
  currentGold: number
  team: string
  level?: number
  items: RiotItem[]
  summonerSpells: {
    summonerSpellOne: { displayName: string }
    summonerSpellTwo: { displayName: string }
  }
}

interface RiotAbility {
  displayName: string
  abilityLevel: number
}

interface RiotPassive {
  displayName: string
}

interface RiotAbilities {
  Q: RiotAbility
  W: RiotAbility
  E: RiotAbility
  R: RiotAbility
  Passive: RiotPassive
}

interface RiotRune {
  displayName: string
  id: number
}

interface RiotRunes {
  keystone: RiotRune
  primaryRuneTree: RiotRune
  secondaryRuneTree: RiotRune
}

interface RiotGameData {
  gameTime: number
  gameMode: string
  events: { Events: RiotEvent[] }
  allPlayers: RiotPlayerData[]
  activePlayer: {
    summonerName: string
    championStats: { currentGold: number }
  }
  abilities: RiotAbilities
  runes: RiotRunes
}

interface RiotEvent {
  EventName: string
  EventTime: number
  KillerName?: string
  VictimName?: string
  TurretKilled?: string
  InhibKilled?: string
  DragonType?: string
  Stolen?: string
  Acer?: string
  AcerTeam?: string
}

export function formatRelativeTime(eventTimeSec: number, currentGameTimeSec: number): string {
  const diff = Math.max(0, currentGameTimeSec - eventTimeSec)
  if (diff < 60) return `${Math.floor(diff)}s ago`
  const m = Math.floor(diff / 60)
  const s = Math.floor(diff % 60)
  return `${m}m ${s}s ago`
}

export function computeEventDetail(
  event: RiotEvent,
  summonerName: string,
  allyNames: Set<string>,
  championMap?: Map<string, string>
): string | undefined {
  const isYou = (n: string) => n === summonerName
  const isAlly = (n: string) => n === summonerName || allyNames.has(n)
  // Use champion name when available, otherwise fall back to summoner name
  const champ = (n: string) => championMap?.get(n) ?? n

  switch (event.EventName) {
    case 'FirstBlood':
    case 'ChampionKill': {
      const killer = event.KillerName ?? event.Acer ?? 'Unknown'
      const victim = event.VictimName ?? 'Unknown'
      const prefix = event.EventName === 'FirstBlood' ? 'First Blood: ' : ''
      if (isYou(killer)) return `${prefix}You killed ${champ(victim)}`
      if (isYou(victim)) return `${prefix}Killed by ${champ(killer)}`
      if (isAlly(victim)) return `${prefix}Ally ${champ(victim)} killed by ${champ(killer)}`
      if (isAlly(killer)) return `${prefix}Ally ${champ(killer)} killed ${champ(victim)}`
      // Both are enemies fighting each other
      return `${prefix}${champ(killer)} killed ${champ(victim)}`
    }
    case 'DragonKill': {
      const dragonType = event.DragonType ?? 'Dragon'
      const stolen = event.Stolen === 'True'
      const killer = event.KillerName ?? 'Unknown'
      const team = isAlly(killer) ? 'Ally' : 'Enemy'
      return stolen
        ? `${team} team stole ${dragonType} Dragon!`
        : `${team} team took ${dragonType} Dragon`
    }
    case 'BaronKill': {
      const stolen = event.Stolen === 'True'
      const killer = event.KillerName ?? 'Unknown'
      const team = isAlly(killer) ? 'Ally' : 'Enemy'
      return stolen ? `${team} team stole Baron!` : `${team} team secured Baron`
    }
    case 'TurretKilled': {
      const killer = event.KillerName ?? 'Unknown'
      const team = isAlly(killer) ? 'Ally' : 'Enemy'
      return `${team} team destroyed a turret`
    }
    case 'InhibitorKilled': {
      const killer = event.KillerName ?? 'Unknown'
      const team = isAlly(killer) ? 'Ally' : 'Enemy'
      return `${team} team destroyed an inhibitor`
    }
    default:
      return undefined
  }
}

function toGameEvent(
  event: RiotEvent,
  currentGameTimeSec: number,
  playerContext?: PlayerContext | null
): GameEvent {
  const detail = playerContext
    ? computeEventDetail(event, playerContext.summonerName, playerContext.allyNames, playerContext.championMap)
    : undefined

  return {
    name: event.EventName,
    time: event.EventTime,
    relativeTime: formatRelativeTime(event.EventTime, currentGameTimeSec),
    category: EVENT_CATEGORIES[event.EventName] ?? 'game',
    ...(detail !== undefined ? { detail } : {})
  }
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { rejectUnauthorized: false }, (res) => {
      let data = ''
      res.on('data', (chunk) => { data += chunk })
      res.on('end', () => resolve(data))
    })
    req.on('error', reject)
    req.setTimeout(5000, () => {
      req.destroy(new Error('Request timed out'))
    })
  })
}

async function fetchAllData(): Promise<RiotGameData | null> {
  try {
    const [gameDataRaw, eventsRaw, playersRaw, activePlayerRaw, abilitiesRaw, runesRaw] = await Promise.all([
      httpsGet(`${RIOT_LIVE_API}/gamestats`),
      httpsGet(`${RIOT_LIVE_API}/eventdata`),
      httpsGet(`${RIOT_LIVE_API}/playerlist`),
      httpsGet(`${RIOT_LIVE_API}/activeplayer`),
      httpsGet(`${RIOT_LIVE_API}/activeplayerabilities`),
      httpsGet(`${RIOT_LIVE_API}/activeplayerrunes`)
    ])

    console.log('[poller] Raw gamestats:', gameDataRaw.slice(0, 100))

    const gameData = JSON.parse(gameDataRaw)
    const events = JSON.parse(eventsRaw)
    const allPlayers = JSON.parse(playersRaw)
    const activePlayer = JSON.parse(activePlayerRaw)
    const abilities = JSON.parse(abilitiesRaw)
    const runes = JSON.parse(runesRaw)

    // Normalise events — some endpoints return { Events: [] }, others return { events: [] }
    const eventsList: RiotEvent[] = events.Events ?? events.events ?? []

    return {
      gameTime: gameData.gameTime ?? gameData.gameLength ?? 0,
      gameMode: gameData.gameMode ?? 'CLASSIC',
      events: { Events: eventsList },
      allPlayers,
      activePlayer,
      abilities,
      runes
    }
  } catch (err: unknown) {
    const error = err as NodeJS.ErrnoException
    if (
      error.code === 'ECONNREFUSED' ||
      error.code === 'ECONNRESET' ||
      error.code === 'ENOTFOUND'
    ) {
      console.log('[poller] Game not running — connection refused')
      return null
    }
    if (error.message?.includes('timed out')) {
      console.log('[poller] Game not running — timeout')
      return null
    }
    console.error('[poller] Error fetching game data:', error.message, error.stack)
    return null
  }
}

export function extractRecentEvents(
  events: RiotEvent[],
  gameTimeSec: number,
  playerContext?: PlayerContext | null
): GameEvent[] {
  return events
    .filter((e) => TRACKED_EVENTS.has(e.EventName) && gameTimeSec - e.EventTime <= 120)
    .slice(-10)
    .map((e) => toGameEvent(e, gameTimeSec, playerContext))
}

export async function pollEvents(): Promise<GameEvent[]> {
  try {
    const [eventsRaw, gameDataRaw] = await Promise.all([
      httpsGet(`${RIOT_LIVE_API}/eventdata`),
      httpsGet(`${RIOT_LIVE_API}/gamestats`)
    ])

    const eventsData = JSON.parse(eventsRaw)
    const gameData = JSON.parse(gameDataRaw)

    const gameTimeSec: number = gameData.gameTime ?? gameData.gameLength ?? 0
    const allEvents: RiotEvent[] = eventsData.Events ?? eventsData.events ?? []
    const tracked = allEvents.filter((e) => TRACKED_EVENTS.has(e.EventName))

    // Only emit events we haven't sent yet
    const newEvents = tracked.slice(lastSentEventCount)
    lastSentEventCount = tracked.length

    return newEvents.map((e) => toGameEvent(e, gameTimeSec, cachedPlayerContext))
  } catch {
    return []
  }
}

export function resetEventState(): void {
  lastSentEventCount = 0
}

export function computeTeamGoldDiff(players: RiotPlayerData[], summonerName: string): number {
  const activePlayer = players.find((p) => p.summonerName === summonerName)
  if (!activePlayer) return 0
  const myTeam = activePlayer.team

  let allyGold = 0
  let enemyGold = 0
  for (const player of players) {
    if (player.team === myTeam) {
      allyGold += player.currentGold
    } else {
      enemyGold += player.currentGold
    }
  }
  return allyGold - enemyGold
}

export function findLaneOpponent(
  players: RiotPlayerData[],
  summonerName: string
): LaneOpponent | null {
  const activePlayer = players.find((p) => p.summonerName === summonerName)
  if (!activePlayer) return null

  // ARAM and modes without positions have empty position strings
  if (!activePlayer.position || !activePlayer.position.trim()) return null

  const opponent = players.find(
    (p) => p.team !== activePlayer.team && p.position === activePlayer.position
  )
  if (!opponent) return null

  return {
    championName: opponent.championName,
    kills: opponent.scores.kills,
    deaths: opponent.scores.deaths,
    assists: opponent.scores.assists
  }
}

function buildChampionContexts(
  players: RiotPlayerData[],
  summonerName: string
): { allies: ChampionContext[]; enemies: ChampionContext[] } {
  const activePlayer = players.find((p) => p.summonerName === summonerName)
  if (!activePlayer) return { allies: [], enemies: [] }
  const myTeam = activePlayer.team

  const allies: ChampionContext[] = players
    .filter((p) => p.team === myTeam && p.summonerName !== summonerName)
    .map((p) => ({
      championName: p.championName,
      items: (p.items ?? []).map((i) => i.displayName),
      level: p.level ?? 1
    }))

  const enemies: ChampionContext[] = players
    .filter((p) => p.team !== myTeam)
    .map((p) => ({
      championName: p.championName,
      items: (p.items ?? []).map((i) => i.displayName),
      level: p.level ?? 1
    }))

  return { allies, enemies }
}

export function detectMeaningfulChange(
  prev: GameState | null,
  next: GameState
): boolean {
  if (!prev) return true

  if (next.deaths > prev.deaths) return true
  if (next.kills > prev.kills) return true

  const prevEventNames = new Set(prev.recentEvents.map((e) => e.name))
  const newEvents = next.recentEvents.filter((e) => !prevEventNames.has(e.name))
  if (newEvents.some((e) => ['DragonKill', 'BaronKill', 'TurretKilled'].includes(e.name))) return true

  const prevPhase = getGamePhase(prev.gameTime)
  const nextPhase = getGamePhase(next.gameTime)
  if (prevPhase !== nextPhase) return true

  if (Math.abs(next.teamGoldDiff - prev.teamGoldDiff) > GOLD_DIFF_THRESHOLD) return true

  // Item purchased: player spent 350+ gold (minimum component cost, excludes consumables)
  if (prev.gold - next.gold >= 350) return true

  return false
}

function getGamePhase(gameTime: string): 'early' | 'mid' | 'late' {
  const seconds = parseGameTime(gameTime)
  if (seconds < 900) return 'early'   // < 15 min
  if (seconds < 1800) return 'mid'    // 15–30 min
  return 'late'
}

function parseGameTime(gameTime: string): number {
  // "mm:ss" format takes priority to avoid parseFloat('16:00') → 16
  if (gameTime.includes(':')) {
    const parts = gameTime.split(':')
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  // gameTime from Riot is in seconds as a float
  const asFloat = parseFloat(gameTime)
  return isNaN(asFloat) ? 0 : asFloat
}

export function formatGameTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

async function poll(callback: (state: GameState | null) => void): Promise<void> {
  const data = await fetchAllData()
  if (!data) {
    callback(null)
    return
  }

  try {
    const summonerName = data.activePlayer.summonerName
    const activePlayerFull = data.allPlayers.find((p) => p.summonerName === summonerName)
    if (!activePlayerFull) {
      callback(null)
      return
    }

    const myTeam = activePlayerFull.team
    const allyNames = new Set(
      data.allPlayers
        .filter((p) => p.team === myTeam && p.summonerName !== summonerName)
        .map((p) => p.summonerName)
    )

    const championMap = new Map<string, string>(
      data.allPlayers.map((p) => [p.summonerName, p.championName])
    )

    // Update cached player context for fast event poll enrichment
    cachedPlayerContext = { summonerName, allyNames, championMap }

    const playerContext: PlayerContext = { summonerName, allyNames, championMap }
    const { allies, enemies } = buildChampionContexts(data.allPlayers, summonerName)

    const gameState: GameState = {
      champion: activePlayerFull.championName,
      role: activePlayerFull.position || 'UNKNOWN',
      gameMode: data.gameMode,
      gameTime: formatGameTime(data.gameTime),
      kills: activePlayerFull.scores.kills,
      deaths: activePlayerFull.scores.deaths,
      assists: activePlayerFull.scores.assists,
      gold: activePlayerFull.currentGold,
      teamGoldDiff: computeTeamGoldDiff(data.allPlayers, summonerName),
      recentEvents: extractRecentEvents(data.events.Events, data.gameTime, playerContext),
      summonerName,
      items: (activePlayerFull.items ?? []).map((item) => ({
        displayName: item.displayName,
        itemID: item.itemID,
        slot: item.slot,
        count: item.count,
        price: item.price
      })),
      abilities: {
        q: { displayName: data.abilities.Q.displayName, level: data.abilities.Q.abilityLevel },
        w: { displayName: data.abilities.W.displayName, level: data.abilities.W.abilityLevel },
        e: { displayName: data.abilities.E.displayName, level: data.abilities.E.abilityLevel },
        r: { displayName: data.abilities.R.displayName, level: data.abilities.R.abilityLevel },
        passive: { displayName: data.abilities.Passive.displayName }
      },
      runes: {
        keystone: data.runes.keystone.displayName,
        primaryTree: data.runes.primaryRuneTree.displayName,
        secondaryTree: data.runes.secondaryRuneTree.displayName
      },
      summonerSpells: {
        spell1: activePlayerFull.summonerSpells?.summonerSpellOne?.displayName ?? 'Unknown',
        spell2: activePlayerFull.summonerSpells?.summonerSpellTwo?.displayName ?? 'Unknown'
      },
      laneOpponent: findLaneOpponent(data.allPlayers, summonerName),
      allies,
      enemies
    }

    callback(gameState)
  } catch (err) {
    console.error('[poller] Failed to parse game state:', err)
    callback(null)
  }
}

export function startPolling(callback: (state: GameState | null) => void): void {
  if (pollTimer) return
  // Fire immediately on start
  poll(callback)
  pollTimer = setInterval(() => poll(callback), POLL_INTERVAL_MS)
}

export function stopPolling(): void {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

export async function triggerPoll(callback: (state: GameState | null) => void): Promise<void> {
  return poll(callback)
}

// Exported for testing
export { getGamePhase, parseGameTime }
