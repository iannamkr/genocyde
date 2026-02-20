import { C } from '../utils/draw.js'

export const PLAYER_STATS = {
  hp: 100, maxHp: 100,
  stress: 0, maxStress: 100,
  speed: 220, jumpVel: -650,
}

export const ENEMY_TYPES = {
  grunt:        { hp: 30,  speed: 80,  damage: 10, width: 20, height: 36 },
  shieldBearer: { hp: 60,  speed: 50,  damage: 15, width: 24, height: 40, hasShield: true },
  boss:         { hp: 150, speed: 60,  damage: 25, width: 32, height: 48 },
}

export const WAVES = [
  ['grunt', 'grunt', 'grunt'],
  ['grunt', 'grunt', 'grunt', 'grunt', 'shieldBearer'],
  ['boss'],
]

// ─── CARD / GENE DATA ─────────────────────────────────────────────────────────

// ─── 기본 덱 ──────────────────────────────────────────────────────────────────
// vfx: 이펙트 키, vfxTint: 색조 오버라이드 (없으면 원본 색상)

export const CARD_DEFS = [
  // 🗡️ Blade — 어떻게 도살할 것인가
  { id:'b1', name:'혈흔 절개',       img:'ci_standard', type:'aoe',  dmg:20, hpCost:0,   stressCost:0,   color:C.CYAN,   cat:'blade', vfx:'effAoe',   vfxTint:0xff2233 },
  { id:'b2', name:'뼈 톱날',         img:'ci_valor',    type:'aoe',  dmg:35, hpCost:0,   stressCost:20,  color:C.RED,    cat:'blade', vfx:'effFlame'                   },
  { id:'b3', name:'맹독 낭포',       img:'ci_venom',    type:'aoe',  dmg:25, hpCost:12,  stressCost:0,   color:C.GREEN,  cat:'blade', vfx:'effFire',  vfxTint:0x44ff44 },
  { id:'b4', name:'괴사 폭풍',       img:'ci_inferno',  type:'aoe',  dmg:50, hpCost:25,  stressCost:0,   color:C.PURPLE, cat:'blade', vfx:'effSkull'                   },

  // 🛡️ Guard — 어떻게 버틸 것인가
  { id:'g1', name:'기생 방어막',     img:'ci_aegis',    type:'dash', dmg:0,  hpCost:0,   stressCost:15,  color:C.CYAN,   cat:'guard', vfx:'effAoe'                     },
  { id:'g2', name:'지혈 충동',       img:'ci_sanctum',  type:'heal', dmg:0,  hpCost:-20, stressCost:0,   color:C.GREEN,  cat:'guard', vfx:'effWings', vfxTint:0x44ff88 },
  { id:'g3', name:'산성 외막',       img:'ci_fleet',    type:'dash', dmg:0,  hpCost:8,   stressCost:0,   color:C.CYAN,   cat:'guard', vfx:'effAoe',   vfxTint:0x22ffff },
  { id:'g4', name:'신경 차단',       img:'ci_hallow',   type:'calm', dmg:0,  hpCost:5,   stressCost:-25, color:C.PURPLE, cat:'guard', vfx:'effBeast'                   },

  // 🩸 Grip — 숙주를 어떻게 뽑아먹을 것인가
  { id:'m1', name:'강제 수혈',       img:'ci_blight',   type:'heal', dmg:0,  hpCost:-20, stressCost:30,  color:C.RED,    cat:'grip',  vfx:'effFlame',  vfxTint:0xff0011 },
  { id:'m2', name:'안도감',          img:'ci_solace',   type:'calm', dmg:0,  hpCost:0,   stressCost:-40, color:C.PURPLE, cat:'grip',  vfx:'effAoe',    vfxTint:0xaa22ff },
  { id:'m3', name:'아드레날린 과다', img:'ci_requiem',  type:'aoe',  dmg:30, hpCost:10,  stressCost:40,  color:C.PINK,   cat:'grip',  vfx:'effSpin'                    },
  { id:'m4', name:'진정제',          img:'ci_echo',     type:'calm', dmg:0,  hpCost:-10, stressCost:-20, color:C.PURPLE, cat:'grip',  vfx:'effBeast',  vfxTint:0x8844ff },
]

export const GENE_CARDS = {
  blade: [
    { id:'gb1', name:'유전자 강타', img:'ci_wanderer', type:'aoe',  dmg:45, hpCost:5,   stressCost:0,   color:C.CYAN,   cat:'blade', vfx:'effFlame', vfxTint:0x44ffff },
    { id:'gb2', name:'변이 베기',   img:'ci_wretch',   type:'aoe',  dmg:30, hpCost:0,   stressCost:0,   color:C.CYAN,   cat:'blade', vfx:'effAoe',   vfxTint:0x44ffff },
  ],
  guard: [
    { id:'gg1', name:'기생 방어막', img:'ci_hollow',   type:'dash', dmg:0,  hpCost:0,   stressCost:10,  color:C.GREEN,  cat:'guard', vfx:'effAoe'                     },
    { id:'gg2', name:'지혈 충동',   img:'ci_sanctum',  type:'heal', dmg:0,  hpCost:-20, stressCost:0,   color:C.GREEN,  cat:'guard', vfx:'effWings', vfxTint:0x44ff88 },
  ],
  grip: [
    { id:'gm1', name:'안도감',      img:'ci_solace',   type:'calm', dmg:0,  hpCost:0,   stressCost:-30, color:C.PURPLE, cat:'grip',  vfx:'effAoe',   vfxTint:0xaa22ff },
    { id:'gm2', name:'진정제',      img:'ci_requiem',  type:'calm', dmg:0,  hpCost:-10, stressCost:-20, color:C.PURPLE, cat:'grip',  vfx:'effBeast', vfxTint:0x8844ff },
  ],
}

export const GENE_LABELS = { blade: '칼날', guard: '코등이', grip: '손잡이' }
export const GENE_COLORS = { blade: C.CYAN, guard: C.GREEN,  grip: C.PURPLE }
