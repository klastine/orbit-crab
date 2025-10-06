export type Star = { x: number, y: number, radius: number, opacity: number }

export const ensureStars = (stars: Star[], width: number, height: number, count = 200): Star[] => {
  if (stars.length > 0) return stars
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    radius: Math.random() * 1.5,
    opacity: Math.random() * 0.8 + 0.2
  }))
}

export const drawStars = (ctx: CanvasRenderingContext2D, stars: Star[]) => {
  for (const star of stars) {
    ctx.beginPath()
    ctx.arc(star.x, star.y, star.radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(255, 255, 255, ${star.opacity})`
    ctx.fill()
  }
}


