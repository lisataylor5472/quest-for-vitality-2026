import { ref, computed } from 'vue'
import { defineStore } from 'pinia'
import type {
  ApiResponse,
  Campaign,
  CampaignProgress,
  DashboardEntry,
  GameClass,
  Player,
  PlayerActivity,
} from '@/types/game'

export const useGameStore = defineStore('game', () => {
  // ---------------------------------------------------------------------------
  // Raw state — mirrors the API response 1-to-1
  // ---------------------------------------------------------------------------
  const dashboard = ref<DashboardEntry[]>([])
  const classes = ref<GameClass[]>([])
  const campaigns = ref<Campaign[]>([])
  const players = ref<Player[]>([])
  const cmpgn1 = ref<CampaignProgress[]>([])
  const plyrActivity = ref<PlayerActivity[]>([])
  const achievements = ref<unknown[]>([])

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

  /** Number of achievements a player has earned (achievements is a comma-separated string). */
  function achievementCount(achievements: string): number {
    if (!achievements || typeof achievements !== 'string') return 0
    return achievements.split(',').filter(Boolean).length
  }

  /**
   * Players sorted by the default ranking hierarchy:
   * totalXp → level → totalActiveDays → achievement count (all descending).
   */
  const rankedPlayers = computed<Player[]>(() =>
    [...players.value].sort((a, b) => {
      if (b.totalXp !== a.totalXp) return b.totalXp - a.totalXp
      if (b.level !== a.level) return b.level - a.level
      if (b.totalActiveDays !== a.totalActiveDays) return b.totalActiveDays - a.totalActiveDays
      return achievementCount(b.achievements) - achievementCount(a.achievements)
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
      classes.value = data.classes
      campaigns.value = data.campaigns
      players.value = data.players
      cmpgn1.value = data.cmpgn1
      plyrActivity.value = data.plyrActivity
      achievements.value = data.achievements
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
    } finally {
      loading.value = false
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------
  return {
    // raw state
    dashboard,
    classes,
    campaigns,
    players,
    cmpgn1,
    plyrActivity,
    achievements,
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
  }
})
