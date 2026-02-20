import Phaser from 'phaser'
import { PLAYER_STATS } from '../data/gameData.js'
import { C } from '../utils/draw.js'
import { AUTO_ATK_RANGE, ENEMY_NEAR_DIST } from '../systems/DistanceSystem.js'
import { HostSprite } from './HostSprite.js'

const GROUND       = 580
const SPEED_FAR    = 190
const SPEED_NEAR   = 110
const AUTO_ATK_DMG = 7
const AUTO_ATK_CD  = 650
const ATTACK_DUR   = 500
const STUN_DUR     = 420

export class Host {
  constructor(scene) {
    this.scene            = scene
    this._ps              = { ...PLAYER_STATS }
    this._state           = 'run' // 'run' | 'auto_attack' | 'stunned' | 'dead'
    this._autoCD          = 0
    this._target          = null
    this._attackHit       = false
    this._invincibleTimer = 0
    this._stressAutoTimer = 3000
    this._runDustTimer    = 0
    this._wasInAir        = false
    this._hs              = new HostSprite(scene)
    this._actionQueue     = []
    this._actionTimer     = 0
  }

  get ps()         { return this._ps }
  get sprite()     { return this._hs.sprite }
  get state()      { return this._state }
  get invincible() { return this._invincibleTimer > 0 }

  // ─── STATE MACHINE ────────────────────────────────────────────────────────

  changeState(newState, animKey = null) {
    if (this._state === 'dead') return
    this._state = newState
    if (animKey) this._hs.play(animKey, true)

    if (newState === 'run') {
      if (this._actionQueue.length > 0) {
        this._actionQueue.shift()()
      } else {
        this._resumeRunAnim()
      }
    }
  }

  // ─── BUILD ────────────────────────────────────────────────────────────────

  build() {
    this._hs.build(200, GROUND - 42, this.scene._platforms)
    this._rampageAura = this.scene.add.graphics().setDepth(15)
  }

  // ─── PUBLIC ACTIONS ───────────────────────────────────────────────────────

  applyCardCosts(hpCost, stressCost) {
    if (hpCost !== 0)
      this._ps.hp = Phaser.Math.Clamp(this._ps.hp - hpCost, 0, this._ps.maxHp)
    if (stressCost !== 0)
      this._ps.stress = Phaser.Math.Clamp(this._ps.stress + stressCost, 0, this._ps.maxStress)
  }

  takeDamage(dmg, stressAdd, source) {
    if (this._invincibleTimer > 0 || this.scene._gameOver || this._state === 'dead') return
    if (source) {
      const dx = source.sprite.x - this.sprite.x
      const dy = source.sprite.y - this.sprite.y
      if (Math.sqrt(dx * dx + dy * dy) > (source.type === 'boss' ? 100 : 72)) return
    }

    this._ps.hp     = Math.max(0, this._ps.hp - dmg)
    this._ps.stress = Math.min(this._ps.maxStress, this._ps.stress + stressAdd)
    this._invincibleTimer = 500

    this.scene.msg.floatText(this.sprite.x, this.sprite.y - 40, `-${dmg}`, C.RED)
    this._hs.setTint(0xff3333)
    this.scene.time.delayedCall(400, () => this._hs.clearTint())

    if (this._ps.hp <= 0) { this.scene._endGame('defeat'); return }

    if (this._state === 'run') {
      this._actionTimer = STUN_DUR
      this.changeState('stunned', 'Stunned')
    }
  }

  triggerAoE(dmg) {
    this.scene.enemies.hitAllInRange(this.sprite.x, this.sprite.y, 240, dmg)
    const boom = this.scene.add.graphics().setDepth(60)
    boom.fillStyle(C.GREEN, 0.18); boom.fillCircle(this.sprite.x, this.sprite.y, 240)
    boom.lineStyle(3, C.GREEN);    boom.strokeCircle(this.sprite.x, this.sprite.y, 240)
    this.scene.time.delayedCall(400, () => boom.destroy())
  }

  triggerDash() {
    this._invincibleTimer = Math.max(this._invincibleTimer, 500)
    this._playFX('dashDust', this.sprite.x, GROUND, { scale: 1.3, originY: 1 })
    this.scene.msg.floatText(this.sprite.x, this.sprite.y - 30, '회피!', C.PURPLE)
  }

  // ─── UPDATE ───────────────────────────────────────────────────────────────

  update(dt) {
    if (this._state === 'dead') return
    this._invincibleTimer = Math.max(0, this._invincibleTimer - dt)

    this._hs.update()

    const onGround = this.sprite.body.blocked.down
    if (this._wasInAir && onGround)
      this._playFX('landDust', this.sprite.x, GROUND, { scale: 1.2, originY: 1 })
    this._wasInAir = !onGround

    this._updateAI(dt)
    this._updateStress(dt)
    this._updateRampageAura()
  }

  // ─── AI ───────────────────────────────────────────────────────────────────

  _updateAI(dt) {
    if (this.scene._gameOver || this._state === 'dead') return

    if (this.scene.cardFactory.geneUI) {
      this.sprite.setVelocityX(0)
      return
    }

    switch (this._state) {

      case 'run': {
        this._autoCD = Math.max(0, this._autoCD - dt)
        const nearest = this.scene.dist.closestEnemy1D(this.scene.enemies.enemies, this.sprite.x, AUTO_ATK_RANGE)

        if (nearest && this._autoCD <= 0) {
          this._target      = nearest
          this._attackHit   = false
          this._actionTimer = ATTACK_DUR
          this.changeState('auto_attack', 'SwordSlash01')
        } else {
          const anyNear = this.scene.dist.hasEnemyNear1D(this.scene.enemies.enemies, this.sprite.x, ENEMY_NEAR_DIST)
          this.sprite.setVelocityX(anyNear ? SPEED_NEAR : SPEED_FAR)
          this._hs.play(anyNear ? 'SwordRun' : 'Run')

          if (this.sprite.body.blocked.down) {
            this._runDustTimer -= dt
            if (this._runDustTimer <= 0) {
              this._playFX('runDust', this.sprite.x - 14, GROUND, { originY: 1 })
              this._runDustTimer = 210
            }
          }
        }
        break
      }

      case 'auto_attack': {
        this.sprite.setVelocityX(0)
        this._actionTimer -= dt
        if (!this._attackHit && this._actionTimer <= ATTACK_DUR * 0.6) {
          this._attackHit = true
          if (this._target?.state !== 'DEAD') {
            this.scene.msg.showHitVfx(this._target.sprite.x, this._target.sprite.y)
            this.scene.enemies.hitEnemy(this._target, AUTO_ATK_DMG)
          }
        }
        if (this._actionTimer <= 0) {
          this._autoCD = AUTO_ATK_CD
          this.changeState('run')
        }
        break
      }

      case 'stunned': {
        this.sprite.setVelocityX(-50)
        this._actionTimer -= dt
        if (this._actionTimer <= 0) this.changeState('run')
        break
      }
    }
  }

  _resumeRunAnim() {
    const anyNear = this.scene.dist.hasEnemyNear1D(this.scene.enemies.enemies, this.sprite.x, ENEMY_NEAR_DIST)
    this._hs.play(anyNear ? 'SwordRun' : 'Run', true)
  }

  // ─── STRESS / RAMPAGE ─────────────────────────────────────────────────────

  _updateStress(dt) {
    if (this._ps.stress < this._ps.maxStress) { this._stressAutoTimer = 3000; return }
    this._stressAutoTimer -= dt
    if (this._stressAutoTimer <= 0) { this._stressAutoTimer = 3000; this._triggerRampage() }
  }

  _triggerRampage() {
    if (this._state === 'dead') return
    if (this._state !== 'run') {
      this._actionQueue.unshift(() => this._triggerRampage())
      return
    }

    this.scene.msg.showRampageTxt()
    this._playEffect('effAoe', this.sprite.x, this.sprite.y - 20, { scale: 1.4, tint: 0xff2d78, depth: 16 })
    this._playFX('gSlam', this.sprite.x + 20, GROUND, { scale: 1.2, depth: 16, originY: 1 })
    this.scene.enemies.hitAllInRange(this.sprite.x, this.sprite.y, 220, 40)

    const boom = this.scene.add.graphics().setDepth(60)
    boom.fillStyle(C.PINK, 0.3); boom.fillCircle(this.sprite.x, this.sprite.y, 220)
    boom.lineStyle(3, C.PINK);   boom.strokeCircle(this.sprite.x, this.sprite.y, 220)
    boom.lineStyle(2, C.PURPLE); boom.strokeCircle(this.sprite.x, this.sprite.y, 140)
    this.scene.time.delayedCall(350, () => boom.destroy())
  }

  _updateRampageAura() {
    if (this._ps.stress < this._ps.maxStress || this.scene._gameOver) {
      this._rampageAura.clear()
      return
    }
    const t  = this.scene.time.now / 380
    const r1 = 32 + Math.sin(t) * 7
    const r2 = 22 + Math.sin(t * 1.7) * 5
    const a1 = 0.35 + Math.sin(t * 2.1) * 0.18
    const px = this.sprite.x, py = this.sprite.y - 22

    this._rampageAura.clear()
    this._rampageAura.lineStyle(3, C.RED, a1 + 0.15)
    this._rampageAura.strokeCircle(px, py, r1)
    this._rampageAura.lineStyle(2, C.PINK, a1)
    this._rampageAura.strokeCircle(px, py, r2)
    for (let k = 0; k < 8; k++) {
      const angle = (k / 8) * Math.PI * 2 + t * 0.5
      this._rampageAura.lineStyle(1, C.RED, a1 * 0.7)
      this._rampageAura.lineBetween(
        px + Math.cos(angle) * r1, py + Math.sin(angle) * r1,
        px + Math.cos(angle) * (r1 + 8), py + Math.sin(angle) * (r1 + 8),
      )
    }
  }

  // ─── FX HELPERS ──────────────────────────────────────────────────────────
  // _playFX   : frame-by-frame images (key_01, key_02 …)
  // _playEffect: spritesheet texture (single image, frame 0)

  _playFX(key, x, y, opts = {}) {
    const { scale = 1, flipX = false, tint, depth = 55, originY = 0.5 } = opts
    if (!this.scene.textures.exists(`${key}_01`)) return
    const spr = this.scene.add.sprite(x, y, `${key}_01`)
      .setDepth(depth).setScale(scale).setFlipX(flipX).setOrigin(0.5, originY)
    if (tint !== undefined) spr.setTint(tint)
    if (this.scene.anims.exists(key)) {
      spr.play(key)
      spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (spr.active) spr.destroy() })
    } else {
      this.scene.time.delayedCall(300, () => { if (spr.active) spr.destroy() })
    }
  }

  _playEffect(key, x, y, opts = {}) {
    const { scale = 1, flipX = false, tint, depth = 55 } = opts
    if (!this.scene.textures.exists(key)) return
    const spr = this.scene.add.sprite(x, y, key, 0)
      .setDepth(depth).setScale(scale).setFlipX(flipX)
    if (tint !== undefined) spr.setTint(tint)
    if (this.scene.anims.exists(key)) {
      spr.play(key)
      spr.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => { if (spr.active) spr.destroy() })
    } else {
      this.scene.time.delayedCall(400, () => { if (spr.active) spr.destroy() })
    }
  }

  // ─── DEATH ────────────────────────────────────────────────────────────────

  die() {
    this.changeState('dead', 'Die')
    this.sprite.setVelocityX(0)
  }
}
