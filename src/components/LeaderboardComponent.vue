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
  if (sortKey.value !== key) return 'unfold_more'
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
    .table-header-area
      table.leaderboard-table
        colgroup
          col(style="width:2.5rem")
          col(style="width:4rem")
          col
          col(style="width:6rem")
          col(style="width:5rem")
          col(style="width:4rem")
          col(style="width:9.5rem")
          col(style="width:5.5rem")
          col(style="width:5.5rem")
          col(style="width:5.5rem")
          col(style="width:8rem")
        thead
          tr
            th.rank-col.sortable(
              :class="{ active: sortKey === null }"
              @click="resetSort"
              title="Default ranking"
            ) Rank
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
    .table-body-area
      table.leaderboard-table
        colgroup
          col(style="width:2.5rem")
          col(style="width:4rem")
          col
          col(style="width:6rem")
          col(style="width:5rem")
          col(style="width:4rem")
          col(style="width:9.5rem")
          col(style="width:5.5rem")
          col(style="width:5.5rem")
          col(style="width:5.5rem")
          col(style="width:8rem")
        tbody
          tr(v-for="(player, index) in displayedPlayers" :key="player.playerId")
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
  overflow: hidden;
  width: 90%;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
}

.table-header-area {
  flex-shrink: 0;
}

.table-body-area {
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
  table-layout: fixed;
  border-collapse: separate;
  border-spacing: 0 3px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;

  thead tr {
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
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    font-size: 1.2rem;
    white-space: nowrap;
    user-select: none;
    // background-color: var(--theme-col-light-red);

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
      border-radius: 10px 0 0 10px;
    }

    td:last-child {
      border-radius: 0 10px 10px 0;
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
  color: var(--theme-col-brown);
  text-align: center;
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
  // font-family: 'Pixelify Sans', sans-serif;
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
  // height: 10px;
  // background: var(--theme-col-parchment-dark);
  // border-radius: 4px;
  // overflow: hidden;
  // border: 1px solid var(--theme-col-brown-light);
  background-color: var(--theme-col-parchment-dark);
  height: 1em;
  width: 100%;
  border-radius: 0.5em;
  margin-top: 0.5em;
  box-shadow: inset 3px 3px 0em 1px var(--theme-col-brown-light);
}

.level-progress-fill {
  height: 100%;
  background-color: var(--theme-col-green);
  height: 100%;
  width: 0%;
  border-radius: 0.5em;
  box-shadow: inset -2px -2px 0em 1px var(--theme-col-ml-green);
  // background:
  //   linear-gradient(to bottom, rgba(255, 255, 255, 0.35) 0%, rgba(0, 0, 0, 0.15) 100%),
  //   linear-gradient(to right, var(--theme-col-med-green), var(--theme-col-green));
  // border-radius: 4px;
  // box-shadow: inset 0 1px 2px rgba(255, 255, 255, 0.5), inset 0 -1px 2px rgba(0, 0, 0, 0.2);
  // transition: width 0.4s ease;
}
</style>
