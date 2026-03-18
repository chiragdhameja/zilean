import Anthropic from '@anthropic-ai/sdk'
import { GameState, CoachingGoals } from '../../shared/types'

const MODEL = 'claude-sonnet-4-6'
const MAX_TOKENS = 900

function buildTeamContextSection(state: GameState): string {
  const formatChamp = (c: { championName: string; items: string[] }): string => {
    const items = c.items.length > 0 ? c.items.join(', ') : 'no items'
    return `${c.championName} (${items})`
  }

  const allyStr = state.allies.length > 0
    ? state.allies.map(formatChamp).join('; ')
    : 'unknown'
  const enemyStr = state.enemies.length > 0
    ? state.enemies.map(formatChamp).join('; ')
    : 'unknown'

  return `- Ally Team: ${allyStr}
- Enemy Team: ${enemyStr}`
}

function buildMatchupTipInstruction(state: GameState): string {
  const opponentStr = state.laneOpponent
    ? `${state.laneOpponent.championName} (${state.laneOpponent.kills}/${state.laneOpponent.deaths}/${state.laneOpponent.assists})`
    : 'unknown opponent'

  if (state.abilities.r.level === 0 || parseGameTimeStr(state.gameTime) < 900) {
    // Early game — lane-focused
    return `In exactly one direct sentence (max 15 words), give the most important lane tip for playing ${state.champion} against ${opponentStr} right now. Be direct and specific.`
  }
  if (parseGameTimeStr(state.gameTime) < 1800) {
    // Mid game — rotations and skirmishes
    return `In exactly one direct sentence (max 15 words), give the most important mid-game tip for ${state.champion} right now — focus on rotations, skirmishes, or objectives, not the lane. Be direct and specific.`
  }
  // Late game — win conditions
  return `In exactly one direct sentence (max 15 words), give the most important late-game tip for ${state.champion} right now — focus on teamfight positioning, win conditions, or objective control. Be direct and specific.`
}

function parseGameTimeStr(gameTime: string): number {
  if (gameTime.includes(':')) {
    const parts = gameTime.split(':')
    if (parts.length === 2) return parseInt(parts[0]) * 60 + parseInt(parts[1])
  }
  return parseFloat(gameTime) || 0
}

function buildPrompt(state: GameState, historicalContext?: string): string {
  const eventsStr = state.recentEvents.length > 0
    ? state.recentEvents.map((e) => e.detail ?? e.name).join('; ')
    : 'none'
  const goldDiffStr = state.teamGoldDiff >= 0
    ? `+${state.teamGoldDiff}`
    : `${state.teamGoldDiff}`

  const itemsStr = state.items.length > 0
    ? state.items.map((i) => i.displayName).join(', ')
    : 'none'

  const abilitiesStr = `Q(${state.abilities.q.level}) W(${state.abilities.w.level}) E(${state.abilities.e.level}) R(${state.abilities.r.level})`

  const runesStr = `${state.runes.keystone} | ${state.runes.primaryTree} / ${state.runes.secondaryTree}`

  const spellsStr = `${state.summonerSpells.spell1} + ${state.summonerSpells.spell2}`

  const opponentStr = state.laneOpponent
    ? `${state.laneOpponent.championName} (${state.laneOpponent.kills}/${state.laneOpponent.deaths}/${state.laneOpponent.assists})`
    : 'unknown'

  const historicalSection = historicalContext
    ? `\nHistorical patterns:\n${historicalContext}\n`
    : ''

  const matchupTipInstruction = buildMatchupTipInstruction(state)
  const teamContext = buildTeamContextSection(state)

  return `Game state:
- Champion: ${state.champion}, Role: ${state.role}
- Game time: ${state.gameTime}
- Score: ${state.kills}/${state.deaths}/${state.assists}
- Gold: ${state.gold}g
- My Items: ${itemsStr}
- Abilities: ${abilitiesStr}
- Keystone: ${runesStr}
- Summoner Spells: ${spellsStr}
- Lane Opponent: ${opponentStr}
${teamContext}
- Recent events: ${eventsStr}
- Team gold difference: ${goldDiffStr}${historicalSection}

Generate coaching goals for the next 3 minutes.
Suggest the single best next item purchase considering my current gold (${state.gold}g), what I've already built, the enemy team composition and what they are building, and the game phase.
Suggest when to back (after which objective/wave, and the gold target to aim for).
Omit item/backTiming fields if the game phase or state doesn't warrant it.
${matchupTipInstruction}
Return ONLY valid JSON:
{"personalGoals":["goal1","goal2"],"personalTag":"<1-2 word label>","teamGoals":["goal1","goal2"],"teamTag":"<1-2 word label>","gamePhase":"early|mid|late","updatedAt":"${state.gameTime}","matchupTip":"<1 sentence, max 20 words>","item":{"name":"<item>","reason":"<why>","goldNeeded":<int>},"backTiming":{"suggestion":"<when to back>","goldTarget":<int>}}
personalTag and teamTag must be 1-2 words capturing the core theme (e.g. "Farm", "Roam", "Peel", "Vision").
matchupTip must be present, exactly 1 sentence, max 20 words.
No explanation. No markdown. JSON only.`
}

function validateCoachingGoals(obj: unknown): CoachingGoals {
  if (!obj || typeof obj !== 'object') {
    throw new Error('Response is not an object')
  }

  const data = obj as Record<string, unknown>

  if (!Array.isArray(data.personalGoals) || data.personalGoals.length !== 2) {
    throw new Error(`personalGoals must be an array of exactly 2 items, got: ${JSON.stringify(data.personalGoals)}`)
  }
  if (typeof data.personalTag !== 'string' || !data.personalTag.trim()) {
    throw new Error('personalTag must be a non-empty string')
  }
  if (!Array.isArray(data.teamGoals) || data.teamGoals.length !== 2) {
    throw new Error(`teamGoals must be an array of exactly 2 items, got: ${JSON.stringify(data.teamGoals)}`)
  }
  if (typeof data.teamTag !== 'string' || !data.teamTag.trim()) {
    throw new Error('teamTag must be a non-empty string')
  }
  if (!['early', 'mid', 'late'].includes(data.gamePhase as string)) {
    throw new Error(`gamePhase must be early|mid|late, got: ${data.gamePhase}`)
  }
  if (typeof data.updatedAt !== 'string') {
    throw new Error('updatedAt must be a string')
  }
  if (typeof data.matchupTip !== 'string' || !data.matchupTip.trim()) {
    throw new Error('matchupTip must be a non-empty string')
  }
  const words = data.matchupTip.trim().split(/\s+/)
  if (words.length > 20) {
    throw new Error(`matchupTip must be max 20 words, got ${words.length}`)
  }

  const result: CoachingGoals = {
    personalGoals: data.personalGoals as string[],
    personalTag: (data.personalTag as string).trim(),
    teamGoals: data.teamGoals as string[],
    teamTag: (data.teamTag as string).trim(),
    gamePhase: data.gamePhase as 'early' | 'mid' | 'late',
    updatedAt: data.updatedAt as string,
    matchupTip: data.matchupTip.trim()
  }

  if (data.item !== undefined) {
    const item = data.item as Record<string, unknown>
    if (typeof item.name !== 'string' || typeof item.reason !== 'string' || typeof item.goldNeeded !== 'number') {
      throw new Error('item must have name (string), reason (string), goldNeeded (number)')
    }
    result.item = { name: item.name, reason: item.reason, goldNeeded: item.goldNeeded }
  }

  if (data.backTiming !== undefined) {
    const bt = data.backTiming as Record<string, unknown>
    if (typeof bt.suggestion !== 'string' || typeof bt.goldTarget !== 'number') {
      throw new Error('backTiming must have suggestion (string), goldTarget (number)')
    }
    result.backTiming = { suggestion: bt.suggestion, goldTarget: bt.goldTarget }
  }

  return result
}

export async function generateCoaching(
  state: GameState,
  historicalContext?: string
): Promise<CoachingGoals> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    throw new Error('ANTHROPIC_API_KEY is not set')
  }

  const client = new Anthropic({ apiKey })

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: MAX_TOKENS,
    system: `You are an expert League of Legends coach with deep knowledge of all roles, champions, itemization, and macro strategy. You analyze live game state and generate short actionable goals. Take recent events seriously — a Baron kill or team fight loss changes priorities immediately. When historical patterns are provided, weave them naturally into coaching goals with supporting evidence counts (e.g., "Avoid X — you did this in 6/10 similar games").`,
    messages: [
      {
        role: 'user',
        content: buildPrompt(state, historicalContext)
      }
    ]
  })

  const content = message.content[0]
  if (content.type !== 'text') {
    throw new Error('Unexpected response type from Claude')
  }

  const text = content.text.trim()

  // Strip markdown code fences if present
  const jsonText = text.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '').trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonText)
  } catch {
    throw new Error(`Claude returned non-JSON response: ${text.slice(0, 200)}`)
  }

  return validateCoachingGoals(parsed)
}
