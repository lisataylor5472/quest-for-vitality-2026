import { createRouter, createWebHistory } from 'vue-router'
import CampaignComponent from '@/components/CampaignComponent.vue'
import LeaderboardComponent from '@/components/LeaderboardComponent.vue'
import DungeonComponent from '@/components/DungeonComponent.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', redirect: '/campaign' },
    { path: '/campaign', component: CampaignComponent },
    { path: '/leaderboard', component: LeaderboardComponent },
    { path: '/dungeon', component: DungeonComponent },
  ],
})

export default router
