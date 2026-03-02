<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import MagicLoader from '@/components/MagicLoader.vue'

const rustyKnightUrl = new URL('../assets/rusty-knight.png', import.meta.url).href

const store = useGameStore()

function avatarSrc(img: string) {
  if (!img) return new URL('../assets/avatars/default.png', import.meta.url).href
  return new URL(`../assets/avatars/${img}`, import.meta.url).href
}

const CLASS_ORDER = ['ranger', 'cleric', 'druid', 'sorcerer', 'rogue', 'barbarian']

const players = computed(() =>
  store.players
    .filter((p) => store.cmpgn1ByPlayer.has(p.playerId))
    .map((p) => ({
      ...p,
      actionPoints: store.cmpgn1ByPlayer.get(p.playerId)!.actionPoints,
      dgnProgress: store.cmpgn1ByPlayer.get(p.playerId)!.dgnProgress,
    }))
    .sort((a, b) => {
      const ai = CLASS_ORDER.indexOf(a.class?.toLowerCase())
      const bi = CLASS_ORDER.indexOf(b.class?.toLowerCase())
      const aRank = ai === -1 ? CLASS_ORDER.length : ai
      const bRank = bi === -1 ? CLASS_ORDER.length : bi
      return aRank - bRank
    }),
)

const classCards = computed(() =>
  [...store.classInfo].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.class.toLowerCase())
    const bi = CLASS_ORDER.indexOf(b.class.toLowerCase())
    const aRank = ai === -1 ? CLASS_ORDER.length : ai
    const bRank = bi === -1 ? CLASS_ORDER.length : bi
    return aRank - bRank
  }),
)

const AVATAR_STEP_REM = 2.5

const playersPositioned = computed(() => {
  const groups = new Map<number, number>() // dgnProgress -> count so far
  return players.value
    .map((p) => {
      const seen = groups.get(p.dgnProgress) ?? 0
      groups.set(p.dgnProgress, seen + 1)
      return { ...p, _groupIdx: seen }
    })
    .map((p) => {
      const groupSize = groups.get(p.dgnProgress)!
      const offset = (p._groupIdx - (groupSize - 1) / 2) * AVATAR_STEP_REM
      return { ...p, topOffset: offset }
    })
})
</script>

<template lang="pug">
.dungeon-component
  MagicLoader(v-if="store.loading")
  p.error(v-else-if="store.error") {{ store.error }}
  .content-layout(v-else)
    .main-row
      .side-panel
        .player-roster
          table.roster-table
            thead
              tr
                th
                th.col-name Player
                th.col-class Class
                th.col-hp HP
                th.col-dgn Dgn%
                th.col-ap
                  span.material-icons.ap-icon campaign
            tbody
              tr(v-for="p in players" :key="p.playerId" :class="`class-${p.class?.toLowerCase()}`")
                td.avatar-cell
                  img.avatar(:src="avatarSrc(p.img)" :alt="p.charName")
                td.col-name
                  span.char-name {{ p.charName }}
                  span.real-name {{ p.realName }}
                td.col-class {{ p.class }}
                td.col-hp {{ p.hp }}/{{ p.maxHp }}
                td.col-dgn {{ p.dgnProgress }}%
                td.col-ap {{ p.actionPoints }}
      .main-content
        .dungeon-floor
          .danger-zone
          .enemy-buffer
            img.enemy-img(:src="rustyKnightUrl" alt="Rusty Knight")
          .player-progress-zone
            .player-token(v-for="p in playersPositioned" :key="p.playerId" :style="{ left: p.dgnProgress + '%', top: `calc(50% + ${p.topOffset}rem)` }")
              img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
        .class-info-row
          .class-card(v-for="c in classCards" :key="c.class" :class="`class-${c.class.toLowerCase()}`")
            .card-header {{ c.class }}
            .card-body
              .ability
                .ability-header
                  span.ability-name {{ c.ability1Name }}
                  span.ability-cost {{ c.ability1Cost }} AP
                p.ability-desc {{ c.ability1Desc }}
              .ability
                .ability-header
                  span.ability-name {{ c.ability2Name }}
                  span.ability-cost {{ c.ability2Cost }} AP
                p.ability-desc {{ c.ability2Desc }}
</template>

<style lang="scss" scoped>
.dungeon-component {
  padding: 1rem 3rem 2rem 0;
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
  flex: 0 0 auto;
  display: flex;
  gap: 1rem;
}

.side-panel {
  flex: 0 0 30%;
  min-width: 0;
  min-height: 0;
  display: flex;
  flex-direction: column;
}

.player-roster {
  background-color: var(--theme-col-parchment-light);
  border-radius: 20px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  font-family: 'Space Grotesk', sans-serif;
}

.roster-table {
  width: 100%;
  border-collapse: separate;
  border-spacing: 0 2px;
  font-size: 0.85rem;

  thead tr {
    background-color: var(--theme-col-blurple);
    color: var(--theme-col-lightest-blurple);

    th:first-child {
      border-radius: 0;
    }
    th:last-child {
      border-radius: 0;
    }
  }

  th {
    font-family: 'Grenze Gotisch', serif;
    font-size: 0.95rem;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: lowercase;
    padding: 0.25rem 0.5rem;
    text-align: center;
    user-select: none;
    white-space: nowrap;

    .ap-icon {
      font-size: 1.1rem;
      vertical-align: middle;
    }
  }

  tbody tr {
    background-color: var(--theme-col-parchment-light);

    &:hover {
      background-color: var(--theme-col-lightest-blurple);
    }

    &.class-ranger {
      background-color: rgba(40, 100, 200, 0.15);
    }
    &.class-cleric {
      background-color: rgba(220, 190, 80, 0.2);
    }
    &.class-druid {
      background-color: rgba(100, 160, 60, 0.15);
    }
    &.class-sorcerer {
      background-color: rgba(120, 60, 200, 0.15);
    }
    &.class-rogue {
      background-color: rgba(60, 60, 80, 0.15);
    }
    &.class-barbarian {
      background-color: rgba(200, 60, 40, 0.15);
    }
  }

  td {
    padding: 0.2rem 0.5rem;
    vertical-align: middle;
    text-align: center;
  }
}

.avatar-cell {
  width: 2.8rem;
  padding: 0.2rem 0.25rem;
}

.avatar {
  display: block;
  width: 2.4rem;
  height: 1.8rem;
  object-fit: contain;
}

.col-name {
  text-align: left;
  display: flex;
  flex-direction: column;
  padding: 0.2rem 0.4rem;
}

.char-name {
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--theme-col-blurple);
  line-height: 1.2;
}

.real-name {
  font-size: 0.7rem;
  color: var(--theme-col-brown-light);
  line-height: 1;
}

.col-class {
  text-align: left;
  font-size: 0.8rem;
}

.dungeon-floor {
  flex: 1;
  min-width: 0;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  height: 40vh;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    border-radius: inherit;
    background-image: url('../assets/stone-floor.svg');
    background-repeat: repeat;
    background-size: 20% auto;
    opacity: 0.4;
    pointer-events: none;
  }
}

.danger-zone {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 19.25%; // enemy-buffer (5%) + 15% of player-zone (95% × 0.15)
  background: rgba(255, 131, 112, 0.42);
  pointer-events: none;
}

.player-progress-zone {
  position: relative;
  flex: 1;
}

.player-token {
  position: absolute;
  transform: translateY(-50%);
}

.player-avatar {
  display: block;
  // width: 2.4rem;
  height: 4.5rem;
  // width: auto;
  object-fit: contain;
}

.enemy-buffer {
  position: relative;
  width: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enemy-img {
  width: 100px;
  // width: 100%;
  height: auto;
  display: block;
}

.class-info-row {
  display: flex;
  gap: 0.5rem;
  margin-top: 0.75rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: auto;
  align-items: flex-start;
}

.class-card {
  flex: 1;
  min-width: 9rem;
  border-radius: 10px;
  overflow: hidden;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.9rem;
  border: 1px solid rgba(0, 0, 0, 0.12);

  &.class-ranger {
    border-color: rgba(40, 100, 200, 0.5);
  }
  &.class-cleric {
    border-color: rgba(220, 190, 80, 0.6);
  }
  &.class-druid {
    border-color: rgba(100, 160, 60, 0.5);
  }
  &.class-sorcerer {
    border-color: rgba(120, 60, 200, 0.5);
  }
  &.class-rogue {
    border-color: rgba(60, 60, 80, 0.4);
  }
  &.class-barbarian {
    border-color: rgba(200, 60, 40, 0.5);
  }
}

.card-header {
  font-family: 'Space Grotesk', serif;
  font-size: 0.9rem;
  font-weight: 600;
  padding: 0.2rem 0.5rem;
  text-align: center;
  color: var(--theme-col-blurple);

  .class-ranger & {
    background-color: rgba(40, 100, 200, 0.2);
  }
  .class-cleric & {
    background-color: rgba(220, 190, 80, 0.3);
  }
  .class-druid & {
    background-color: rgba(100, 160, 60, 0.2);
  }
  .class-sorcerer & {
    background-color: rgba(120, 60, 200, 0.2);
  }
  .class-rogue & {
    background-color: rgba(60, 60, 80, 0.2);
  }
  .class-barbarian & {
    background-color: rgba(200, 60, 40, 0.2);
  }
}

.card-body {
  padding: 0.35rem 0.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background-color: var(--theme-col-parchment-light);
}

.ability {
  &:not(:last-child) {
    padding-bottom: 0.35rem;
    border-bottom: 1px dashed rgba(0, 0, 0, 0.15);
  }
}

.ability-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.25rem;
  font-family: 'Space Grotesk', san-serif;
}

.ability-name {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--theme-col-blurple);
}

.ability-cost {
  font-size: 0.63rem;
  background-color: var(--theme-col-blurple);
  color: white;
  padding: 0.05rem 0.3rem;
  border-radius: 3px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ability-desc {
  margin: 0.15rem 0 0;
  font-size: 0.8rem;
  color: var(--theme-col-brown-light);
  line-height: 1.3;
}

.error {
  text-align: center;
  padding: 2rem;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--theme-col-dark-red);
}
</style>
