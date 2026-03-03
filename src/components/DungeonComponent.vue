<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import MagicLoader from '@/components/MagicLoader.vue'

const rustyKnightUrl = new URL('../assets/rusty-knight.png', import.meta.url).href

const store = useGameStore()

const hoveredPlayerId = ref<string | null>(null)
const collapsedGroups = ref(new Set<string>())

function toggleGroup(cls: string) {
  if (collapsedGroups.value.has(cls)) {
    collapsedGroups.value.delete(cls)
  } else {
    collapsedGroups.value.add(cls)
  }
}

function truncate(text: string, max = 21): string {
  return text.length > max ? text.slice(0, max) + '…' : text
}

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

const groupedPlayers = computed(() => {
  const map = new Map<string, (typeof players.value)[number][]>()
  for (const p of players.value) {
    const cls = p.class?.toLowerCase() ?? 'unknown'
    if (!map.has(cls)) map.set(cls, [])
    map.get(cls)!.push(p)
  }
  return CLASS_ORDER.filter((c) => map.has(c)).map((c) => ({ class: c, players: map.get(c)! }))
})

const classCards = computed(() =>
  [...store.classInfo].sort((a, b) => {
    const ai = CLASS_ORDER.indexOf(a.class.toLowerCase())
    const bi = CLASS_ORDER.indexOf(b.class.toLowerCase())
    const aRank = ai === -1 ? CLASS_ORDER.length : ai
    const bRank = bi === -1 ? CLASS_ORDER.length : bi
    return aRank - bRank
  }),
)

const AVATAR_STEP_REM = 1.8

const hoveredDgnProgress = computed(() => {
  if (!hoveredPlayerId.value) return null
  return players.value.find((p) => p.playerId === hoveredPlayerId.value)?.dgnProgress ?? null
})

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
          .class-group(v-for="group in groupedPlayers" :key="group.class")
            .class-group-header(:class="`class-${group.class}`" @click="toggleGroup(group.class)")
              span.class-group-label {{ group.class }}
              span.material-icons.collapse-icon {{ collapsedGroups.has(group.class) ? 'expand_more' : 'expand_less' }}
            table.roster-table(v-show="!collapsedGroups.has(group.class)")
              tbody
                tr(v-for="p in group.players" :key="p.playerId" :class="`class-${p.class?.toLowerCase()}`" @mouseenter="hoveredPlayerId = p.playerId" @mouseleave="hoveredPlayerId = null")
                  td.avatar-cell
                    img.avatar(:src="avatarSrc(p.img)" :alt="p.charName")
                  td.col-name
                    span.char-name(:data-tooltip="p.charName.length > 20 ? p.charName : undefined") {{ truncate(p.charName) }}
                    span.real-name(:data-tooltip="p.realName.length > 20 ? p.realName : undefined") {{ truncate(p.realName) }}
                  td.col-hp {{ p.hp }}/{{ p.maxHp }}
                  td.col-ap
                    | {{ p.actionPoints }}
                    span.material-icons.ap-icon campaign
      .main-content
        .dungeon-floor
          .danger-zone
          .enemy-buffer
            img.enemy-img(:src="rustyKnightUrl" alt="Rusty Knight")
          .player-progress-zone
            .hover-radius(v-if="hoveredDgnProgress !== null" :style="{ left: hoveredDgnProgress + '%' }")
            .player-token(v-for="p in playersPositioned" :key="p.playerId" :style="{ left: p.dgnProgress + '%', top: `calc(50% + ${p.topOffset}rem)` }" :class="{ 'is-highlighted': hoveredPlayerId === p.playerId, 'is-dimmed': hoveredPlayerId !== null && hoveredPlayerId !== p.playerId }")
              img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
        .class-info-row
          .class-card(v-for="c in classCards" :key="c.class" :class="`class-${c.class.toLowerCase()}`")
            .card-header {{ c.class }}
            .card-body
              .ability
                .ability-header
                  span.ability-name {{ c.ability1Name }}
                  span.ability-cost(v-if="c.ability1Cost > 1") {{ c.ability1Cost }} AP
                p.ability-desc {{ c.ability1Desc }}
              .ability
                .ability-header
                  span.ability-name {{ c.ability2Name }}
                  span.ability-cost(v-if="c.ability2Cost > 1") {{ c.ability2Cost }} AP
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
  flex: 1;
  min-height: 0;
  display: flex;
  gap: 1rem;
  align-items: stretch;
}

.main-content {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.side-panel {
  flex: 0 0 25%;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
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
  font-size: 0.8rem;
  color: var(--theme-col-blurple);
  line-height: 1.2;
}

.real-name {
  font-size: 0.7rem;
  color: var(--theme-col-brown-light);
  line-height: 1;
}

.class-group-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  user-select: none;

  &.class-ranger {
    background-color: rgba(40, 100, 200, 0.12);
  }
  &.class-cleric {
    background-color: rgba(220, 190, 80, 0.18);
  }
  &.class-druid {
    background-color: rgba(100, 160, 60, 0.12);
  }
  &.class-sorcerer {
    background-color: rgba(120, 60, 200, 0.12);
  }
  &.class-rogue {
    background-color: rgba(60, 60, 80, 0.12);
  }
  &.class-barbarian {
    background-color: rgba(200, 60, 40, 0.12);
  }

  &:hover {
    filter: brightness(0.95);
  }
}

.class-group-label {
  font-family: 'Space Grotesk', serif;
  font-size: 0.8rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.collapse-icon {
  font-size: 1rem;
  opacity: 0.6;
}

.col-ap {
  white-space: nowrap;

  .ap-icon {
    font-size: 0.85rem;
    vertical-align: middle;
    opacity: 0.7;
  }
}

.col-dgn {
  font-size: 0.8rem;
}

.col-hp {
  font-size: 0.7rem;
}

.dungeon-floor {
  --floor-height: 35vh;
  flex: none;
  min-width: 0;
  border-radius: 20px;
  overflow: hidden;
  position: relative;
  display: flex;
  align-items: center;
  height: var(--floor-height);

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

.hover-radius {
  position: absolute;
  top: 0;
  width: 10%;
  height: 100%;
  transform: translateX(-50%);
  background: radial-gradient(ellipse at center, rgba(255, 255, 255, 0.18) 0%, transparent 70%);
  pointer-events: none;
  transition: left 0.2s ease;
}

.player-token {
  position: absolute;
  transform: translateY(-50%);
  transition:
    transform 0.2s ease,
    opacity 0.2s ease,
    filter 0.2s ease;

  &.is-highlighted {
    transform: translateY(-50%) scale(1.25);
    filter: drop-shadow(0 0 6px rgba(255, 255, 255, 0.9));
    z-index: 10;
  }

  &.is-dimmed {
    opacity: 0.35;
  }
}

.player-avatar {
  display: block;
  height: clamp(1rem, 7vh, 4.5rem);
  max-height: 75%;
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
  // background-color: var(--theme-col-brown-light);
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
