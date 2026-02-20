import Phaser from 'phaser'
import { ANIM_MANIFEST } from '../data/animManifest.js'

// ─── PART Z-ORDER (back → front within container) ─────────────────────────────
const PART_ORDER = ['RightLeg', 'RightArm', 'Torso', 'Head', 'LeftLeg', 'LeftArm', 'Weapon', 'FX']
const EXTRA_PARTS = new Set(['Weapon', 'FX'])

// ─── GAME STATES TO PRELOAD ───────────────────────────────────────────────────
// Add state names here to enable them; must exist in ANIM_MANIFEST.
export const USED_STATES = [
  'Idle',
  'Run',
  'Die',
  'SwordIdle',
  'SwordRun',
  'SwordSlash01',
  'SwordRunSlash',
  'ShockHeavy',
  'Stunned',
]

// ─── HOST SPRITE ──────────────────────────────────────────────────────────────
// Composite character built from 6 body-part layers (+ optional Weapon / FX).
// Uses a Phaser Container for visual rendering and an invisible physics sprite
// for collision / velocity. Host.js drives velocity; this class drives animation.

export class HostSprite {
  constructor(scene) {
    this.scene              = scene
    this._parts             = {}   // part name → Phaser.GameObjects.Sprite
    this._physBody          = null // invisible physics sprite
    this._container         = null // visual container
    this._currentState      = null
    this._flipped           = false
    this._animCompleteCallback = null // stored ref so we can remove it before adding a new one
  }

  // ─── ACCESSORS (backward-compat with host.sprite.xxx) ────────────────────

  /** Physics sprite — exposes .x .y .body .setVelocityX() etc. */
  get sprite() { return this._physBody }

  // ─── STATIC: PRELOAD ─────────────────────────────────────────────────────

  static preload(scene) {
    const pad = n => String(n).padStart(2, '0')
    const base = 'assets/sprites/prototype'

    for (const stateName of USED_STATES) {
      const cfg = ANIM_MANIFEST[stateName]
      if (!cfg) { console.warn(`HostSprite: unknown state "${stateName}"`); continue }

      for (const [part, frameCount] of Object.entries(cfg.parts)) {
        for (let i = 1; i <= frameCount; i++) {
          const key = `${stateName}_${part}_${pad(i)}`
          const url = `${base}/${cfg.dir}/${part}/${stateName}${pad(i)}.png`
          scene.load.image(key, url)
        }
      }
    }
  }

  // ─── STATIC: BUILD ANIMATIONS ────────────────────────────────────────────

  static buildAnims(scene) {
    const pad = n => String(n).padStart(2, '0')

    for (const stateName of USED_STATES) {
      const cfg = ANIM_MANIFEST[stateName]
      if (!cfg) continue

      for (const [part, frameCount] of Object.entries(cfg.parts)) {
        const animKey = `${stateName}_${part}`
        if (scene.anims.exists(animKey)) continue

        scene.anims.create({
          key:       animKey,
          frames:    Array.from({ length: frameCount }, (_, i) => ({
            key: `${stateName}_${part}_${pad(i + 1)}`,
          })),
          frameRate: cfg.fps,
          repeat:    cfg.loop ? -1 : 0,
        })
      }
    }
  }

  // ─── BUILD (call after preload + buildAnims) ──────────────────────────────

  build(x, y, platforms) {
    const firstState = USED_STATES[0]   // 'Idle'
    const firstKey   = `${firstState}_Torso_01`

    // Invisible physics sprite — same body size / offset as old merged sprite
    this._physBody = this.scene.physics.add.sprite(x, y, firstKey)
      .setCollideWorldBounds(true)
      .setAlpha(0)
      .setVisible(false)   // belt-and-suspenders: fully removes from rendering
      .setDepth(-100)
    this._physBody.setBodySize(28, 58).setOffset(34, 26)
    this.scene.physics.add.collider(this._physBody, platforms)

    // Visual container — synced to physics body each update()
    this._container = this.scene.add.container(x, y).setDepth(10)

    // Create one sprite per part in z-order
    for (const part of PART_ORDER) {
      const tex = this.scene.textures.exists(`${firstState}_${part}_01`)
        ? `${firstState}_${part}_01`
        : firstKey   // fallback for parts not in first state (Weapon/FX)

      const spr = this.scene.add.sprite(0, 0, tex)
      spr.setVisible(!EXTRA_PARTS.has(part))   // hide Weapon/FX by default
      this._parts[part] = spr
      this._container.add(spr)
    }

    this.play('Idle')
  }

  // ─── PLAY ─────────────────────────────────────────────────────────────────
  // Plays all parts simultaneously. Handles Weapon/FX visibility.
  // For one-shot animations, auto-transitions to cfg.next when done.

  play(stateName, force = false) {
    const cfg = ANIM_MANIFEST[stateName]
    if (!cfg) { console.warn(`HostSprite.play: unknown state "${stateName}"`); return }
    if (!force && this._currentState === stateName) return

    this._currentState = stateName
    const hasParts = new Set(Object.keys(cfg.parts))

    // Show / hide Weapon and FX
    for (const extra of EXTRA_PARTS) {
      this._parts[extra]?.setVisible(hasParts.has(extra))
    }

    // Play all available parts.
    // ignoreIfPlaying=!force: force=true always restarts; force=false doesn't re-interrupt a loop.
    for (const part of PART_ORDER) {
      const spr = this._parts[part]
      if (!spr || !hasParts.has(part)) continue
      const animKey = `${stateName}_${part}`
      if (this.scene.anims.exists(animKey)) spr.play(animKey, !force)
    }

    // One-shot → auto-transition on complete.
    // Remove any stale callback from a previous interrupted one-shot before registering the new one,
    // so abandoned once-listeners don't pile up and cause unexpected extra transitions.
    const pivot = this._parts['Torso'] || this._parts['Head']
    if (pivot && this._animCompleteCallback) {
      pivot.off(Phaser.Animations.Events.ANIMATION_COMPLETE, this._animCompleteCallback)
      this._animCompleteCallback = null
    }
    if (!cfg.loop && cfg.next !== undefined) {
      this._animCompleteCallback = () => {
        this._animCompleteCallback = null
        if (this._currentState !== stateName) return   // state changed mid-anim
        if (cfg.next) this.play(cfg.next)
      }
      pivot?.once(Phaser.Animations.Events.ANIMATION_COMPLETE, this._animCompleteCallback)
    }
  }

  // ─── FLIP ─────────────────────────────────────────────────────────────────

  setFlipX(flip) {
    if (this._flipped === flip) return
    this._flipped = flip
    for (const spr of Object.values(this._parts)) {
      spr.setFlipX(flip)
    }
  }

  // ─── UPDATE — sync container to physics body ──────────────────────────────

  update() {
    if (this._container && this._physBody) {
      this._container.setPosition(this._physBody.x, this._physBody.y)
    }
  }

  // ─── TINT (damage flash) ──────────────────────────────────────────────────

  setTint(color) {
    for (const spr of Object.values(this._parts)) spr.setTint(color)
  }

  clearTint() {
    for (const spr of Object.values(this._parts)) spr.clearTint()
  }

  /** Read-only access to individual part sprites (for one-shot event hooks). */
  get parts() { return this._parts }

  // ─── DESTROY ──────────────────────────────────────────────────────────────

  destroy() {
    this._container?.destroy()
    this._physBody?.destroy()
  }
}
