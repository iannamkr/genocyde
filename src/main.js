import Phaser from 'phaser'
import { BattleScene } from './scenes/BattleScene.js'

const dpr = window.devicePixelRatio || 1

const config = {
  type: Phaser.CANVAS,
  backgroundColor: '#0b0602',
  scene: [BattleScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.NONE,      // zoom=1 고정 → CSS크기 = 1280×720 그대로
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  render: {
    antialias: true,
    resolution: dpr,              // 버퍼 = 1280*dpr × 720*dpr (Retina: 2560×1440)
  },
}

new Phaser.Game(config)
