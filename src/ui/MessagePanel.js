import { C } from '../utils/draw.js'

const W = 1280
const H = 720
const OV_BTN = { cx: W / 2, cy: H / 2 + 70, hw: 105, hh: 21 }

// ─── MESSAGE PANEL ────────────────────────────────────────────────────────────
// Float damage text, wave announce, rampage message, victory/defeat overlay.

export class MessagePanel {
  constructor(scene) { this.scene = scene }

  build() {
    const sf = 0

    this._waveAnnounce = this.scene.add.text(W / 2, 180, '', {
      fontSize: '38px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 5,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(200).setVisible(false)

    this._rampageTxt = this.scene.add.text(W / 2, 220, '', {
      fontSize: '20px', fill: C.hex(C.RED), fontFamily: 'Galmuri11',
      stroke: '#000000', strokeThickness: 3,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(200).setVisible(false)

    this._buildOverlay()
  }

  // ─── FLOAT TEXT ───────────────────────────────────────────────────────────

  floatText(x, y, str, color) {
    const t = this.scene.add.text(x, y, str, {
      fontSize: '14px', fill: C.hex(color), fontFamily: 'Galmuri11',
      fontStyle: 'bold', stroke: '#000000', strokeThickness: 2,
    }).setDepth(80)
    this.scene.tweens.add({
      targets: t, y: y - 48, alpha: 0, duration: 750,
      onComplete: () => t.destroy(),
    })
  }

  // ─── HIT VFX ─────────────────────────────────────────────────────────────

  showHitVfx(x, y) {
    const g = this.scene.add.graphics().setDepth(55)
    g.lineStyle(3, 0xffffff)
    g.lineBetween(x - 20, y - 20, x + 20, y + 20)
    g.lineBetween(x - 20, y + 10, x + 20, y - 10)
    g.lineStyle(2, C.CYAN)
    g.lineBetween(x - 12, y - 24, x + 12, y + 24)
    this.scene.time.delayedCall(130, () => g.destroy())
  }

  // ─── ANNOUNCEMENTS ────────────────────────────────────────────────────────

  showWaveAnnounce(text, onComplete) {
    this._waveAnnounce.setText(text).setAlpha(1).setVisible(true)
    this.scene.tweens.add({
      targets: this._waveAnnounce, alpha: 0, delay: 1500, duration: 400,
      onComplete: () => {
        this._waveAnnounce.setVisible(false).setAlpha(1)
        onComplete?.()
      },
    })
  }

  showRampageTxt() {
    this._rampageTxt.setText('검의 의지가 폭주한다!').setAlpha(1).setVisible(true)
    this.scene.tweens.add({
      targets: this._rampageTxt, alpha: 0, delay: 1800, duration: 400,
      onComplete: () => this._rampageTxt.setVisible(false).setAlpha(1),
    })
  }

  // ─── OVERLAY (Victory / Defeat) ───────────────────────────────────────────

  _buildOverlay() {
    const D = 299, sf = 0
    this._ovBg  = this.scene.add.rectangle(W/2, H/2, W, H, 0x000000, 0.88).setScrollFactor(sf).setDepth(D).setVisible(false)
    this._ovTtl = this.scene.add.text(W/2, H/2 - 80, '', {
      fontSize: '34px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11', fontStyle: 'bold',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 1).setVisible(false)
    this._ovMsg = this.scene.add.text(W/2, H/2 - 20, '', {
      fontSize: '14px', fill: C.hex(C.WHITE), fontFamily: 'Galmuri11',
      align: 'center', lineSpacing: 8,
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 1).setVisible(false)
    this._ovBtn = this.scene.add.rectangle(OV_BTN.cx, OV_BTN.cy, OV_BTN.hw * 2, OV_BTN.hh * 2, C.BG2)
      .setScrollFactor(sf).setDepth(D + 1).setStrokeStyle(2, C.GOLD).setVisible(false)
    this._ovBtnT = this.scene.add.text(OV_BTN.cx, OV_BTN.cy, '[ 다시 시작 ]', {
      fontSize: '14px', fill: C.hex(C.GOLD), fontFamily: 'Galmuri11',
    }).setOrigin(0.5).setScrollFactor(sf).setDepth(D + 2).setVisible(false)
  }

  showOverlay(result) {
    [this._ovBg, this._ovTtl, this._ovMsg, this._ovBtn, this._ovBtnT].forEach(o => o.setVisible(true))
    if (result === 'victory') {
      this._ovTtl.setText('저주받은 검 — 승리').setStyle({ fill: C.hex(C.CYAN) })
      this._ovMsg.setText('3웨이브를 모두 격파했다.\n검이 기쁨을 느끼는 것 같다...\n숙주의 몸이 한계에 달했다.')
    } else {
      this._ovTtl.setText('숙주 폐기됨').setStyle({ fill: C.hex(C.RED) })
      this._ovMsg.setText('숙주의 HP가 고갈되었다.\n검은 새로운 숙주를 찾아\n어둠 속으로 사라졌다...')
    }
  }

  isRestartHit(x, y) {
    return Math.abs(x - OV_BTN.cx) < OV_BTN.hw && Math.abs(y - OV_BTN.cy) < OV_BTN.hh
  }
}
