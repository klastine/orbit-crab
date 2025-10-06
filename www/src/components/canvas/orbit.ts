export type OrbitParams = { a: number, e: number, i: number, raan: number, w: number }

export const rebuildOrbitPath = (params: OrbitParams, steps = 360) => {
  const points: Array<{x: number, y: number, z: number}> = []
  const { a, e, i, raan, w } = params
  for (let deg = 0; deg < 360; deg += 360 / steps) {
    const nu = (deg * Math.PI) / 180
    const r = a * (1 - e * e) / (1 + e * Math.cos(nu))
    const x_orb = r * Math.cos(nu)
    const y_orb = r * Math.sin(nu)
    const cosO = Math.cos(raan), sinO = Math.sin(raan)
    const cosi = Math.cos(i),   sini = Math.sin(i)
    const cosw = Math.cos(w),   sinw = Math.sin(w)
    const x = (cosO * cosw - sinO * sinw * cosi) * x_orb + (-cosO * sinw - sinO * cosw * cosi) * y_orb
    const y = (sinO * cosw + cosO * sinw * cosi) * x_orb + (-sinO * sinw + cosO * cosw * cosi) * y_orb
    const z = (sinw * sini) * x_orb + (cosw * sini) * y_orb
    points.push({ x, y, z })
  }
  return points
}

export const drawOrbitPath = (
  ctx: CanvasRenderingContext2D,
  project3D: (p: [number, number, number]) => [number, number],
  SCALE: number,
  path: Array<{x: number, y: number, z: number}>
) => {
  if (!path || path.length === 0) return
  ctx.save()
  ctx.imageSmoothingEnabled = false
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.setLineDash([6, 6])
  ctx.strokeStyle = 'rgba(255, 107, 53, 0.9)'
  ctx.lineWidth = 2

  let started = false
  let first: [number, number] | null = null
  for (let i = 0; i < path.length; i++) {
    const p = path[i]
    const [sx, sy] = project3D([p.x * SCALE, p.y * SCALE, p.z * SCALE])
    if (!started) {
      ctx.beginPath()
      ctx.moveTo(Math.round(sx), Math.round(sy))
      first = [Math.round(sx), Math.round(sy)]
      started = true
    } else {
      ctx.lineTo(Math.round(sx), Math.round(sy))
    }
  }
  if (started && first) {
    ctx.lineTo(first[0], first[1])
    ctx.stroke()
  }
  ctx.restore()
}


