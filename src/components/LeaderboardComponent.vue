<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Player } from '@/types/game'
import MagicLoader from '@/components/MagicLoader.vue'

const store = useGameStore()

// ---------------------------------------------------------------------------
// Avatar helper
// ---------------------------------------------------------------------------
function avatarSrc(img: string) {
  if (!img) return new URL('../assets/avatars/default.png', import.meta.url).href
  return new URL(`../assets/avatars/${img}`, import.meta.url).href
}

function achievementIconSrc(icon: string) {
  return new URL(`../assets/achievements/${icon}`, import.meta.url).href
}

// Returns the list of Achievement objects the player has earned,
// with cX-complete achievements sorted to the end.
const cCompletePattern = /^c\d+-complete$/

function playerAchievements(player: Player) {
  return store.achievements
    .filter((a) => player[a.id] === true)
    .sort((a, b) => {
      const aIsComplete = cCompletePattern.test(a.id)
      const bIsComplete = cCompletePattern.test(b.id)
      if (aIsComplete === bIsComplete) return 0
      return aIsComplete ? 1 : -1
    })
}

// ---------------------------------------------------------------------------
// Level progress bar helpers
// XP per level = 200 (level 1 → 0 xp, level 2 → 200 xp, level 3 → 400 xp …)
// ---------------------------------------------------------------------------
const XP_PER_LEVEL = 200

function xpLevelProgress(totalXp: number): number {
  return ((totalXp % XP_PER_LEVEL) / XP_PER_LEVEL) * 100
}

function xpIntoLevel(totalXp: number): number {
  return totalXp % XP_PER_LEVEL
}

// ---------------------------------------------------------------------------
// Expandable rows
// ---------------------------------------------------------------------------
const expandedPlayerId = ref<string | null>(null)

function toggleExpand(playerId: string) {
  expandedPlayerId.value = expandedPlayerId.value === playerId ? null : playerId
}

// ---------------------------------------------------------------------------
// Sort state
// null sortKey = use the store's default hierarchy sort
// ---------------------------------------------------------------------------
type SortKey = 'totalXp' | 'level' | 'totalActiveDays' | 'achievements'

const sortKey = ref<SortKey | null>(null)
const sortDir = ref<'desc' | 'asc'>('desc')

function setSort(key: SortKey) {
  if (sortKey.value === key) {
    sortDir.value = sortDir.value === 'desc' ? 'asc' : 'desc'
  } else {
    sortKey.value = key
    sortDir.value = 'asc'
  }
}

function resetSort() {
  sortKey.value = null
  sortDir.value = 'desc'
}

function sortIcon(key?: SortKey) {
  if (key === undefined || sortKey.value !== key) return 'unfold_more'
  return sortDir.value === 'desc' ? 'expand_more' : 'expand_less'
}

// ---------------------------------------------------------------------------
// Sorted player list — falls back to store's hierarchy when no column is active
// ---------------------------------------------------------------------------
const displayedPlayers = computed(() => {
  if (!sortKey.value) return store.rankedPlayers

  const key = sortKey.value
  const dir = sortDir.value === 'desc' ? -1 : 1

  return [...store.players].sort((a, b) => {
    const aVal = key === 'achievements' ? (a.achievements as number) : (a[key] as number)
    const bVal = key === 'achievements' ? (b.achievements as number) : (b[key] as number)
    return dir * (bVal - aVal)
  })
})

const TOTAL_COLS = 11
</script>

<template lang="pug">
.leaderboard-component
  MagicLoader(v-if="store.loading")
  p.error(v-else-if="store.error") {{ store.error }}
  .table-scroll-wrapper(v-else)
    table.leaderboard-table
      thead
        tr
          th.rank-col.sortable(
            :class="{ active: sortKey === null }"
            @click="resetSort"
            title="Default ranking"
          )
            | Rank
            span.material-icons.sort-icon {{ sortIcon() }}
          th
          th.player-col Player
          th Class
          th HP
          th.sortable(
            :class="{ active: sortKey === 'level' }"
            @click="setSort('level')"
          )
            | Lvl
            span.material-icons.sort-icon {{ sortIcon('level') }}
          th Lvl Progress
          th.sortable(
            :class="{ active: sortKey === 'totalXp' }"
            @click="setSort('totalXp')"
          )
            | total XP
            span.material-icons.sort-icon {{ sortIcon('totalXp') }}
          th Weeks Won
          th.sortable(
            :class="{ active: sortKey === 'totalActiveDays' }"
            @click="setSort('totalActiveDays')"
          )
            | Active Days
            span.material-icons.sort-icon {{ sortIcon('totalActiveDays') }}
          th.sortable(
            :class="{ active: sortKey === 'achievements' }"
            @click="setSort('achievements')"
          )
            | Achievements
            span.material-icons.sort-icon {{ sortIcon('achievements') }}
      tbody
        template(v-for="(player, index) in displayedPlayers" :key="player.playerId")
          tr.player-row(
            @click="toggleExpand(player.playerId)"
            :class="{ 'is-expanded': expandedPlayerId === player.playerId, 'is-odd': index % 2 !== 0 }"
          )
            td.rank {{ index + 1 }}
            td.avatar-cell
              img.avatar(:src="avatarSrc(player.img)" :alt="player.charName")
            td.player-name
              span.char-name {{ player.charName }}
              span.real-name {{ player.realName }}
            td.class-name {{ player.class }}
            td.hp {{ player.hp }} / {{ player.maxHp }}
            td.level-num {{ player.level }}
            td.level-progress-cell
              .level-progress-labels
                span.lv-xp {{ xpIntoLevel(player.totalXp) }} / 200
              .level-progress-track
                .level-progress-fill(:style="{ width: `${xpLevelProgress(player.totalXp)}%` }")
            td {{ player.totalXp }}
            td {{ player.weekWins }}
            td {{ player.totalActiveDays }}
            td.achievement-count {{ player.achievements }}
          transition(name="expand")
            tr.achievement-row(v-if="expandedPlayerId === player.playerId")
              td.achievement-panel(:colspan="TOTAL_COLS")
                .achievement-panel-inner
                  .achievement-list(v-if="playerAchievements(player).length > 0")
                    .achievement-badge(
                      v-for="ach in playerAchievements(player)"
                      :key="ach.id"
                      :data-tooltip="ach.achievement"
                      :class="`tier-${ach.tier}`"
                    )
                      img.achievement-icon(:src="achievementIconSrc(ach.icon)" :alt="ach.achievement")
                  .achievement-empty(v-else)
                    span No achievements yet
</template>

<style lang="scss" scoped>
.leaderboard-component {
  padding: 2rem 1.25rem 2rem 0rem;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-sizing: border-box;
}

.table-scroll-wrapper {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  width: 90%;
  margin: 0 auto;
}

.error {
  text-align: center;
  padding: 2rem;
  font-family: 'Space Grotesk', sans-serif;
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
    color: var(--theme-col-parchment-light);
    text-align: center;

    th:first-child {
      border-radius: 10px 0 0 10px;
    }

    th:last-child {
      border-radius: 0 10px 10px 0;
    }
  }

  th {
    font-family: 'Grenze Gotisch', serif;
    padding: 0.25rem 0.5rem;
    // font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    font-size: 1.1rem;
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

  tbody {
    .player-row {
      background-color: var(--theme-col-parchment-light);
      cursor: pointer;
      transition: background-color 0.15s ease;

      &.is-odd {
        background-color: var(--theme-col-parchment-med);
      }

      &:hover {
        background-color: var(--theme-col-lightest-blue);
      }

      &.is-expanded {
        background-color: var(--theme-col-lightest-blue);

        td {
          padding-bottom: 0;
        }
        td:first-child {
          border-radius: 10px 0 0 0;
        }
        td:last-child {
          border-radius: 0 10px 0 0;
        }
      }

      &:not(.is-expanded) {
        td:first-child {
          border-radius: 10px 0 0 10px;
        }
        td:last-child {
          border-radius: 0 10px 10px 0;
        }
      }
    }

    .achievement-row {
      cursor: pointer;

      .achievement-panel {
        background-color: var(--theme-col-lightest-blue);
        border-radius: 0 0 10px 10px;
        padding: 0 1rem 0.2rem;
        // paint upward into the border-spacing gap so the two rows look merged
        box-shadow: 0 -3px 0 0 var(--theme-col-lightest-blue);
      }
    }
  }

  td {
    padding: 0.4rem 0.5rem;
    vertical-align: middle;
    text-align: center;
  }
}

.rank-col {
  text-align: center;
  width: 2rem;
}

.rank {
  font-weight: 700;
  font-family: 'Space Grotesk', serif;
  color: var(--theme-col-dark-red);
  text-align: center;
  font-size: 2em;
}

.avatar-cell {
  width: 3rem;
  padding: 0.35rem 0.5rem;
}

.avatar {
  display: block;
  width: 2.6rem;
  height: 2.9rem;
  object-fit: contain;
}

.player-col,
td.player-name {
  text-align: left;
}

.player-name {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.char-name {
  font-weight: 600;
  font-size: 1.1em;
  color: var(--theme-col-blurple);
}

.real-name {
  font-size: 0.7rem;
  color: var(--theme-col-brown-light);
}

.class-name {
  font-weight: 700;
}

.level-num {
  font-weight: 600;
  font-size: 1.2em;
  color: var(--theme-col-blurple);
}

.hp {
  font-variant-numeric: tabular-nums;
}

.level-progress-cell {
  min-width: 160px;
}

.level-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.lv-xp {
  color: var(--theme-col-brown-light);
  font-variant-numeric: tabular-nums;
}

.level-progress-track {
  background-color: var(--theme-col-parchment-dark);
  height: 0.7em;
  width: 100%;
  border-radius: 0.5em;
  // margin-top: 0.5em;
  box-shadow: inset 2px 2px 0em 1px var(--theme-col-brown-light);
}

.level-progress-fill {
  height: 100%;
  background-color: var(--theme-col-green);
  width: 0%;
  border-radius: 0.5em;
  box-shadow: inset -2px -2px 0em 1px var(--theme-col-ml-green);
}

// ---------------------------------------------------------------------------
// Achievement panel
// ---------------------------------------------------------------------------
.achievement-panel-inner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.achievement-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0 0 0.2em 0;
}

.achievement-badge {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  padding: 0.25rem;
  flex-shrink: 0;

  // Tier 2 — default / blurple
  &.tier-2 {
    background-color: var(--theme-col-blurple);
    border: 2px solid var(--theme-col-light-blurple);

    .achievement-icon {
      filter: brightness(0) invert(1);
    }
  }

  // Tier 1 — same as tier 2
  &.tier-1 {
    background-color: var(--theme-col-blurple);
    border: 2px solid var(--theme-col-light-blurple);

    .achievement-icon {
      filter: brightness(0) invert(1);
    }
  }

  // Tier 3 — plain SVG, no badge styling
  &.tier-3 {
    background: none;
    border: none;
    padding: 0;
  }
}

.achievement-icon {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.achievement-count {
  font-weight: 600;
  color: var(--theme-col-blurple);
}

// ---------------------------------------------------------------------------
// Expand / collapse transition
// ---------------------------------------------------------------------------
.expand-enter-active,
.expand-leave-active {
  transition:
    opacity 0.3s ease,
    transform 0.3s ease;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

.achievement-empty {
  font-size: 0.8rem;
  color: var(--theme-col-brown-light);
  font-style: italic;
  padding: 0.25rem 0;
}
</style>
