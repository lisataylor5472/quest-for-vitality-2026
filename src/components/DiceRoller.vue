<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const DICE = [4, 6, 8, 10, 12, 20]
const MAX_QTY = 10

const pickerOpen = ref(false)
const modalOpen = ref(false)
const selectedDie = ref(20)
const qty = ref(1)
const floorVal = ref(5)

const displayNumber = ref<number | null>(null)
const individualRolls = ref<number[]>([])
const isFloored = ref(false)
const rolling = ref(false)

const wrapperEl = ref<HTMLElement | null>(null)

function togglePicker() {
  pickerOpen.value = !pickerOpen.value
}

function changeQty(delta: number) {
  qty.value = Math.max(1, Math.min(MAX_QTY, qty.value + delta))
}

function changeFloor(delta: number) {
  floorVal.value = Math.max(0, floorVal.value + delta)
}

function roll(sides: number) {
  selectedDie.value = sides
  pickerOpen.value = false
  modalOpen.value = true
  rolling.value = true
  displayNumber.value = null
  individualRolls.value = []
  isFloored.value = false

  const start = Date.now()
  const duration = 900
  const maxTotal = qty.value * sides

  const interval = setInterval(() => {
    displayNumber.value = Math.floor(Math.random() * maxTotal) + qty.value
    if (Date.now() - start >= duration) {
      clearInterval(interval)
      const rolls = Array.from({ length: qty.value }, () => Math.floor(Math.random() * sides) + 1)
      const rawTotal = rolls.reduce((a, b) => a + b, 0)
      const finalTotal = rawTotal + floorVal.value
      individualRolls.value = rolls
      isFloored.value = floorVal.value > 0
      displayNumber.value = finalTotal
      rolling.value = false
    }
  }, 60)
}

const breakdown = computed(() => {
  if (!individualRolls.value.length) return ''
  const parts = [...individualRolls.value]
  if (isFloored.value) return [...parts, `${floorVal.value} (base)`].join(' + ')
  return parts.join(' + ')
})

const showBreakdown = computed(
  () => individualRolls.value.length > 0 && (qty.value > 1 || isFloored.value),
)

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
  button.dice-btn(@click="togglePicker") roll the dice
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
  .dice-modal-backdrop(v-if="modalOpen" @click.self="closeModal")
    .dice-modal
      .die-label {{ qty > 1 ? `${qty}d${selectedDie}` : `d${selectedDie}` }}
      .die-result(:class="{ rolling }")
        span {{ displayNumber ?? '?' }}
      .die-breakdown(v-if="!rolling && showBreakdown")
        span {{ breakdown }}
      button.dismiss-btn(@click="closeModal") dismiss
</template>

<style lang="scss" scoped>
.dice-roller-wrapper {
  position: absolute;
  right: 1rem;
  top: 50%;
  transform: translateY(-50%);
  height: 3rem;
  margin-right: 10rem;
}

.dice-btn {
  border: 2px solid var(--theme-col-blurple);
  border-radius: 37px;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.3rem;
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

  &:active {
    transform: translateY(1px);
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
  background: var(--theme-col-parchment);
  border: 3px solid var(--theme-col-dark-blurple);
  border-radius: 16px;
  padding: 2.5rem 4rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  min-width: 220px;
}

.die-label {
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.4rem;
  color: var(--theme-col-dark-blurple);
  opacity: 0.7;
  letter-spacing: 0.05em;
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
  font-family: 'Space Grotesk', sans-serif;
  font-size: 1rem;
  color: var(--theme-col-dark-blurple);
  opacity: 0.65;
  letter-spacing: 0.03em;
}

.floored-badge {
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.8rem;
  background: var(--theme-col-light-blurple);
  color: var(--theme-col-dark-blurple);
  border-radius: 20px;
  padding: 0.1rem 0.7rem;
}

.dismiss-btn {
  margin-top: 1rem;
  border: 2px solid var(--theme-col-blurple);
  border-radius: 37px;
  background: #d0d6ff;
  color: var(--theme-col-blurple);
  font-family: 'Grenze Gotisch', serif;
  font-size: 1.1rem;
  padding: 0.1rem 1.5rem 0.3rem;
  cursor: pointer;
  box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);

  &:hover {
    background: var(--theme-col-lightest-blurple);
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
