// Per-player campaign completion and global game state metadata.
// Only dashboard[0] carries currentDate / currentCmpgn / cmpgnWeek;
// the remaining rows are per-player campaign completion flags.
export interface DashboardEntry {
  playerId: string
  realName: string
  campaignsComplete: string
  c1: string
  c2: string
  c3: string
  c4: string
  c5: string
  c6: string
  currentDate: string // ISO date string or ""
  currentCmpgn: string // "c1" | "c2" | ... | ""
  cmpgnWeek: number | string // 1–4, or "" when not yet set
}

export interface GameClass {
  className: string
  vibe: string
  ability1: string
  ability2: string
}

export interface Campaign {
  id: string
  name: string
  theme: string
  questAction: string
  timesPerWeek: number
  successThreshold: number
  enemy: string
  enemyImg: string
  enemyHp: string | number
  enemyMaxHp: string | number
  enemyProg: string | number
  enemySpeed: string | number
  enemyDmg: string | number
  reward: string
  start: string // ISO date string
  end: string // ISO date string
  days: number
  cutoff: string
  week1: string
  week2: string
  week3: string
  week4: string
}

export interface Player {
  playerId: string
  realName: string
  img: string
  charName: string
  class: string
  hp: number
  maxHp: number
  weekWins: number
  totalXp: number
  level: number
  achievements: string
  totalActiveDays: number
}

// Campaign-specific progress row, keyed to a specific campaign table (e.g. cmpgn1).
export interface CampaignProgress {
  playerId: string
  realName: string
  dgnProgress: number
  cmpgnProgress: number
  weeklyWinCount: number
  w1Count: number
  w2Count: number
  w3Count: number
  w4Count: number
}

// Raw activity log row. Rows with an empty playerId are padding/rest days and
// should be filtered before use.
export interface PlayerActivity {
  playerId: string
  realName: string
  activeDay: string // ISO date string or ""
}

export interface ApiResponse {
  dashboard: DashboardEntry[]
  classes: GameClass[]
  campaigns: Campaign[]
  players: Player[]
  achievements: unknown[]
  cmpgn1: CampaignProgress[]
  plyrActivity: PlayerActivity[]
}
