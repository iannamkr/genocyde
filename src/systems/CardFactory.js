import { C } from '../utils/draw.js'
import { GENE_CARDS, GENE_LABELS, GENE_COLORS } from '../data/gameData.js'

const W = 1280

const GUI_BW = 320, GUI_BH = 200
const GUI_BX = (W - GUI_BW) / 2
const GUI_BY = 150

const GENE_BTN_BOUNDS = [
  { key: 'blade', x: GUI_BX + 12,       y: GUI_BY + 50, w: 90, h: 90 },
  { key: 'guard', x: GUI_BX + 12 + 100, y: GUI_BY + 50, w: 90, h: 90 },
  { key: 'grip',  x: GUI_BX + 12 + 200, y: GUI_BY + 50, w: 90, h: 90 },
]

// ─── CARD FACTORY ─────────────────────────────────────────────────────────────
// Gene item drops, proximity pickup UI, slot application.

export class CardFactory {
  constructor(scene) {
    this.scene   = scene
    this._slots  = { blade: false, guard: false, grip: false }
    this._items  = []
    this._geneUI = false
    this._uiObjs = null
  }

  get geneUI() { return this._geneUI }

  // ─── DROP ─────────────────────────────────────────────────────────────────

  dropGene(x, y) {
    const gfx = this.scene.add.graphics().setDepth(20)
    gfx.fillStyle(C.GOLD);     gfx.fillCircle(0, 0, 8)
    gfx.lineStyle(2, 0xffffff); gfx.strokeCircle(0, 0, 8)
    gfx.fillStyle(0xffffff);   gfx.fillCircle(0, 0, 3)
    gfx.x = x; gfx.y = y
    this.scene.tweens.add({ targets: gfx, y: y - 8, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    const label = this.scene.add.text(x, y - 20, '유전자', {
      fontSize: '9px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11',
    }).setOrigin(0.5, 1).setDepth(21)
    this.scene.tweens.add({ targets: label, y: y - 28, duration: 800, yoyo: true, repeat: -1, ease: 'Sine.InOut' })

    this._items.push({ gfx, label, x, y, collected: false })
  }

  // ─── UPDATE (proximity check) ─────────────────────────────────────────────

  update() {
    if (this._geneUI) return
    const px = this.scene.host.sprite.x
    const py = this.scene.host.sprite.y
    for (const item of this._items) {
      if (item.collected) continue
      const dx = px - item.x, dy = py - item.y
      if (Math.sqrt(dx * dx + dy * dy) < 80) { this._showUI(item); break }
    }
  }

  // ─── CLICK HANDLER ────────────────────────────────────────────────────────

  handleClick(x, y) {
    if (!this._geneUI) return false
    if (x > GUI_BX + GUI_BW - 50 && y < GUI_BY + 40) { this._hideUI(); return true }
    for (const { key, x: bx, y: by, w, h } of GENE_BTN_BOUNDS) {
      if (x >= bx && x <= bx + w && y >= by && y <= by + h) {
        if (!this._slots[key]) this._applySlot(key)
        return true
      }
    }
    return true
  }

  hideUI() { this._hideUI() }

  // ─── PRIVATE ──────────────────────────────────────────────────────────────

  _showUI(geneItem) {
    if (this._geneUI) return
    this._geneUI = true
    const D = 205, sf = 0

    const bg = this.scene.add.graphics().setScrollFactor(sf).setDepth(D)
    bg.fillStyle(0x000000, 0.82); bg.fillRoundedRect(GUI_BX, GUI_BY, GUI_BW, GUI_BH, 8)
    bg.lineStyle(2, C.GOLD);     bg.strokeRoundedRect(GUI_BX, GUI_BY, GUI_BW, GUI_BH, 8)

    const title = this.scene.add.text(W / 2, GUI_BY + 18, '⚔  유전자 슬롯 선택', {
      fontSize: '13px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11', fontStyle: 'bold',
    }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 1)

    const skipBtn = this.scene.add.text(GUI_BX + GUI_BW - 14, GUI_BY + 10, '넘기기', {
      fontSize: '9px', fill: C.hex(C.DIM), fontFamily: 'Galmuri11',
    }).setOrigin(1, 0).setScrollFactor(sf).setDepth(D + 2)

    const slotObjs = GENE_BTN_BOUNDS.map(({ key, x: bx, y: by, w, h }) => {
      const filled = this._slots[key], col = GENE_COLORS[key]
      const btn = this.scene.add.graphics().setScrollFactor(sf).setDepth(D + 1)
      btn.fillStyle(filled ? 0x0a0a1a : 0x0d0d22); btn.fillRoundedRect(bx, by, w, h, 4)
      btn.lineStyle(filled ? 1 : 2, filled ? C.DIM : col); btn.strokeRoundedRect(bx, by, w, h, 4)
      const lbl = this.scene.add.text(bx + w / 2, by + 22, GENE_LABELS[key], {
        fontSize: '12px', fill: C.hex(filled ? C.DIM : C.WHITE), fontFamily: 'Galmuri11', fontStyle: 'bold',
      }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 2)
      const sub = this.scene.add.text(bx + w / 2, by + 42, filled ? '장착됨' : '비어있음', {
        fontSize: '8px', fill: C.hex(filled ? C.DIM : col), fontFamily: 'Galmuri11',
      }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 2)
      const info = this.scene.add.text(bx + w / 2, by + 58, filled ? '' : '+2 카드', {
        fontSize: '8px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11',
      }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 2)
      return { btn, lbl, sub, info }
    })

    this._uiObjs = { bg, title, skipBtn, slotObjs, geneItem }
  }

  _hideUI() {
    if (!this._geneUI || !this._uiObjs) return
    const { bg, title, skipBtn, slotObjs } = this._uiObjs
    bg.destroy(); title.destroy(); skipBtn.destroy()
    slotObjs.forEach(o => { o.btn.destroy(); o.lbl.destroy(); o.sub.destroy(); o.info.destroy() })
    this._geneUI = false
    this._uiObjs = null
  }

  _applySlot(slot) {
    if (this._slots[slot]) return
    this._slots[slot] = true
    GENE_CARDS[slot].forEach(card => this.scene.cardPanel.addToDiscard({ ...card }))
    this.scene.msg.floatText(
      this.scene.host.sprite.x, this.scene.host.sprite.y - 50,
      `${GENE_LABELS[slot]} 유전자 장착!`, C.GOLD
    )
    if (this._uiObjs?.geneItem) {
      const item = this._uiObjs.geneItem
      item.collected = true
      this.scene.tweens.killTweensOf(item.gfx)
      this.scene.tweens.killTweensOf(item.label)
      item.gfx.destroy(); item.label.destroy()
    }
    this._hideUI()
    this.scene.statusPanel.fillGeneSlot(slot, GENE_COLORS[slot])
    this.scene.cardPanel.setHandDirty()
  }
}
