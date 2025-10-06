import React, { useRef, useEffect, useState, useCallback } from 'react'
import { loadWasm, type WasmModule, type Satellite } from '../wasm'
import { toCameraSpaceFactory, project3DFactory } from './canvas/math'
import { drawWireframeEarth as drawEarthExternal } from './canvas/earth'
import { rebuildOrbitPath as rebuildOrbitExternal, drawOrbitPath as drawOrbitExternal } from './canvas/orbit'
import { ensureStars as ensureStarsExternal, drawStars as drawStarsExternal, type Star } from './canvas/stars'
import { drawSatellite as drawSatelliteExternal } from './canvas/satellite'

interface Camera {
  x: number
  y: number
  z: number
  rotationX: number
  rotationY: number
}

interface MouseState {
  isDown: boolean
  lastX: number
  lastY: number
}

const OrbitCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const animationRef = useRef<number>()
  const mouseRef = useRef<MouseState>({ isDown: false, lastX: 0, lastY: 0 })
  const wasmRef = useRef<WasmModule | null>(null)
  const satelliteRef = useRef<Satellite | null>(null)
  const lastTimeRef = useRef<number>(Date.now())
  const starsRef = useRef<Star[]>([])
  const trailRef = useRef<Array<{x: number, y: number, z: number, time: number}>>([])
  const orbitPathRef = useRef<Array<{x: number, y: number, z: number}>>([])
  const orbitParamsRef = useRef<{a: number, e: number, i: number, raan: number, w: number} | null>(null)
  const semiMajorAxisRef = useRef<number>(0)

  // UI state for interactive controls
  const [inclinationDeg, setInclinationDeg] = useState<number>(51.6)
  const [eccentricity, setEccentricity] = useState<number>(0.0)
  
  const [camera, setCamera] = useState<Camera>({
    x: 0,
    y: 0,
    z: 3000, // Start closer to Earth
    rotationX: Math.PI/4,
    rotationY: Math.PI/2,
  })
  const cameraRef = useRef(camera)
  useEffect(() => { cameraRef.current = camera }, [camera])

  // Constants
  const EARTH_RADIUS = 6371 // km
  const SCALE = 0.1 // pixels per km

  // Compute maximum eccentricity that keeps periapsis above Earth radius
  const getSafeMaxE = () => {
    const a = semiMajorAxisRef.current || (EARTH_RADIUS + 4000)
    const rawMax = 1 - (EARTH_RADIUS / a)
    // keep a small safety margin
    return Math.max(0, Math.min(0.95, rawMax - 0.01))
  }

  // Mouse event handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    mouseRef.current.isDown = true
    mouseRef.current.lastX = e.clientX
    mouseRef.current.lastY = e.clientY
  }, [])

  const handleMouseUp = useCallback(() => {
    mouseRef.current.isDown = false
  }, [])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!mouseRef.current.isDown) return

    const deltaX = e.clientX - mouseRef.current.lastX
    const deltaY = e.clientY - mouseRef.current.lastY

    setCamera(prev => ({
      ...prev,
      rotationY: prev.rotationY + deltaX * 0.01,
      rotationX: Math.max(-Math.PI/2, Math.min(Math.PI/2, prev.rotationX + deltaY * 0.01))
    }))

    mouseRef.current.lastX = e.clientX
    mouseRef.current.lastY = e.clientY
  }, [])

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault()
    setCamera(prev => ({
      ...prev,
      z: Math.max(2000, Math.min(5000, prev.z - e.deltaY * 10))
    }))
  }, [])

  // Projection helpers from math module
  const toCameraSpace = toCameraSpaceFactory(() => cameraRef.current.rotationX, () => cameraRef.current.rotationY)
  const project3D = project3DFactory(toCameraSpace, () => cameraRef.current.z)

  // Draw wireframe Earth
  const drawWireframeEarth = (ctx: CanvasRenderingContext2D) => {
    drawEarthExternal(ctx, project3D, EARTH_RADIUS * SCALE)
  }

  // Precompute orbital path points from current elements (approximate, using JS math)
  const rebuildOrbitPath = () => {
    if (!orbitParamsRef.current) return
    orbitPathRef.current = rebuildOrbitExternal(orbitParamsRef.current)
  }

  // Draw full dotted orbital trajectory (full 360°, no horizon clipping)
  const drawOrbitPath = (ctx: CanvasRenderingContext2D) => {
    drawOrbitExternal(ctx, project3D, SCALE, orbitPathRef.current)
  }

  // Draw stars background (delegated)
  const drawStars = (ctx: CanvasRenderingContext2D) => {
    starsRef.current = ensureStarsExternal(starsRef.current, window.innerWidth, window.innerHeight, 200)
    drawStarsExternal(ctx, starsRef.current)
  }

  // Draw satellite
  const drawSatellite = (ctx: CanvasRenderingContext2D) => {
    drawSatelliteExternal(
      ctx,
      () => {
        if (!satelliteRef.current) return null
        return {
          x: satelliteRef.current.get_x(),
          y: satelliteRef.current.get_y(),
          z: satelliteRef.current.get_z(),
        }
      },
      project3D,
      SCALE
    )
  }

  // Animation loop
  const animate = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Set canvas size with device pixel ratio for crisp rendering
    const dpr = window.devicePixelRatio || 1
    canvas.width = window.innerWidth * dpr
    canvas.height = window.innerHeight * dpr
    canvas.style.width = window.innerWidth + 'px'
    canvas.style.height = window.innerHeight + 'px'
    ctx.scale(dpr, dpr)

    // Update satellite if it exists
    if (satelliteRef.current) {
      const currentTime = Date.now()
      const deltaTime = (currentTime - lastTimeRef.current) / 1000 
      lastTimeRef.current = currentTime
      
      satelliteRef.current.update(deltaTime * 50)
    }

    // Clear canvas with space background
    ctx.fillStyle = 'rgba(5, 5, 15, 0.1)'
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    // Draw stars
    drawStars(ctx)

    // Draw full dotted orbit path first (if available)
    drawOrbitPath(ctx)

    // Draw wireframe Earth (for reference grid)
    drawWireframeEarth(ctx)

    // Draw satellite on top
    drawSatellite(ctx)

    animationRef.current = requestAnimationFrame(animate)
  }, [])

  // Initialize animation and handle resize
  useEffect(() => {
    const initializeWasm = async () => {
      try {
        console.log('Loading WASM module...')
        const wasm = await loadWasm()
        wasmRef.current = wasm
        console.log('WASM loaded successfully:', wasm)
        
        console.log('Initializing WASM...')
        await wasm.default()
        console.log('WASM initialized successfully')
        
        // Create ISS-like satellite (408 km altitude, circular orbit, 51.6° inclination)
        const semiMajorAxis = EARTH_RADIUS + 4000 // km
        semiMajorAxisRef.current = semiMajorAxis
        console.log('Creating satellite with semi-major axis:', semiMajorAxis)
        
        satelliteRef.current = new wasm.Satellite(
          semiMajorAxis,
          0.0,    // eccentricity (circular)
          51.6,   // inclination (degrees)
          0.0,    // RAAN (degrees)
          0.0,    // argument of periapsis (degrees)
          0.0,    // initial true anomaly (degrees)
          1000.0, // mass (kg)
          300.0,  // isp (specific impulse in seconds)
          1000.0  // thrust limit (N)
        )
        
        console.log('Satellite created successfully:', satelliteRef.current)
        console.log('Initial satellite position:', {
          x: satelliteRef.current.get_x(),
          y: satelliteRef.current.get_y(),
          z: satelliteRef.current.get_z()
        })

        try {
          const satAny = satelliteRef.current as any
          const a = typeof satAny.get_semi_major_axis === 'function' ? satAny.get_semi_major_axis() : semiMajorAxis
          const e = typeof satAny.get_eccentricity === 'function' ? satAny.get_eccentricity() : eccentricity
          const i = typeof satAny.get_inclination === 'function' ? satAny.get_inclination() : (inclinationDeg * Math.PI / 180)
          const raan = typeof satAny.get_raan === 'function' ? satAny.get_raan() : 0
          const w = typeof satAny.get_arg_periapsis === 'function' ? satAny.get_arg_periapsis() : 0
          orbitParamsRef.current = { a, e, i, raan, w }
          rebuildOrbitPath()
        } catch (_) {
          orbitParamsRef.current = { a: semiMajorAxis, e: 0, i: 0, raan: 0, w: 0 }
          rebuildOrbitPath()
        }
      } catch (error) {
        console.error('Failed to initialize WASM:', error)
      }
    }

    initializeWasm()
    animate()

    const handleResize = () => {
      const canvas = canvasRef.current
      if (canvas) {
        const dpr = window.devicePixelRatio || 1
        canvas.width = window.innerWidth * dpr
        canvas.height = window.innerHeight * dpr
        canvas.style.width = window.innerWidth + 'px'
        canvas.style.height = window.innerHeight + 'px'
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.scale(dpr, dpr)
        }
        // Regenerate stars for new canvas size
        starsRef.current = []
      }
    }

    window.addEventListener('resize', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [])

  // Rebuild satellite and orbit path when UI params change
  useEffect(() => {
    const rebuild = async () => {
      if (!wasmRef.current) return
      // Recreate satellite with new elements
      {
        // Clamp e to safe maximum for current semi-major axis
        const a = semiMajorAxisRef.current || (EARTH_RADIUS + 4000)
        const eSafe = Math.min(eccentricity, 1 - (EARTH_RADIUS / a) - 0.01)
        satelliteRef.current = new (wasmRef.current as any).Satellite(
          a,
          Math.max(0, eSafe),
          inclinationDeg,
          0,
          0,
          0,
          1000.0, // mass (kg)
          300.0,  // isp (specific impulse in seconds)
          1000.0  // thrust limit (N)
        )
      }
      // reset integrator clock to avoid jumps
      lastTimeRef.current = Date.now()
      orbitParamsRef.current = {
        a: semiMajorAxisRef.current || (EARTH_RADIUS + 4000),
        e: Math.max(0, Math.min(eccentricity, getSafeMaxE())),
        i: inclinationDeg * Math.PI / 180,
        raan: 0,
        w: 0,
      }
      rebuildOrbitPath()
      trailRef.current = []
    }
    rebuild()
  }, [inclinationDeg, eccentricity])

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        onMouseLeave={handleMouseUp}
        style={{
          width: '100%',
          height: '100%',
          cursor: mouseRef.current.isDown ? 'grabbing' : 'grab',
          display: 'block'
        }}
      />
      {/* Controls overlay */}
      <div style={{ position: 'absolute', top: 12, right: 12, background: 'rgba(0,0,0,0.4)', padding: '12px 14px', borderRadius: 8, border: '1px solid rgba(255,255,255,0.15)', color: '#fff', width: 260 }}>
        <div style={{ marginBottom: 10 }}>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Inclination (deg): {inclinationDeg.toFixed(1)}</label>
          <input
            type="range"
            min={0}
            max={180}
            step={0.1}
            value={inclinationDeg}
            onChange={(e) => setInclinationDeg(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
        <div>
          <label style={{ display: 'block', fontSize: 12, marginBottom: 6 }}>Eccentricity (max {getSafeMaxE().toFixed(2)}): {eccentricity.toFixed(2)}</label>
          <input
            type="range"
            min={0}
            max={getSafeMaxE()}
            step={0.01}
            value={eccentricity}
            onChange={(e) => setEccentricity(parseFloat(e.target.value))}
            style={{ width: '100%' }}
          />
        </div>
      </div>
    </div>
  )
}

export default OrbitCanvas
