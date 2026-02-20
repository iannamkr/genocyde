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

export const CARD_DEFS = [
  { id:'b1', name:'베기',        img:'ci_standard', type:'slash', dmg:15, hpCost:0,  stressCost:0,  color:C.CYAN,   cat:'basic'  },
  { id:'b2', name:'찌르기',      img:'ci_wanderer', type:'slash', dmg:18, hpCost:0,  stressCost:0,  color:C.CYAN,   cat:'basic'  },
  { id:'b3', name:'후려치기',    img:'ci_wretch',   type:'slash', dmg:12, hpCost:0,  stressCost:0,  color:C.CYAN,   cat:'basic'  },
  { id:'o1', name:'검의 강타',   img:'ci_valor',    type:'heavy', dmg:35, hpCost:10, stressCost:0,  color:C.PINK,   cat:'body'   },
  { id:'o2', name:'육식 충동',   img:'ci_inferno',  type:'heavy', dmg:28, hpCost:8,  stressCost:0,  color:C.PINK,   cat:'body'   },
  { id:'o3', name:'산성 분비',   img:'ci_venom',    type:'aoe',   dmg:20, hpCost:15, stressCost:0,  color:C.GREEN,  cat:'body'   },
  { id:'m1', name:'기괴한 후퇴', img:'ci_fleet',    type:'dash',  dmg:0,  hpCost:0,  stressCost:20, color:C.PURPLE, cat:'mental' },
  { id:'m2', name:'환각 절개',   img:'ci_hollow',   type:'slash', dmg:25, hpCost:0,  stressCost:25, color:C.PURPLE, cat:'mental' },
  { id:'m3', name:'자기혐오',    img:'ci_blight',   type:'aoe',   dmg:30, hpCost:0,  stressCost:30, color:C.PURPLE, cat:'mental' },
]

export const GENE_CARDS = {
  blade: [
    { id:'gb1', name:'유전자 강타', img:'ci_hallow',  type:'heavy', dmg:45, hpCost:5,   stressCost:0,  color:C.CYAN,   cat:'basic'  },
    { id:'gb2', name:'변이 베기',   img:'ci_echo',    type:'slash', dmg:30, hpCost:0,   stressCost:0,  color:C.CYAN,   cat:'basic'  },
  ],
  guard: [
    { id:'gg1', name:'기생 방어막', img:'ci_aegis',   type:'dash',  dmg:0,  hpCost:0,   stressCost:10, color:C.GREEN,  cat:'mental' },
    { id:'gg2', name:'지혈 충동',   img:'ci_sanctum', type:'heal',  dmg:0,  hpCost:-20, stressCost:0,  color:C.GREEN,  cat:'body'   },
  ],
  grip: [
    { id:'gm1', name:'안도감',      img:'ci_solace',  type:'calm',  dmg:0,  hpCost:0,   stressCost:-30,color:C.PURPLE, cat:'mental' },
    { id:'gm2', name:'진정제',      img:'ci_requiem', type:'calm',  dmg:0,  hpCost:-10, stressCost:-20,color:C.PURPLE, cat:'mental' },
  ],
}

export const GENE_LABELS = { blade: '칼날', guard: '코등이', grip: '손잡이' }
export const GENE_COLORS = { blade: C.CYAN, guard: C.GREEN,  grip: C.PURPLE }
