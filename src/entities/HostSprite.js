import Phaser from 'phaser'
import { ANIM_MANIFEST } from '../data/animManifest.js'

// ─── PART Z-ORDER (back → front within container) ─────────────────────────────
const PART_ORDER = ['RightLeg', 'RightArm', 'Torso', 'Head', 'LeftLeg', 'LeftArm', 'Weapon', 'FX']

// Y offset so each part sprite's bottom edge (origin 0.5,1) aligns with the
// physics body center. All part canvases are 96×84px; 84/2 = 42.
const PART_ORIGIN_Y = 42

// ─── GAME STATES TO PRELOAD ───────────────────────────────────────────────────
// Add state names here to enable them; must exist in ANIM_MANIFEST.
export const USED_STATES = [
  'Run',
  'Die',
  'SwordRun',
  'SwordSlash01',
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
    const firstState = USED_STATES[0]   // 'Run'
    const firstKey   = `${firstState}_Torso_01`

    // Invisible physics body — uses 1×1 'pixel' texture so it never bleeds through.
    // setOffset(-14,-16) aligns body.bottom with GROUND for the 1×1 texture.
    this._physBody = this.scene.physics.add.image(x, y, 'pixel')
      .setCollideWorldBounds(true)
      .setAlpha(0)
    this._physBody.setBodySize(28, 58).setOffset(-14, -16)
    this.scene.physics.add.collider(this._physBody, platforms)

    // Visual container — synced to physics body each update()
    this._container = this.scene.add.container(x, y).setDepth(10)

    // Create one sprite per part in z-order.
    // Removed from displayList immediately so the container is the sole render path;
    // stays in updateList so Phaser advances animation frames via preUpdate().
    // origin(0.5, 1) anchors each sprite's bottom-center to the foot line.
    for (const part of PART_ORDER) {
      const tex = this.scene.textures.exists(`${firstState}_${part}_01`)
        ? `${firstState}_${part}_01`
        : firstKey   // fallback for Weapon/FX parts

      const spr = this.scene.add.sprite(0, PART_ORIGIN_Y, tex).setOrigin(0.5, 1)
      this.scene.sys.displayList.remove(spr)
      spr.setVisible(false)
      this._parts[part] = spr
      this._container.add(spr)
    }

    this.play('Run')
  }

  // ─── PLAY ─────────────────────────────────────────────────────────────────
  // Plays all parts simultaneously. Updates visibility on every part every time
  // so no ghost frames from a previous state can linger.
  // For one-shot animations, auto-transitions to cfg.next when done.

  play(stateName, force = false) {
    const cfg = ANIM_MANIFEST[stateName]
    if (!cfg) { console.warn(`HostSprite.play: unknown state "${stateName}"`); return }
    if (!force && this._currentState === stateName) return

    this._currentState = stateName
    const hasParts = new Set(Object.keys(cfg.parts))

    // For every part: show/hide and play/skip — no part is ever left in a stale
    // visible state from a previous animation.
    // ignoreIfPlaying=!force: force=true always restarts from frame 1 (keeps parts in sync);
    // force=false avoids interrupting a loop that's already on the right animation.
    for (const part of PART_ORDER) {
      const spr = this._parts[part]
      if (!spr) continue

      const active = hasParts.has(part)
      spr.setVisible(active)   // hide parts this state doesn't use → no ghosting

      if (active) {
        const animKey = `${stateName}_${part}`
        if (this.scene.anims.exists(animKey)) spr.play(animKey, !force)
      }
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

  // ─── DESTROY ──────────────────────────────────────────────────────────────

  destroy() {
    this._container?.destroy()
    this._physBody?.destroy()
  }
}
