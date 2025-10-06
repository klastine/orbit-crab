mod utils;
mod orbital;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    fn alert(s: &str);
    
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);
}

/// Initialize the WASM module
#[wasm_bindgen(start)]
pub fn init() {
    #[cfg(feature = "console_error_panic_hook")]
    console_error_panic_hook::set_once();
    
    log("OrbitCrab WASM module initialized!");
}

/// Export the Satellite struct to JavaScript
#[wasm_bindgen]
pub struct Satellite {
    inner: orbital::Satellite,
}

#[wasm_bindgen]
impl Satellite {
    #[wasm_bindgen(constructor)]
    pub fn new(
        semi_major_axis: f64,
        eccentricity: f64,
        inclination: f64,
        raan: f64,
        arg_periapsis: f64,
        true_anomaly: f64,
    ) -> Satellite {
        Satellite {
            inner: orbital::Satellite::new(
                semi_major_axis,
                eccentricity,
                inclination,
                raan,
                arg_periapsis,
                true_anomaly,
            ),
        }
    }
    
    /// Update satellite position based on time delta
    pub fn update(&mut self, delta_time: f64) {
        self.inner.update(delta_time);
    }
    
    /// Get current X position in kilometers
    pub fn get_x(&self) -> f64 {
        self.inner.position.x
    }
    
    /// Get current Y position in kilometers
    pub fn get_y(&self) -> f64 {
        self.inner.position.y
    }
    
    /// Get current Z position in kilometers
    pub fn get_z(&self) -> f64 {
        self.inner.position.z
    }
    
    /// Get orbital period in seconds
    pub fn get_period(&self) -> f64 {
        self.inner.get_orbital_period()
    }
    
    /// Get current orbital velocity in km/s
    pub fn get_velocity(&self) -> f64 {
        self.inner.get_velocity()
    }
    
    /// Get apoapsis altitude in kilometers
    pub fn get_apoapsis(&self) -> f64 {
        self.inner.get_apoapsis()
    }
    
    /// Get periapsis altitude in kilometers
    pub fn get_periapsis(&self) -> f64 {
        self.inner.get_periapsis()
    }

    /// Semi-major axis (km)
    pub fn get_semi_major_axis(&self) -> f64 {
        self.inner.elements.semi_major_axis
    }
    /// Eccentricity (unitless)
    pub fn get_eccentricity(&self) -> f64 {
        self.inner.elements.eccentricity
    }
    /// Inclination (radians)
    pub fn get_inclination(&self) -> f64 {
        self.inner.elements.inclination
    }
    /// RAAN (radians)
    pub fn get_raan(&self) -> f64 {
        self.inner.elements.raan
    }
    /// Argument of periapsis (radians)
    pub fn get_arg_periapsis(&self) -> f64 {
        self.inner.elements.arg_periapsis
    }
}

