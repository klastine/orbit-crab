# 🦀 OrbitCrab

A Rust-WASM powered orbital mechanics simulator with real-time 3D visualization. 

## Features

- **Real Orbital Mechanics**: Implements Keplerian orbital elements and two-body dynamics
- **Interactive Visualization**: Canvas-based rendering with Earth wireframe and satellite tracking
- **Customizable Orbits**: Adjust orbital parameters in real-time
- **Performance**: Rust compiled to WebAssembly for near-native speed
- **Educational**: Clear code structure for learning both Rust and orbital mechanics

## Project Architecture

### Backend (Rust/WASM)

The orbital mechanics engine is written in Rust and compiled to WebAssembly for high-performance calculations in the browser.

#### Core Components

**`src/lib.rs`** - WASM bindings and public API
- Exports the `Satellite` struct to JavaScript
- Provides getters for orbital elements (semi-major axis, eccentricity, inclination, RAAN, argument of periapsis)
- Handles WASM module initialization

**`src/orbital.rs`** - Orbital mechanics calculations
- Implements Keplerian orbital elements and two-body dynamics
- Propagates satellite position using mean motion approximation
- Calculates orbital period, velocity, apoapsis, and periapsis
- Uses Earth-Centered Inertial (ECI) coordinate system

**`src/utils.rs`** - Utility functions
- Degree/radian conversions
- Value clamping and mathematical helpers

#### Orbital Mechanics Implementation

The simulator uses six classical Keplerian orbital elements:

1. **Semi-major Axis (a)**: Defines the size of the orbit
2. **Eccentricity (e)**: Defines the shape (0 = circular, <1 = elliptical)
3. **Inclination (i)**: Angle from the equatorial plane
4. **RAAN (Ω)**: Right Ascension of Ascending Node - where the orbit crosses the equator going north
5. **Argument of Periapsis (ω)**: Orientation of the ellipse in the orbital plane
6. **True Anomaly (ν)**: Current position of the satellite in its orbit

The satellite position is propagated using mean motion approximation, suitable for near-circular orbits. The coordinate system uses Earth-Centered Inertial (ECI) frame for calculations.

### Frontend (React/TypeScript)

The visualization layer is built with React and TypeScript, providing an interactive 3D canvas-based interface.

#### Core Components

**`www/src/components/OrbitCanvas.tsx`** - Main orchestrator
- Manages camera state, mouse controls, and zoom
- Integrates WASM satellite with React lifecycle
- Handles real-time parameter updates via sliders
- Coordinates the animation loop and rendering pipeline

**`www/src/components/canvas/math.ts`** - 3D transformation utilities
- `rotateX`/`rotateY`: 3D rotation matrices
- `toCameraSpaceFactory`: World-to-camera space transformation
- `project3DFactory`: 3D-to-2D orthographic projection

**`www/src/components/canvas/earth.ts`** - Earth wireframe rendering
- Draws latitude/longitude grid lines
- Highlights the equator in red
- Uses crisp line rendering for sharp wireframe appearance

**`www/src/components/canvas/orbit.ts`** - Orbital path visualization
- `rebuildOrbitPath`: Generates 360 sample points along the orbital ellipse
- `drawOrbitPath`: Renders dotted orbital ring with proper 3D projection
- Handles elliptical orbits with varying radius based on true anomaly

**`www/src/components/canvas/satellite.ts`** - Satellite rendering
- Draws wireframe cube with solar panels
- Projects 3D world coordinates to screen space
- Maintains visual consistency with orbital path

**`www/src/components/canvas/stars.ts`** - Background star field
- Generates static star field for space ambiance
- Manages star regeneration on window resize

#### Rendering Pipeline

1. **Camera System**: Mouse-controlled rotation and zoom with orthographic projection
2. **Coordinate Transformation**: World space → Camera space → Screen space
3. **Rendering Order**: Stars → Orbital path → Earth wireframe → Satellite
4. **Real-time Updates**: WASM satellite position updates every frame, orbital path rebuilds when parameters change

#### Interactive Controls

- **Mouse Pan**: Rotate camera around Earth
- **Mouse Wheel**: Zoom in/out with constrained range
- **Inclination Slider**: Adjust orbital inclination (0-180°)
- **Eccentricity Slider**: Adjust orbital shape (0 to safe maximum based on semi-major axis)

The eccentricity slider automatically caps at a safe maximum to prevent orbits that would intersect Earth's surface.

## Implementation

### WASM Integration

The Rust orbital mechanics engine is compiled to WebAssembly using `wasm-pack` and integrated with React through TypeScript bindings. The satellite object provides real-time position updates and orbital element access.

### 3D Visualization

The 2D canvas uses orthographic projection to render 3D orbital mechanics. Camera rotations are applied in world space, then projected to screen coordinates. The system maintains proper 3D relationships between the satellite, orbital path, and Earth.

### Performance

- Rust/WASM provides near-native performance for orbital calculations
- Canvas rendering with device pixel ratio scaling for crisp visuals
- Efficient coordinate transformations with minimal allocations
- Real-time parameter updates without performance degradation