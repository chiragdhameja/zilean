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
  recentEvents: string[]
  summonerName: string
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

export interface AppSettings {
  anthropicApiKey: string
  overlayVisible: boolean
  summonerName?: string
  overlayTheme: 'lol-native' | 'minimal' | 'sidebar'
}
