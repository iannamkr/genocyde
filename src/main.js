import Phaser from 'phaser'
import { BattleScene } from './scenes/BattleScene.js'

const dpr = window.devicePixelRatio || 1

const config = {
  type: Phaser.CANVAS,
  backgroundColor: '#08071a',
  scene: [BattleScene],
  parent: document.body,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 1280,
    height: 720,
  },
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 900 }, debug: false },
  },
  render: {
    antialias: false,
    roundPixels: true,
    resolution: dpr,
  },
}

new Phaser.Game(config)
