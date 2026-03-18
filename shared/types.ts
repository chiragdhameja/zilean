export interface GameEvent {
  name: string
  time: number          // event time in game-seconds
  relativeTime: string  // e.g. "8s ago"
  category: 'kill' | 'objective' | 'structure' | 'economy' | 'vision' | 'game'
  detail?: string       // e.g. "You killed Yasuo", "Enemy team took Fire Dragon"
}

export interface PlayerItem {
  displayName: string
  itemID: number
  slot: number
  count: number
  price: number
}

export interface PlayerAbilities {
  q: { displayName: string; level: number }
  w: { displayName: string; level: number }
  e: { displayName: string; level: number }
  r: { displayName: string; level: number }
  passive: { displayName: string }
}

export interface PlayerRunes {
  keystone: string       // e.g. "Electrocute"
  primaryTree: string    // e.g. "Domination"
  secondaryTree: string  // e.g. "Sorcery"
}

export interface LaneOpponent {
  championName: string
  kills: number
  deaths: number
  assists: number
}

export interface ChampionContext {
  championName: string
  items: string[]  // displayNames only — keeps GameState lean
  level: number
}

export interface GameState {
  champion: string
  role: string
  gameMode: string
  gameTime: string
  kills: number
  deaths: number
  assists: number
  gold: number
  teamGoldDiff: number
  recentEvents: GameEvent[]
  summonerName: string
  items: PlayerItem[]
  abilities: PlayerAbilities
  runes: PlayerRunes
  summonerSpells: { spell1: string; spell2: string }
  laneOpponent: LaneOpponent | null
  allies: ChampionContext[]   // all allied champions (excluding self)
  enemies: ChampionContext[]  // all enemy champions
}

export interface ItemSuggestion {
  name: string
  reason: string
  goldNeeded: number
}

export interface BackTiming {
  suggestion: string
  goldTarget: number
}

export interface CoachingGoals {
  personalGoals: string[]  // exactly 2
  teamGoals: string[]       // exactly 2
  personalTag: string       // 1-2 word AI summary of personal goals
  teamTag: string           // 1-2 word AI summary of team goals
  gamePhase: 'early' | 'mid' | 'late'
  updatedAt: string
  matchupTip: string        // exactly 1 sentence, always present during active game
  item?: ItemSuggestion
  backTiming?: BackTiming
}

export type CoachingStatus = 'waiting' | 'active' | 'error'

export interface CoachingUpdate {
  status: CoachingStatus
  goals?: CoachingGoals | null
  error?: string
  champion?: string
  gameMode?: string
}

export interface EventsUpdate {
  events: GameEvent[]
}

export interface AppSettings {
  anthropicApiKey: string
  overlayVisible: boolean
  summonerName?: string
  overlayTheme: 'lol-native' | 'minimal' | 'sidebar'
}
