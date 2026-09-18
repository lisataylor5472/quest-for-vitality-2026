// Pulls dungeonActivity/dungeonMechanics from the AppScript endpoint, appends
// the new activity rows to public/data.json, and applies their effects
// (useAP, hp, bossDamage) to the players/campaigns already stored there.
//
// Run with: node --env-file=.env scripts/sync-dungeon-activity.mjs
import { readFile, writeFile } from 'node:fs/promises'

const DATA_PATH = new URL('../public/data.json', import.meta.url)

function normalizePlayerKey(row) {
  if ('player' in row) return row
  if ('UKPJFU18U' in row) {
    const { UKPJFU18U, ...rest } = row
    return { player: UKPJFU18U, ...rest }
  }
  if ('playerId' in row) {
    const { playerId, ...rest } = row
    return { player: playerId, ...rest }
  }
  return row
}

const norm = (v) => String(v ?? '').trim().toLowerCase()

function findC6Section(campaigns, bossValue) {
  if (!bossValue) return null
  const target = norm(bossValue)
  return (
    campaigns.find((c) => /^c6-\d+$/.test(c.id) && norm(c.theme) === target) ??
    campaigns.find((c) => /^c6-\d+$/.test(c.id) && norm(c.enemy) === target) ??
    null
  )
}

async function main() {
  const apiUrl = process.env.VITE_API_URL
  if (!apiUrl) throw new Error('VITE_API_URL is not set (run with --env-file=.env)')

  const res = await fetch(apiUrl)
  if (!res.ok) throw new Error(`Fetch failed: HTTP ${res.status}`)
  const fresh = await res.json()

  const stored = JSON.parse(await readFile(DATA_PATH, 'utf8'))

  // Normalize the player-id key across all existing rows.
  stored.dungeonActivity = stored.dungeonActivity.map(normalizePlayerKey)

  const newRows = (fresh.dungeonActivity ?? []).map(normalizePlayerKey)
  stored.dungeonActivity.push(...newRows)
  if (fresh.dungeonMechanics) stored.dungeonMechanics = fresh.dungeonMechanics

  // Apply this pull's new rows against players/campaigns state.
  const changes = []
  for (const row of newRows) {
    const player = stored.players.find((p) => p.playerId === row.player)

    const useAP = Number(row.useAP)
    if (player && useAP) {
      player.actionPoints -= useAP
      changes.push(`${player.realName}: actionPoints -${useAP} -> ${player.actionPoints}`)
    }

    const hp = Number(row.hp)
    if (player && hp < 0) {
      player.hp += hp
      changes.push(`${player.realName}: hp ${hp} -> ${player.hp}`)
    }

    const bossDamage = Number(row.bossDamage)
    if (bossDamage) {
      const section = findC6Section(stored.campaigns, row.boss)
      if (section) {
        section.enemyHp = Number(section.enemyHp) - bossDamage
        changes.push(`${section.enemy} (${section.id}): enemyHp -${bossDamage} -> ${section.enemyHp}`)
      } else {
        changes.push(`WARNING: bossDamage ${bossDamage} on row for ${row.playerName} has no matching c6 section for boss="${row.boss}"`)
      }
    }
  }

  await writeFile(DATA_PATH, JSON.stringify(stored))

  console.log(`Appended ${newRows.length} dungeonActivity rows (total now ${stored.dungeonActivity.length}).`)
  console.log(changes.length ? changes.join('\n') : 'No stat changes to apply (all new rows were blank).')
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
