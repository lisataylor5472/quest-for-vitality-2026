<script setup lang="ts">
import MagicLoader from '@/components/MagicLoader.vue'
</script>

<template lang="pug">
.dungeon-component
  MagicLoader(text="Soon to be Unveiled")
</template>

<style lang="scss" scoped>
.dungeon-component {
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 1rem;
}
</style>
