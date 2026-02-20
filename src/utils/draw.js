export const C = {
  BG:     0x0b0602,
  BG2:    0x110904,
  BORDER: 0x3a1e08,
  GOLD:   0xc8a96e,
  DIM:    0x6a5030,
  RED:    0xc93333,
  RED2:   0xff5555,
  PURPLE: 0x9955bb,
  BLUE:   0x4488cc,
  GREEN:  0x44aa44,
  ORANGE: 0xcc7722,

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
