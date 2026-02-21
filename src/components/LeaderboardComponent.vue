<script setup lang="ts">
import { ref, computed } from 'vue'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

// ---------------------------------------------------------------------------
// Avatar helper
// ---------------------------------------------------------------------------
function avatarSrc(img: string) {
  if (!img) return new URL('../assets/avatars/default.svg', import.meta.url).href
  return new URL(`../assets/avatars/${img}`, import.meta.url).href
}

function achievementCount(achievements: string): number {
  if (!achievements || typeof achievements !== 'string') return 0
  return achievements.split(',').filter(Boolean).length
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

function sortIcon(key: SortKey) {
  if (sortKey.value !== key) return '[-]'
  return sortDir.value === 'desc' ? '⌄' : '⌃'
}

// ---------------------------------------------------------------------------
// Sorted player list — falls back to store's hierarchy when no column is active
// ---------------------------------------------------------------------------
const displayedPlayers = computed(() => {
  if (!sortKey.value) return store.rankedPlayers

  const key = sortKey.value
  const dir = sortDir.value === 'desc' ? -1 : 1

  return [...store.players].sort((a, b) => {
    const aVal = key === 'achievements' ? achievementCount(a.achievements) : a[key]
    const bVal = key === 'achievements' ? achievementCount(b.achievements) : b[key]
    return dir * (bVal - aVal)
  })
})
</script>

<template lang="pug">
.leaderboard-component
  p.loading(v-if="store.loading") Loading...
  p.error(v-else-if="store.error") {{ store.error }}
  .table-scroll-wrapper(v-else)
    table.leaderboard-table
      thead
        tr
          th.rank-col.sortable(
            :class="{ active: sortKey === null }"
            @click="resetSort"
            title="Default ranking"
          ) #
          th
          th Player
          th Class
          th HP
          th.sortable(
            :class="{ active: sortKey === 'level' }"
            @click="setSort('level')"
          ) Lvl {{ sortIcon('level') }}
          th Lvl Progress
          th.sortable(
            :class="{ active: sortKey === 'totalXp' }"
            @click="setSort('totalXp')"
          ) total XP {{ sortIcon('totalXp') }}
          th Weeks Won
          th.sortable(
            :class="{ active: sortKey === 'totalActiveDays' }"
            @click="setSort('totalActiveDays')"
          ) Active Days {{ sortIcon('totalActiveDays') }}
          th.sortable(
            :class="{ active: sortKey === 'achievements' }"
            @click="setSort('achievements')"
          ) Achievements {{ sortIcon('achievements') }}
      tbody
        tr(v-for="(player, index) in displayedPlayers" :key="player.playerId")
          td.rank {{ index + 1 }}
          td.avatar-cell
            img.avatar(:src="avatarSrc(player.img)" :alt="player.charName")
          td.player-name
            span.char-name {{ player.charName }}
            span.real-name {{ player.realName }}
          td {{ player.class }}
          td.hp {{ player.hp }} / {{ player.maxHp }}
          td {{ player.level }}
          td.level-progress-cell
            .level-progress-labels
              //- span.lv-current Lv {{ player.level }}
              span.lv-xp {{ xpIntoLevel(player.totalXp) }} / 200
            .level-progress-track
              .level-progress-fill(:style="{ width: `${xpLevelProgress(player.totalXp)}%` }")
          td {{ player.totalXp }}
          td {{ player.weekWins }}
          td {{ player.totalActiveDays }}
          td {{ achievementCount(player.achievements) }}
</template>

<style lang="scss" scoped>
.leaderboard-component {
  padding: 2rem;
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
  border-collapse: collapse;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;

  thead tr {
    position: sticky;
    top: 0;
    // background-color: var(--theme-col-brown);
    // color: var(--theme-col-parchment-light);
    // background-color: var(--theme-col-parchment-light);
    background-color: var(--theme-col-parchment);
    color: var(--theme-col-dark-red);
    text-align: left;
    border-bottom: 2px solid var(--theme-col-dark-red);
  }

  th {
    font-family: 'Grenze Gotisch', serif;
    padding: 0.25rem 0.5rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    font-size: 1.2rem;
    white-space: nowrap;
    user-select: none;

    &.sortable {
      cursor: pointer;

      &:hover {
        background-color: var(--theme-col-brown-light);
      }

      &.active {
        background-color: var(--theme-col-dark-red);
        color: var(--theme-col-parchment-light);
      }
    }
  }

  tbody tr {
    background-color: var(--theme-col-parchment-light);
    border-bottom: 1px solid var(--theme-col-parchment-dark);

    &:nth-child(even) {
      background-color: rgba(0, 0, 0, 0.04);
    }

    &:hover {
      background-color: var(--theme-col-lightest-blurple);
    }
  }

  td {
    padding: 0.5rem 0.75rem;
    vertical-align: middle;
  }
}

.rank-col {
  text-align: center;
  width: 2rem;
}

.rank {
  font-weight: 700;
  color: var(--theme-col-brown);
  text-align: center;
}

.avatar-cell {
  width: 4rem;
  padding: 0.35rem 0.5rem;
}

.avatar {
  display: block;
  width: 2.6rem;
  height: 2.9rem;
  object-fit: contain;
}

.player-name {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
}

.char-name {
  font-weight: 600;
  color: var(--theme-col-dark-blurple);
}

.real-name {
  font-size: 0.75rem;
  color: var(--theme-col-brown-light);
}

.hp {
  font-variant-numeric: tabular-nums;
}

.level-progress-cell {
  min-width: 140px;
}

.level-progress-labels {
  display: flex;
  justify-content: space-between;
  font-size: 0.7rem;
  margin-bottom: 4px;
}

.lv-current {
  font-weight: 700;
  color: var(--theme-col-dark-blurple);
  letter-spacing: 0.03em;
}

.lv-xp {
  color: var(--theme-col-brown-light);
  font-variant-numeric: tabular-nums;
}

.level-progress-track {
  height: 8px;
  background: var(--theme-col-parchment-dark);
  border-radius: 4px;
  overflow: hidden;
  border: 1px solid var(--theme-col-brown-light);
}

.level-progress-fill {
  height: 100%;
  background: linear-gradient(to right, var(--theme-col-blurple), var(--theme-col-med-blurple));
  border-radius: 4px;
  transition: width 0.4s ease;
}
</style>
