<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import MagicLoader from '@/components/MagicLoader.vue'

const rustyKnightUrl = new URL('../assets/rusty-knight.png', import.meta.url).href
const chestClosedUrl = new URL('../assets/chest-closed.svg', import.meta.url).href
const chestOpenUrl = new URL('../assets/chest-open.svg', import.meta.url).href

const store = useGameStore()

const hoveredPlayerId = ref<string | null>(null)
const collapsedGroups = ref(new Set<string>())
const expandedPlayers = ref(new Set<string>())
const enemyCollapsed = ref(false)
const apFilter = ref(true)
const rosterTab = ref<'roster' | 'initiative'>('roster')

function toggleExpanded(playerId: string) {
  if (expandedPlayers.value.has(playerId)) {
    expandedPlayers.value.delete(playerId)
  } else {
    expandedPlayers.value.add(playerId)
  }
}

function itemCount(p: { itemSlot1: string; itemSlot2: string }): number {
  return (p.itemSlot1 ? 1 : 0) + (p.itemSlot2 ? 1 : 0)
}

const campaignC1 = computed(() => store.campaigns.find((c) => c.id === 'c1') ?? null)

const playerById = computed(() => {
  const map = new Map<string, (typeof store.players)[number]>()
  for (const p of store.players) map.set(p.playerId, p)
  return map
})

const initiativeList = computed(() => {
  return store.initiativeOrder
    .map((entry) => playerById.value.get(entry.playerId))
    .filter((p): p is NonNullable<typeof p> => !!p && (!apFilter.value || p.actionPoints > 0))
})

function enemySrc(img: string) {
  return new URL(`../assets/${img}`, import.meta.url).href
}

function toggleGroup(cls: string) {
  if (collapsedGroups.value.has(cls)) {
    collapsedGroups.value.delete(cls)
  } else {
    collapsedGroups.value.add(cls)
  }
}

function truncate(text: string, max = 22): string {
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
  const source = apFilter.value ? players.value.filter((p) => p.actionPoints > 0) : players.value
  const map = new Map<string, (typeof players.value)[number][]>()
  for (const p of source) {
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

const CHEST_STEP_REM = 2.2

const hoveredChestId = ref<number | null>(null)

const itemByNo = computed(() => {
  const map = new Map<string, string>()
  for (const item of store.items) {
    if (item.itemNo) map.set(item.itemNo, item.itemName)
  }
  return map
})

const itemEffectByNo = computed(() => {
  const map = new Map<string, string>()
  for (const item of store.items) {
    if (item.itemNo) map.set(item.itemNo, item.Effect)
  }
  return map
})

function chestItemNames(chest: {
  item1: string
  item2: string
  item3: string
  item4: string
  item5: string
  item6: string
}): string[] {
  return [chest.item1, chest.item2, chest.item3, chest.item4, chest.item5, chest.item6]
    .filter(Boolean)
    .map((key) => itemByNo.value.get(key) ?? key)
}

const c1Chests = computed(() => {
  const visible = store.dungeonElements.filter((e) => e.campaign === 'c1' && e.visible)
  const groups = new Map<number, number>()
  return visible.map((chest) => {
    const stackIdx = groups.get(chest.location) ?? 0
    groups.set(chest.location, stackIdx + 1)
    return { ...chest, bottomOffset: 0.5 + stackIdx * CHEST_STEP_REM }
  })
})

function chestSrc(looted: boolean) {
  return looted ? chestOpenUrl : chestClosedUrl
}

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
        .enemy-section(v-if="campaignC1")
          .enemy-section-header(@click="enemyCollapsed = !enemyCollapsed")
            span.enemy-section-label ENEMY
            span.material-icons.collapse-icon {{ enemyCollapsed ? 'expand_more' : 'expand_less' }}
          .enemy-section-body(v-show="!enemyCollapsed")
            span.enemy-name {{ campaignC1.enemy }}
            .enemy-block
              img.enemy-section-img(:src="enemySrc(campaignC1.enemyImg)" :alt="campaignC1.enemy")
              .enemy-stats
                .en-row
                  span.en-label HP
                  span.en-value {{ campaignC1.enemyHp }}/{{ campaignC1.enemyMaxHp }}
                .en-row
                  span.en-label DMG
                  span.en-value {{ campaignC1.enemyDmg }}
                .en-row
                  span.en-label DMG Zone
                  span.en-value {{ campaignC1.enemyDmgZone }}%
                .en-row
                  span.en-label Speed
                  span.en-value {{ campaignC1.enemySpeed }}% per week
        .party-header
          .party-tabs
            button.party-tab(:class="{ active: rosterTab === 'roster' }" @click="rosterTab = 'roster'") Roster
            button.party-tab(:class="{ active: rosterTab === 'initiative' }" @click="rosterTab = 'initiative'") Initiative
          button.ap-filter-btn(@click="apFilter = !apFilter" :class="{ active: apFilter }")
            span.material-icons campaign
        .player-roster
          .initiative-list(v-if="rosterTab === 'initiative'")
            .initiative-row(v-for="(p, i) in initiativeList" :key="p.playerId" :class="`class-${p.class?.toLowerCase()}`")
              span.initiative-num {{ i + 1 }}
              img.avatar(:src="avatarSrc(p.img)" :alt="p.charName")
              span.initiative-name {{ p.charName }}
              span.initiative-ap
                span.material-icons.ap-icon campaign
                | {{ p.actionPoints }}
          .roster-groups(v-else)
            .class-group(v-for="group in groupedPlayers" :key="group.class")
              .class-group-header(:class="`class-${group.class}`" @click="toggleGroup(group.class)")
                span.class-group-label {{ group.class }}
                span.class-group-count  ({{ group.players.length }})
                span.material-icons.collapse-icon {{ collapsedGroups.has(group.class) ? 'expand_more' : 'expand_less' }}
              table.roster-table(v-show="!collapsedGroups.has(group.class)")
                tbody
                  template(v-for="p in group.players" :key="p.playerId")
                    tr(:class="['class-' + p.class?.toLowerCase(), { 'is-expanded': expandedPlayers.has(p.playerId) }]" @mouseenter="hoveredPlayerId = p.playerId" @mouseleave="hoveredPlayerId = null" @click="toggleExpanded(p.playerId)" style="cursor:pointer")
                      td.avatar-cell
                        img.avatar(:src="avatarSrc(p.img)" :alt="p.charName")
                      td.col-name(:title="p.realName")
                        span.char-name(:data-tooltip="p.charName.length > 20 ? p.charName : undefined") {{ truncate(p.charName) }}
                      td.col-hp {{ p.hp }}/{{ p.maxHp }}
                      td.col-items
                        span.material-icons.bag-icon backpack
                        | {{ itemCount(p) }}
                      td.col-ap
                        span.material-icons.ap-icon campaign
                        | {{ p.actionPoints }}
                    tr.expanded-row(v-if="expandedPlayers.has(p.playerId)" :class="`class-${p.class?.toLowerCase()}`")
                      td(colspan="5")
                        .item-list
                          span.item-slot-label ITEMS:
                          .item-slots
                            .item-slot-wrapper(v-if="p.itemSlot1")
                              span.item-slot-value {{ itemByNo.get(p.itemSlot1) ?? p.itemSlot1 }}
                              .item-slot-tooltip(v-if="itemEffectByNo.get(p.itemSlot1)") {{ itemEffectByNo.get(p.itemSlot1) }}
                            span.item-slot-empty(v-else) [ ... ]
                            .item-slot-wrapper(v-if="p.itemSlot2")
                              span.item-slot-value {{ itemByNo.get(p.itemSlot2) ?? p.itemSlot2 }}
                              .item-slot-tooltip(v-if="itemEffectByNo.get(p.itemSlot2)") {{ itemEffectByNo.get(p.itemSlot2) }}
                            span.item-slot-empty(v-else) [ ... ]
      .main-content
        .dungeon-floor
          .danger-zone
          .enemy-buffer
            img.enemy-img(:src="rustyKnightUrl" alt="Rusty Knight")
          .player-progress-zone
            .hover-radius(v-if="hoveredDgnProgress !== null" :style="{ left: hoveredDgnProgress + '%' }")
            .chest-token(v-for="chest in c1Chests" :key="chest.id" :style="{ left: chest.location + '%', bottom: chest.bottomOffset + 'rem' }" :class="{ 'is-looted': chest.looted, 'is-legendary': chest.item === 'legendaryChest' }" @mouseenter="hoveredChestId = chest.id" @mouseleave="hoveredChestId = null")
              img.chest-img(:src="chestSrc(chest.looted)" :alt="chest.item")
              .chest-tooltip(v-if="hoveredChestId === chest.id && chest.itemsRevealed")
                span.chest-tooltip-item(v-for="name in chestItemNames(chest)" :key="name") {{ name }}
            .player-token(v-for="p in playersPositioned" :key="p.playerId" :style="{ left: p.dgnProgress + '%', top: `calc(50% + ${p.topOffset}rem)` }" :class="{ 'is-highlighted': hoveredPlayerId === p.playerId, 'is-dimmed': hoveredPlayerId !== null && hoveredPlayerId !== p.playerId }")
              img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
        .class-area
          .universal-bar
            span.universal-label ALL PLAYERS
            .universal-divider
            span.universal-action
              span.universal-action-name Search Nearby Chest
              span.universal-action-detail  Standard — roll d6 · Legendary — roll d20
              span.universal-action-name Use Item
              span.universal-action-detail  See item for cost - does not apply to immediate use or Buffs
            .universal-divider
            span.universal-ap-note Ability Cost: 1AP (unless noted otherwise)
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

.party-header {
  margin-top: 0.5rem;
  background-color: var(--theme-col-blurple);
  color: var(--theme-col-lightest-blurple);
  font-family: 'Space Grotesk', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  padding: 0.25rem 0.5rem 0.25rem 0.75rem;
  border-radius: 10px 10px 0 0;
  flex-shrink: 0;
  text-transform: uppercase;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.party-tabs {
  display: flex;
  gap: 0.25rem;
}

.party-tab {
  font-family: 'Space Grotesk', serif;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  padding: 0.1rem 0.45rem;
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &.active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-color: rgba(255, 255, 255, 0.7);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
  }
}

.roster-groups {
  display: contents;
}

.initiative-list {
  padding: 0.25rem 0;
}

.initiative-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.2rem 0.5rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.82rem;

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
    background-color: rgba(220, 120, 20, 0.15);
  }
}

.initiative-num {
  flex: 0 0 1.2rem;
  font-weight: 700;
  font-size: 0.75rem;
  color: var(--theme-col-brown-light);
  text-align: right;
}

.initiative-name {
  flex: 1;
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--theme-col-blurple);
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.initiative-ap {
  display: flex;
  align-items: center;
  gap: 0.15rem;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--theme-col-brown);
  flex-shrink: 0;

  .ap-icon {
    font-size: 0.85rem;
    opacity: 0.7;
  }
}

.ap-filter-btn {
  display: flex;
  align-items: center;
  padding: 0.1rem 0.25rem;

  .material-icons {
    font-size: 1rem;
  }
  border-radius: 4px;
  border: 1px solid rgba(255, 255, 255, 0.35);
  background: transparent;
  color: rgba(255, 255, 255, 0.5);
  cursor: pointer;
  transition:
    background 0.15s,
    color 0.15s;

  &.active {
    background: rgba(255, 255, 255, 0.2);
    color: white;
    border-color: rgba(255, 255, 255, 0.7);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.15);
    color: rgba(255, 255, 255, 0.85);
  }
}

.player-roster {
  background-color: var(--theme-col-parchment-light);
  border-radius: 0 0 20px 20px;
  overflow-y: auto;
  min-height: 0;
  flex: 1;
  font-family: 'Space Grotesk', sans-serif;
}

.roster-table {
  width: 100%;
  table-layout: fixed;
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
      background-color: rgba(220, 120, 20, 0.15);
    }
  }

  td {
    padding: 0.2rem 0.5rem;
    vertical-align: middle;
    text-align: center;
  }
}

.avatar-cell {
  width: 1.8rem;
  padding: 0.2rem 0.1rem;
}

.avatar {
  display: block;
  width: 1.5rem;
  height: 1.5rem;
  object-fit: contain;
}

td.col-name {
  text-align: left;
  padding: 0.2rem 0.4rem;
}

.char-name {
  font-weight: 600;
  font-size: 0.8rem;
  color: var(--theme-col-blurple);
  line-height: 1.1;
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
    background-color: rgba(220, 120, 20, 0.12);
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

.class-group-header-right {
  display: flex;
  align-items: center;
  gap: 0.25rem;
}

.class-group-count {
  font-size: 0.7rem;
  font-weight: 600;
  opacity: 0.6;
  margin-left: 0.2rem;
}

.collapse-icon {
  font-size: 1rem;
  opacity: 0.6;
  margin-left: auto;
}

.col-items {
  width: 2.8rem;
  text-align: center;
  padding: 0.2rem 0.25rem;
  font-size: 0.7rem;
  white-space: nowrap;
}

.bag-icon {
  font-size: 0.85rem;
  vertical-align: middle;
  opacity: 0.7;
}

.expanded-row td {
  padding: 0.25rem 0.5rem 0.4rem;
  background-color: var(--theme-col-parchment-light);
}

.item-list {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  font-size: 0.75rem;
}

.item-slot-label {
  flex-shrink: 0;
  font-weight: 600;
  color: var(--theme-col-brown-light);
  font-size: 0.65rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  margin-left: 3em;
}

.item-slots {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.3rem;
}

.item-slot-wrapper {
  position: relative;
  display: inline-flex;

  &:hover .item-slot-tooltip {
    display: block;
  }
}

.item-slot-value {
  font-weight: 600;
  color: var(--theme-col-blurple);
  background-color: rgba(0, 0, 0, 0.06);
  padding: 0.05rem 0.35rem;
  border-radius: 3px;
  margin-right: 0.5rem;
  cursor: default;
}

.item-slot-tooltip {
  display: none;
  position: absolute;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--theme-col-parchment-light);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  white-space: normal;
  width: 14rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--theme-col-blurple);
  z-index: 20;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;
  line-height: 1.35;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--theme-col-parchment-light);
  }
}

.item-slot-empty {
  color: var(--theme-col-brown-light);
  opacity: 0.45;
  margin-right: 0.5rem;
}

.col-ap {
  width: 2.8rem;
  text-align: center;
  padding: 0.2rem 0.25rem;
  font-size: 0.7rem;
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
  width: 3.5rem;
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

.chest-token {
  position: absolute;
  transform: translateX(-50%);
  z-index: 5;

  &.is-legendary .chest-img {
    filter: drop-shadow(0 0 5px rgba(255, 200, 50, 0.9));
  }

  &.is-looted {
    opacity: 0.5;
  }
}

.chest-img {
  display: block;
  height: clamp(1.25rem, 4vh, 2.5rem);
  width: auto;
  object-fit: contain;
}

.chest-tooltip {
  position: absolute;
  bottom: calc(100% + 0.4rem);
  left: 50%;
  transform: translateX(-50%);
  background: var(--theme-col-parchment-light);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  z-index: 20;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  &::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--theme-col-parchment-light);
  }
}

.chest-tooltip-item {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--theme-col-blurple);
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
  height: clamp(1.25rem, 8vh, 5rem);
  max-height: 85%;
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

.class-area {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin-top: 0.75rem;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.class-info-row {
  display: flex;
  gap: 0.5rem;
  overflow-x: auto;
  align-items: flex-start;
}

.class-card {
  flex: 1;
  min-width: 9rem;

  &.class-universal {
    border-color: rgba(0, 0, 0, 0.2);
    flex: none;
    width: 100%;
  }
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
    border-color: rgba(220, 120, 20, 0.5);
  }
}

.universal-bar {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.3rem 0.75rem;
  background-color: var(--theme-col-parchment-light);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 8px;
  font-family: 'Space Grotesk', sans-serif;
  flex-wrap: wrap;
  margin-bottom: 0.5em;
}

.universal-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: var(--theme-col-brown-light);
  flex-shrink: 0;
}

.universal-divider {
  width: 1px;
  align-self: stretch;
  background: rgba(0, 0, 0, 0.15);
  flex-shrink: 0;
}

.universal-action {
  font-size: 0.78rem;
  flex-shrink: 0;
}

.universal-action-name {
  font-weight: 600;
  color: var(--theme-col-blurple);
}

.universal-action-detail {
  color: var(--theme-col-brown-light);
  font-size: 0.72rem;
  margin-right: 1em;
}

.universal-ap-note {
  font-size: 0.68rem;
  font-style: italic;
  color: var(--theme-col-brown-light);
  opacity: 0.7;
  margin-left: auto;
  flex-shrink: 0;
}

.card-header {
  font-family: 'Space Grotesk', serif;
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.1rem 0.5rem;
  text-align: center;
  text-transform: uppercase;
  // color: var(--theme-col-blurple);

  .class-universal & {
    background-color: rgba(0, 0, 0, 0.08);
  }

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
    background-color: rgba(220, 120, 20, 0.2);
  }
}

.card-body {
  padding: 0.25rem 0.4rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  background-color: var(--theme-col-parchment-light);
  line-height: 1.1em;
}

.ability {
  &:not(:last-child) {
    padding-bottom: 0.2rem;
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

.enemy-section {
  flex: 0 0 auto;
  background-color: var(--theme-col-parchment-light);
  border-radius: 12px;
  overflow: hidden;
  font-family: 'Space Grotesk', sans-serif;
}

.enemy-section-header {
  display: flex;
  align-items: center;
  padding: 0.2rem 0.5rem;
  cursor: pointer;
  // background-color: rgba(230, 83, 61, 0.34);
  color: var(--theme-col-white-mute);
  background-color: var(--theme-col-red);
  border-bottom: 1px solid rgba(0, 0, 0, 0.1);
  user-select: none;

  &:hover {
    filter: brightness(0.95);
  }
}

.enemy-section-label {
  font-family: 'Space Grotesk', serif;
  font-size: 1rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.enemy-section-body {
  padding: 0.2rem 0.75rem;
}

.enemy-name {
  display: block;
  font-family: 'Space Grotesk', serif;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--theme-col-blurple);
  margin-bottom: 0.4rem;
}

.enemy-block {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.enemy-section-img {
  flex: 0 0 auto;
  width: 8rem;
  height: 8rem;
  object-fit: contain;
}

.enemy-stats {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.en-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  font-size: 0.8rem;
  border-bottom: 1px solid var(--theme-col-parchment-dark);
  padding-bottom: 0.2rem;

  &:last-child {
    border-bottom: none;
    padding-bottom: 0;
  }
}

.en-label {
  color: var(--theme-col-brown-light);
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.en-value {
  font-weight: 600;
  color: var(--theme-col-brown);
}

.error {
  text-align: center;
  padding: 2rem;
  font-family: 'Space Grotesk', sans-serif;
  color: var(--theme-col-dark-red);
}
</style>
