export const drawSatellite = (
  ctx: CanvasRenderingContext2D,
  getWorldPosition: () => { x: number, y: number, z: number } | null,
  project3D: (p: [number, number, number]) => [number, number],
  SCALE: number
) => {
  const pos = getWorldPosition()
  if (!pos) return
  const { x, y, z } = pos
  const [sx, sy] = project3D([x * SCALE, y * SCALE, z * SCALE])

  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  const cubeSize = 6
  ctx.strokeStyle = '#ff6b35'
  ctx.lineWidth = 2

  ctx.beginPath()
  ctx.moveTo(Math.round(sx - cubeSize), Math.round(sy - cubeSize))
  ctx.lineTo(Math.round(sx + cubeSize), Math.round(sy - cubeSize))
  ctx.lineTo(Math.round(sx + cubeSize), Math.round(sy + cubeSize))
  ctx.lineTo(Math.round(sx - cubeSize), Math.round(sy + cubeSize))
  ctx.closePath()

  ctx.moveTo(Math.round(sx - cubeSize + 2), Math.round(sy - cubeSize + 2))
  ctx.lineTo(Math.round(sx + cubeSize + 2), Math.round(sy - cubeSize + 2))
  ctx.lineTo(Math.round(sx + cubeSize + 2), Math.round(sy + cubeSize + 2))
  ctx.lineTo(Math.round(sx - cubeSize + 2), Math.round(sy + cubeSize + 2))
  ctx.closePath()

  ctx.moveTo(Math.round(sx - cubeSize), Math.round(sy - cubeSize))
  ctx.lineTo(Math.round(sx - cubeSize + 2), Math.round(sy - cubeSize + 2))
  ctx.moveTo(Math.round(sx + cubeSize), Math.round(sy - cubeSize))
  ctx.lineTo(Math.round(sx + cubeSize + 2), Math.round(sy - cubeSize + 2))
  ctx.moveTo(Math.round(sx + cubeSize), Math.round(sy + cubeSize))
  ctx.lineTo(Math.round(sx + cubeSize + 2), Math.round(sy + cubeSize + 2))
  ctx.moveTo(Math.round(sx - cubeSize), Math.round(sy + cubeSize))
  ctx.lineTo(Math.round(sx - cubeSize + 2), Math.round(sy + cubeSize + 2))
  ctx.stroke()

  // Solar panels
  const panelSize = 12
  const panelOffset = cubeSize + 3
  ctx.beginPath()
  ctx.moveTo(Math.round(sx - panelOffset), Math.round(sy - panelSize / 2))
  ctx.lineTo(Math.round(sx - panelOffset), Math.round(sy + panelSize / 2))
  ctx.lineTo(Math.round(sx - panelOffset - 2), Math.round(sy + panelSize / 2))
  ctx.lineTo(Math.round(sx - panelOffset - 2), Math.round(sy - panelSize / 2))
  ctx.closePath()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(Math.round(sx + panelOffset), Math.round(sy - panelSize / 2))
  ctx.lineTo(Math.round(sx + panelOffset), Math.round(sy + panelSize / 2))
  ctx.lineTo(Math.round(sx + panelOffset + 2), Math.round(sy + panelSize / 2))
  ctx.lineTo(Math.round(sx + panelOffset + 2), Math.round(sy - panelSize / 2))
  ctx.closePath()
  ctx.stroke()

  ctx.beginPath()
  ctx.moveTo(Math.round(sx - cubeSize), Math.round(sy))
  ctx.lineTo(Math.round(sx - panelOffset), Math.round(sy))
  ctx.moveTo(Math.round(sx + cubeSize), Math.round(sy))
  ctx.lineTo(Math.round(sx + panelOffset), Math.round(sy))
  ctx.stroke()
}


