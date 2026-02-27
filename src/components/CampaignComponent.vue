<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import MagicLoader from '@/components/MagicLoader.vue'

const store = useGameStore()

// ---------------------------------------------------------------------------
// Avatar helper (shared pattern with LeaderboardComponent)
// ---------------------------------------------------------------------------
function avatarSrc(img: string) {
  if (!img) return new URL('../assets/avatars/default.png', import.meta.url).href
  return new URL(`../assets/avatars/${img}`, import.meta.url).href
}

function enemySrc(img: string) {
  return new URL(`../assets/${img}`, import.meta.url).href
}

// ---------------------------------------------------------------------------
// Sort state
// null sortKey = default alphabetical by charName
// ---------------------------------------------------------------------------
type SortKey =
  | 'cmpgnProgress'
  | 'dgnProgress'
  | 'weeklyWinCount'
  | 'w1Count'
  | 'w2Count'
  | 'w3Count'
  | 'w4Count'

const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'desc' | 'asc'>('asc')

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'desc'
  }
}

function resetSort() {
  sortKey.value = null
  sortDir.value = 'asc'
}

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return 'unfold_more'
  return sortDir.value === 'desc' ? 'expand_more' : 'expand_less'
}

// ---------------------------------------------------------------------------
// Activity tracker — campaign c1 date range + per-player activity sets
// ---------------------------------------------------------------------------

/** The campaign with id 'c1', used for its start/end date range. */
const campaignC1 = computed(() => store.campaigns.find((c) => c.id === 'c1') ?? null)

/** All ISO date strings (YYYY-MM-DD) spanning the c1 campaign.
 *  start/end may be full ISO datetimes; we normalize to UTC midnight before iterating. */
const campaignDays = computed<string[]>(() => {
  const c = campaignC1.value
  if (!c?.start || !c?.end) return []
  const days: string[] = []
  const cur = new Date(c.start)
  const end = new Date(c.end)
  cur.setUTCHours(0, 0, 0, 0)
  end.setUTCHours(0, 0, 0, 0)
  while (cur <= end) {
    days.push(cur.toISOString().slice(0, 10))
    cur.setUTCDate(cur.getUTCDate() + 1)
  }
  return days
})

function formatDate(iso: string | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function formatDayTooltip(isoDate: string): string {
  const d = new Date(isoDate + 'T00:00:00Z')
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d.getUTCDay()]
  const month = String(d.getUTCMonth() + 1).padStart(2, '0')
  const day = String(d.getUTCDate()).padStart(2, '0')
  return `${dow} ${month}/${day}`
}

/** Activity dates as Sets per player for O(1) has() lookups.
 *  Normalizes to YYYY-MM-DD in case activeDay is a full ISO datetime string. */
const activitySetByPlayer = computed<Map<string, Set<string>>>(() => {
  const map = new Map<string, Set<string>>()
  for (const [playerId, days] of store.activityByPlayer) {
    map.set(playerId, new Set(days.map((d) => d.slice(0, 10))))
  }
  return map
})

// ---------------------------------------------------------------------------
// Joined rows: players + cmpgn1 progress, sorted
// ---------------------------------------------------------------------------
const displayedRows = computed(() => {
  const rows = store.players
    .filter((player) => store.cmpgn1ByPlayer.has(player.playerId))
    .map((player) => ({
      ...player,
      ...store.cmpgn1ByPlayer.get(player.playerId)!,
    }))

  if (!sortKey.value) {
    return [...rows].sort((a, b) => a.charName.localeCompare(b.charName))
  }

  const key = sortKey.value
  const dir = sortDir.value === 'desc' ? -1 : 1
  return [...rows].sort((a, b) => dir * (b[key] - a[key]))
})
</script>

<template lang="pug">
.campaigns-component
  MagicLoader(v-if="store.loading")
  p.error(v-else-if="store.error") {{ store.error }}
  .content-layout(v-else)
    .top-bar
      .campaigns-button-wrapper
        button.c1 flexibility
        button.active.c2
          span.material-icons hourglass_empty
        button.active.c3
          span.material-icons hourglass_empty
        button.active.c4
          span.material-icons hourglass_empty
        button.active.c5
          span.material-icons hourglass_empty
        button.active.c6
          span.material-icons hourglass_empty
    .main-row
      .side-panel
        .quest-info-wrapper(v-if="campaignC1")
          .qi-header
            h2.qi-name {{ campaignC1.name }}
          .qi-body
            .qi-row
              span.qi-label Start
              span.qi-value {{ formatDate(campaignC1.start) }}
            .qi-row
              span.qi-label End
              span.qi-value {{ formatDate(campaignC1.end) }}
            .qi-row
              span.qi-label Days
              span.qi-value {{ campaignC1.days }}
            .qi-row.qi-row--stacked
              span.qi-label Quest
              span.qi-value {{ campaignC1.questAction }}
            .qi-row
              span.qi-label Times Per week
              span.qi-value {{ campaignC1.timesPerWeek }}x
            .qi-row.qi-row--stacked
              span.qi-label Reward
              span.qi-value {{ campaignC1.reward }}
              span.qi-desc(v-if="campaignC1.rewardDesc") {{ campaignC1.rewardDesc }}
            .qi-row
              span.qi-label Threat
              span.qi-value {{ campaignC1.enemy }}
            .qi-enemy-block
              img.qi-enemy-img(:src="enemySrc(campaignC1.enemyImg)" :alt="campaignC1.enemy")
              .qi-enemy-stats
                .qi-row.qi-row--stacked
                  span.qi-label HP
                  span.qi-value {{ campaignC1.enemyHp }}/{{ campaignC1.enemyMaxHp }}
                //- .qi-row.qi-row--stacked
                //-   span.qi-label Speed
                //-   span.qi-value {{ campaignC1.enemySpeed }}% per week
                .qi-row.qi-row--stacked
                  span.qi-label Dmg
                  span.qi-value {{ campaignC1.enemyDmg }}


      .table-scroll-wrapper
        table.leaderboard-table
          thead
            tr
              th
              th.player-col.sortable(
                :class="{ active: sortKey === null }"
                @click="resetSort"
                title="Sort alphabetically"
              ) Player
              th Class
              th.sortable(
                :class="{ active: sortKey === 'dgnProgress' }"
                @click="setSort('dgnProgress')"
              )
                | Dungeon
                span.material-icons.sort-icon {{ sortIcon('dgnProgress') }}
              th.sortable(
                :class="{ active: sortKey === 'cmpgnProgress' }"
                @click="setSort('cmpgnProgress')"
              )
                | Success
                span.material-icons.sort-icon {{ sortIcon('cmpgnProgress') }}
              th.sortable(
                :class="{ active: sortKey === 'weeklyWinCount' }"
                @click="setSort('weeklyWinCount')"
              )
                | Weeks Won
                span.material-icons.sort-icon {{ sortIcon('weeklyWinCount') }}
              th.activity-col Activity
          tbody
            tr(v-for="row in displayedRows" :key="row.playerId")
              td.avatar-cell
                img.avatar(:src="avatarSrc(row.img)" :alt="row.charName")
              td.player-name
                span.char-name {{ row.charName }}
                span.real-name {{ row.realName }}
              td.class-name {{ row.class }}
              td {{ row.dgnProgress }}%
              td {{ row.cmpgnProgress }}%
              td {{ row.weeklyWinCount }}

              td.activity-cell
                .activity-track
                  span.day-box(
                    v-for="(day, i) in campaignDays"
                    :key="day"
                    :data-tooltip="formatDayTooltip(day)"
                    :class="{ active: activitySetByPlayer.get(row.playerId)?.has(day), 'week-gap': (i + 1) % 7 === 0 && i < campaignDays.length - 1 }"
                  )
</template>

<style lang="scss" scoped>
.campaigns-component {
  padding: 1rem 2rem 2rem 0rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.content-layout {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.main-row {
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
}

.side-panel {
  flex: 0 0 20%;
  min-width: 0;
}

.quest-info-wrapper {
  background-color: var(--theme-col-parchment-light);
  border-radius: 20px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: 'Space Grotesk', sans-serif;
}

.qi-header {
  color: var(--theme-col-lightest-blurple);
  padding: 1rem 1rem 0.75rem;
  border-radius: 20px 20px 0 0;
}

.qi-name {
  font-family: 'Space Grotesk', serif;
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0 0 0.15rem;
  line-height: 1.1;
  letter-spacing: -0.05em;
}

.qi-theme {
  font-size: 0.75rem;
  margin: 0;
  opacity: 0.85;
  font-style: italic;
}

.qi-enemy {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem 0.25rem;
  background-color: var(--theme-col-parchment-dark);
}

.qi-body {
  padding: 0.75rem 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.qi-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.85rem;
  border-bottom: 1px solid var(--theme-col-parchment-dark);
  padding-bottom: 0.3rem;

  &:last-child {
    border-bottom: none;
  }

  &.qi-row--stacked {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.15rem;

    .qi-value {
      align-self: center;
      text-align: center;
    }
  }
}

.qi-label {
  color: var(--theme-col-brown-light);
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.qi-value {
  font-weight: 600;
  color: var(--theme-col-brown);
}

.qi-desc {
  font-size: 0.72rem;
  color: var(--theme-col-brown-light);
  font-style: italic;
  line-height: 1.3;
  margin-top: 0.1rem;
  align-self: center;
  text-align: center;
}

.qi-enemy-block {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 0;
  border-bottom: 1px solid var(--theme-col-parchment-dark);
}

.qi-enemy-img {
  flex: 0 0 auto;
  width: 12rem;
  max-height: 16rem;
  object-fit: contain;
  object-position: center;
}

.qi-enemy-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;

  .qi-row {
    border-bottom: 1px solid var(--theme-col-parchment-dark);
    padding-bottom: 0.3rem;

    &.qi-row--stacked {
      qi-value {
        justify-content: left;
      }
    }

    &:last-child {
      border-bottom: none;
      padding-bottom: 0;
    }
  }
}

.qi-enemy-name {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--theme-col-brown);
  margin-top: 0.25rem;
}

.table-scroll-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
}

.campaigns-button-wrapper {
  display: flex;
  gap: 0.5rem;
  padding: 0.5rem 0 1.5em;
  justify-content: center;
}

.campaigns-button-wrapper button {
  width: 10em;
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.2rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.35rem 1rem;
  border: none;
  border-radius: 37px;
  cursor: pointer;
  box-shadow:
    0 4px 0 var(--vt-c-divider-dark-1),
    0 5px 6px rgba(0, 0, 0, 0.35);
  transform: translateY(0);
  transition:
    transform 0.07s ease,
    box-shadow 0.07s ease;
  user-select: none;
  margin: 0 1em;

  &:hover {
    background-color: var(--theme-col-green);
  }

  &:active,
  &.active {
    box-shadow:
      0 1px 0 var(--theme-col-dark-green),
      0 1px 3px rgba(0, 0, 0, 0.3);
    transform: translateY(3px);
  }
}

.loading,
.error {
  text-align: center;
  padding: 2rem;
  font-family: 'Space Grotesk', sans-serif;
}

.error {
  color: var(--theme-col-dark-red);
}

.leaderboard-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 3px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;

  thead tr {
    position: sticky;
    top: 0;
    background-color: var(--theme-col-blurple);
    color: var(--theme-col-lightest-blurple);
    text-align: center;

    th:first-child {
      border-radius: 10px 0 0 0;
    }

    th:last-child {
      border-radius: 0 10px 0 0;
    }
  }

  th {
    // border-bottom: 2px solid var(--theme-col-dark-red);
    font-family: 'Grenze Gotisch', serif;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    font-size: 1rem;
    white-space: nowrap;
    user-select: none;

    &.sortable {
      cursor: pointer;
    }

    .sort-icon {
      font-size: 1rem;
      vertical-align: middle;
      margin-left: 2px;
    }
  }

  tbody tr {
    background-color: var(--theme-col-parchment-light);

    &:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.04);
    }

    &:hover {
      background-color: var(--theme-col-lightest-blurple);
    }

    td:first-child {
      border-radius: 0;
    }

    td:last-child {
      border-radius: 0;
    }

    &:last-child {
      td:first-child {
        border-radius: 0 0 0 10px;
      }

      td:last-child {
        border-radius: 0 0 10px 0;
      }
    }
  }

  td {
    padding: 0.2rem 0.5rem;
    vertical-align: middle;
    text-align: center;
  }
}

.avatar-cell {
  width: 3rem;
  padding: 0.25rem 0.25rem;
}

.avatar {
  display: block;
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  object-fit: cover;
  object-position: top;
  border: 2px solid var(--theme-col-parchment-dark);
  background-color: var(--theme-col-parchment-med);
}

.player-col,
td.player-name {
  text-align: left;
}

.player-name {
  display: flex;
  flex-direction: column;
}
.char-name {
  // margin-top: 5px;
  font-weight: 600;
  font-size: 1.1em;
  line-height: -1;
  color: var(--theme-col-blurple);
}
.real-name {
  font-size: 0.7rem;
  line-height: 1;
  color: var(--theme-col-brown-light);
  // font-style: italic;
}

.class-name {
  font-size: 0.9em;
  // font-weight: 700;
}

.activity-col {
  white-space: nowrap;
}

.activity-cell {
  padding: 0.4rem 0.75rem;
}

.activity-track {
  display: flex;
  align-items: center;
  gap: 2px;
  flex-wrap: nowrap;
  width: fit-content;
  margin: 0 auto;
}

.day-box {
  flex-shrink: 0;
  width: 15px;
  height: 15px;
  background: var(--theme-col-parchment-dark);
  border-radius: 2px;

  &.active {
    background: var(--theme-col-green);
    // box-shadow: inset -1px -1px 0 0 var(--theme-col-ml-green);
  }

  &.week-gap {
    margin-right: 5px;
  }
}
</style>
