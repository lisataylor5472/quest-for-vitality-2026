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
  DungeonActivity,
  DungeonElement,
  DungeonMechanic,
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

const norm = (v: unknown) => String(v ?? '').trim().toLowerCase()

/**
 * Applies a dungeon activity log on top of baseline players/campaigns.
 * Each row is a discrete action (a player who acted twice has two rows), so
 * effects are summed, not overwritten. Returns fresh copies — never mutates
 * the baseline, so this can be safely re-run from scratch on every refresh.
 */
function applyDungeonActivity(basePlayers: Player[], baseCampaigns: Campaign[], activity: DungeonActivity[]) {
  const players = basePlayers.map((p) => ({ ...p }))
  const campaigns = baseCampaigns.map((c) => ({ ...c }))
  const playerById = new Map(players.map((p) => [p.playerId, p]))

  const findBossSection = (boss: string | undefined) => {
    const target = norm(boss)
    if (!target) return undefined
    // `boss` holds a short nickname (e.g. "Rigidus"), matched against the
    // section's full enemy name (e.g. "Ser Rigidus Invictus").
    return campaigns.find((c) => /^c6-\d+$/.test(c.id) && norm(c.enemy).includes(target))
  }

  for (const row of activity) {
    const player = playerById.get(row.player)

    const useAP = Number(row.useAP)
    if (player && useAP) player.actionPoints -= useAP

    const hp = Number(row.hp)
    if (player && hp < 0) player.hp += hp

    const bossDamage = Number(row.bossDamage)
    if (bossDamage) {
      const section = findBossSection(row.boss)
      if (section) section.enemyHp = Number(section.enemyHp || 0) - bossDamage
    }
  }

  return { players, campaigns }
}

export const useGameStore = defineStore('game', () => {
  // ---------------------------------------------------------------------------
  // Raw state — mirrors the API response 1-to-1
  // ---------------------------------------------------------------------------
  const dashboard = ref<DashboardEntry[]>([])
  const classInfo = ref<ClassInfo[]>([])
  const baseCampaigns = ref<Campaign[]>([])
  const basePlayers = ref<Player[]>([])
  /** Historical dungeon activity, as of the last full snapshot pull. */
  const dungeonActivityHistory = ref<DungeonActivity[]>([])
  /** Today's dungeon activity, re-fetched live from the sheet on every refresh. */
  const liveDungeonActivity = ref<DungeonActivity[]>([])
  const dungeonMechanics = ref<DungeonMechanic[]>([])
  const cmpgn1 = ref<CampaignProgress[]>([])
  const cmpgn2 = ref<CampaignProgress[]>([])
  const cmpgn3 = ref<CampaignProgress[]>([])
  const cmpgn4 = ref<CampaignProgress[]>([])
  const cmpgn5 = ref<CampaignProgress[]>([])
  const cmpgn6 = ref<CampaignProgress[]>([])
  const plyrActivity = ref<PlayerActivity[]>([])
  const plyrActivity2 = ref<PlayerActivity[]>([])
  const plyrActivity3 = ref<PlayerActivity[]>([])
  const plyrActivity4 = ref<PlayerActivity[]>([])
  const plyrActivity5 = ref<PlayerActivity[]>([])
  const plyrActivity6 = ref<PlayerActivity[]>([])
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

  /** Baseline players/campaigns with today's live dungeon activity applied. */
  const withLiveActivity = computed(() =>
    applyDungeonActivity(basePlayers.value, baseCampaigns.value, liveDungeonActivity.value),
  )
  const players = computed(() => withLiveActivity.value.players)
  const campaigns = computed(() => withLiveActivity.value.campaigns)
  const dungeonActivity = computed(() => [...dungeonActivityHistory.value, ...liveDungeonActivity.value])

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

  const cmpgn5ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn5.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  const cmpgn6ByPlayer = computed<Map<string, CampaignProgress>>(() => {
    const map = new Map<string, CampaignProgress>()
    for (const row of cmpgn6.value) {
      if (row.playerId) map.set(row.playerId, row)
    }
    return map
  })

  /**
   * Campaign 6 splits the dungeon floor into five sections, one per previous
   * boss. Section rows live in `campaigns` as "c6-1".."c6-5" and carry only
   * enemy data — no dates — so they are excluded from the campaign selectors,
   * which filter on `start`. Ordered left-to-right by section number, which
   * matches c1–c5 chronological order.
   */
  const c6Sections = computed(() =>
    campaigns.value
      .filter((c) => /^c6-\d+$/.test(c.id))
      .sort((a, b) => Number(a.id.slice(3)) - Number(b.id.slice(3)))
      .map((c) => ({ id: c.id, campaign: c })),
  )

  /**
   * Map<playerId, sectionId> — which section boss each c6 player is facing.
   *
   * `cmpgn6.dgnType` names the section by theme ("Strength"), matched against
   * the section rows' own `theme`. Earlier rows used the campaign id form
   * ("c1".."c5"), which still resolves so legacy rows keep working.
   */
  const cmpgn6SectionByPlayer = computed<Map<string, string>>(() => {
    const norm = (v: string) => v.trim().toLowerCase()

    const byTheme = new Map<string, string>()
    for (const section of c6Sections.value) {
      const theme = section.campaign.theme
      if (theme) byTheme.set(norm(theme), section.id)
    }

    const map = new Map<string, string>()
    for (const row of cmpgn6.value) {
      if (!row.playerId || !row.dgnType) continue
      const raw = String(row.dgnType).trim()
      const legacy = raw.match(/^c([1-5])$/i)
      const sectionId = legacy ? `c6-${legacy[1]}` : byTheme.get(norm(raw))
      if (sectionId) map.set(row.playerId, sectionId)
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
      activeDaysByPlayer.get(entry.playerId)!.add(entry.activeDay.slice(0, 10))
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
      map.set(row.playerId, Math.min(100, (missed / 2 / totalDays) * 100))
    }
    return map
  })

  // ---------------------------------------------------------------------------
  // Actions
  // ---------------------------------------------------------------------------

  /**
   * Pulls today's dungeon activity straight from the live sheet (bypassing the
   * static snapshot) and replaces `liveDungeonActivity` wholesale. It's a full
   * re-fetch each time, not an append, so re-running it (e.g. clicking refresh
   * repeatedly) stays correct — `withLiveActivity` re-derives players/campaigns
   * from the baseline every time rather than layering deltas on deltas.
   */
  async function fetchLiveDungeonActivity() {
    const apiUrl = import.meta.env.VITE_API_URL
    if (!apiUrl) return
    try {
      const res = await fetch(apiUrl)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: Pick<ApiResponse, 'dungeonActivity' | 'dungeonMechanics'> = await res.json()
      liveDungeonActivity.value = data.dungeonActivity ?? []
      if (data.dungeonMechanics) dungeonMechanics.value = data.dungeonMechanics
    } catch (e) {
      // Best-effort — keep whatever live activity we already had on failure.
      console.error('Failed to pull live dungeon activity', e)
    }
  }

  function applySnapshot(data: ApiResponse) {
    dashboard.value = data.dashboard
    classInfo.value = enrichClassInfo(data.classInfo)
    baseCampaigns.value = data.campaigns
    basePlayers.value = data.players.filter((p) => !!p.playerId)
    dungeonActivityHistory.value = data.dungeonActivity ?? []
    dungeonMechanics.value = data.dungeonMechanics ?? []
    cmpgn1.value = data.cmpgn1
    cmpgn2.value = data.cmpgn2 ?? []
    cmpgn3.value = data.cmpgn3 ?? []
    cmpgn4.value = data.cmpgn4 ?? []
    cmpgn5.value = data.cmpgn5 ?? []
    cmpgn6.value = data.cmpgn6 ?? []
    plyrActivity.value = data.plyrActivity
    plyrActivity2.value = data.plyrActivity2 ?? []
    plyrActivity3.value = data.plyrActivity3 ?? []
    plyrActivity4.value = data.plyrActivity4 ?? []
    plyrActivity5.value = data.plyrActivity5 ?? []
    plyrActivity6.value = data.plyrActivity6 ?? []
    achievements.value = data.achievements
    dungeonElements.value = data.dungeonElements ?? []
    items.value = data.items ?? []
    initiativeOrder.value = data.initiativeOrder ?? []
  }

  async function fetchData() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/data.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      applySnapshot(await res.json())
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
    } finally {
      loading.value = false
    }
    await fetchLiveDungeonActivity()
  }

  async function quietRefresh() {
    error.value = null
    try {
      const res = await fetch('/data.json')
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      applySnapshot(await res.json())
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Failed to fetch data'
    }
    await fetchLiveDungeonActivity()
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
    cmpgn5,
    cmpgn6,
    plyrActivity,
    plyrActivity2,
    plyrActivity3,
    plyrActivity4,
    plyrActivity5,
    plyrActivity6,
    achievements,
    dungeonElements,
    items,
    initiativeOrder,
    dungeonActivity,
    dungeonMechanics,
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
    cmpgn5ByPlayer,
    cmpgn6ByPlayer,
    cmpgn6SectionByPlayer,
    c6Sections,
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
