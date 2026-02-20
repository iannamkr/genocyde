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

// ─── 상태 우선순위 (높을수록 중단 불가) ──────────────────────────────────────
// 규칙: 낮은 priority 상태는 높은 priority 상태를 중단할 수 없음
// 'run'은 항상 예외 — 모든 상태의 완료 귀환점이므로 priority 무관하게 진입 허용
const STATE_PRIORITY = {
  run:         0,
  card_attack: 1,   // 카드 스킬 — AI가 덮어쓰기 불가
  auto_attack: 1,   // 자동 공격 — 카드 스킬로 중단 불가 (큐에서 대기)
  stunned:     2,   // 피격 — 일반 공격은 중단하지만 광분/사망에 덮어씌워짐
  rampage:     3,   // 광분 — stunned 포함 대부분 차단 (슈퍼아머)
  dead:        99,  // 사망 — 항상 진입 가능
}

export class Host {
  constructor(scene) {
    this.scene            = scene
    this._ps              = { ...PLAYER_STATS }
    this._state           = 'run' // 상태: 'run', 'auto_attack', 'card_attack', 'rampage', 'stunned', 'dead'
    this._autoCD          = 0
    this._stunTimer       = 0
    this._target          = null
    this._attackHit       = false
    this._invincibleTimer = 0
    this._stressAutoTimer = 3000
    this._runDustTimer    = 0
    this._wasInAir        = false
    this._currentAttack   = null
    this._hs              = new HostSprite(scene)
    
    // ★ 핵심: 행동 대기열 (애니메이션이 끝날 때까지 기다리는 큐)
    this._actionQueue     = [] 
  }

  get ps()         { return this._ps }
  get sprite()     { return this._hs.sprite }
  get state()      { return this._state }
  get invincible() { return this._invincibleTimer > 0 }

  // ─── STATE MACHINE CORE (액션 큐 관리) ────────────────────────────────────
  
  changeState(newState, animKey = null) {
    if (this._state === 'dead') return false

    // 우선순위 차단: 'run'/'dead'는 항상 허용, 그 외는 현재 상태보다 낮은 priority면 차단
    if (newState !== 'run' && newState !== 'dead') {
      const cur = STATE_PRIORITY[this._state] ?? 0
      const nxt = STATE_PRIORITY[newState]    ?? 0
      if (nxt < cur) return false
    }

    this._state = newState
    if (animKey) this._hs.play(animKey, true)

    // 'run'으로 복귀 시 대기 중인 다음 행동 실행
    if (newState === 'run') {
      if (this._actionQueue.length > 0) {
        const nextAction = this._actionQueue.shift()
        this.scene.time.delayedCall(10, nextAction)
      } else {
        this._resumeRunAnim()
      }
    }

    return true
  }

  // ─── BUILD ────────────────────────────────────────────────────────────────

  build() {
    this._hs.build(200, GROUND - 42, this.scene._platforms)
    this._attackVfx   = this.scene.add.graphics().setDepth(50)
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
      const maxDist = source.type === 'boss' ? 100 : 72
      if (Math.sqrt(dx * dx + dy * dy) > maxDist) return
    }
    
    this._ps.hp     = Math.max(0, this._ps.hp - dmg)
    this._ps.stress = Math.min(this._ps.maxStress, this._ps.stress + stressAdd)
    this._invincibleTimer = 500
    
    this.scene.msg.floatText(this.sprite.x, this.sprite.y - 40, `-${dmg}`, C.RED)
    this._hs.setTint(0xff3333)
    this.scene.time.delayedCall(400, () => this._hs.clearTint())

    if (this._ps.hp <= 0) {
      this.scene._endGame('defeat');
      return;
    }

    // 슈퍼아머: rampage(priority 3) 중엔 stunned(priority 2) 차단됨 — priority 시스템이 처리
    if (this.changeState('stunned', 'Stunned')) {
      this._stunTimer     = STUN_DUR
      this._currentAttack = null
    }
  }

  startAttack(type, dmg) {
    if (this._state === 'dead') return;
    
    // ★ 큐(Queue) 로직: 현재 다른 애니메이션(자동 공격, 광분 등) 재생 중이면 대기열에 넣고 종료
    if (this._state !== 'run') {
      this._actionQueue.push(() => this.startAttack(type, dmg));
      return;
    }
    
    const dur = type === 'light' ? 200 : 350
    this._currentAttack = { type, timer: dur, maxTimer: dur, hitSet: new Set(), dmg }
    
    // 상태 변경 및 스킬 애니메이션 실행
    this.changeState('card_attack', 'SwordRunSlash');

    this.scene.time.delayedCall(dur + 120, () => {
      // 내 애니메이션이 완전히 끝났을 때만 run 상태로 복귀
      if (this._state === 'card_attack') {
        this._currentAttack = null;
        this.changeState('run');
      }
    })
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

  playSkillEffect(type) {
    const x = this.sprite.x, y = this.sprite.y
    switch (type) {
      case 'slash': this._playFX('airSlash', x + 68, y - 18, { scale: 1.6, depth: 52 }); break;
      case 'heavy': 
        this._playFX('gSlam', x + 45, GROUND, { scale: 0.9, depth: 52, originY: 1 });
        this._playEffect('effHeavy', x + 70, y - 5, { scale: 0.65, depth: 9 });
        break;
      case 'aoe':   this._playEffect('effAoe', x + 12, y - 18, { scale: 1.8, depth: 52 }); break;
      case 'heal':  this._playEffect('effAoe', x, y - 20, { scale: 0.8, tint: 0x44ff88 }); break;
    }
  }

  // ─── MAIN UPDATE ─────────────────────────────────────────────────────────

  update(dt) {
    if (this._state === 'dead') return
    this._invincibleTimer = Math.max(0, this._invincibleTimer - dt)

    this._hs.update()

    const onGround = this.sprite.body.blocked.down
    if (this._wasInAir && onGround)
      this._playFX('landDust', this.sprite.x, GROUND, { scale: 1.2, originY: 1 })
    this._wasInAir = !onGround

    this._updateAI(dt)
    this._updateAttack(dt)
    this._updateStress(dt)
    this._updateRampageAura()
  }

  // ─── AI (완벽한 상태 격리) ─────────────────────────────────────────────────

  _updateAI(dt) {
    if (this.scene._gameOver || this._state === 'dead') return

    if (this.scene.cardFactory.geneUI) {
      this.sprite.setVelocityX(0)
      if (this._state === 'run') this._hs.play('Idle')
      return
    }

    switch (this._state) {
      
      case 'run': {
        this._autoCD = Math.max(0, this._autoCD - dt)
        const nearest = this.scene.dist.closestEnemy1D(this.scene.enemies.enemies, this.sprite.x, AUTO_ATK_RANGE)
        
        if (nearest && this._autoCD <= 0) {
          // 자동 공격 진입
          this.changeState('auto_attack', 'SwordSlash01')
          this._target    = nearest
          this._attackHit = false
          this.sprite.setVelocityX(0)

          this.scene.time.delayedCall(ATTACK_DUR * 0.4, () => {
            if (this._state !== 'auto_attack' || !this._target || this._attackHit) return
            this._attackHit = true
            if (this._target.state !== 'DEAD') {
              this.scene.msg.showHitVfx(this._target.sprite.x, this._target.sprite.y)
              this.scene.enemies.hitEnemy(this._target, AUTO_ATK_DMG)
            }
          })
          
          this.scene.time.delayedCall(ATTACK_DUR, () => {
            if (this._state === 'auto_attack') {
              this._autoCD = AUTO_ATK_CD
              this.changeState('run')
            }
          })
        } 
        else {
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

      case 'card_attack': {
        const anyNearCard = this.scene.dist.hasEnemyNear1D(this.scene.enemies.enemies, this.sprite.x, ENEMY_NEAR_DIST)
        this.sprite.setVelocityX(anyNearCard ? SPEED_NEAR : SPEED_FAR)
        break
      }

      case 'auto_attack':
      case 'rampage': {
        this.sprite.setVelocityX(0)
        break
      }

      case 'stunned': {
        this._stunTimer -= dt
        this.sprite.setVelocityX(-50)
        if (this._stunTimer <= 0) { 
          this.changeState('run')
        }
        break
      }
    }
  }

  _resumeRunAnim() {
    const anyNear = this.scene.dist.hasEnemyNear1D(
      this.scene.enemies.enemies, this.sprite.x, ENEMY_NEAR_DIST
    )
    this._hs.play(anyNear ? 'SwordRun' : 'Run', true)
  }

  // ─── CARD ATTACK HITBOX ───────────────────────────────────────────────────

  _updateAttack(dt) {
    if (!this._currentAttack) return
    const atk = this._currentAttack
    atk.timer -= dt

    const atkW = atk.type === 'light' ? 90  : 130
    const atkH = atk.type === 'light' ? 65  : 90
    const col  = atk.type === 'light' ? C.CYAN : C.PINK
    const px   = this.sprite.x + (10 + atkW / 2)
    const py   = this.sprite.y

    this._attackVfx.clear()
    this._attackVfx.fillStyle(col, 0.35)
    this._attackVfx.fillRect(px - atkW/2, py - atkH/2, atkW, atkH)
    this._attackVfx.lineStyle(2, col, 0.9)
    this._attackVfx.strokeRect(px - atkW/2, py - atkH/2, atkW, atkH)

    for (const e of this.scene.enemies.enemies) {
      if (e.state === 'DEAD' || atk.hitSet.has(e)) continue
      const dx = Math.abs(e.sprite.x - px), dy = Math.abs(e.sprite.y - py)
      if (dx < atkW/2 + 12 && dy < atkH/2 + 18) {
        atk.hitSet.add(e)
        let dmg = atk.dmg
        if (e.type === 'shieldBearer' && e.facing === -1) {
          dmg = Math.floor(dmg * 0.5)
          this.scene.msg.floatText(e.sprite.x, e.sprite.y - 35, 'BLOCK!', C.CYAN)
        }
        this.scene.msg.showHitVfx(e.sprite.x, e.sprite.y)
        this.scene.enemies.hitEnemy(e, dmg)
      }
    }
    if (atk.timer <= 0) { this._currentAttack = null; this._attackVfx.clear() }
  }

  // ─── STRESS / RAMPAGE ─────────────────────────────────────────────────────

  _updateStress(dt) {
    if (this._ps.stress < this._ps.maxStress) { this._stressAutoTimer = 3000; return }
    this._stressAutoTimer -= dt
    if (this._stressAutoTimer <= 0) { this._stressAutoTimer = 3000; this._triggerRampage() }
  }

  _triggerRampage() {
    if (this._state === 'dead' || this._state === 'rampage') return;
    
    // ★ 큐(Queue) 로직: 다른 행동 중이면 최우선 순위로 대기열 맨 앞에 넣음
    if (this._state !== 'run') {
       this._actionQueue.unshift(() => this._triggerRampage());
       return;
    }

    this.scene.msg.showRampageTxt()
    this.changeState('rampage', 'ShockHeavy')

    const torso = this._hs.parts.Torso
    if (torso) {
      torso.once(Phaser.Animations.Events.ANIMATION_COMPLETE, () => {
        if (this._state === 'rampage') {
          this.changeState('run')
        }
      })
    }
    
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
    this.changeState('dead', 'Die');
    this.sprite.setVelocityX(0)
  }
}