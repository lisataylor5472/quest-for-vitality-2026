import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  AbilityDice,
  Achievement,
  ApiResponse,
  Campaign,
  CampaignProgress,
  DashboardEntry,
  ClassInfo,
  DungeonElement,
  GameItem,
  InitiativeOrder,
  Player,
  PlayerActivity,
} from '@/types/game'

function parseDice(desc: string): AbilityDice | undefined {
  const withFloor = desc.match(/(\d+)\s*\+\s*(?:Roll\s+)?(\d+)d(\d+)/)
  if (withFloor) {
    return { floor: parseInt(withFloor[1]!), qty: parseInt(withFloor[2]!), sides: parseInt(withFloor[3]!) }
  }
  const bare = desc.match(/(\d+)d(\d+)/)
  if (bare) {
    return { floor: 0, qty: parseInt(bare[1]!), sides: parseInt(bare[2]!) }
  }
  return undefined
}

function enrichClassInfo(raw: ClassInfo[]): ClassInfo[] {
  return raw.map((c) => {
    const ability2Dice = c.ability2Desc ? parseDice(c.ability2Desc) : undefined
    return {
      ...c,
      ability1Dice: c.ability1Desc ? parseDice(c.ability1Desc) : undefined,
      ability2Dice:
        ability2Dice && c.class.toLowerCase() === 'sorcerer'
          ? { ...ability2Dice, tiered: true }
          : ability2Dice,
      ability3Dice: c.ability3Desc ? parseDice(c.ability3Desc) : undefined,
    }
  })
}

export const useGameStore = defineStore('game', () => {
  // ---------------------------------------------------------------------------
  // Raw state — mirrors the API response 1-to-1
  // ---------------------------------------------------------------------------
  const dashboard = ref<DashboardEntry[]>([])
  const classInfo = ref<ClassInfo[]>([])
  const campaigns = ref<Campaign[]>([])
  const players = ref<Player[]>([])
  const cmpgn1 = ref<CampaignProgress[]>([])
  const cmpgn2 = ref<CampaignProgress[]>([])
  const cmpgn3 = ref<CampaignProgress[]>([])
  const cmpgn4 = ref<CampaignProgress[]>([])
  const plyrActivity = ref<PlayerActivity[]>([])
  const plyrActivity2 = ref<PlayerActivity[]>([])
  const plyrActivity3 = ref<PlayerActivity[]>([])
  const plyrActivity4 = ref<PlayerActivity[]>([])
  const achievements = ref<Achievement[]>([])
  const dungeonElements = ref<DungeonElement[]>([])
  const items = ref<GameItem[]>([])
  const initiativeOrder = ref<InitiativeOrder[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)
  const pendingRoll = ref<AbilityDice | null>(null)
  const sneakAttack = ref(false)

  // ---------------------------------------------------------------------------
  // Getters
  // ---------------------------------------------------------------------------

  /** Global game state — currentDate, currentCmpgn, cmpgnWeek live on row 0. */
  const gameState = computed(() => dashboard.value[0] ?? null)

  /** The campaign object matching the currently active campaign id. */
  const currentCampaign = computed<Campaign | null>(() => {
    const id = gameState.value?.currentCmpgn
    if (!id) return null
    return campaigns.value.find((c) => c.id === id) ?? null
  })

  /**
   * Players sorted by the default ranking hierarchy:
   * totalXp → level → totalActiveDays → achievement count (all descending).
   */
  const rankedPlayers = computed<Player[]>(() =>
    [...players.value].sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp
      if (b.level !== a.level) return b.level - a.level
      if (b.totalActiveDays !== a.totalActiveDays) return b.totalActiveDays - a.totalActiveDays
      return (b.achievements as number) - (a.achievements as number)
    }),
  )

  /**
   * Activity dates grouped by playerId, with empty/padding rows filtered out.
   * Map<playerId, ISO-date-string[]>
   */
  const activityByPlayer = computed<Map<string, string[]>>(() => {
    const map = new Map<string, string[]>()
    for (const entry of plyrActivity.value) {
      if (!entry.playerId || !entry.activeDay) continue
      const days = map.get(entry.playerId) ?? []
      days.push(entry.activeDay)
      map.set(entry.playerId, days)
    }
    return map
  })

  /**
   * cmpgn1 rows keyed by playerId for O(1) lookup in the Campaign view.
   * Map<playerId, CampaignProgress>
   */
  const cmpgn1ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn1.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  const cmpgn2ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn2.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  const cmpgn3ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn3.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  const cmpgn4ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn4.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  /**
   * Campaign 4 dungeon progress computed from activity gaps.
   * Each calendar day from campaign start to today (or end) where the player
   * has no plyrActivity4 entry counts as one step toward the enemy.
   * Returns a 0–100 percentage of (missed days / total campaign days).
   */
  const cmpgn4DgnProgressByPlayer = computed<Map<string, number>>(() => {
    const campaign = campaigns.value.find((c) => c.id === 'c4')
    if (!campaign) return new Map()

    const rawDate = gameState.value?.currentDate
    const today = rawDate ? new Date(rawDate) : new Date()
    const start = new Date(campaign.start)
    const end = new Date(campaign.end)
    const effectiveEnd = today <= end ? today : end

    const totalDays = Number(campaign.days)
    if (!totalDays) return new Map()

    const activeDaysByPlayer = new Map<string, Set<string>>()
    for (const entry of plyrActivity4.value) {
      if (!entry.playerId || !entry.activeDay) continue
      if (!activeDaysByPlayer.has(entry.playerId)) activeDaysByPlayer.set(entry.playerId, new Set())
      activeDaysByPlayer.get(entry.playerId)!.add(entry.activeDay)
    }

    const map = new Map<string, number>()
    for (const row of cmpgn4.value) {
      if (!row.playerId) continue
      const activeDays = activeDaysByPlayer.get(row.playerId) ?? new Set<string>()
      let missed = 0
      const cursor = new Date(start)
      while (cursor <= effectiveEnd) {
        if (!activeDays.has(cursor.toISOString().slice(0, 10))) missed++
        cursor.setUTCDate(cursor.getUTCDate() + 1)
      }
      map.set(row.playerId, Math.min(100, (missed / totalDays) * 100))
    }
    return map
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(import.meta.env.VITE_API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ApiResponse = await res.json()
      dashboard.value = data.dashboard
      classInfo.value = enrichClassInfo(data.classInfo)
      campaigns.value = data.campaigns
      players.value = data.players.filter((p) => !!p.playerId)
      cmpgn1.value = data.cmpgn1
      cmpgn2.value = data.cmpgn2 ?? []
      cmpgn3.value = data.cmpgn3 ?? []
      cmpgn4.value = data.cmpgn4 ?? []
      plyrActivity.value = data.plyrActivity
      plyrActivity2.value = data.plyrActivity2 ?? []
      plyrActivity3.value = data.plyrActivity3 ?? []
      plyrActivity4.value = data.plyrActivity4 ?? []
      achievements.value = data.achievements
      dungeonElements.value = data.dungeonElements ?? []
      items.value = data.items ?? []
      initiativeOrder.value = data.initiativeOrder ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
    } finally {
      loading.value = false
    }
  }

  async function quietRefresh() {
    error.value = null
    try {
      const res = await fetch(import.meta.env.VITE_API_URL)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: ApiResponse = await res.json()
      dashboard.value = data.dashboard
      classInfo.value = enrichClassInfo(data.classInfo)
      campaigns.value = data.campaigns
      players.value = data.players.filter((p) => !!p.playerId)
      cmpgn1.value = data.cmpgn1
      cmpgn2.value = data.cmpgn2 ?? []
      cmpgn3.value = data.cmpgn3 ?? []
      cmpgn4.value = data.cmpgn4 ?? []
      plyrActivity.value = data.plyrActivity
      plyrActivity2.value = data.plyrActivity2 ?? []
      plyrActivity3.value = data.plyrActivity3 ?? []
      plyrActivity4.value = data.plyrActivity4 ?? []
      achievements.value = data.achievements
      dungeonElements.value = data.dungeonElements ?? []
      items.value = data.items ?? []
      initiativeOrder.value = data.initiativeOrder ?? []
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    // raw state
    dashboard,
    classInfo,
    campaigns,
    players,
    cmpgn1,
    cmpgn2,
    cmpgn3,
    cmpgn4,
    plyrActivity,
    plyrActivity2,
    plyrActivity3,
    plyrActivity4,
    achievements,
    dungeonElements,
    items,
    initiativeOrder,
    loading,
    error,
    // computed
    gameState,
    currentCampaign,
    rankedPlayers,
    activityByPlayer,
    cmpgn1ByPlayer,
    cmpgn2ByPlayer,
    cmpgn3ByPlayer,
    cmpgn4ByPlayer,
    cmpgn4DgnProgressByPlayer,
    pendingRoll,
    sneakAttack,
    // actions
    fetchData,
    quietRefresh,
    requestRoll(dice: AbilityDice) { pendingRoll.value = dice },
    clearPendingRoll() { pendingRoll.value = null },
  }
})
