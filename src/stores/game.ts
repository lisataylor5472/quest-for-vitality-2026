import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
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

export const useGameStore = defineStore('game', () => {
  // ---------------------------------------------------------------------------
  // Raw state — mirrors the API response 1-to-1
  // ---------------------------------------------------------------------------
  const dashboard = ref<DashboardEntry[]>([])
  const classInfo = ref<ClassInfo[]>([])
  const campaigns = ref<Campaign[]>([])
  const players = ref<Player[]>([])
  const cmpgn1 = ref<CampaignProgress[]>([])
  const plyrActivity = ref<PlayerActivity[]>([])
  const achievements = ref<Achievement[]>([])
  const dungeonElements = ref<DungeonElement[]>([])
  const items = ref<GameItem[]>([])
  const initiativeOrder = ref<InitiativeOrder[]>([])

  const loading = ref(false)
  const error = ref<string | null>(null)

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
      classInfo.value = data.classInfo
      campaigns.value = data.campaigns
      players.value = data.players.filter((p) => !!p.playerId)
      cmpgn1.value = data.cmpgn1
      plyrActivity.value = data.plyrActivity
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
      classInfo.value = data.classInfo
      campaigns.value = data.campaigns
      players.value = data.players.filter((p) => !!p.playerId)
      cmpgn1.value = data.cmpgn1
      plyrActivity.value = data.plyrActivity
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
    plyrActivity,
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
    // actions
    fetchData,
    quietRefresh,
  }
})
