import Phaser from 'phaser'
import { ENEMY_TYPES } from '../data/gameData.js'
import { C } from '../utils/draw.js'
import { ENEMY_MIN_AHEAD } from '../systems/DistanceSystem.js'

const GROUND = 580

// Per-type sprite/body configuration
const ENEMY_CFG = {
  grunt: {
    tex: 'bugIdle', sc: 1.5, bw: 32, bh: 30, ox: 16, oy: 17,
    idle: 'bugIdle', move: 'bugMove', atk: 'bugAttack', die: 'bugDeath',
  },
  shieldBearer: {
    tex: 'batIdle', sc: 0.85, bw: 64, bh: 65, ox: 32, oy: 31,
    idle: 'batIdle', move: 'batMove', atk: 'batAttack', die: 'batDeath',
  },
  boss: {
    tex: 'hulkIdle', sc: 1.2, bw: 80, bh: 75, ox: 56, oy: 10,
    idle: 'hulkIdle', move: 'hulkWalk', atk: 'hulkAttack', die: 'hulkDeath',
  },
}

// ─── ENEMY SYSTEM ─────────────────────────────────────────────────────────────
// Manages the enemy collection: spawn, AI (distance check + attack), death.

export class EnemySystem {
  constructor(scene) {
    this.scene    = scene
    this._enemies = []
  }

  get enemies() { return this._enemies }

  allDead()     { return this._enemies.every(e => e.state === 'DEAD') }
  clearEnemies() { this._enemies = [] }

  // ─── SPAWN ────────────────────────────────────────────────────────────────

  spawn(type, x, y) {
    const stats = ENEMY_TYPES[type]
    const cfg   = ENEMY_CFG[type]

    const sprite = this.scene.physics.add.sprite(x, y, cfg.tex, 0)
      .setCollideWorldBounds(true).setScale(cfg.sc).setDepth(10)
    sprite.setBodySize(cfg.bw, cfg.bh).setOffset(cfg.ox, cfg.oy)
    this.scene.physics.add.collider(sprite, this.scene._platforms)
    sprite.play(cfg.idle)

    const e = {
      type, sprite, cfg,
      hp: stats.hp, maxHp: stats.hp,
      speed: stats.speed, damage: stats.damage,
      state: 'PATROL', staggerTimer: 0, attackCooldown: 0,
      facing: -1, patrolDir: -1, patrolTimer: 1500 + (x % 1200),
      pattern: 0, patternTimer: 0,
      curAnim: cfg.idle,
    }
    this._enemies.push(e)
    return e
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  update(dt) {
    for (const e of this._enemies) {
      if (e.state === 'DEAD') continue
      if (e.state === 'STAGGER') {
        e.staggerTimer -= dt
        e.sprite.setVelocityX(0)
        if (e.staggerTimer <= 0) e.state = 'PATROL'
        continue
      }
      e.attackCooldown = Math.max(0, e.attackCooldown - dt)
      e.type === 'boss' ? this._bossAI(e, dt) : this._standardAI(e, dt)
      // Sprites default face right; flip when facing left (toward player)
      e.sprite.setFlipX(e.facing === 1)
    }
  }

  // ─── COMBAT ───────────────────────────────────────────────────────────────

  hitEnemy(e, dmg) {
    e.hp -= dmg
    this.scene.msg.floatText(e.sprite.x, e.sprite.y - 24, `-${dmg}`, C.RED)
    if (e.hp <= 0) {
      this._killEnemy(e)
    } else {
      e.state = 'STAGGER'
      e.staggerTimer = 280
      e.sprite.setTint(0xffffff)
      this.scene.time.delayedCall(80, () => { if (e.sprite.active) e.sprite.clearTint() })
    }
  }

  hitAllInRange(cx, cy, range, dmg) {
    for (const e of this._enemies) {
      if (e.state === 'DEAD') continue
      const dx = e.sprite.x - cx, dy = e.sprite.y - cy
      if (Math.sqrt(dx * dx + dy * dy) < range) {
        this.scene.msg.showHitVfx(e.sprite.x, e.sprite.y)
        this.hitEnemy(e, dmg)
      }
    }
  }

  // ─── AI ───────────────────────────────────────────────────────────────────

  _standardAI(e, dt) {
    const px   = this.scene.host.sprite.x
    const dx   = px - e.sprite.x
    const dist = Math.abs(dx)
    const dir  = Math.sign(dx)

    if (dist > 300) {
      e.state = 'PATROL'
      e.patrolTimer -= dt
      if (e.patrolTimer <= 0) { e.patrolDir *= -1; e.patrolTimer = 2000 }
      e.sprite.setVelocityX(e.patrolDir * e.speed * 0.4)
      e.facing = e.patrolDir
      this._playAnim(e, e.cfg.move)
    } else if (dist < 65) {
      e.state = 'ATTACK'
      e.sprite.setVelocityX(0)
      e.facing = dir
      if (e.attackCooldown <= 0) {
        this._attackHost(e)
        e.attackCooldown = 1400
        this._playAnim(e, e.cfg.atk)
      } else {
        this._playAnim(e, e.cfg.idle)
      }
    } else {
      e.state = 'CHASE'
      e.sprite.setVelocityX(dir * e.speed)
      e.facing = dir
      this._playAnim(e, e.cfg.move)
    }

    this._clampAhead(e)
  }

  _bossAI(e, dt) {
    const px   = this.scene.host.sprite.x
    const dx   = px - e.sprite.x
    const dist = Math.abs(dx)
    const dir  = Math.sign(dx)
    e.patternTimer += dt
    if (e.patternTimer > 4500) { e.patternTimer = 0; e.pattern = (e.pattern + 1) % 3 }
    e.facing = dir

    if (dist > 500) {
      e.sprite.setVelocityX(dir * e.speed * 0.6)
      this._playAnim(e, e.cfg.move)
    } else {
      switch (e.pattern) {
        case 0:
          e.sprite.setVelocityX(dir * e.speed)
          this._playAnim(e, e.cfg.move)
          if (dist < 80 && e.attackCooldown <= 0) { this._attackHost(e); e.attackCooldown = 1200 }
          break
        case 1:
          e.sprite.setVelocityX(dir * e.speed * 2.8)
          this._playAnim(e, e.cfg.move)
          if (dist < 95 && e.attackCooldown <= 0) { this._attackHost(e); e.attackCooldown = 900 }
          break
        case 2:
          if (e.sprite.body.blocked.down) {
            if (dist < 220 && e.attackCooldown <= 0) {
              e.sprite.setVelocityY(-680)
              e.sprite.setVelocityX(dir * e.speed * 1.6)
              this._playAnim(e, e.cfg.atk)
            } else {
              e.sprite.setVelocityX(dir * e.speed * 0.8)
              this._playAnim(e, e.cfg.move)
            }
          } else {
            e.sprite.setVelocityX(dir * e.speed * 1.6)
            if (dist < 90 && e.attackCooldown <= 0) { this._attackHost(e); e.attackCooldown = 1100 }
          }
          break
      }
    }

    this._clampAhead(e)
  }

  // ─── HELPERS ──────────────────────────────────────────────────────────────

  _attackHost(e) {
    // Distance validation is in host.takeDamage; pass enemy as source
    this.scene.host.takeDamage(e.damage, 15, e)
  }

  _clampAhead(e) {
    const minX = this.scene.host.sprite.x + ENEMY_MIN_AHEAD
    if (e.sprite.x < minX) {
      e.sprite.setX(minX)
      e.sprite.body.reset(minX, e.sprite.y)
    }
  }

  _killEnemy(e) {
    e.state = 'DEAD'
    e.hp    = 0
    this.scene.tweens.killTweensOf(e.sprite)

    const dieKey = e.cfg.die
    if (this.scene.anims.exists(dieKey)) {
      this._playAnim(e, dieKey)
      e.sprite.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (!e.sprite.active) return
        this.scene.tweens.add({
          targets: e.sprite, alpha: 0, duration: 300,
          onComplete: () => { if (e.sprite.active) e.sprite.destroy() },
        })
      })
    } else {
      this.scene.tweens.add({
        targets: e.sprite, scaleX: 1.9, scaleY: 0.1, duration: 250,
        onComplete: () => { if (e.sprite.active) e.sprite.destroy() },
      })
    }

    const dropChance = { grunt: 0.35, shieldBearer: 0.65, boss: 1.0 }[e.type] ?? 0
    if (Math.random() < dropChance) this.scene.cardFactory.dropGene(e.sprite.x, GROUND - 8)
  }

  _playAnim(e, key) {
    if (!e.sprite.active || e.curAnim === key) return
    e.curAnim = key
    if (this.scene.anims.exists(key)) e.sprite.play(key, true)
  }
}
