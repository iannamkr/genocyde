export const C = {
  BG:     0x08071a,  // 딥 네이비 스카이
  BG2:    0x0d0b2a,  // 다크 빌딩
  STONE:  0x1a2035,  // 플랫폼/바닥
  BORDER: 0x1e2d4a,  // 경계선
  CYAN:   0x00e5ff,  // 네온 시안 (주 강조)
  PINK:   0xff2d78,  // 네온 핑크 (보조 강조)
  PURPLE: 0x4400cc,  // 딥 퍼플
  DIM:    0x334466,  // 뮤트 블루
  WHITE:  0xffffff,  // 플레이어 실루엣
  RED:    0xff3333,  // HP/데미지
  GREEN:  0x44ff88,  // 아이템/버프
  GOLD:   0xffe566,  // UI 텍스트

  hex(color) {
    return '#' + color.toString(16).padStart(6, '0')
  },
}

export function drawRoundRect(graphics, x, y, w, h, r, fillColor, strokeColor, strokeWidth = 1) {
  graphics.clear()
  graphics.fillStyle(fillColor)
  graphics.fillRoundedRect(x, y, w, h, r)
  if (strokeWidth > 0) {
    graphics.lineStyle(strokeWidth, strokeColor, 1)
    graphics.strokeRoundedRect(x, y, w, h, r)
  }
}
