<script setup lang="ts">
import { ref } from 'vue'
import CampaignComponent from '@/components/CampaignComponent.vue'
import LeaderboardComponent from '@/components/LeaderboardComponent.vue'
import DungeonComponent from '@/components/DungeonComponent.vue'

type View = 'campaign' | 'leaderboard' | 'dungeon'

const activeView = ref<View>('campaign')
</script>

<template lang="pug">
.left-panel

.app-wrapper
  .header-wrapper
    .header-stripe
    .header-banner
      img.title-svg(src="@/assets/banner-updated.svg" alt="Title Banner")
    .header-details
      .flag-pole-wrapper
        .flag-pole
        .flags-wrapper
          .adventure-flag
            img.flag-unrolled(v-if="true" src="@/assets/flags/flexibility-flag.svg" alt="Flexibility Dungeon Flag")
            img(v-else src="@/assets/flags/rolled-flag-flexibility.svg" alt="Flexibility Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="true" src="@/assets/flags/hydration-flag.svg" alt="Hydration Dungeon Flag")
            img(v-else src="@/assets/flags/rolled-flag-hydration.svg" alt="Future Dungeon Flag")
          .adventure-flag
            img.flag-unrolled(v-if="true" src="@/assets/flags/cardio-flag.svg" alt="Cardio Dungeon Flag")
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
      button(@click="activeView = 'campaign'") campaign
      button(@click="activeView = 'leaderboard'") leaderboard
      button(@click="activeView = 'dungeon'") dungeon
  .main-content-wrapper
    .parchment-page
      CampaignComponent(v-show="activeView === 'campaign'")
      LeaderboardComponent(v-show="activeView === 'leaderboard'")
      DungeonComponent(v-show="activeView === 'dungeon'")

.right-panel
</template>

<style lang="scss" scoped>
.nav-button-wrapper {
  display: flex;
  justify-content: center;
  padding-left: 20em;
  margin-bottom: 0.5em;
  button {
    border-radius: 37px;
    border: 2px solid #29f36e;
    width: 150px;
    height: 35px;
    font-size: 1.5rem;
    font-family: 'Grenze Gotisch', serif;
    display: flex;
    justify-content: center;
    margin-left: 1rem;
    align-items: center;
    padding-bottom: 4px;
    cursor: pointer;
    transition:
      transform 0.12s ease,
      box-shadow 0.2s ease,
      background 0.15s ease,
      color 0.15s ease;
    &:not(.active) {
      background: #d0ffe0;
      color: #2d864c;
      box-shadow: 2px 2px 0px 1px #29f36e;
    }
    a {
      text-decoration: none;
      color: #005d20;
    }
    &:hover {
      background: #0d2118;
      color: #d0ffe0;
      box-shadow:
        0 0 4px 1px #29f36e,
        0 0 12px 3px #29f36e,
        0 0 22px 5px var(--theme-col-med-blurple);
      animation: btn-glow-pulse 1.6s ease-in-out infinite;
    }
    &:active {
      transform: scale(0.93) translateY(2px);
      box-shadow:
        0 0 4px 1px #29f36e,
        inset 0 2px 6px rgba(0, 0, 0, 0.35);
      animation: none;
    }
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
.main-content-wrapper {
  height: 75vh;
  padding: 0.5em 2em;
  .parchment-page {
    width: 100%;
    height: 100%;
    padding: 1em 5em 3em 3em;
    // padding-right: 5em;
    background-image: url('@/assets/parchment.svg'); /* Adjust path as needed */
  }
}
</style>
