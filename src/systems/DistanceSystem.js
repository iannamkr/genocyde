// ─── DISTANCE SYSTEM ──────────────────────────────────────────────────────────
// Pure utility for spatial queries between host and enemies.

export const AUTO_ATK_RANGE  = 95
export const ENEMY_NEAR_DIST = 320
export const ENEMY_MIN_AHEAD = 52

export class DistanceSystem {
  // 2D Euclidean distance
  between(ax, ay, bx, by) {
    const dx = bx - ax, dy = by - ay
    return Math.sqrt(dx * dx + dy * dy)
  }

  // 1D horizontal distance (used for side-scroll AI range checks)
  horiz(ax, bx) { return Math.abs(bx - ax) }

  // Nearest enemy by 1D horizontal distance within maxRange
  closestEnemy1D(enemies, px, maxRange = Infinity) {
    let nearest = null, best = maxRange
    for (const e of enemies) {
      if (e.state === 'DEAD') continue
      const d = Math.abs(e.sprite.x - px)
      if (d < best) { best = d; nearest = e }
    }
    return nearest
  }

  // Whether any enemy is within 1D horizontal range
  hasEnemyNear1D(enemies, px, range) {
    return enemies.some(e => e.state !== 'DEAD' && Math.abs(e.sprite.x - px) <= range)
  }

  // Whether any enemy is within 2D radius
  hasEnemyInRadius(enemies, cx, cy, range) {
    return enemies.some(e => {
      if (e.state === 'DEAD') return false
      const dx = e.sprite.x - cx, dy = e.sprite.y - cy
      return Math.sqrt(dx * dx + dy * dy) < range
    })
  }
}
