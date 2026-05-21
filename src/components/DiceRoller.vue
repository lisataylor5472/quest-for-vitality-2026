<script setup lang="ts">
import { ref, computed, watch, onMounted, onUnmounted } from 'vue'
import { useGameStore } from '@/stores/game'

const store = useGameStore()

const DICE = [4, 6, 8, 10, 12, 20]
const MAX_QTY = 10

const SORCERER_TIERS = [
  { min: 1, max: 8, damage: 5, label: '1–8' },
  { min: 9, max: 16, damage: 15, label: '9–16' },
  { min: 17, max: 20, damage: 20, label: '17–20' },
]

const pickerOpen = ref(false)
const modalOpen = ref(false)
const selectedDie = ref(20)
const qty = ref(1)
const floorVal = ref(5)
const huntersMark = ref(0)
const applySneakAttack = ref(false)

const displayNumber = ref<number | null>(null)
const displayNumbers = ref<number[]>([])
const finalTotal = ref<number | null>(null)
const individualRolls = ref<number[]>([])
const isFloored = ref(false)
const rolling = ref(false)
const isTiered = ref(false)
const tierDamage = ref<number | null>(null)

const activeTier = computed(() => {
  if (!isTiered.value || displayNumber.value === null) return null
  return (
    SORCERER_TIERS.find((t) => displayNumber.value! >= t.min && displayNumber.value! <= t.max) ??
    null
  )
})

const wrapperEl = ref<HTMLElement | null>(null)

const coinModalOpen = ref(false)
const coinFlipping = ref(false)
const coinResult = ref<'yes' | 'no' | null>(null)

function flipCoin() {
  coinModalOpen.value = true
  coinFlipping.value = true
  coinResult.value = null
  setTimeout(() => {
    coinResult.value = Math.random() < 0.5 ? 'yes' : 'no'
    coinFlipping.value = false
  }, 1000)
}

function closeCoinModal() {
  coinModalOpen.value = false
}

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function changeQty(delta: number) {
  qty.value = Math.max(1, Math.min(MAX_QTY, qty.value + delta))
}

function changeFloor(delta: number) {
  floorVal.value = Math.max(0, floorVal.value + delta)
}

function changeHuntersMark(delta: number) {
  huntersMark.value = Math.max(0, huntersMark.value + delta)
}

function roll(sides: number) {
  selectedDie.value = sides
  pickerOpen.value = false
  modalOpen.value = true
  rolling.value = true
  displayNumber.value = null
  displayNumbers.value = Array.from(
    { length: qty.value },
    () => Math.floor(Math.random() * sides) + 1,
  )
  finalTotal.value = null
  individualRolls.value = []
  isFloored.value = false
  if (!isTiered.value) tierDamage.value = null

  const start = Date.now()
  const duration = isTiered.value ? 2000 : 900
  const maxTotal = qty.value * sides

  const interval = setInterval(() => {
    if (qty.value > 1) {
      displayNumbers.value = Array.from(
        { length: qty.value },
        () => Math.floor(Math.random() * sides) + 1,
      )
    } else {
      displayNumber.value = Math.floor(Math.random() * maxTotal) + qty.value
    }
    if (Date.now() - start >= duration) {
      clearInterval(interval)
      const rolls = Array.from({ length: qty.value }, () => Math.floor(Math.random() * sides) + 1)
      const rawTotal = rolls.reduce((a, b) => a + b, 0)
      individualRolls.value = rolls
      displayNumbers.value = rolls
      displayNumber.value = rawTotal
      if (isTiered.value) {
        const tier = SORCERER_TIERS.find((t) => rawTotal >= t.min && rawTotal <= t.max)
        tierDamage.value = tier?.damage ?? null
        isFloored.value = floorVal.value > 0
        if (tierDamage.value !== null) {
          finalTotal.value = tierDamage.value + floorVal.value + huntersMark.value * 3
        }
      } else {
        isFloored.value = floorVal.value > 0
        finalTotal.value =
          rawTotal + floorVal.value + huntersMark.value * 3 + (applySneakAttack.value ? 5 : 0)
      }
      rolling.value = false
    }
  }, 60)
}

type AdderPart = { num: string; label: string; type: 'base' | 'hunters-mark' | 'sneak-attack' }

const adderParts = computed((): AdderPart[] => {
  const parts: AdderPart[] = []
  if (isFloored.value) parts.push({ num: String(floorVal.value), label: 'base', type: 'base' })
  if (huntersMark.value > 0)
    parts.push({ num: String(huntersMark.value * 3), label: "hunter's mark", type: 'hunters-mark' })
  if (applySneakAttack.value) parts.push({ num: '5', label: 'sneak attack', type: 'sneak-attack' })
  return parts
})

const showTotal = computed(
  () => finalTotal.value !== null && (adderParts.value.length > 0 || qty.value > 1),
)

function closeModal() {
  modalOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (wrapperEl.value && !wrapperEl.value.contains(e.target as Node)) {
    pickerOpen.value = false
  }
}

watch(
  () => store.pendingRoll,
  (dice) => {
    if (!dice) return
    qty.value = dice.qty
    floorVal.value = dice.floor
    isTiered.value = !!dice.tiered
    applySneakAttack.value = !!dice.sneakAttack
    tierDamage.value = null
    store.clearPendingRoll()
    roll(dice.sides)
  },
)

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template lang="pug">
.dice-roller-wrapper(ref="wrapperEl")
  .dice-pills
    button.dice-btn(@click="togglePicker") roll di
    button.coin-btn(@click="flipCoin") coinflip!
    .pill-segment.hm-segment
      span.seg-label mark
      .seg-stepper
        button(@click="changeHuntersMark(-1)" :disabled="huntersMark <= 0") −
        span {{ huntersMark || 'off' }}
        button(@click="changeHuntersMark(1)") +
  .dice-picker(v-if="pickerOpen")
    .picker-row
      span qty
      .stepper
        button(@click="changeQty(-1)" :disabled="qty <= 1") −
        span {{ qty }}
        button(@click="changeQty(1)" :disabled="qty >= 10") +
    .picker-row
      span base
      .stepper
        button(@click="changeFloor(-1)" :disabled="floorVal <= 0") −
        span {{ floorVal || 'off' }}
        button(@click="changeFloor(1)") +
    .dice-grid
      button(v-for="sides in DICE" :key="sides" @click="roll(sides)") d{{ sides }}

Teleport(to="body")
  .coin-modal-backdrop(v-if="coinModalOpen" @click.self="closeCoinModal")
    .coin-modal
      .coin-label flip a coin
      .coin-display(v-if="coinFlipping")
        .coin-inner.flipping
      .coin-answer(v-if="!coinFlipping && coinResult" :class="coinResult") {{ coinResult === 'yes' ? 'yes!' : 'no.' }}
      button.close-btn(@click="closeCoinModal") ×

Teleport(to="body")
  .dice-modal-backdrop(v-if="modalOpen" @click.self="closeModal")
    .dice-modal
      .die-label {{ qty > 1 ? `${qty}d${selectedDie}` : `d${selectedDie}` }}
      .die-chips-row(v-if="qty > 1")
        span.die-chip(v-for="(n, i) in displayNumbers" :key="i" :class="{ rolling }") {{ n }}
      .die-result(v-else :class="{ rolling }")
        span {{ displayNumber ?? '?' }}
      .wild-surge(v-if="isTiered && rolling")
        span wild surge!
        span wild surge!
        span wild surge!
      .tier-ladder(v-if="isTiered && !rolling")
        .tier-row(
          v-for="tier in SORCERER_TIERS"
          :key="tier.label"
          :class="{ 'tier-row--active': activeTier?.damage === tier.damage }"
        )
          span.tier-range {{ tier.label }}
          span.tier-sep →
          span.tier-dmg {{ tier.damage }}
          span.tier-dmg-label dmg
      .die-adders(v-if="!rolling && adderParts.length")
        .adder-row(v-for="part in adderParts" :key="part.type" :class="`adder-row--${part.type}`")
          span.adder-sign +
          span.adder-num {{ part.num }}
          span.adder-label {{ part.label }}
      .die-divider(v-if="!rolling && !isTiered && showTotal")
      .die-total(v-if="!rolling && !isTiered && showTotal") = {{ finalTotal }}
      .die-divider.die-divider--pink(v-if="isTiered && !rolling && tierDamage !== null")
      .tier-damage(v-if="isTiered && !rolling && tierDamage !== null") {{ finalTotal }}
      button.close-btn(@click="closeModal") ×
</template>

<style lang="scss" scoped>
.dice-roller-wrapper {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  height: 2.2rem;
  margin-right: 10rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dice-pills {
  display: flex;
  height: 100%;
}

.pill-segment {
  border: 2px solid var(--theme-col-blurple);
  border-left: none;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  display: flex;
  flex-direction: row;
  align-items: center;
  justify-content: center;
  gap: 0.45rem;
  padding: 0 0.8rem;
  height: 100%;

  &.hm-segment {
    border-radius: 0 37px 37px 0;
    padding-right: 1rem;
    box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);
  }
}

.seg-label {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.05rem;
  color: var(--theme-col-blurple);
  white-space: nowrap;
  padding-bottom: 2px;
}

.seg-stepper {
  display: flex;
  align-items: center;
  gap: 0.1rem;

  span {
    min-width: 1.8ch;
    text-align: center;
    color: var(--theme-col-dark-blurple);
    font-family: 'Grenze Gotisch', serif;
    font-size: 1rem;
    padding-bottom: 2px;
  }

  button {
    width: 1.1rem;
    height: 1.1rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    background: transparent;
    color: var(--theme-col-blurple);
    border: none;
    font-family: 'Grenze Gotisch', serif;
    font-size: 1rem;
    line-height: 1;
    cursor: pointer;
    opacity: 0.6;
    transition: opacity 0.1s ease;

    &:hover:not(:disabled) {
      opacity: 1;
    }

    &:disabled {
      opacity: 0.2;
      cursor: default;
    }
  }
}

.dice-btn {
  border: 2px solid var(--theme-col-blurple);
  border-radius: 37px 0 0 37px;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.1rem;
  padding: 0 1rem;
  padding-bottom: 3px;
  height: 100%;
  min-width: 100px;
  cursor: pointer;
  box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);
  transition:
    background 0.15s ease,
    transform 0.1s ease;

  &:hover {
    background: var(--theme-col-lightest-blurple);
  }
}

.dice-picker {
  position: absolute;
  top: calc(100% + 8px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--theme-col-dark-blurple);
  border: 2px solid var(--theme-col-blurple);
  border-radius: 12px;
  padding: 0.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  z-index: 100;
  white-space: nowrap;

  button {
    background: #d0d6ff;
    color: var(--theme-col-dark-blurple);
    border: 1px solid var(--theme-col-blurple);
    border-radius: 8px;
    font-family: 'Grenze Gotisch', serif;
    font-size: 1.2rem;
    padding: 0.2rem 0.5rem 0.35rem;
    cursor: pointer;
    transition: background 0.1s ease;

    &:hover:not(:disabled) {
      background: var(--theme-col-lightest-blurple);
    }

    &:disabled {
      opacity: 0.4;
      cursor: default;
    }
  }
}

.picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  color: var(--theme-col-light-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1rem;
}

.stepper {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 1rem;

  span {
    min-width: 2.5ch;
    text-align: center;
    color: var(--theme-col-parchment-light);
    font-family: 'Grenze Gotisch', serif;
    font-size: 1rem;
  }

  button {
    width: 1.6rem;
    height: 1.6rem;
    padding: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 6px;
    font-size: 1rem;
  }
}

.dice-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.4rem;
}

.dice-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8, 6, 20, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.dice-modal {
  position: relative;
  background: #0a0c16;
  border: 2px solid var(--theme-col-green);
  border-radius: 6px;
  padding: 2rem 2.5rem 2.5rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: 300px;
  min-height: 220px;
  box-shadow:
    0 0 24px rgba(41, 243, 110, 0.1),
    inset 0 0 40px rgba(0, 0, 0, 0.5);
}

.die-label {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.7rem;
  color: var(--theme-col-med-green);
  letter-spacing: 0.2em;
  // text-transform: uppercase;
  opacity: 0.7;
  align-self: flex-start;
}

.die-chips-row {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
  padding: 0.25rem 0;
}

.die-chip {
  font-family: 'Orbitron', sans-serif;
  font-size: 1.6rem;
  line-height: 1;
  background: #141826;
  color: var(--theme-col-green);
  border: 1.5px solid var(--theme-col-dark-green);
  border-radius: 4px;
  width: 2.6rem;
  height: 2.6rem;
  display: flex;
  align-items: center;
  justify-content: center;

  &.rolling {
    animation: number-flicker 0.06s linear infinite;
  }
}

.die-result {
  font-family: 'Orbitron', sans-serif;
  font-size: 6rem;
  line-height: 1;
  color: var(--theme-col-green);
  text-shadow: 0 0 24px rgba(41, 243, 110, 0.45);
  min-width: 3ch;
  text-align: center;

  &.rolling span {
    animation: number-flicker 0.06s linear infinite;
  }
}

.die-adders {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  width: 100%;
  margin-top: 0.25rem;
}

.adder-row {
  display: grid;
  grid-template-columns: 1.2rem 2.4rem 1fr;
  align-items: baseline;
  font-family: 'Orbitron', sans-serif;

  &--base {
    .adder-num {
      color: var(--theme-col-light-blurple);
    }
  }
  &--hunters-mark {
    .adder-num {
      color: var(--theme-col-dark-yellow);
    }
  }
  &--sneak-attack {
    .adder-num {
      color: var(--theme-col-red);
    }
  }
}

.adder-sign {
  font-size: 1.4rem;
  color: rgba(255, 255, 255, 0.25);
  text-align: center;
}

.adder-num {
  font-size: 1.7rem;
  text-align: right;
  padding-right: 0.5rem;
}

.adder-label {
  font-size: 1.3rem;
  color: rgba(255, 255, 255, 0.35);
  letter-spacing: 0.05em;
}

.die-divider {
  width: 100%;
  border: none;
  border-top: 1px dashed rgba(41, 243, 110, 0.25);
  margin: 0.1rem 0;

  &--pink {
    border-top-color: rgba(255, 77, 184, 0.3);
  }
}

.die-total {
  font-family: 'Orbitron', sans-serif;
  font-size: 3.5rem;
  color: var(--theme-col-green);
  line-height: 1;
  text-shadow: 0 0 16px rgba(41, 243, 110, 0.4);
  align-self: flex-end;
  padding-right: 0.1rem;
}

.tier-ladder {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  width: 100%;
  margin-top: 0.4rem;
}

.tier-row {
  display: grid;
  grid-template-columns: 3rem 1.4rem 2rem 2.2rem;
  align-items: baseline;
  font-family: 'Orbitron', sans-serif;
  font-size: 0.95rem;
  color: rgba(255, 255, 255, 0.22);
  padding: 0.18rem 0.4rem;
  border-radius: 4px;
  transition: color 0.15s ease;

  &--active {
    color: #ff4db8;
    text-shadow: 0 0 10px rgba(255, 77, 184, 0.5);
    background: rgba(255, 77, 184, 0.07);
  }
}

.tier-range {
  text-align: right;
}

.tier-sep {
  text-align: center;
  opacity: 0.5;
}

.tier-dmg {
  text-align: right;
  font-size: 1.1rem;
}

.tier-dmg-label {
  padding-left: 0.3rem;
  font-size: 0.75rem;
  opacity: 0.6;
}

.tier-damage {
  font-family: 'Orbitron', sans-serif;
  font-size: 3.5rem;
  color: #ff4db8;
  line-height: 1;
  text-shadow: 0 0 20px rgba(255, 77, 184, 0.55);
  align-self: flex-end;
  padding-right: 0.1rem;
  margin-top: 0.2rem;
}

.close-btn {
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  width: 2rem;
  height: 2rem;
  border: none;
  background: transparent;
  color: var(--theme-col-blurple);
  font-size: 1.6rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.5;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition:
    opacity 0.15s ease,
    background 0.15s ease;

  .dice-modal & {
    color: var(--theme-col-green);
  }

  &:hover {
    opacity: 1;
    background: rgba(100, 80, 200, 0.1);
  }
}

.coin-btn {
  border: 2px solid var(--theme-col-blurple);
  border-radius: 0;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.1rem;
  padding: 0 1rem;
  padding-bottom: 3px;
  height: 100%;
  cursor: pointer;
  box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);
  transition: background 0.15s ease;

  &:hover {
    background: var(--theme-col-lightest-blurple);
  }
}

.coin-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 16, 50, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.coin-modal {
  position: relative;
  background: var(--theme-col-lightest-blurple);
  border: 3px solid var(--theme-col-dark-blurple);
  border-radius: 16px;
  padding: 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  width: 280px;
  min-height: 260px;
}

.coin-label {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.4rem;
  color: var(--theme-col-dark-blurple);
  opacity: 0.7;
  letter-spacing: 0.05em;
}

.coin-display {
  perspective: 400px;
  width: 120px;
  height: 120px;
}

.coin-inner {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #f5e27a, #c9a227);
  border: 3px solid #a07d18;

  &.flipping {
    animation: coin-flip 1s ease-in-out forwards;
  }
}

.coin-answer {
  font-family: 'Grenze Gotisch', serif;
  font-size: 5rem;
  line-height: 1;
  text-align: center;
  animation: answer-pop 0.35s ease-out forwards;

  &.yes {
    color: #2d7a2d;
  }

  &.no {
    color: var(--theme-col-blurple);
  }
}

@keyframes coin-flip {
  0% {
    transform: scaleX(1) translateY(0);
  }
  10% {
    transform: scaleX(0) translateY(-8px);
  }
  20% {
    transform: scaleX(1) translateY(-14px);
  }
  30% {
    transform: scaleX(0) translateY(-18px);
  }
  40% {
    transform: scaleX(1) translateY(-20px);
  }
  50% {
    transform: scaleX(0) translateY(-18px);
  }
  60% {
    transform: scaleX(1) translateY(-12px);
  }
  70% {
    transform: scaleX(0) translateY(-6px);
  }
  80% {
    transform: scaleX(1) translateY(-2px);
  }
  90% {
    transform: scaleX(0.3) translateY(0);
  }
  100% {
    transform: scaleX(1) translateY(0);
  }
}

@keyframes answer-pop {
  0% {
    opacity: 0;
    transform: scale(0.7);
  }
  60% {
    transform: scale(1.1);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.wild-surge {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.2rem;
  margin: 0.5rem 0 0.25rem;

  span {
    font-family: 'Orbitron', sans-serif;
    font-size: 1.05rem;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: #ff4db8;
    text-shadow:
      0 0 18px rgba(255, 77, 184, 0.9),
      0 0 36px rgba(255, 77, 184, 0.4);
    opacity: 0;
    animation: wild-surge-pop 1.2s ease-in-out infinite;

    &:nth-child(1) {
      animation-delay: 0s;
    }
    &:nth-child(2) {
      animation-delay: 0.4s;
    }
    &:nth-child(3) {
      animation-delay: 0.8s;
    }
  }
}

@keyframes wild-surge-pop {
  0% {
    opacity: 0;
    transform: scaleX(0.85);
  }
  12% {
    opacity: 1;
    transform: scaleX(1.04);
  }
  28% {
    opacity: 1;
    transform: scaleX(1);
  }
  42% {
    opacity: 0;
  }
  100% {
    opacity: 0;
  }
}

@keyframes number-flicker {
  0% {
    opacity: 1;
    transform: scale(1.05);
  }
  50% {
    opacity: 0.6;
    transform: scale(0.95);
  }
  100% {
    opacity: 1;
    transform: scale(1.05);
  }
}
</style>
