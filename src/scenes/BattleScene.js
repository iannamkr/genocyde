import Phaser from 'phaser'
import { SKILLS, createState } from '../data/gameData.js'
import { C, drawRoundRect } from '../utils/draw.js'

const W = 1280
const H = 720

export class BattleScene extends Phaser.Scene {
  constructor() {
    super('BattleScene')
  }

  create() {
    this.state = createState()
    this._buildUI()
    this._newGame()
  }

  // ─── NEW GAME ───────────────────────────────

  _newGame() {
    this.state = createState()
    this.overlay.setVisible(false)
    this._clearLog()
    this._log('▶ 저주받은 검이 깨어났다. 숙주를 통해 세계를 관찰한다.', C.DIM)
    this._logSep()
    this._log('턴 1 시작. 스킬을 선택하라.', C.DIM)
    this._log('⚠ 보스: 플레이어 1열에 30 데미지 예고', C.ORANGE)
    this._log('⚠ 쫄따구: 플레이어 1~2열 전체에 스트레스 30 예고', C.ORANGE)
    this._render()
  }

  // ─── UI BUILD ───────────────────────────────

  _buildUI() {
    const s = this.state

    // Phase bar background
    this.add.rectangle(0, 0, W, 30, C.BG2).setOrigin(0, 0)
    this.phaseText = this.add.text(W / 2, 15, '', {
      fontSize: '13px', fill: C.hex(C.GOLD), fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5)

    // Log panel background
    this.add.rectangle(0, 30, W, 140, C.BG2).setOrigin(0, 0)
    this._logLines = []
    this._logY = 36

    // Battlefield background
    this.add.rectangle(0, 170, W, 400, C.BG).setOrigin(0, 0)

    // Divider
    this.add.rectangle(W / 2, 170, 2, 400, C.BORDER).setOrigin(0.5, 0)

    // Rank slot labels & slots
    this._pSlots = []  // index = rank-1
    this._eSlots = []  // index = rank-1
    this._buildSlots()

    // Skill area background
    this.add.rectangle(0, 570, W, 150, C.BG2).setOrigin(0, 0)
    this._skillPanels = []
    this._buildSkillPanels()

    // Overlay
    this._buildOverlay()
  }

  _buildSlots() {
    const slotW = 130
    const slotH = 200
    const slotY = 170 + 200  // vertical center of battlefield

    // Player side: P4 P3 P2 P1 (rank1 closest to center)
    const pRank1X = W / 2 - 20 - slotW / 2
    for (let r = 1; r <= 4; r++) {
      const x = pRank1X - (r - 1) * (slotW + 10)
      const slot = this._makeSlot(x, slotY, slotW, slotH, `P${r}열`)
      this._pSlots[r - 1] = slot
    }

    // Enemy side: E1 E2 E3 E4 (rank1 closest to center)
    const eRank1X = W / 2 + 20 + slotW / 2
    for (let r = 1; r <= 4; r++) {
      const x = eRank1X + (r - 1) * (slotW + 10)
      const slot = this._makeSlot(x, slotY, slotW, slotH, `E${r}열`)
      this._eSlots[r - 1] = slot
    }
  }

  _makeSlot(x, y, w, h, label) {
    const bg = this.add.graphics()
    drawRoundRect(bg, x - w / 2, y - h / 2, w, h, 4, C.BG2, C.BORDER, 1)

    const rankLbl = this.add.text(x, y - h / 2 + 6, label, {
      fontSize: '9px', fill: C.hex(C.BORDER), fontFamily: 'monospace'
    }).setOrigin(0.5, 0)

    return { x, y, w, h, bg, rankLbl, entities: [] }
  }

  _buildSkillPanels() {
    const panelW = 240
    const panelH = 118
    const startX = W / 2 - (panelW + 12)
    const y = 570 + 75

    SKILLS.forEach((sk, i) => {
      const x = startX + i * (panelW + 10)
      const panel = this._makeSkillPanel(x, y, panelW, panelH, sk, i)
      this._skillPanels.push(panel)
    })
  }

  _makeSkillPanel(x, y, w, h, sk, idx) {
    const bg = this.add.graphics()
    drawRoundRect(bg, x - w / 2, y - h / 2, w, h, 3, C.BG2, C.BORDER, 1)

    // Accent bar
    const accent = this.add.rectangle(x - w / 2 + 1.5, y, 3, h - 2, sk.accent)
      .setOrigin(0.5, 0.5)

    const nameT = this.add.text(x - w / 2 + 12, y - h / 2 + 6, sk.name, {
      fontSize: '13px', fill: C.hex(C.GOLD), fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0, 0)

    const geneT = this.add.text(x - w / 2 + 12, y - h / 2 + 22, sk.gene || '─', {
      fontSize: '9px', fill: C.hex(C.DIM), fontFamily: 'monospace'
    }).setOrigin(0, 0)

    const useT = this.add.text(x - w / 2 + 12, y - h / 2 + 33, '사용: ' + dots(sk.useRanks), {
      fontSize: '11px', fill: C.hex(C.DIM), fontFamily: 'monospace'
    }).setOrigin(0, 0)

    const tgtText = sk.targetType === 'self'     ? '타겟: 자신'
                  : sk.targetType === 'enemy_all' ? '타겟: ' + dots([1,2,3,4]) + ' (전체)'
                  :                                 '타겟: ' + dots(sk.targetRanks)
    const tgtT = this.add.text(x - w / 2 + 12, y - h / 2 + 46, tgtText, {
      fontSize: '11px', fill: C.hex(C.DIM), fontFamily: 'monospace'
    }).setOrigin(0, 0)

    const costT = this.add.text(x - w / 2 + 12, y - h / 2 + 59, sk.costDesc, {
      fontSize: '10px', fill: C.hex(C.RED), fontFamily: 'monospace'
    }).setOrigin(0, 0)

    const effT = this.add.text(x - w / 2 + 12, y - h / 2 + 71, sk.effectDesc, {
      fontSize: '10px', fill: C.hex(C.GREEN), fontFamily: 'monospace'
    }).setOrigin(0, 0)

    // Hit area
    const hitZone = this.add.zone(x, y, w, h).setInteractive({ cursor: 'pointer' })
    hitZone.on('pointerdown', () => this._onSkillClick(idx))
    hitZone.on('pointerover', () => { if (!this._isSkillDisabled(idx)) bg.setAlpha(1.15) })
    hitZone.on('pointerout',  () => bg.setAlpha(1))

    return { x, y, w, h, bg, accent, hitZone, texts: [nameT, geneT, useT, tgtT, costT, effT] }
  }

  _buildOverlay() {
    this.overlay = this.add.container(W / 2, H / 2)

    const bg = this.add.rectangle(0, 0, W, H, 0x000000, 0.88)
    const title = this.add.text(0, -60, '', {
      fontSize: '28px', fill: C.hex(C.GREEN), fontFamily: 'monospace', fontStyle: 'bold'
    }).setOrigin(0.5, 0.5)
    const msg = this.add.text(0, 0, '', {
      fontSize: '13px', fill: C.hex(C.DIM), fontFamily: 'monospace', align: 'center', lineSpacing: 6
    }).setOrigin(0.5, 0.5)

    // Restart button
    const btnBg = this.add.rectangle(0, 70, 180, 36, C.BG2)
      .setStrokeStyle(1, C.GOLD)
      .setInteractive({ cursor: 'pointer' })
    const btnTxt = this.add.text(0, 70, '[ 다시 시작 ]', {
      fontSize: '13px', fill: C.hex(C.GOLD), fontFamily: 'monospace'
    }).setOrigin(0.5, 0.5)

    btnBg.on('pointerdown', () => this._newGame())
    btnBg.on('pointerover',  () => btnBg.setFillStyle(0x1e1308))
    btnBg.on('pointerout',   () => btnBg.setFillStyle(C.BG2))

    this.overlay.add([bg, title, msg, btnBg, btnTxt])
    this.overlay.setVisible(false)

    // Store refs
    this.overlay.titleText = title
    this.overlay.msgText   = msg
  }

  // ─── RENDER ─────────────────────────────────

  _render() {
    this._renderPhase()
    this._renderPlayerSlots()
    this._renderEnemySlots()
    this._renderSkills()
  }

  _renderPhase() {
    const map = { player: '⚡ 플레이어 턴', enemy: '☠ 적의 행동 중...', done: '■ 전투 종료' }
    this.phaseText.setText(`${map[this.state.phase]}  —  턴 ${this.state.turn}`)
  }

  _renderPlayerSlots() {
    const { host } = this.state
    for (let r = 1; r <= 4; r++) {
      const slot = this._pSlots[r - 1]
      this._clearSlot(slot)
      if (host.rank === r) this._drawHostCard(slot)
    }
  }

  _renderEnemySlots() {
    const { boss, minion, selectedSkill, waitingTarget } = this.state
    for (let r = 1; r <= 4; r++) {
      const slot = this._eSlots[r - 1]
      this._clearSlot(slot)

      const isTarget = waitingTarget &&
        selectedSkill >= 0 &&
        SKILLS[selectedSkill].targetType === 'enemy_single' &&
        SKILLS[selectedSkill].targetRanks.includes(r)

      // Redraw slot border
      slot.bg.clear()
      const borderCol = isTarget ? C.GOLD : C.BORDER
      drawRoundRect(slot.bg, slot.x - slot.w/2, slot.y - slot.h/2, slot.w, slot.h, 4, C.BG2, borderCol, isTarget ? 2 : 1)

      if (boss.alive && boss.rank === r) {
        this._drawEnemyCard(slot, boss, '☠ 보스', '👁', '플레이어 1열에 데미지 30', C.RED2, isTarget, 'boss')
      } else if (minion.alive && minion.rank === r) {
        this._drawEnemyCard(slot, minion, '⚡ 쫄따구', '💀', '플레이어 1~2열에 스트레스 30', C.ORANGE, isTarget, 'minion')
      }
    }
  }

  _clearSlot(slot) {
    slot.entities?.forEach(e => e.destroy())
    slot.entities = []
  }

  _drawHostCard(slot) {
    const { host } = this.state
    const { x, y, h } = slot
    const objs = []

    objs.push(this.add.text(x, y - h/2 + 30, '⚔', { fontSize: '32px' }).setOrigin(0.5, 0))
    objs.push(this.add.text(x, y - h/2 + 68, '숙주', { fontSize: '11px', fill: C.hex(C.BLUE), fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5, 0))
    objs.push(this.add.text(x, y - h/2 + 82, `HP ${Math.max(0, host.hp)} / ${host.maxHp}`, { fontSize: '10px', fill: C.hex(C.RED2), fontFamily: 'monospace' }).setOrigin(0.5, 0))
    objs.push(...this._drawBar(x, y - h/2 + 95, 90, host.hp / host.maxHp, C.RED))
    objs.push(this.add.text(x, y - h/2 + 104, `스트레스 ${host.stress} / ${host.maxStress}`, { fontSize: '10px', fill: C.hex(C.PURPLE), fontFamily: 'monospace' }).setOrigin(0.5, 0))
    objs.push(...this._drawBar(x, y - h/2 + 117, 90, host.stress / host.maxStress, C.PURPLE))

    slot.entities = objs
  }

  _drawEnemyCard(slot, enemy, label, portrait, warn, color, isTarget, id) {
    const { x, y, h } = slot
    const objs = []

    objs.push(this.add.text(x, y - h/2 + 8, `[예고] ${warn}`, {
      fontSize: '9px', fill: '#ff7777', fontFamily: 'monospace', align: 'center', wordWrap: { width: 100 }
    }).setOrigin(0.5, 0))

    objs.push(this.add.text(x, y - h/2 + 36, portrait, { fontSize: '32px' }).setOrigin(0.5, 0))
    objs.push(this.add.text(x, y - h/2 + 74, label, { fontSize: '11px', fill: C.hex(color), fontFamily: 'monospace', fontStyle: 'bold' }).setOrigin(0.5, 0))
    objs.push(this.add.text(x, y - h/2 + 88, `HP ${Math.max(0, enemy.hp)} / ${enemy.maxHp}`, { fontSize: '10px', fill: C.hex(C.RED2), fontFamily: 'monospace' }).setOrigin(0.5, 0))
    objs.push(...this._drawBar(x, y - h/2 + 101, 90, enemy.hp / enemy.maxHp, C.RED))

    if (isTarget) {
      const hitZone = this.add.zone(x, y, slot.w, slot.h).setInteractive({ cursor: 'pointer' })
      hitZone.on('pointerdown', () => this._onEnemyClick(id))
      this.tweens.add({ targets: slot.bg, alpha: { from: 0.7, to: 1 }, duration: 600, yoyo: true, repeat: -1 })
      objs.push(hitZone)
    } else {
      this.tweens.killTweensOf(slot.bg)
      slot.bg.setAlpha(1)
    }

    slot.entities = objs
  }

  _drawBar(x, y, width, ratio, color) {
    const bg   = this.add.rectangle(x, y, width, 5, 0x1a0804).setOrigin(0.5, 0)
    const fill = this.add.rectangle(x - width/2, y, width * Math.max(0, Math.min(1, ratio)), 5, color).setOrigin(0, 0)
    return [bg, fill]
  }

  _renderSkills() {
    const { phase, state } = this
    SKILLS.forEach((sk, i) => {
      const panel     = this._skillPanels[i]
      const disabled  = this._isSkillDisabled(i)
      const selected  = this.state.selectedSkill === i

      panel.texts.forEach(t => t.setAlpha(disabled ? 0.3 : 1))
      panel.hitZone.setInteractive(disabled ? {} : { cursor: 'pointer' })

      panel.bg.clear()
      const bgCol     = selected ? 0x1e1308 : C.BG2
      const borderCol = selected ? C.GOLD   : C.BORDER
      drawRoundRect(panel.bg, panel.x - panel.w/2, panel.y - panel.h/2, panel.w, panel.h, 3, bgCol, borderCol, selected ? 2 : 1)
      if (disabled) panel.bg.setAlpha(0.3)
      else          panel.bg.setAlpha(1)
    })
  }

  _isSkillDisabled(idx) {
    const { phase, host, selectedSkill, waitingTarget } = this.state
    if (phase !== 'player') return true
    return !SKILLS[idx].useRanks.includes(host.rank)
  }

  // ─── SKILL CLICK ─────────────────────────────

  _onSkillClick(idx) {
    const { phase, host, selectedSkill, waitingTarget } = this.state
    if (phase !== 'player') return
    if (!SKILLS[idx].useRanks.includes(host.rank)) return

    // Toggle off
    if (selectedSkill === idx && waitingTarget) {
      this.state.selectedSkill = -1
      this.state.waitingTarget = false
      this._log('스킬 선택 취소.', C.DIM)
      this._render()
      return
    }

    this.state.selectedSkill = idx
    const sk = SKILLS[idx]

    if (sk.targetType === 'self')      return this._execRetreat()
    if (sk.targetType === 'enemy_all') return this._execAcid()

    this.state.waitingTarget = true
    this._log('[일반 베기] 타겟을 선택하세요.', C.DIM)
    this._render()
  }

  _onEnemyClick(id) {
    const { waitingTarget, selectedSkill } = this.state
    if (!waitingTarget || selectedSkill < 0) return

    this.state.selectedSkill = -1
    this.state.waitingTarget = false
    this._execSlash(id)
  }

  // ─── SKILL EXECUTION ─────────────────────────

  _execRetreat() {
    this._logSep()
    this._log('▶ [기괴한 후퇴] 발동', C.BLUE)
    this._log('검의 강요로 숙주가 비틀거리며 뒤로 물러선다.', C.DIM)

    const oldRank = this.state.host.rank
    this.state.host.stress += 40
    this.state.host.rank    = Math.min(4, this.state.host.rank + 1)
    this.state.selectedSkill = -1

    this._log(`스트레스 +40 → ${this.state.host.stress}/${this.state.host.maxStress}`, C.PURPLE)
    this._log(`숙주 위치: ${oldRank}열 → ${this.state.host.rank}열`, C.BLUE)
    this._afterSkill()
  }

  _execAcid() {
    this._logSep()
    this._log('▶ [산성 분비] 발동', C.BLUE)
    this._log('숙주의 몸이 녹아내리며 강산이 분출된다.', C.DIM)

    this.state.host.hp -= 20
    this._log(`숙주 HP -20 → ${Math.max(0, this.state.host.hp)}/${this.state.host.maxHp}`, C.RED)

    for (const enemy of [this.state.boss, this.state.minion]) {
      if (enemy.alive) {
        enemy.hp -= 10
        const lbl = enemy === this.state.boss ? '☠ 보스' : '⚡ 쫄따구'
        this._log(`${lbl} HP -10 → ${Math.max(0, enemy.hp)}/${enemy.maxHp}`, C.RED)
      }
    }

    this.state.selectedSkill = -1
    this._afterSkill()
  }

  _execSlash(id) {
    const enemy = id === 'boss' ? this.state.boss : this.state.minion
    const lbl   = id === 'boss' ? '☠ 보스' : '⚡ 쫄따구'

    this._logSep()
    this._log(`▶ [일반 베기] → ${lbl}`, C.BLUE)
    this._log('검이 냉혹하게 적을 베어낸다.', C.DIM)

    enemy.hp -= 5
    this._log(`${lbl} HP -5 → ${Math.max(0, enemy.hp)}/${enemy.maxHp}`, C.RED)
    this._afterSkill()
  }

  // ─── TURN FLOW ───────────────────────────────

  _afterSkill() {
    if (this.state.boss.alive && this.state.boss.hp <= 0) {
      this.state.boss.alive        = false
      this.state.bossDiedThisTurn  = true
      this._log('☠ 보스 처치!', C.GREEN)
    }
    if (this.state.minion.alive && this.state.minion.hp <= 0) {
      this.state.minion.alive = false
      this._log('⚡ 쫄따구 처치!', C.GREEN)
    }

    this.state.phase = 'enemy'
    this._render()

    this.time.delayedCall(500, () => this._runEnemyPhase())
  }

  _runEnemyPhase() {
    const { boss, minion, host } = this.state

    if (boss.alive || minion.alive) this._log('── 적 행동 ──', C.DIM)

    if (boss.alive) {
      if (host.rank === 1) {
        this._log('☠ 보스: 1열 공격! 숙주에게 30 데미지!', C.RED2)
        this.state.host.hp -= 30
      } else {
        this._log(`☠ 보스: 1열 공격 — 숙주가 ${host.rank}열에 있어 빗나감!`, C.DIM)
      }
    }

    if (minion.alive) {
      if (host.rank <= 2) {
        this._log('⚡ 쫄따구: 저주! 스트레스 +30', C.PURPLE)
        this.state.host.stress += 30
      } else {
        this._log(`⚡ 쫄따구: 저주 — 숙주가 ${host.rank}열에 있어 범위 밖!`, C.DIM)
      }
    }

    this.time.delayedCall(400, () => this._resolve())
  }

  _resolve() {
    this._render()

    if (this.state.bossDiedThisTurn) {
      this.time.delayedCall(300, () => this._endGame('victory'))
      return
    }
    if (this.state.host.hp <= 0) {
      this._log('숙주의 심장이 멈췄다.', C.RED2)
      this._render()
      this.time.delayedCall(300, () => this._endGame('hp'))
      return
    }
    if (this.state.host.stress >= this.state.host.maxStress) {
      this._log('숙주가 발광했다. 통제 불능.', C.RED2)
      this._render()
      this.time.delayedCall(300, () => this._endGame('stress'))
      return
    }

    this.state.turn++
    this.state.bossDiedThisTurn = false
    this.state.phase = 'player'
    this._logSep()
    this._log(`턴 ${this.state.turn} 시작.`, C.DIM)
    this._render()
  }

  // ─── WIN / LOSE ──────────────────────────────

  _endGame(reason) {
    this.state.phase = 'done'
    this._render()

    if (reason === 'victory') {
      this.overlay.titleText.setText('유전자 획득 성공').setStyle({ fill: C.hex(C.GREEN) })
      this.overlay.msgText.setText('적 보스 처치 완료.\n희귀 유전자를 흡수하였다.\n\n숙주의 희생은... 기억하지 않겠다.')
    } else {
      this.overlay.titleText.setText('숙주 폐기됨').setStyle({ fill: C.hex(C.RED2) })
      const detail = reason === 'hp' ? '숙주의 HP가 고갈되었다.' : '숙주가 발광 상태에 빠졌다.'
      this.overlay.msgText.setText(`${detail}\n유전자 획득 실패.\n\n다음 숙주를 찾아야 한다...`)
    }

    this.overlay.setVisible(true)
  }

  // ─── LOG ─────────────────────────────────────

  _log(text, color = C.DIM) {
    const LOG_X    = 14
    const LOG_TOP  = 36
    const LOG_BOT  = 164
    const LINE_H   = 15

    const lbl = this.add.text(LOG_X, this._logY, text, {
      fontSize: '13px', fill: C.hex(color), fontFamily: 'monospace'
    }).setDepth(1)

    this._logLines.push(lbl)

    // Scroll: remove oldest lines if overflow
    while (this._logY + LINE_H > LOG_BOT) {
      const oldest = this._logLines.shift()
      oldest.destroy()
      this._logLines.forEach(l => l.setY(l.y - LINE_H))
      this._logY -= LINE_H
    }

    this._logY += LINE_H
  }

  _logSep() {
    this._log('─────────────────────────────────────────────', C.BORDER)
  }

  _clearLog() {
    this._logLines.forEach(l => l.destroy())
    this._logLines = []
    this._logY = 32
  }
}

function dots(validRanks) {
  return [1,2,3,4].map(i => validRanks.includes(i) ? '●' : '○').join('')
}
