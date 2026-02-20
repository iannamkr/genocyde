import Phaser from 'phaser'
import { WAVES } from '../data/gameData.js'
import { Host }           from '../entities/Host.js'
import { HostSprite }     from '../entities/HostSprite.js'
import { EnemySystem }    from '../entities/Enemy.js'
import { CardPanel }      from '../ui/CardPanel.js'
import { StatusPanel }    from '../ui/StatusPanel.js'
import { MessagePanel }   from '../ui/MessagePanel.js'
import { CardFactory }    from '../systems/CardFactory.js'
import { DistanceSystem } from '../systems/DistanceSystem.js'

const W       = 1280
const H       = 720
const WORLD_W = 4000
const GROUND  = 580

const SPRITE_BASE  = 'assets/sprites/prototype/Sprites'
const BG_BASE      = 'assets/sprites/background/Forest Parallax'
const CARD_BASE    = 'assets/sprites/card'
const MONSTER_BASE = 'assets/monster'
const EFFECT_BASE  = 'assets/sprites/effect'
const CAMP_BASE    = 'assets/sprites/background/camp'

// Individual camp props — key maps to PNG in CAMP_BASE, sx = display scale
const CAMP_PROPS = [
  { key: 'camp_tower',    sx: 3.5 },
  { key: 'camp_equip',    sx: 2.2 },
  { key: 'camp_tree1',    sx: 1.8 },
  { key: 'camp_tree2',    sx: 1.8 },
  { key: 'camp_lamppost', sx: 2.5 },
  { key: 'camp_barrier',  sx: 2.2 },
  { key: 'camp_sandbag',  sx: 2.5 },
  { key: 'camp_scaffold', sx: 1.0 },
]

export class BattleScene extends Phaser.Scene {
  constructor() { super('BattleScene') }

  // ─── PRELOAD ──────────────────────────────────────────────────────────────

  preload() {
    const load = (key, path) => this.load.image(key, path)
    const pad  = n => String(n).padStart(2, '0')

    // Forest parallax backgrounds
    load('bg_0', `${BG_BASE}/bg.png`)
    load('bg_1', `${BG_BASE}/bg1.png`)
    load('bg_2', `${BG_BASE}/bg2.png`)
    load('bg_3', `${BG_BASE}/bg3.png`)
    load('bg_4', `${BG_BASE}/bg4.png`)

    // Camp decoration individual sprites
    CAMP_PROPS.forEach(p => load(p.key, `${CAMP_BASE}/${p.key}.png`))

    // Player body-part sprites (SpritesSeparated, auto-managed by HostSprite)
    HostSprite.preload(this)

    // FX dust animations
    for (let i = 1; i <= 8; i++) load(`runDust_${pad(i)}`,  `${SPRITE_BASE}/FX/RunDustFront/RunDustFront${pad(i)}.png`)
    for (let i = 1; i <= 7; i++) load(`dashDust_${pad(i)}`, `${SPRITE_BASE}/FX/DashDust/DashDust${pad(i)}.png`)
    for (let i = 1; i <= 6; i++) load(`landDust_${pad(i)}`, `${SPRITE_BASE}/FX/LandingDust/LandingDust${pad(i)}.png`)

    // Combat VFX
    for (let i = 1; i <= 4;  i++) load(`airSlash_${pad(i)}`, `${SPRITE_BASE}/Combat/AirSlash/AirSlash${pad(i)}.png`)
    for (let i = 1; i <= 10; i++) load(`gSlam_${pad(i)}`,    `${SPRITE_BASE}/Combat/GroundSlam/GroundSlam${pad(i)}.png`)

    // Monster spritesheets
    const MB = MONSTER_BASE
    this.load.spritesheet('bugIdle',    `${MB}/BugZ/BugZ/Idle.png`,    { frameWidth: 64,  frameHeight: 64  })
    this.load.spritesheet('bugAttack',  `${MB}/BugZ/BugZ/Attack.png`,  { frameWidth: 64,  frameHeight: 64  })
    this.load.spritesheet('bugMove',    `${MB}/BugZ/BugZ/Move.png`,    { frameWidth: 64,  frameHeight: 64  })
    this.load.spritesheet('bugDeath',   `${MB}/BugZ/BugZ/Death.png`,   { frameWidth: 64,  frameHeight: 64  })

    this.load.spritesheet('batIdle',    `${MB}/BatZ/BatZ/Idle.png`,    { frameWidth: 128, frameHeight: 128 })
    this.load.spritesheet('batAttack',  `${MB}/BatZ/BatZ/Attack.png`,  { frameWidth: 128, frameHeight: 128 })
    this.load.spritesheet('batMove',    `${MB}/BatZ/BatZ/Move.png`,    { frameWidth: 128, frameHeight: 128 })
    this.load.spritesheet('batDeath',   `${MB}/BatZ/BatZ/Death.png`,   { frameWidth: 128, frameHeight: 128 })

    this.load.spritesheet('hulkIdle',   `${MB}/HulkZ/HulkZ/Idle.png`,   { frameWidth: 192, frameHeight: 96 })
    this.load.spritesheet('hulkAttack', `${MB}/HulkZ/HulkZ/Attack.png`, { frameWidth: 192, frameHeight: 96 })
    this.load.spritesheet('hulkWalk',   `${MB}/HulkZ/HulkZ/Walk.png`,   { frameWidth: 192, frameHeight: 96 })
    this.load.spritesheet('hulkDeath',  `${MB}/HulkZ/HulkZ/Death.png`,  { frameWidth: 192, frameHeight: 96 })

    // Effect spritesheets
    const EB = EFFECT_BASE
    this.load.spritesheet('effAoe',   `${EB}/Effect Pack #1/Effect Pack #1/Effect 1/Effect 1.png`, { frameWidth: 128, frameHeight: 128 })
    this.load.spritesheet('effHeavy', `${EB}/Effect Pack #1/Effect Pack #1/Effect 3/Effect 3.png`, { frameWidth: 128, frameHeight: 128 })

    // Card images
    const CB = CARD_BASE
    load('ci_standard', `${CB}/TheMortals/The Mortals/Standard/Standard.png`)
    load('ci_wanderer', `${CB}/TheMortals/The Mortals/Wanderer/Wanderer.png`)
    load('ci_wretch',   `${CB}/TheMortals/The Mortals/Wretch/Wretch.png`)
    load('ci_hollow',   `${CB}/TheMortals/The Mortals/Hollow/Hollow.png`)
    load('ci_valor',    `${CB}/The High Order/The Valor/The Valor.png`)
    load('ci_inferno',  `${CB}/The High Order/The Inferno/The Inferno.png`)
    load('ci_venom',    `${CB}/The High Order/The Venom/The Venom.png`)
    load('ci_fleet',    `${CB}/The High Order/The Fleet/The Fleet.png`)
    load('ci_blight',   `${CB}/The High Order/The Blight/The Blight.png`)
    load('ci_hallow',   `${CB}/The High Order/The Hallow/The Hallow.png`)
    load('ci_echo',     `${CB}/The High Order/The Echo/The Echo.png`)
    load('ci_aegis',    `${CB}/The High Order/The Aegis/The Aegis.png`)
    load('ci_sanctum',  `${CB}/The High Order/The Sanctum/The Sanctum.png`)
    load('ci_solace',   `${CB}/The High Order/The Solace/The Solace.png`)
    load('ci_requiem',  `${CB}/The High Order/The Requiem/The Requiem.png`)
  }

  // ─── CREATE ───────────────────────────────────────────────────────────────

  create() {
    this._gameOver     = false
    this._currentWave  = 0
    this._waveActive   = false
    this._inTransition = false

    this._genPixelTexture()
    this.physics.world.setBounds(0, 0, WORLD_W, H)
    this._buildAnims()

    // Systems (order matters: entities need scene refs to exist first)
    this.dist        = new DistanceSystem()
    this.msg         = new MessagePanel(this)
    this.statusPanel = new StatusPanel(this)
    this.host        = new Host(this)
    this.enemies     = new EnemySystem(this)
    this.cardFactory = new CardFactory(this)
    this.cardPanel   = new CardPanel(this)

    this._buildParallax()
    this._buildWorld()

    this.host.build()
    this.msg.build()
    this.statusPanel.build()
    this.cardPanel.build()

    this.cameras.main.setBounds(0, 0, WORLD_W, H)
    this.cameras.main.startFollow(this.host.sprite, true, 0.08, 0.08)

    this._escKey = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.ESC)
    this.input.on('pointerdown', ptr => this._onPointerDown(ptr.x, ptr.y))
    this.input.on('pointermove', ptr => this.cardPanel.onPointerMove(ptr.x, ptr.y))

    this._startWave(0)
  }

  // ─── TEXTURES / ANIMS ─────────────────────────────────────────────────────

  _genPixelTexture() {
    const g = this.make.graphics({ add: false })
    g.fillStyle(0xffffff); g.fillRect(0, 0, 1, 1)
    g.generateTexture('pixel', 1, 1); g.destroy()
  }

  _buildAnims() {
    const pad = n => String(n).padStart(2, '0')
    const mk = (key, prefix, count, fps, repeat = -1) => {
      this.anims.create({
        key,
        frames: Array.from({ length: count }, (_, i) => ({ key: `${prefix}${pad(i + 1)}` })),
        frameRate: fps, repeat,
      })
    }
    const mkSS = (key, texKey, endFrame, fps, repeat = -1) => {
      this.anims.create({
        key,
        frames: this.anims.generateFrameNumbers(texKey, { start: 0, end: endFrame }),
        frameRate: fps, repeat,
      })
    }

    // Player body-part animations (auto-registered per USED_STATES in HostSprite)
    HostSprite.buildAnims(this)

    mk('runDust',  'runDust_',  8, 16, 0)
    mk('dashDust', 'dashDust_', 7, 18, 0)
    mk('landDust', 'landDust_', 6, 14, 0)
    mk('airSlash', 'airSlash_', 4, 16, 0)
    mk('gSlam',    'gSlam_',   10, 14, 0)

    mkSS('bugIdle',    'bugIdle',   5,  8)
    mkSS('bugMove',    'bugMove',   5, 12)
    mkSS('bugAttack',  'bugAttack', 7, 14, 0)
    mkSS('bugDeath',   'bugDeath',  9, 10, 0)

    mkSS('batIdle',    'batIdle',   5,  8)
    mkSS('batMove',    'batMove',   3, 12)
    mkSS('batAttack',  'batAttack', 6, 12, 0)
    mkSS('batDeath',   'batDeath',  7, 10, 0)

    mkSS('hulkIdle',   'hulkIdle',   5,  6)
    mkSS('hulkWalk',   'hulkWalk',   6,  8)
    mkSS('hulkAttack', 'hulkAttack', 11, 10, 0)
    mkSS('hulkDeath',  'hulkDeath',  10,  8, 0)

    mkSS('effAoe',   'effAoe',   10, 15, 0)
    mkSS('effHeavy', 'effHeavy',  6, 14, 0)
  }

  // ─── PARALLAX ─────────────────────────────────────────────────────────────

  _buildParallax() {
    const tileScale = H / 384
    const layers = [
      { key: 'bg_0', factor: 0.05, depth: -10 },
      { key: 'bg_1', factor: 0.1,  depth: -9  },
      { key: 'bg_2', factor: 0.2,  depth: -8  },
      { key: 'bg_3', factor: 0.35, depth: -7  },
      { key: 'bg_4', factor: 0.55, depth: -6  },
    ]
    this._bgLayers = layers.map(({ key, factor, depth }) => {
      const ts = this.add.tileSprite(0, 0, W, H, key)
        .setOrigin(0, 0).setScrollFactor(0)
        .setTileScale(tileScale, tileScale).setDepth(depth)
      return { ts, factor }
    })
  }

  _updateParallax() {
    const scrollX = this.cameras.main.scrollX
    this._bgLayers.forEach(({ ts, factor }) => { ts.tilePositionX = scrollX * factor })
  }

  // ─── WORLD ────────────────────────────────────────────────────────────────

  _buildWorld() {
    this._platforms = this.physics.add.staticGroup()

    const g = this.add.graphics().setDepth(-1)
    g.fillStyle(0x1a1408, 0.70); g.fillRect(0, GROUND, WORLD_W, 200)
    g.lineStyle(2, 0x3a2c12);   g.lineBetween(0, GROUND, WORLD_W, GROUND)

    const floor = this._platforms.create(WORLD_W / 2, GROUND + 1, 'pixel')
    floor.setDisplaySize(WORLD_W, 2).setAlpha(0).refreshBody()

    this._addCampDecorations()
  }

  _addCampDecorations() {
    const positions = [280, 550, 870, 1150, 1480, 1750, 2050, 2350, 2680, 2950, 3250, 3600]
    positions.forEach((baseX, idx) => {
      const prop    = CAMP_PROPS[idx % CAMP_PROPS.length]
      const centerX = baseX + Phaser.Math.Between(-40, 40)
      const isFg    = idx % 3 === 0
      const depth   = isFg ? 6 : -5
      const alpha   = isFg ? 1.0 : 0.55
      const sx      = prop.sx * (isFg ? 1.0 : 0.75)

      this.add.image(centerX, GROUND, prop.key)
        .setOrigin(0.5, 1)
        .setScale(sx)
        .setAlpha(alpha)
        .setDepth(depth)
    })
  }

  // ─── POINTER INPUT ────────────────────────────────────────────────────────

  _onPointerDown(x, y) {
    if (this.cardFactory.geneUI) { this.cardFactory.handleClick(x, y); return }
    if (this._gameOver) {
      if (this.msg.isRestartHit(x, y)) this.scene.restart()
      return
    }
    this.cardPanel.onPointerDown(x, y)
  }

  // ─── WAVE SYSTEM ──────────────────────────────────────────────────────────

  _startWave(idx) {
    this._currentWave  = idx
    this._waveActive   = false
    this._inTransition = true
    this.statusPanel.setWave(idx + 1, WAVES.length)
    this.msg.showWaveAnnounce(`Wave ${idx + 1}`, () => {
      this._spawnWave(idx)
      this._waveActive   = true
      this._inTransition = false
    })
  }

  _spawnWave(idx) {
    const types   = WAVES[idx]
    const offsets = [350, 550, 750, 950, 1150]
    types.forEach((type, i) => {
      const x = Math.min(
        this.host.sprite.x + offsets[i % offsets.length] + Math.floor(i / offsets.length) * 300,
        WORLD_W - 200
      )
      this.enemies.spawn(type, x, GROUND - 80)
    })
  }

  _checkWaveComplete() {
    if (!this._waveActive || this._inTransition) return
    if (!this.enemies.allDead()) return
    this._waveActive   = false
    this._inTransition = true
    if (this._currentWave >= WAVES.length - 1) {
      this.time.delayedCall(1000, () => this._endGame('victory'))
    } else {
      this.time.delayedCall(2000, () => {
        this.enemies.clearEnemies()
        this._startWave(this._currentWave + 1)
      })
    }
  }

  // ─── GAME END ─────────────────────────────────────────────────────────────

  _endGame(result) {
    if (this._gameOver) return
    this._gameOver = true
    this.host.die()
    if (result === 'defeat') {
      this.time.delayedCall(950, () => this.msg.showOverlay(result))
    } else {
      this.msg.showOverlay(result)
    }
  }

  // ─── MAIN UPDATE ──────────────────────────────────────────────────────────

  update(time, delta) {
    if (this._gameOver) { this._updateParallax(); return }

    const dt = delta

    if (this.cardFactory.geneUI && Phaser.Input.Keyboard.JustDown(this._escKey))
      this.cardFactory.hideUI()

    this.host.update(dt)
    this.enemies.update(dt)
    this.cardFactory.update()
    this.cardPanel.update(dt)
    this.statusPanel.update()
    this._updateParallax()
    this._checkWaveComplete()
  }
}
