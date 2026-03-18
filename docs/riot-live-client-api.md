# Riot Live Client Data API — Reference

Local API served by the LoL game client while a game is in progress.

**Base URL**: `https://127.0.0.1:2999/liveclientdata`
**Auth**: None required — local loopback only
**TLS**: Self-signed cert → use `rejectUnauthorized: false`
**Swagger**: `https://127.0.0.1:2999/swagger/v2/swagger.json` (requires game running)

---

## Endpoints

### GET /allgamedata
All data in a single response (superset of all endpoints below).

### GET /gamestats
Current game clock and mode.

```json
{
  "gameMode": "CLASSIC",
  "gameTime": 612.34,
  "mapName": "Map11",
  "mapNumber": 11,
  "mapTerrain": "Default"
}
```

**Fields we use**: `gameTime` (seconds as float), `gameMode`
**Also available**: `mapName`, `mapTerrain`

---

### GET /activeplayer
Stats for the local player (you).

```json
{
  "summonerName": "PlayerName",
  "championStats": {
    "abilityHaste": 0,
    "abilityPower": 0,
    "armor": 47,
    "armorPenetrationFlat": 0,
    "attackDamage": 68,
    "attackRange": 175,
    "attackSpeed": 0.679,
    "bonusArmorPenetrationPercent": 0,
    "bonusMagicPenetrationPercent": 0,
    "critChance": 0,
    "critDamage": 175,
    "currentHealth": 580,
    "healthRegenRate": 7,
    "lifeSteal": 0,
    "magicLethality": 0,
    "magicPenetrationFlat": 0,
    "magicResist": 32,
    "maxHealth": 580,
    "moveSpeed": 345,
    "physicalLethality": 0,
    "resourceMax": 200,
    "resourceRegenRate": 50,
    "resourceType": "MANA",
    "resourceValue": 200,
    "spellVamp": 0,
    "tenacity": 0
  },
  "currentGold": 500,
  "fullRunes": { ... }
}
```

**Fields we use**: `summonerName`, `championStats.currentGold`
**Also available**: All champion stats, `fullRunes` (alternative rune endpoint)

---

### GET /activeplayerabilities
Ability levels for the local player.

```json
{
  "E": { "abilityLevel": 2, "displayName": "Shadow Slash", "id": "ZedE", "rawDescription": "..." },
  "Passive": { "displayName": "Contempt for the Weak", "id": "ZedPassive", "rawDescription": "..." },
  "Q": { "abilityLevel": 3, "displayName": "Razor Shuriken", "id": "ZedQ", "rawDescription": "..." },
  "R": { "abilityLevel": 1, "displayName": "Death Mark", "id": "ZedR", "rawDescription": "..." },
  "W": { "abilityLevel": 1, "displayName": "Living Shadow", "id": "ZedW", "rawDescription": "..." }
}
```

**Fields we use**: `Q/W/E/R.displayName`, `Q/W/E/R.abilityLevel`, `Passive.displayName`
**Note**: Passive has no `abilityLevel`

---

### GET /activeplayerrunes
Rune page for the local player.

```json
{
  "keystone": { "displayName": "Electrocute", "id": 8112, "rawDescription": "...", "rawDisplayName": "..." },
  "primaryRuneTree": { "displayName": "Domination", "id": 8100, "rawDescription": "...", "rawDisplayName": "..." },
  "secondaryRuneTree": { "displayName": "Sorcery", "id": 8200, "rawDescription": "...", "rawDisplayName": "..." },
  "generalRunes": [
    { "displayName": "Cheap Shot", "id": 8126, "rawDescription": "...", "rawDisplayName": "..." },
    ...
  ],
  "statRunes": [
    { "id": 5008, "rawDescription": "..." },
    ...
  ]
}
```

**Fields we use**: `keystone.displayName`, `primaryRuneTree.displayName`, `secondaryRuneTree.displayName`
**Also available**: `generalRunes` (6 slot runes), `statRunes` (adaptive/armor/magic resist shards)

---

### GET /playerlist
All players in the game (both teams).

```json
[
  {
    "championName": "Zed",
    "isBot": false,
    "isDead": false,
    "items": [
      {
        "canUse": false,
        "consumable": false,
        "count": 1,
        "displayName": "Long Sword",
        "itemID": 1036,
        "price": 350,
        "rawDescription": "...",
        "rawDisplayName": "...",
        "slot": 0
      }
    ],
    "level": 8,
    "position": "MID",
    "rawChampionName": "game_character_displayname_Zed",
    "respawnTimer": 0.0,
    "runes": { "keystone": { ... }, "primaryRuneTree": { ... }, "secondaryRuneTree": { ... } },
    "scores": {
      "assists": 2,
      "creepScore": 78,
      "deaths": 1,
      "kills": 5,
      "wardScore": 8.0
    },
    "skinID": 0,
    "summonerName": "PlayerName",
    "summonerSpells": {
      "summonerSpellOne": { "displayName": "Flash", "rawDescription": "...", "rawDisplayName": "..." },
      "summonerSpellTwo": { "displayName": "Ignite", "rawDescription": "...", "rawDisplayName": "..." }
    },
    "team": "ORDER",
    "currentGold": 487
  },
  ...
]
```

**Fields we use**: `summonerName`, `championName`, `position`, `scores.kills/deaths/assists`, `currentGold`, `team`, `items`, `summonerSpells`
**Also available**: `level`, `scores.creepScore`, `scores.wardScore`, `isDead`, `respawnTimer`, `runes` (per-player runes)

**Position values**: `TOP`, `JUNGLE`, `MIDDLE` (or `MID`), `BOTTOM` (or `BOT`), `UTILITY` (or `SUPPORT`), `""` (ARAM/no position)

---

### GET /eventdata
All in-game events.

```json
{
  "Events": [
    { "EventID": 0, "EventName": "GameStart", "EventTime": 0.0 },
    { "EventID": 1, "EventName": "MinionsSpawning", "EventTime": 65.0 },
    { "EventID": 2, "EventName": "FirstBlood", "EventTime": 134.5, "Acer": "PlayerName", "AcerTeam": "ORDER", "Assisters": [] },
    { "EventID": 3, "EventName": "ChampionKill", "EventTime": 240.0, "KillerName": "PlayerName", "VictimName": "Enemy", "Assisters": [] },
    { "EventID": 4, "EventName": "DragonKill", "EventTime": 300.0, "KillerName": "PlayerName", "Stolen": "False", "DragonType": "Fire", "Assisters": [] },
    { "EventID": 5, "EventName": "BaronKill", "EventTime": 1200.0, "KillerName": "PlayerName", "Stolen": "False", "Assisters": [] },
    { "EventID": 6, "EventName": "TurretKilled", "EventTime": 480.0, "KillerName": "PlayerName", "TurretKilled": "Turret_T2_C_07", "Assisters": [] },
    { "EventID": 7, "EventName": "InhibitorKilled", "EventTime": 900.0, "KillerName": "PlayerName", "InhibKilled": "Barracks_T2_C1", "Assisters": [] },
    { "EventID": 8, "EventName": "ItemPurchased", "EventTime": 100.0, "ItemID": 1036, "Recipient": "PlayerName" },
    { "EventID": 9, "EventName": "WardPlaced", "EventTime": 120.0, "WardID": "...", "WardType": "YellowTrinket" },
    { "EventID": 10, "EventName": "WardKilled", "EventTime": 240.0, "WardID": "...", "WardType": "YellowTrinket" },
    { "EventID": 11, "EventName": "GameEnd", "EventTime": 1800.0, "Result": "Win" }
  ]
}
```

**Fields we use**: `EventName`, `EventTime`
**Tracked event types**: `DragonKill`, `BaronKill`, `TurretKilled`, `ChampionKill`, `InhibitorKilled`, `ItemPurchased`, `WardPlaced`, `WardKilled`, `FirstBlood`, `GameStart`, `GameEnd`
**Also captured**: `KillerName`, `VictimName`, `Stolen`, `DragonType`, `TurretKilled`, `Assisters`

---

## Fields Used vs Available Summary

| Endpoint | Fields Used | Notable Unused |
|----------|-------------|----------------|
| `/gamestats` | `gameTime`, `gameMode` | `mapTerrain` |
| `/activeplayer` | `summonerName`, `currentGold` | All `championStats` (AD, AP, armor, etc.) |
| `/activeplayerabilities` | `Q/W/E/R.displayName`, `.abilityLevel`, `Passive.displayName` | `rawDescription`, ability IDs |
| `/activeplayerrunes` | `keystone.displayName`, `primaryRuneTree.displayName`, `secondaryRuneTree.displayName` | `generalRunes`, `statRunes` |
| `/playerlist` | `summonerName`, `championName`, `position`, `scores.kills/deaths/assists`, `currentGold`, `team`, `items`, `summonerSpells` | `level`, `scores.creepScore`, `isDead`, `respawnTimer` |
| `/eventdata` | `EventName`, `EventTime` | `KillerName`, `Stolen`, `DragonType`, `Assisters` |

---

## Replay API (Future Reference)

Riot also exposes replay endpoints while spectating or in replay mode:

- `GET /replay/playback` — playback speed, paused state, current time
- `GET /replay/render` — camera settings, fog of war, etc.
- `GET /replay/recording` — recording state
- `POST /replay/playback` — control playback

These are not used by Zilean but may be useful for future post-game analysis features.

---

## Notes

- All endpoints return HTTP 404 / connection refused when no game is running
- Some response shapes differ slightly between game versions — use defensive parsing
- ARAM games have empty `position` strings for all players (use `""` check)
- `gameTime` can come as either `gameTime` or `gameLength` depending on game version
- Events list is cumulative (never resets mid-game) — use index-based deduplication
