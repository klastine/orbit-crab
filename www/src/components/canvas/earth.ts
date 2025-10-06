export const drawWireframeEarth = (
  ctx: CanvasRenderingContext2D,
  project3D: (p: [number, number, number]) => [number, number],
  radius: number
) => {
  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'square'
  ctx.lineJoin = 'miter'
  ctx.strokeStyle = 'rgba(119, 255, 119, 0.3)'
  ctx.lineWidth = 3

  // latitude lines
  for (let lat = -90; lat <= 90; lat += 15) {
    const latRad = (lat * Math.PI) / 180
    const y = radius * Math.sin(latRad)
    const circleRadius = radius * Math.cos(latRad)
    ctx.beginPath()
    for (let lon = 0; lon <= 360; lon += 5) {
      const lonRad = (lon * Math.PI) / 180
      const x = circleRadius * Math.cos(lonRad)
      const z = circleRadius * Math.sin(lonRad)
      const [sx, sy] = project3D([x, y, z])
      if (lon === 0) ctx.moveTo(Math.round(sx), Math.round(sy))
      else ctx.lineTo(Math.round(sx), Math.round(sy))
    }
    ctx.stroke()
  }

  // longitude lines
  for (let lon = 0; lon < 360; lon += 15) {
    const lonRad = (lon * Math.PI) / 180
    ctx.beginPath()
    for (let lat = -90; lat <= 90; lat += 5) {
      const latRad = (lat * Math.PI) / 180
      const x = radius * Math.cos(latRad) * Math.cos(lonRad)
      const y = radius * Math.sin(latRad)
      const z = radius * Math.cos(latRad) * Math.sin(lonRad)
      const [sx, sy] = project3D([x, y, z])
      if (lat === -90) ctx.moveTo(Math.round(sx), Math.round(sy))
      else ctx.lineTo(Math.round(sx), Math.round(sy))
    }
    ctx.stroke()
  }

  // equator
  ctx.strokeStyle = 'rgba(255, 0, 4, 0.3)'
  ctx.lineWidth = 5
  ctx.beginPath()
  for (let lon = 0; lon <= 360; lon += 2) {
    const lonRad = (lon * Math.PI) / 180
    const x = radius * Math.cos(lonRad)
    const y = 0
    const z = radius * Math.sin(lonRad)
    const [sx, sy] = project3D([x, y, z])
    if (lon === 0) ctx.moveTo(Math.round(sx), Math.round(sy))
    else ctx.lineTo(Math.round(sx), Math.round(sy))
  }
  ctx.stroke()
}


