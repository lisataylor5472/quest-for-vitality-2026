<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const DICE = [4, 6, 8, 10, 12, 20]
const MAX_QTY = 10

const pickerOpen = ref(false)
const modalOpen = ref(false)
const selectedDie = ref(20)
const qty = ref(1)
const floorVal = ref(5)
const huntersMark = ref(0)
const sneakAttack = ref(false)

const displayNumber = ref<number | null>(null)
const displayNumbers = ref<number[]>([])
const finalTotal = ref<number | null>(null)
const individualRolls = ref<number[]>([])
const isFloored = ref(false)
const rolling = ref(false)

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

  const start = Date.now()
  const duration = 900
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
      isFloored.value = floorVal.value > 0
      displayNumber.value = rawTotal
      finalTotal.value =
        rawTotal + floorVal.value + huntersMark.value * 3 + (sneakAttack.value ? 5 : 0)
      rolling.value = false
    }
  }, 60)
}

type BreakdownPart = { value: string; type: 'die' | 'base' | 'hunters-mark' | 'sneak-attack' }

const breakdownParts = computed((): BreakdownPart[] => {
  if (!individualRolls.value.length) return []
  const parts: BreakdownPart[] = individualRolls.value.map((r) => ({
    value: String(r),
    type: 'die',
  }))
  return parts
})

const adderParts = computed((): BreakdownPart[] => {
  const parts: BreakdownPart[] = []
  if (isFloored.value) parts.push({ value: `${floorVal.value} base`, type: 'base' })
  if (huntersMark.value > 0)
    parts.push({ value: `${huntersMark.value * 3} hunter's mark`, type: 'hunters-mark' })
  if (sneakAttack.value) parts.push({ value: `5 sneak attack`, type: 'sneak-attack' })
  return parts
})

const showBreakdown = computed(() => {
  if (!individualRolls.value.length) return false
  if (qty.value > 1) return true
  return isFloored.value || huntersMark.value > 0 || sneakAttack.value
})

const showTotal = computed(() => adderParts.value.length > 0 && finalTotal.value !== null)

function closeModal() {
  modalOpen.value = false
}

function onDocClick(e: MouseEvent) {
  if (wrapperEl.value && !wrapperEl.value.contains(e.target as Node)) {
    pickerOpen.value = false
  }
}

onMounted(() => document.addEventListener('click', onDocClick))
onUnmounted(() => document.removeEventListener('click', onDocClick))
</script>

<template lang="pug">
.dice-roller-wrapper(ref="wrapperEl")
  .dice-pills
    button.dice-btn(@click="togglePicker") roll the dice
    button.coin-btn(@click="flipCoin") coinflip!
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
    .picker-row
      span hunter's mark
      .stepper
        button(@click="changeHuntersMark(-1)" :disabled="huntersMark <= 0") −
        span {{ huntersMark || 'off' }}
        button(@click="changeHuntersMark(1)") +
    .picker-row
      span sneak attack
      label.toggle-dial
        input(type="checkbox" v-model="sneakAttack")
        span.toggle-track
          span.toggle-knob
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
      .die-results-wrap(v-if="qty > 1")
        .die-result(v-for="(n, i) in displayNumbers" :key="i" :class="{ rolling }")
          span {{ n }}
      .die-result(v-else :class="{ rolling }")
        span {{ displayNumber ?? '?' }}
      .die-breakdown(v-if="!rolling && showBreakdown")
        template(v-for="(part, i) in breakdownParts" :key="i")
          span.breakdown-sep(v-if="i > 0") +
          span(:class="`breakdown-part breakdown-part--${part.type}`") {{ part.value }}
        template(v-for="(part, i) in adderParts" :key="`adder-${i}`")
          span.breakdown-sep +
          span(:class="`breakdown-part breakdown-part--${part.type}`") {{ part.value }}
      .die-total(v-if="!rolling && showTotal")
        span Total :: {{ finalTotal }}
      button.close-btn(@click="closeModal") ×
</template>

<style lang="scss" scoped>
.dice-roller-wrapper {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  height: 2, 8rem;
  margin-right: 10rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.dice-pills {
  display: flex;
  height: 100%;
}

.dice-btn {
  border: 2px solid var(--theme-col-blurple);
  border-radius: 37px 0 0 37px;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.4rem;
  padding: 0 1.2rem;
  padding-bottom: 4px;
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
  background: rgba(20, 16, 50, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9000;
}

.dice-modal {
  position: relative;
  background: var(--theme-col-lightest-blurple);
  border: 3px solid var(--theme-col-dark-blurple);
  border-radius: 16px;
  padding: 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 280px;
  min-height: 260px;
}

.die-label {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.4rem;
  color: var(--theme-col-dark-blurple);
  opacity: 0.7;
  letter-spacing: 0.05em;
}

.die-results-wrap {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.3rem;

  .die-result {
    font-size: 3.2rem;
    min-width: 1.6ch;
    min-height: unset;
  }
}

.die-result {
  font-family: 'Grenze Gotisch', serif;
  font-size: 6rem;
  line-height: 1;
  color: var(--theme-col-blurple);
  min-width: 3ch;
  text-align: center;
  min-height: 1.1em;

  &.rolling span {
    animation: number-flicker 0.06s linear infinite;
  }
}

.die-breakdown {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.95rem;
  color: var(--theme-col-dark-blurple);
  letter-spacing: 0.03em;
}

.breakdown-sep {
  opacity: 0.4;
  font-size: 0.85rem;
}

.breakdown-part {
  padding: 0.1rem 0.45rem 0.15rem;
  border-radius: 6px;
  font-weight: 600;

  &--die {
    background: var(--theme-col-light-blurple);
    color: var(--theme-col-dark-blurple);
  }

  &--base {
    background: #e8e4f7;
    color: var(--theme-col-blurple);
    font-weight: 400;
    font-size: 0.85rem;
  }

  &--hunters-mark {
    background: #fef3c7;
    color: #92400e;
    font-weight: 400;
    font-size: 0.85rem;
  }

  &--sneak-attack {
    background: #fce7f3;
    color: #9d174d;
    font-weight: 400;
    font-size: 0.85rem;
  }
}

.toggle-dial {
  display: flex;
  align-items: center;
  cursor: pointer;

  input {
    display: none;
  }
}

.toggle-track {
  position: relative;
  display: inline-flex;
  align-items: center;
  width: 2.6rem;
  height: 1.4rem;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.15);
  border: 1.5px solid rgba(255, 255, 255, 0.25);
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
  left: 0.18rem;
  width: 1rem;
  height: 1rem;
  border-radius: 50%;
  background: var(--theme-col-parchment-light);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  transition: transform 0.2s ease;

  .toggle-dial input:checked ~ .toggle-track & {
    transform: translateX(1.1rem);
  }
}

.die-total {
  font-family: 'Grenze Gotisch', serif;
  font-size: 2.2rem;
  color: var(--theme-col-dark-blurple);
  line-height: 1.1;
}

.floored-badge {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  background: var(--theme-col-light-blurple);
  color: var(--theme-col-dark-blurple);
  border-radius: 20px;
  padding: 0.1rem 0.7rem;
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

  &:hover {
    opacity: 1;
    background: rgba(100, 80, 200, 0.1);
  }
}

.coin-btn {
  border: 2px solid var(--theme-col-blurple);
  border-radius: 0 37px 37px 0;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.4rem;
  padding: 0 1.2rem;
  padding-bottom: 4px;
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
