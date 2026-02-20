export const SKILLS = [
  {
    id: 0,
    name: '일반 베기',
    gene: '',
    useRanks: [1, 2],
    targetType: 'enemy_single',
    targetRanks: [1, 2],
    costDesc: '코스트 없음',
    effectDesc: '적 1명에게 데미지 5',
    accent: 0xc8a96e,
  },
  {
    id: 1,
    name: '산성 분비',
    gene: '에얼리언 유전자',
    useRanks: [1, 2, 3],
    targetType: 'enemy_all',
    targetRanks: [1, 2, 3, 4],
    costDesc: '숙주 HP 20 영구 소모',
    effectDesc: '적 전체에 데미지 10',
    accent: 0x44aa44,
  },
  {
    id: 2,
    name: '기괴한 후퇴',
    gene: '바퀴벌레 유전자',
    useRanks: [1, 2],
    targetType: 'self',
    targetRanks: [],
    costDesc: '스트레스 40 증가',
    effectDesc: '숙주를 뒤로 1칸 이동',
    accent: 0x9955bb,
  },
]

export function createState() {
  return {
    host:   { rank: 1, hp: 25, maxHp: 50, stress: 80, maxStress: 100 },
    boss:   { rank: 1, hp: 10, maxHp: 10, alive: true },
    minion: { rank: 2, hp: 5,  maxHp: 5,  alive: true },
    phase: 'player',
    selectedSkill: -1,
    waitingTarget: false,
    turn: 1,
    bossDiedThisTurn: false,
  }
}
