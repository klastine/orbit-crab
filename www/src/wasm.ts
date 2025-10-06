// WASM module types
export interface Satellite {
  update(deltaTime: number): void
  get_x(): number
  get_y(): number
  get_z(): number
  get_period(): number
  get_velocity(): number
  get_apoapsis(): number
  get_periapsis(): number
}

export interface WasmModule {
  Satellite: new (
    semiMajorAxis: number,
    eccentricity: number,
    inclination: number,
    raan: number,
    argPeriapsis: number,
    trueAnomaly: number
  ) => Satellite;
  default: () => Promise<any>; // WASM initialization function
}

// Load WASM module
export const loadWasm = async (): Promise<WasmModule> => {
  try {
    // Import the WASM module from the local pkg directory
    const wasm = await import('../pkg/orbit_crab.js')
    return wasm as WasmModule
  } catch (error) {
    console.error('Failed to load WASM module:', error)
    throw error
  }
}
