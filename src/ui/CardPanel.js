import Phaser from 'phaser'
import { CARD_DEFS } from '../data/gameData.js'
import { C } from '../utils/draw.js'

const W = 1280
const H = 720
const CW = 100, CH = 150
const HOVER_RISE  = 65
const HOVER_SCALE = 1.28

// ─── CARD PANEL ───────────────────────────────────────────────────────────────
// Deck / hand / discard management, Hearthstone fan layout, card execution.

export class CardPanel {
  constructor(scene) {
    this.scene           = scene
    this._deck           = Phaser.Utils.Array.Shuffle([...CARD_DEFS])
    this._hand           = []
    this._discard        = []
    this._handObjs       = []
    this._cardBounds     = []
    this._handDirty      = false
    this._autoDrawTimer  = 8000
    this._actionCooldown = 0
    this._hoveredCard    = -1
  }

  // ─── PUBLIC API ───────────────────────────────────────────────────────────

  build() {
    for (let i = 0; i < 4; i++) this._drawCard()
  }

  update(dt) {
    this._actionCooldown = Math.max(0, this._actionCooldown - dt)
    this._autoDrawTimer -= dt
    if (this._autoDrawTimer <= 0 && this._hand.length < 5) {
      this._drawCard(); this._autoDrawTimer = 8000
    }
    if (this._handDirty) this._renderHand()
  }

  addToDiscard(card) { this._discard.push(card) }
  setHandDirty()     { this._handDirty = true }

  onPointerDown(x, y) {
    if (this.scene.cardFactory.geneUI) return
    if (this.scene._gameOver) return
    if (this._actionCooldown > 0) return
    for (let i = this._cardBounds.length - 1; i >= 0; i--) {
      const b = this._cardBounds[i]
      if (!b) continue
      if (this._hitTestCard(x, y, b)) { this._onCardClick(i); break }
    }
  }

  onPointerMove(x, y) {
    if (this.scene.cardFactory.geneUI || this.scene._gameOver) {
      if (this._hoveredCard >= 0) { this._unhoverCard(this._hoveredCard); this._hoveredCard = -1 }
      return
    }
    let found = -1
    for (let i = this._cardBounds.length - 1; i >= 0; i--) {
      const b = this._cardBounds[i]
      if (!b) continue
      if (this._hitTestCard(x, y, b)) { found = i; break }
    }
    if (found !== this._hoveredCard) {
      if (this._hoveredCard >= 0 && this._hoveredCard < this._handObjs.length)
        this._unhoverCard(this._hoveredCard)
      this._hoveredCard = found
      if (found >= 0) this._hoverCard(found)
    }
  }

  // ─── PRIVATE ─────────────────────────────────────────────────────────────

  _drawCard() {
    if (this._hand.length >= 8) return
    if (this._deck.length === 0) {
      if (this._discard.length === 0) return
      this._deck    = Phaser.Utils.Array.Shuffle([...this._discard])
      this._discard = []
    }
    this._hand.push({ ...this._deck.pop() })
    this._handDirty = true
  }

  _onCardClick(i) {
    if (this.scene._gameOver || this._actionCooldown > 0) return
    if (i >= this._hand.length || !this._cardBounds[i]) return
    const card = this._hand[i]
    if (card.hpCost > 0 && this.scene.host.ps.hp <= card.hpCost) return

    const obj = this._handObjs[i]
    this._hand.splice(i, 1)
    this._discard.push(card)
    this._handObjs.splice(i, 1)
    this._cardBounds.splice(i, 1)
    if (this._hoveredCard === i) this._hoveredCard = -1
    else if (this._hoveredCard > i) this._hoveredCard--

    this.scene.host.applyCardCosts(card.hpCost, card.stressCost)
    this._executeCard(card)
    this._actionCooldown = 300

    if (obj?.container?.active) {
      this.scene.tweens.add({
        targets: obj.container,
        y: obj.container.y - 240, rotation: 0, scaleX: 1.4, scaleY: 1.4,
        duration: 290, ease: 'Cubic.Out',
        onComplete: () => obj.container.destroy(),
      })
    }

    this._handDirty = true
    this.scene.time.delayedCall(180, () => this._drawCard())
    if (this.scene.host.ps.hp <= 0) this.scene._endGame('defeat')
  }

  _executeCard(card) {
    const s = this.scene
    switch (card.type) {
      case 'aoe':  s.host.triggerAoE(card.dmg); break
      case 'dash': s.host.triggerDash(); break
      case 'heal':
        s.msg.floatText(s.host.sprite.x, s.host.sprite.y - 30, `+${-card.hpCost} HP`, C.GREEN)
        break
      case 'calm':
        s.msg.floatText(s.host.sprite.x, s.host.sprite.y - 30, '스트레스 완화', C.PURPLE)
        break
    }
  }

  _hitTestCard(px, py, b) {
    const cos = Math.cos(-b.rot), sin = Math.sin(-b.rot)
    const dx  = px - b.cx, dy = py - b.cy
    const lx  = dx * cos - dy * sin
    const ly  = dx * sin + dy * cos
    return Math.abs(lx) <= b.hw && Math.abs(ly) <= b.hh
  }

  _getCardFanPos(i, n) {
    if (n <= 0) return { x: W / 2, y: H - 30, rotation: 0, depth: 155 }
    const t          = n === 1 ? 0 : (i / (n - 1)) * 2 - 1
    const spacing    = n === 1 ? 0 : Math.min(115, (W * 0.72) / (n - 1))
    const totalW     = (n - 1) * spacing
    const x          = W / 2 - totalW / 2 + i * spacing
    const y          = H - 30 + t * t * 16
    const rotation   = t * 0.09
    const distCenter = Math.abs(i - (n - 1) / 2)
    const depth      = 155 + Math.round(n - distCenter)
    return { x, y, rotation, depth }
  }

  _hoverCard(i) {
    if (i >= this._handObjs.length) return
    const { container, glowGfx } = this._handObjs[i]
    const card = this._hand[i]
    const { y } = this._getCardFanPos(i, this._hand.length)
    this.scene.tweens.killTweensOf(container)
    this.scene.tweens.add({
      targets: container,
      y: y - HOVER_RISE, rotation: 0, scaleX: HOVER_SCALE, scaleY: HOVER_SCALE,
      duration: 130, ease: 'Power2',
    })
    container.setDepth(300)
    glowGfx.clear()
    glowGfx.lineStyle(4, card.color, 1)
    glowGfx.strokeRoundedRect(-CW / 2 - 2, -CH / 2 - 2, CW + 4, CH + 4, 7)
    this._cardBounds[i] = { ...this._cardBounds[i], cy: y - HOVER_RISE, rot: 0 }
  }

  _unhoverCard(i) {
    if (i >= this._handObjs.length) return
    const { container, glowGfx } = this._handObjs[i]
    const { y, rotation, depth } = this._getCardFanPos(i, this._hand.length)
    this.scene.tweens.killTweensOf(container)
    this.scene.tweens.add({
      targets: container,
      y, rotation, scaleX: 1, scaleY: 1,
      duration: 100, ease: 'Power2',
    })
    container.setDepth(depth)
    glowGfx.clear()
    this._cardBounds[i] = { ...this._cardBounds[i], cy: y, rot: rotation }
  }

  _renderHand() {
    this._handObjs.forEach(o => { if (o.container?.active) o.container.destroy() })
    this._handObjs   = []
    this._cardBounds = []
    this._hoveredCard = -1

    const n = this._hand.length
    if (n === 0) { this._handDirty = false; return }

    this._hand.forEach((card, i) => {
      const { x, y, rotation, depth } = this._getCardFanPos(i, n)
      const container = this.scene.add.container(x, y)
        .setScrollFactor(0).setDepth(depth).setRotation(rotation)

      const img = this.scene.add.image(0, 0, card.img).setDisplaySize(CW, CH)
      container.add(img)

      const strip = this.scene.add.graphics()
      strip.fillStyle(0x000000, 0.75)
      strip.fillRect(-CW / 2, CH / 2 - 30, CW, 30)
      container.add(strip)

      const nameTxt = this.scene.add.text(0, CH / 2 - 15, card.name, {
        fontSize: '10px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11',
        fontStyle: 'bold', align: 'center',
      }).setOrigin(0.5, 0.5)
      container.add(nameTxt)

      const hasHp    = card.hpCost > 0
      const hasSt    = card.stressCost > 0
      const badgeCol = hasHp ? C.RED : hasSt ? C.PURPLE : C.CYAN
      const costNum  = hasHp ? card.hpCost : hasSt ? card.stressCost : 0

      const badge = this.scene.add.graphics()
      badge.fillStyle(badgeCol, 0.93)
      badge.fillCircle(-CW / 2 + 15, -CH / 2 + 15, 13)
      badge.lineStyle(2, 0xffffff, 0.8)
      badge.strokeCircle(-CW / 2 + 15, -CH / 2 + 15, 13)
      container.add(badge)

      const costTxt = this.scene.add.text(-CW / 2 + 15, -CH / 2 + 15, `${costNum}`, {
        fontSize: '11px', fill: '#ffffff', fontFamily: 'Galmuri11', fontStyle: 'bold',
      }).setOrigin(0.5, 0.5)
      container.add(costTxt)

      const glowGfx = this.scene.add.graphics()
      container.add(glowGfx)

      this._cardBounds.push({ cx: x, cy: y, hw: CW / 2, hh: CH / 2, rot: rotation })
      this._handObjs.push({ container, glowGfx })
    })

    this._handDirty = false
  }
}
