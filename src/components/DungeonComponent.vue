<script setup lang="ts">
import { computed, ref } from 'vue'
import { useGameStore } from '@/stores/game'
import MagicLoader from '@/components/MagicLoader.vue'

const rustyKnightUrl = new URL('../assets/rusty-knight.png', import.meta.url).href
const chestClosedUrl = new URL('../assets/chest-closed.svg', import.meta.url).href
const chestOpenUrl = new URL('../assets/chest-open.svg', import.meta.url).href

const store = useGameStore()

const hoveredPlayerId = ref<string | null>(null)

function hpClass(hp: number, maxHp: number): string {
  if (!maxHp) return ''
  const ratio = hp / maxHp
  if (ratio >= 1) return 'hp-full'
  if (ratio >= 0.9) return 'hp-good'
  if (ratio >= 0.8) return 'hp-warn'
  return 'hp-crit'
}
const collapsedGroups = ref(new Set<string>())
const expandedPlayers = ref(new Set<string>())
const enemyCollapsed = ref(false)
const apFilter = ref(false)
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

/** `currentCmpgn` is "#N/A" between campaigns, so it needs validating against
 *  the real campaign rows rather than a bare nullish fallback. */
const selectedCampaignId = ref<string>(
  store.campaigns.some((c) => c.id === store.gameState?.currentCmpgn)
    ? store.gameState!.currentCmpgn
    : 'c6',
)

const activeCampaign = computed(
  () => store.campaigns.find((c) => c.id === selectedCampaignId.value) ?? null,
)

/** Campaigns visible in the selector: start date is today or in the past,
 *  plus a 1-week lookahead so the next campaign appears before it begins. */
const visibleCampaigns = computed(() => {
  const rawDate = store.gameState?.currentDate
  const today = rawDate ? new Date(rawDate) : new Date()
  const lookahead = new Date(today)
  lookahead.setUTCDate(lookahead.getUTCDate() + 7)
  return store.campaigns.filter((c) => c.start && new Date(c.start) <= lookahead)
})

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

const players = computed(() => {
  const c4 = selectedCampaignId.value === 'c4'
  const byPlayer = c4
    ? store.cmpgn4ByPlayer
    : selectedCampaignId.value === 'c6'
      ? store.cmpgn6ByPlayer
      : selectedCampaignId.value === 'c5'
        ? store.cmpgn5ByPlayer
        : selectedCampaignId.value === 'c3'
          ? store.cmpgn3ByPlayer
          : selectedCampaignId.value === 'c2'
            ? store.cmpgn2ByPlayer
            : store.cmpgn1ByPlayer
  return store.players
    .filter((p) => byPlayer.has(p.playerId))
    .map((p) => ({
      ...p,
      dgnProgress: c4
        ? (store.cmpgn4DgnProgressByPlayer.get(p.playerId) ?? 0)
        : byPlayer.get(p.playerId)!.dgnProgress,
    }))
    .sort((a, b) => {
      const ai = CLASS_ORDER.indexOf(a.class?.toLowerCase())
      const bi = CLASS_ORDER.indexOf(b.class?.toLowerCase())
      const aRank = ai === -1 ? CLASS_ORDER.length : ai
      const bRank = bi === -1 ? CLASS_ORDER.length : bi
      return aRank - bRank
    })
})

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

function rollAbility(dice: import('@/types/game').AbilityDice | undefined, sneakAttack = false) {
  if (dice) store.requestRoll(sneakAttack ? { ...dice, sneakAttack: true } : dice)
}

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

const activeChests = computed(() => {
  const visible = store.dungeonElements.filter(
    (e) => e.campaign === selectedCampaignId.value && e.visible,
  )
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

// Vertical stacking for the finished column, in vh so it tracks the floor height.
// Mirrors --floor-height and the .player-avatar height clamp.
const FLOOR_VH = 34
const AVATAR_VH = 8
const FINISHED_MAX_STEP_VH = 3.6

/** Players at (or past) the end of the track. Absolute `left: 100%` would place
 *  them outside the progress zone, where the floor's overflow clips them, so they
 *  stack against the inside of the right edge instead. Avatars stay full size and
 *  overlap vertically, tightening the step only as far as the floor requires. */
const finishedPlayers = computed(() => {
  const list = players.value.filter((p) => p.dgnProgress >= 100)
  const span = FLOOR_VH - AVATAR_VH - 2
  const step = list.length > 1 ? Math.min(FINISHED_MAX_STEP_VH, span / (list.length - 1)) : 0
  return list.map((p, i) => ({ ...p, topOffset: (i - (list.length - 1) / 2) * step }))
})

const playersPositioned = computed(() => {
  const groups = new Map<number, number>() // dgnProgress -> count so far
  return players.value
    .filter((p) => p.dgnProgress < 100)
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

const HYDRATION_REVEAL_DATE = '2026-04-05'

const enemyRevealed = computed(() => {
  const isHydration =
    activeCampaign.value?.name?.toLowerCase().includes('hydration') ||
    activeCampaign.value?.theme?.toLowerCase().includes('hydration')
  if (!isHydration) return true
  const rawDate = store.gameState?.currentDate
  const today = rawDate ? rawDate : new Date().toISOString().slice(0, 10)
  return today >= HYDRATION_REVEAL_DATE
})

const enemyLeftPercent = computed(() => {
  if (selectedCampaignId.value === 'c4') return 93
  const prog = Number(activeCampaign.value?.enemyProg ?? 0)
  return prog === 0 ? 2.5 : 5 + prog * 0.95
})

const enemyLeft = computed(() => `${enemyLeftPercent.value}%`)

// ---------------------------------------------------------------------------
// Campaign 6 — five fixed sections, one per previous boss.
//
// Unlike c1–c5 there is no horizontal track: `dgnProgress` does not move a
// player. Section membership comes from `cmpgn6.dgnType` and is fixed for the
// whole campaign, so avatars only ever scatter within their own band.
// ---------------------------------------------------------------------------
const isC6 = computed(() => selectedCampaignId.value === 'c6')

const hoveredSection = ref<string | null>(null)

/** FNV-1a over the playerId, normalised to [0,1). Seeds the scatter so avatars
 *  hold their positions across refreshes instead of jumping on every poll. */
function seed(key: string): number {
  let h = 2166136261
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return (h >>> 0) / 4294967296
}

// Avatars occupy the upper band of a section; the boss sits below them.
const SCATTER_TOP_PCT = 12
const SCATTER_BAND_PCT = 38
const SCATTER_JITTER = 0.55

/**
 * Sections left-to-right, each with its assigned players pre-positioned.
 * Players are laid on a coarse lattice sized to the section's headcount, then
 * nudged by their seeded offsets — even coverage, organic result.
 */
const c6SectionsWithPlayers = computed(() => {
  const sectionOfPlayer = store.cmpgn6SectionByPlayer
  return store.c6Sections.map((section, sectionIdx) => {
    const members = players.value.filter((p) => sectionOfPlayer.get(p.playerId) === section.id)
    const cols = Math.max(1, Math.ceil(Math.sqrt(members.length)))
    const rows = Math.max(1, Math.ceil(members.length / cols))
    const cellW = 100 / cols
    const cellH = SCATTER_BAND_PCT / rows

    const scattered = members.map((p, i) => {
      const col = i % cols
      const row = Math.floor(i / cols)
      const jx = (seed(p.playerId) - 0.5) * cellW * SCATTER_JITTER
      const jy = (seed(p.playerId + '#y') - 0.5) * cellH * SCATTER_JITTER
      return {
        ...p,
        leftPct: Math.min(92, Math.max(8, (col + 0.5) * cellW + jx)),
        topPct: SCATTER_TOP_PCT + (row + 0.5) * cellH + jy,
      }
    })

    return { ...section, tint: sectionIdx + 1, players: scattered }
  })
})

/** Section boss HP for the on-floor chip. `enemyHp` is blank until the first
 *  hit lands, so it falls back to an em dash rather than rendering "/150". */
function hpText(c: { enemyHp: string | number; enemyMaxHp: string | number }): string {
  const hp = c.enemyHp === '' || c.enemyHp === null ? '—' : c.enemyHp
  return c.enemyMaxHp === '' ? `${hp}` : `${hp}/${c.enemyMaxHp}`
}

const dangerZoneStyle = computed(() => {
  const dmgZone = Number(activeCampaign.value?.enemyDmgZone ?? 16.75)
  if (selectedCampaignId.value === 'c4') {
    return { left: `${enemyLeftPercent.value - dmgZone}%`, right: '0', width: 'auto', background: 'rgba(10, 55, 10, 0.52)' }
  }
  return { width: `${enemyLeftPercent.value + dmgZone}%` }
})
</script>

<template lang="pug">
.dungeon-component
  MagicLoader(v-if="store.loading")
  p.error(v-else-if="store.error") {{ store.error }}
  .content-layout(v-else)
    .main-row
      .side-panel
        .party-header
          span Choose Dungeon
        .dungeon-selector
          select(v-model="selectedCampaignId")
            option(v-for="c in visibleCampaigns" :key="c.id" :value="c.id") {{ c.name }}
        .enemy-section(v-if="activeCampaign && !isC6")
          .enemy-section-header(@click="enemyCollapsed = !enemyCollapsed")
            span.enemy-section-label ENEMY
            span.material-icons.collapse-icon {{ enemyCollapsed ? 'expand_more' : 'expand_less' }}
          .enemy-section-body(v-show="!enemyCollapsed")
            span.enemy-name {{ enemyRevealed ? activeCampaign.enemy : '???' }}
            .enemy-block
              img.enemy-section-img(v-if="enemyRevealed" :src="enemySrc(activeCampaign.enemyImg)" :alt="activeCampaign.enemy")
              .enemy-stats
                .en-row
                  span.en-label HP
                  span.en-value {{ activeCampaign.enemyHp }}/{{ activeCampaign.enemyMaxHp }}
                .en-row
                  span.en-label DMG
                  span.en-value {{ activeCampaign.enemyDmg }}
                .en-row
                  span.en-label DMG Zone
                  span.en-value {{ activeCampaign.enemyDmgZone }}%
                .en-row
                  span.en-label Speed
                  span.en-value {{ activeCampaign.enemySpeed }}% per week
        .party-header
          | PARTY
          .party-tabs
            button.party-tab(:class="{ active: rosterTab === 'roster' }" @click="rosterTab = 'roster'") Roster
            button.party-tab(:class="{ active: rosterTab === 'initiative' }" @click="rosterTab = 'initiative'") Initiative
          button.ap-filter-btn(@click="apFilter = !apFilter" :class="{ active: apFilter }")
            span.material-icons campaign
        .player-roster
          .initiative-list(v-if="rosterTab === 'initiative'")
            table.roster-table
              tbody
                template(v-for="p in initiativeList" :key="p.playerId")
                  tr(:class="['class-' + p.class?.toLowerCase(), { 'is-expanded': expandedPlayers.has(p.playerId) }]" @mouseenter="hoveredPlayerId = p.playerId" @mouseleave="hoveredPlayerId = null" @click="toggleExpanded(p.playerId)" style="cursor:pointer")
                    td.avatar-cell
                      img.avatar(:src="avatarSrc(p.img)" :alt="p.charName")
                    td.col-name(:title="p.realName")
                      span.char-name(:data-tooltip="p.charName.length > 20 ? p.charName : undefined") {{ truncate(p.charName) }}
                    td.col-hp(:class="hpClass(p.hp, p.maxHp)") {{ p.hp }}/{{ p.maxHp }}
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
                      td.col-hp(:class="hpClass(p.hp, p.maxHp)") {{ p.hp }}/{{ p.maxHp }}
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
        .dungeon-floor.sectioned(v-if="isC6")
          .dgn-section(
            v-for="section in c6SectionsWithPlayers"
            :key="section.id"
            :class="[`tint-${section.tint}`, { 'is-dimmed': hoveredSection !== null && hoveredSection !== section.id }]"
            @mouseenter="hoveredSection = section.id"
            @mouseleave="hoveredSection = null"
          )
            .section-label {{ section.campaign.theme }}
            .section-players
              .player-token(
                v-for="p in section.players"
                :key="p.playerId"
                :style="{ left: p.leftPct + '%', top: p.topPct + '%' }"
                :class="{ 'is-highlighted': hoveredPlayerId === p.playerId, 'is-dimmed': hoveredPlayerId !== null && hoveredPlayerId !== p.playerId }"
                :title="p.charName"
              )
                img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
            .section-boss-block
              img.section-boss(
                v-if="section.campaign.enemyImg"
                :src="enemySrc(section.campaign.enemyImg)"
                :alt="section.campaign.enemy"
              )
              .section-hp(:title="section.campaign.enemy")
                span.section-hp-label HP
                span.section-hp-value {{ hpText(section.campaign) }}
        .dungeon-floor(v-else :class="{ ocean: selectedCampaignId === 'c3', forest: selectedCampaignId === 'c4' }")
          .danger-zone(:style="dangerZoneStyle")
          .enemy-buffer
          img.enemy-img(v-if="activeCampaign && enemyRevealed" :src="enemySrc(activeCampaign.enemyImg)" :alt="activeCampaign.enemy" :style="{ left: enemyLeft, top: selectedCampaignId === 'c4' ? '50%' : '75%' }")
          .player-progress-zone
            .hover-radius(v-if="hoveredDgnProgress !== null" :style="{ left: hoveredDgnProgress + '%' }")
            .chest-token(v-for="chest in activeChests" :key="chest.id" :style="chest.item === 'exit' ? { left: chest.location + '%', bottom: '0' } : { left: chest.location + '%', bottom: chest.bottomOffset + 'rem' }" :class="{ 'is-looted': chest.looted, 'is-legendary': chest.item === 'legendaryChest', 'is-exit': chest.item === 'exit' }" @mouseenter="hoveredChestId = chest.id" @mouseleave="hoveredChestId = null")
              .exit-circle(v-if="chest.item === 'exit'")
              img.chest-img(v-else :src="chestSrc(chest.looted)" :alt="chest.item")
              .chest-tooltip(v-if="hoveredChestId === chest.id && chest.itemsRevealed" :class="chest.location < 50 ? 'tooltip-right' : 'tooltip-left'")
                span.chest-tooltip-item(v-for="name in chestItemNames(chest)" :key="name") {{ name }}
            .player-token(v-for="p in playersPositioned" :key="p.playerId" :style="{ left: p.dgnProgress + '%', top: `calc(50% + ${p.topOffset}rem)` }" :class="{ 'is-highlighted': hoveredPlayerId === p.playerId, 'is-dimmed': hoveredPlayerId !== null && hoveredPlayerId !== p.playerId }")
              img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
            .finished-token(v-for="p in finishedPlayers" :key="p.playerId" :style="{ top: `calc(50% + ${p.topOffset}vh)` }" :class="{ 'is-highlighted': hoveredPlayerId === p.playerId, 'is-dimmed': hoveredPlayerId !== null && hoveredPlayerId !== p.playerId }" :title="p.charName")
              img.player-avatar(:src="avatarSrc(p.img)" :alt="p.charName")
        .class-area
          .universal-bar
            span.universal-action
              span.universal-action-name Search Nearby Chest
              span.universal-action-detail  Standard — roll d6 · Legendary — roll d20
              span.universal-action-name Use Item
              span.universal-action-detail  See item for cost
            span.universal-action
              span.universal-action-name Basic Attack
              span.universal-action-detail  Deal 1 damage to enemy - (must describe)
          .class-info-row
            .class-card(v-for="c in classCards" :key="c.class" :class="`class-${c.class.toLowerCase()}`")
              .card-header {{ c.class }}
              .card-body
                .ability
                  .ability-header
                    span.ability-name(:class="{ 'ability-name--rollable': c.ability1Dice }" @click="rollAbility(c.ability1Dice)") {{ c.ability1Name }}
                    span.ability-cost(v-if="c.ability1Cost > 1") {{ c.ability1Cost }} AP
                  p.ability-desc {{ c.ability1Desc }}
                .ability
                  .ability-header
                    span.ability-name(:class="{ 'ability-name--rollable': c.ability2Dice }" @click="rollAbility(c.ability2Dice, c.class.toLowerCase() === 'rogue' && store.sneakAttack)") {{ c.ability2Name }}
                    span.ability-cost(v-if="c.ability2Cost > 1") {{ c.ability2Cost }} AP
                    label.toggle-dial(v-if="c.class.toLowerCase() === 'rogue' && c.ability2Name?.toLowerCase().includes('sneak attack')" title="toggle sneak attack")
                      input(type="checkbox" v-model="store.sneakAttack")
                      span.toggle-track
                        span.toggle-knob
                  p.ability-desc {{ c.ability2Desc }}
                .ability(v-if="c.ability3Name")
                  .ability-header
                    span.ability-name(:class="{ 'ability-name--rollable': c.ability3Dice }" @click="rollAbility(c.ability3Dice)") {{ c.ability3Name }}
                    span.ability-cost(v-if="c.ability3Cost && c.ability3Cost > 1") {{ c.ability3Cost }} AP
                  p.ability-desc {{ c.ability3Desc }}
        span.universal-ap-note All Actions 1 AP (unless noted otherwise)

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
  padding: 0.1rem 0.5rem 0.1rem 0.75rem;
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
  font-weight: 600;

  &.hp-full {
    color: var(--theme-col-med-green);
  }
  &.hp-good {
    color: var(--theme-col-dark-yellow);
  }
  &.hp-warn {
    color: var(--theme-col-red);
  }
  &.hp-crit {
    color: var(--theme-col-dark-red);
  }
}

.dungeon-floor {
  --floor-height: 34vh;
  flex: none;
  min-width: 0;
  border-radius: 20px;
  overflow-x: hidden;
  overflow-y: visible;
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

  &.ocean::before {
    background-image: url('../assets/waves.svg');
    background-color: #1a4a7a;
    background-blend-mode: multiply;
    background-size: 15% auto;
    opacity: 0.85;
  }

  &.forest::before {
    background-image: url('../assets/stone-floor.svg');
    background-color: #2a5c1a;
    background-blend-mode: multiply;
    background-size: 20% auto;
    opacity: 0.75;
  }
}

// ---------------------------------------------------------------------------
// Campaign 6 — five tinted bands over the shared stone texture. Each band owns
// its boss and its players; no shared horizontal track.
// ---------------------------------------------------------------------------
.dungeon-floor.sectioned {
  display: flex;
  align-items: stretch;
  overflow: hidden;

  .dgn-section {
    position: relative;
    flex: 1 1 0;
    min-width: 0;
    transition: opacity 0.2s ease;

    &::before {
      content: '';
      position: absolute;
      inset: 0;
      background: var(--section-tint);
      mix-blend-mode: multiply;
      pointer-events: none;
    }

    & + .dgn-section {
      border-left: 1px solid rgba(0, 0, 0, 0.35);
    }

    &.is-dimmed {
      opacity: 0.45;
    }

    // Castle, cave, ocean, jungle, volcano.
    &.tint-1 {
      --section-tint: rgba(96, 92, 130, 0.55);
    }
    &.tint-2 {
      --section-tint: rgba(122, 86, 48, 0.55);
    }
    &.tint-3 {
      --section-tint: rgba(26, 74, 122, 0.6);
    }
    &.tint-4 {
      --section-tint: rgba(42, 92, 26, 0.6);
    }
    &.tint-5 {
      --section-tint: rgba(150, 52, 24, 0.55);
    }
  }

  .section-label {
    position: absolute;
    top: 0.35rem;
    left: 0;
    right: 0;
    text-align: center;
    font-family: 'Space Grotesk', sans-serif;
    font-size: 0.62rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: rgba(255, 255, 255, 0.75);
    text-shadow: 0 1px 2px rgba(0, 0, 0, 0.6);
    pointer-events: none;
    z-index: 6;
  }

  // Inset by roughly half an avatar so a token centred at 0% or 100% still
  // lands inside its own band rather than bleeding into the neighbouring one.
  .section-players {
    position: absolute;
    top: 0;
    bottom: 0;
    left: clamp(0.9rem, 3vh, 2rem);
    right: clamp(0.9rem, 3vh, 2rem);
    z-index: 5;
  }

  // The shared .player-token only translates on Y, which would anchor the
  // avatar's left edge to left%. Sections need it centred.
  .player-token {
    transform: translate(-50%, -50%);

    &.is-highlighted {
      transform: translate(-50%, -50%) scale(1.25);
    }
  }

  // Boss and its HP chip sit together at the foot of the band.
  // Boss + chip are centred as one unit, so a wide boss would otherwise shove
  // the chip past the band edge. Cap the pair and let the art shrink instead.
  .section-boss-block {
    position: absolute;
    bottom: 0;
    left: 50%;
    transform: translateX(-50%);
    max-width: 100%;
    display: flex;
    align-items: flex-end;
    gap: 0.3rem;
    pointer-events: none;
    z-index: 2;
  }

  .section-boss {
    height: clamp(3rem, 13vh, 7rem);
    width: auto;
    min-width: 0;
    flex: 0 1 auto;
    object-fit: contain;
  }

  .section-hp {
    flex: 0 0 auto;
    display: flex;
    flex-direction: column;
    align-items: center;
    line-height: 1.1;
    margin-bottom: 0.4rem;
    padding: 0.15rem 0.3rem;
    border-radius: 4px;
    background: rgba(0, 0, 0, 0.45);
    font-family: 'Space Grotesk', sans-serif;
    white-space: nowrap;
  }

  .section-hp-label {
    font-size: 0.5rem;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: rgba(255, 255, 255, 0.6);
  }

  .section-hp-value {
    font-size: 0.62rem;
    font-weight: 700;
    color: #fff;
  }
}

.danger-zone {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
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

  &:hover {
    z-index: 100;
  }

  &.is-legendary .chest-img {
    filter: drop-shadow(0 0 5px rgba(255, 200, 50, 0.9));
  }

  &.is-looted {
    opacity: 0.5;
  }
}

.exit-circle {
  width: clamp(2rem, 6vh, 4rem);
  height: clamp(0.6rem, 1.8vh, 1.2rem);
  border-radius: 50%;
  background: #000;
}

.chest-img {
  display: block;
  height: clamp(1.25rem, 4vh, 2.5rem);
  width: auto;
  object-fit: contain;
}

.chest-tooltip {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  z-index: 200;
  background: var(--theme-col-parchment-light);
  border: 1px solid rgba(0, 0, 0, 0.15);
  border-radius: 6px;
  padding: 0.3rem 0.5rem;
  white-space: nowrap;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  pointer-events: none;

  &.tooltip-right {
    left: calc(100% + 0.5rem);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      right: 100%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-right-color: var(--theme-col-parchment-light);
    }
  }

  &.tooltip-left {
    right: calc(100% + 0.5rem);

    &::after {
      content: '';
      position: absolute;
      top: 50%;
      left: 100%;
      transform: translateY(-50%);
      border: 5px solid transparent;
      border-left-color: var(--theme-col-parchment-light);
    }
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

// Players at 100%+ — stacked against the inside of the right edge at full avatar
// size, overlapping vertically (topOffset is computed in vh to fit the floor).
.finished-token {
  position: absolute;
  right: 0.35rem;
  transform: translateY(-50%);
  z-index: 6;
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

.enemy-buffer {
  position: relative;
  width: 5%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.enemy-img {
  position: absolute;
  top: 75%;
  transform: translateX(-50%) translateY(-50%);
  width: 100px;
  height: auto;
  z-index: 10;
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
  font-size: 0.7rem;
  flex-shrink: 0;
}

.universal-action-name {
  font-weight: 600;
  color: var(--theme-col-blurple);
}

.universal-action-detail {
  color: var(--theme-col-brown-light);
  font-size: 0.7rem;
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

  &--rollable {
    cursor: pointer;
    text-decoration: underline dotted;
    text-underline-offset: 2px;

    &:hover {
      opacity: 0.75;
    }
  }
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
  font-size: 0.7rem;
  color: var(--theme-col-brown-light);
  line-height: 1.3;
}

.toggle-dial {
  display: flex;
  align-items: center;
  cursor: pointer;
  margin-left: auto;

  input {
    display: none;
  }
}

.toggle-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 2.2rem;
  height: 1.1rem;
  border-radius: 999px;
  background: rgba(0, 0, 0, 0.15);
  border: 1.5px solid rgba(0, 0, 0, 0.2);
  transition:
    background 0.2s ease,
    border-color 0.2s ease;

  .toggle-dial input:checked ~ & {
    background: var(--theme-col-blurple);
    border-color: var(--theme-col-blurple);
  }
}

.toggle-knob {
  position: absolute;
  left: 0.15rem;
  width: 0.8rem;
  height: 0.8rem;
  border-radius: 50%;
  background: white;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;

  .toggle-dial input:checked ~ .toggle-track & {
    transform: translateX(1rem);
  }
}

.dungeon-selector {
  padding: 0.6rem 0.75rem 0.9rem;
  background-color: var(--theme-col-parchment-light);
  border-radius: 0 0 14px 14px;
  margin-bottom: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.dungeon-selector-label {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1rem;
  font-weight: 700;
  color: var(--theme-col-lightest-blurple);
  letter-spacing: 0.04em;
  text-transform: lowercase;
}

.dungeon-selector select {
  width: 100%;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.85rem;
  font-weight: 600;
  padding: 0.35rem 0.6rem;
  border-radius: 8px;
  border: 2px solid var(--theme-col-parchment-dark);
  background-color: var(--theme-col-parchment);
  color: var(--theme-col-brown);
  cursor: pointer;
  appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='8' viewBox='0 0 12 8'%3E%3Cpath d='M1 1l5 5 5-5' stroke='%23815f5f' stroke-width='1.8' fill='none' stroke-linecap='round'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.6rem center;
  padding-right: 2rem;

  &:focus {
    outline: none;
    border-color: var(--theme-col-med-blurple);
  }
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
  padding: 0rem 0.5rem;
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
  gap: 0.75rem;
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
  flex-shrink: 0;
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
