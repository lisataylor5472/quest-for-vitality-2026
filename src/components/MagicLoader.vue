<template lang="pug">
.magic-loader
  .magic-orb
    span.spark(v-for="i in 8" :key="i" :style="`--i: ${i - 1}`")
  h1.loading-text Conjuring the data
</template>

<style lang="scss" scoped>
.magic-loader {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  text-align: center;
  padding-bottom: 10em;
  // font-family: 'Space Grotesk', sans-serif;
}

.magic-orb {
  position: relative;
  width: 80px;
  height: 80px;
  margin: 0 auto;

  &::before {
    content: '';
    position: absolute;
    // inset: 0;
    border-radius: 50%;
    background: radial-gradient(circle, var(--theme-col-light-blurple) 0%, transparent 70%);
    animation: orb-pulse 2s ease-in-out infinite;
  }
}

@keyframes orb-pulse {
  0%,
  100% {
    transform: scale(0.7);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.3);
    opacity: 1;
  }
}

.spark {
  position: absolute;
  top: 50%;
  left: 50%;
  color: var(--theme-col-blurple);
  font-size: 1.1rem;

  &::before {
    content: '✦';
    position: absolute;
    transform: rotate(calc(var(--i) * 45deg)) translateY(-42px);
    animation: sparkle-twinkle 1.6s ease-in-out infinite;
    animation-delay: calc(var(--i) * 0.2s);
  }
}

@keyframes sparkle-twinkle {
  0%,
  100% {
    opacity: 0.1;
    transform: rotate(calc(var(--i) * 45deg)) translateY(-42px) scale(0.3);
    color: var(--theme-col-med-blurple);
  }
  50% {
    opacity: 1;
    transform: rotate(calc(var(--i) * 45deg)) translateY(-42px) scale(1.4);
    color: var(--theme-col-yellow);
  }
}

.loading-text {
  // font-family: 'Grenze Gotisch', serif;
  font-size: 1.8rem;
  color: var(--theme-col-blurple);
  animation: text-shimmer 2.5s ease-in-out infinite;
  padding-top: 2em;
}

@keyframes text-shimmer {
  0%,
  100% {
    text-shadow: 0 0 8px var(--theme-col-light-blurple);
    opacity: 0.75;
  }
  50% {
    text-shadow:
      0 0 18px var(--theme-col-blurple),
      0 0 35px var(--theme-col-med-blurple);
    opacity: 1;
  }
}
</style>
