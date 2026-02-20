import { C } from '../utils/draw.js'
import { GENE_LABELS, GENE_COLORS } from '../data/gameData.js'

const W = 1280

// ─── STATUS PANEL ─────────────────────────────────────────────────────────────
// Top-left HP / Stress bars, top-right wave label, gene slot indicators.

export class StatusPanel {
  constructor(scene) { this.scene = scene }

  build() {
    const D = 100, sf = 0
    const s = this.scene

    // HP bar
    s.add.rectangle(10, 10, 200, 16, 0x220a0a).setOrigin(0, 0).setScrollFactor(sf).setDepth(D)
    this._hpFill  = s.add.rectangle(10, 10, 200, 16, C.RED).setOrigin(0, 0).setScrollFactor(sf).setDepth(D + 1)
    this._hpLabel = s.add.text(14, 12, 'HP 100/100', {
      fontSize: '10px', fill: C.hex(C.WHITE), fontFamily: 'Galmuri11',
    }).setOrigin(0, 0).setScrollFactor(sf).setDepth(D + 2)

    // Stress bar
    s.add.rectangle(10, 30, 200, 10, 0x150a22).setOrigin(0, 0).setScrollFactor(sf).setDepth(D)
    this._stressFill  = s.add.rectangle(10, 30, 200, 10, C.PURPLE).setOrigin(0, 0).setScrollFactor(sf).setDepth(D + 1)
    this._stressFill.scaleX = 0
    this._stressLabel = s.add.text(14, 31, '스트레스 0/100', {
      fontSize: '9px', fill: C.hex(C.DIM), fontFamily: 'Galmuri11',
    }).setOrigin(0, 0).setScrollFactor(sf).setDepth(D + 2)

    // Wave label
    this._waveLabel = s.add.text(W - 12, 10, 'Wave 1 / 3', {
      fontSize: '14px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11', fontStyle: 'bold',
    }).setOrigin(1, 0).setScrollFactor(sf).setDepth(D)

    // Gene slot indicators
    this._slotRects = {}
    Object.keys(GENE_LABELS).forEach((key, i) => {
      const bx = W - 96 + i * 33
      const r = s.add.rectangle(bx, 42, 28, 14, 0x111122)
        .setOrigin(0, 0).setScrollFactor(sf).setDepth(D).setStrokeStyle(1, GENE_COLORS[key])
      s.add.text(bx + 14, 43, GENE_LABELS[key][0], {
        fontSize: '8px', fill: C.hex(C.DIM), fontFamily: 'Galmuri11',
      }).setOrigin(0.5, 0).setScrollFactor(sf).setDepth(D + 1)
      this._slotRects[key] = r
    })
  }

  update() {
    const ps  = this.scene.host.ps
    const hpR = Math.max(0, ps.hp / ps.maxHp)
    const stR = Math.max(0, ps.stress / ps.maxStress)
    this._hpFill.scaleX     = hpR
    this._stressFill.scaleX = stR
    this._hpLabel.setText(`HP ${Math.max(0, ps.hp)}/${ps.maxHp}`)
    this._stressLabel.setText(`스트레스 ${ps.stress}/${ps.maxStress}`)
    this._stressFill.setFillStyle(stR > 0.8 ? C.RED : C.PURPLE)
  }

  setWave(num, total) {
    this._waveLabel.setText(`Wave ${num} / ${total}`)
  }

  fillGeneSlot(key, color) {
    this._slotRects[key]?.setFillStyle(color)
  }
}
