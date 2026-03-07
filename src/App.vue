<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import DiceRoller from '@/components/DiceRoller.vue'

const route = useRoute()

const gameStore = useGameStore()
gameStore.fetchData()

const refreshing = ref(false)
async function handleQuietRefresh() {
  if (refreshing.value) return
  refreshing.value = true
  await gameStore.quietRefresh()
  refreshing.value = false
}

// ---------------------------------------------------------------------------
// Global tooltip — position: fixed so it renders above scrollbars and outside
// any overflow container. Reads the existing data-tooltip / data-tooltip-pos
// attributes used throughout the app.
// ---------------------------------------------------------------------------
const tooltipEl = ref<HTMLElement | null>(null)
let activeTarget: HTMLElement | null = null

function onMouseOver(e: MouseEvent) {
  const el = (e.target as HTMLElement).closest?.('[data-tooltip]') as HTMLElement | null
  if (el === activeTarget) return
  activeTarget = el
  const tip = tooltipEl.value
  if (!el || !tip) {
    if (tip) tip.style.opacity = '0'
    return
  }
  const text = el.getAttribute('data-tooltip')
  if (!text) return

  const below = el.getAttribute('data-tooltip-pos') === 'below'
  const rect = el.getBoundingClientRect()
  tip.textContent = text
  tip.className = below ? 'below' : 'above'
  tip.style.left = `${rect.left + rect.width / 2}px`
  tip.style.top = below ? `${rect.bottom + 6}px` : `${rect.top - 6}px`
  tip.style.transform = below ? 'translateX(-50%)' : 'translateX(-50%) translateY(-100%)'
  tip.style.opacity = '1'
}

function onMouseOut(e: MouseEvent) {
  if (!activeTarget) return
  const rel = e.relatedTarget as HTMLElement | null
  if (rel && activeTarget.contains(rel)) return
  activeTarget = null
  if (tooltipEl.value) tooltipEl.value.style.opacity = '0'
}

onMounted(() => {
  document.addEventListener('mouseover', onMouseOver)
  document.addEventListener('mouseout', onMouseOut)
})

onUnmounted(() => {
  document.removeEventListener('mouseover', onMouseOver)
  document.removeEventListener('mouseout', onMouseOut)
})
</script>

<template lang="pug">
.left-panel

.app-wrapper
  .header-wrapper
    .header-stripe
    .header-banner
      img.title-svg(src="@/assets/Banner-updated.svg" alt="Title Banner")
    .header-details
      .flag-pole-wrapper
        .flag-pole
        .flags-wrapper
          .adventure-flag
            img.flag-unrolled(v-if="true" src="@/assets/flags/flexibility-flag.svg" alt="Flexibility Dungeon Flag")
            img(v-else src="@/assets/flags/rolled-flag-flexibility.svg" alt="Flexibility Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="false" src="@/assets/flags/hydration-flag.svg" alt="Hydration Dungeon Flag")
            img(v-else src="@/assets/flags/rolled-flag-hydration.svg" alt="Future Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="false" src="@/assets/flags/cardio-flag.svg" alt="Cardio Dungeon Flag")
            img(v-else src="@/assets/flags/rolled-flag-cardio.svg" alt="Future Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="false" src="@/assets/flags/sleep-flag.svg")
            img(v-else src="@/assets/flags/rolled-flag-sleep.svg" alt="Future Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="false" src="@/assets/flags/strength-flag.svg")
            img(v-else src="@/assets/flags/rolled-flag-strength.svg" alt="Future Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="false" src="@/assets/flags/final-flag.svg")
            img(v-else src="@/assets/flags/rolled-flag-final.svg" alt="Future Dungeon Flag")
  .nav-button-wrapper
    .nav-pills
      RouterLink(to="/leaderboard" custom v-slot="{ navigate, isActive }")
        button(@click="navigate" :class="{ active: isActive }") leaderboard
      RouterLink(to="/campaign" custom v-slot="{ navigate, isActive }")
        button(@click="navigate" :class="{ active: isActive }") campaign
      RouterLink(to="/dungeon" custom v-slot="{ navigate, isActive }")
        button(@click="navigate" :class="{ active: isActive }") dungeon
    button.refresh-btn(@click="handleQuietRefresh" :class="{ spinning: refreshing }" data-tooltip="Refresh data" data-tooltip-pos="below")
      svg(xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round")
        polyline(points="23 4 23 10 17 10")
        path(d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10")
    DiceRoller(v-if="route.path === '/dungeon'")
  .main-content-wrapper
    .parchment-page
      RouterView

.right-panel

#global-tooltip(ref="tooltipEl")
</template>

<style lang="scss" scoped>
.nav-button-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  z-index: 10;
  padding: 0.25rem 1rem;
  height: 4rem;
  margin-bottom: 0.5em;
  margin-left: 12em;
  gap: 0.75rem;

  .nav-pills {
    display: flex;

    button {
      border: 2px solid var(--theme-col-blurple);
      width: 150px;
      font-size: 1.4rem;
      font-family: 'Grenze Gotisch', serif;
      display: flex;
      justify-content: center;
      align-items: center;
      padding-bottom: 4px;
      cursor: pointer;
      transition:
        transform 0.1s ease,
        box-shadow 0.1s ease;

      &:not(.active) {
        background: #d0d6ff;
        color: var(--theme-col-blurple);
        box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);
      }

      &.active {
        background: var(--theme-col-blurple);
        color: #fff;
        box-shadow: 1px 1px 0px 1px var(--theme-col-blurple);
      }

      &:hover:not(.active) {
        background: var(--theme-col-lightest-blurple);
      }

      &:first-of-type {
        border-radius: 37px 0 0 37px;
      }

      &:last-of-type {
        border-radius: 0 37px 37px 0;
      }
    }
  }

  .refresh-btn {
    width: 2.8rem;
    height: 2.8rem;
    border-radius: 50%;
    border: 2px solid var(--theme-col-blurple);
    background: #d0d6ff;
    color: var(--theme-col-blurple);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.1s ease;

    &:hover {
      background: var(--theme-col-lightest-blurple);
    }

    svg {
      width: 1rem;
      height: 1rem;
    }

    &.spinning svg {
      animation: spin 0.7s linear infinite;
    }
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes flag-wave {
  0% {
    transform: perspective(300px) rotateX(5deg);
  }
  50% {
    transform: perspective(300px) rotateX(-4deg);
  }
  100% {
    transform: perspective(300px) rotateX(5deg);
  }
}

@keyframes banner-wiggle {
  0%,
  100% {
    transform: rotate(0deg) translateY(0);
  }
  15% {
    transform: rotate(-1deg) translateY(-2px);
  }
  35% {
    transform: rotate(1.5deg) translateY(-2px);
  }
  55% {
    transform: rotate(-0.8deg) translateY(-1px);
  }
  75% {
    transform: rotate(0.5deg) translateY(-2px);
  }
  90% {
    transform: rotate(-0.3deg) translateY(-1px);
  }
}

@keyframes btn-glow-pulse {
  0%,
  100% {
    box-shadow:
      0 0 4px 1px #29f36e,
      0 0 12px 3px #29f36e,
      0 0 22px 5px var(--theme-col-med-blurple);
  }
  50% {
    box-shadow:
      0 0 6px 2px #29f36e,
      0 0 18px 6px #29f36e,
      0 0 32px 8px var(--theme-col-med-blurple);
  }
}
.header-wrapper {
  height: 18vh;
  display: flex;
  align-items: center;
  position: relative;
  justify-content: space-between;
  .header-stripe {
    height: 100px;
    background: #603bb1;
    width: 100%;
    position: absolute;
    z-index: -1;
    background-image: url('@/assets/noise.png');
  }
  .header-banner {
    .title-svg {
      margin-top: 15px;
      height: 26vh;
      z-index: 5;
      cursor: pointer;
      transform-origin: center bottom;
      transition: transform 0.2s ease;

      &:hover {
        animation: banner-wiggle 0.55s ease-in-out infinite;
      }
    }
  }
  .header-details {
    flex-basis: 60%;
    position: relative;
    align-self: flex-start;
    margin-top: 2em;
    .flag-pole {
      width: 100%;
      height: 25px;
      background: var(--theme-col-brown-light);
      border: 3px solid var(--theme-col-brown);
    }
    .flags-wrapper {
      position: absolute;
      top: 0;
      width: 100%;
      display: flex;
      justify-content: space-between;
      padding: 0 1rem;
      height: 10vh;
      .adventure-flag {
        margin-right: 1em;
        img {
          width: 100px;
          height: auto;
        }
        img.flag-unrolled {
          transform-origin: top center;
          animation: flag-wave 3.5s ease-in-out infinite;
        }
        &:nth-child(2) img.flag-unrolled {
          animation-delay: 0.4s;
        }
        &:nth-child(3) img.flag-unrolled {
          animation-delay: 0.8s;
        }
        &:nth-child(4) img.flag-unrolled {
          animation-delay: 1.2s;
        }
        &:nth-child(5) img.flag-unrolled {
          animation-delay: 1.6s;
        }
        &:nth-child(6) img.flag-unrolled {
          animation-delay: 2s;
        }
      }
    }
  }
}
#global-tooltip {
  position: fixed;
  z-index: 9999;
  background-color: var(--theme-col-dark-blurple);
  color: var(--theme-col-parchment-light);
  padding: 0.3rem 0.65rem;
  border-radius: 6px;
  font-family: 'Space Grotesk', sans-serif;
  font-size: 0.75rem;
  font-weight: 500;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.15s ease;

  &.above::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-top-color: var(--theme-col-dark-blurple);
  }

  &.below::after {
    content: '';
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    border: 5px solid transparent;
    border-bottom-color: var(--theme-col-dark-blurple);
  }
}

.main-content-wrapper {
  height: 72vh;
  padding: 0.5em 2em;

  .parchment-page {
    width: 100%;
    height: 100%;
    padding: 1em 5em 3em 3em;
    // padding-right: 5em;
    background-image: url('@/assets/parchment.svg'); /* Adjust path as needed */
  }
  .loading-wrapper {
    margin-top: 10em;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
  }
}
</style>
