use crate::utils;

// Physical constants
const EARTH_MU: f64 = 398600.4418;
const EARTH_RADIUS: f64 = 6371.0;

#[derive(Debug, Clone, Copy)]
pub struct Vec3 {
    pub x: f64,
    pub y: f64,
    pub z: f64,
}

impl Vec3 {
    pub fn new(x: f64, y: f64, z: f64) -> Self {
        Vec3 { x, y, z }
    }
    
    pub fn magnitude(&self) -> f64 {
        libm::sqrt(self.x * self.x + self.y * self.y + self.z * self.z)
    }
    
    pub fn normalize(&self) -> Vec3 {
        let mag = self.magnitude();
        if mag > 0.0 {
            Vec3::new(self.x / mag, self.y / mag, self.z / mag)
        } else {
            Vec3::new(0.0, 0.0, 0.0)
        }
    }
}

/// Orbital elements (Keplerian elements)
#[derive(Debug, Clone)]
pub struct OrbitalElements {
    pub semi_major_axis: f64,    // a: Semi-major axis (km)
    pub eccentricity: f64,        // e: Eccentricity
    pub inclination: f64,         // i: Inclination (radians)
    pub raan: f64,                // Ω: Right Ascension of Ascending Node (radians)
    pub arg_periapsis: f64,       // ω: Argument of periapsis (radians)
    pub true_anomaly: f64,        // ν: True anomaly (radians)
}

impl OrbitalElements {
    pub fn new(
        semi_major_axis: f64,
        eccentricity: f64,
        inclination: f64,
        raan: f64,
        arg_periapsis: f64,
        true_anomaly: f64,
    ) -> Self {
        OrbitalElements {
            semi_major_axis,
            eccentricity,
            inclination: utils::deg_to_rad(inclination),
            raan: utils::deg_to_rad(raan),
            arg_periapsis: utils::deg_to_rad(arg_periapsis),
            true_anomaly: utils::deg_to_rad(true_anomaly),
        }
    }
}

/// Satellite with orbital state
#[derive(Debug, Clone)]
pub struct Satellite {
    pub elements: OrbitalElements,
    pub position: Vec3,
    pub velocity: Vec3,
    pub time: f64,
}

impl Satellite {
    pub fn new(
        semi_major_axis: f64,
        eccentricity: f64,
        inclination: f64,
        raan: f64,
        arg_periapsis: f64,
        true_anomaly: f64,
    ) -> Self {
        let elements = OrbitalElements::new(
            semi_major_axis,
            eccentricity,
            inclination,
            raan,
            arg_periapsis,
            true_anomaly,
        );
        
        let (position, velocity) = Self::elements_to_state_vectors(&elements);
        
        Satellite {
            elements,
            position,
            velocity,
            time: 0.0,
        }
    }
    
    fn elements_to_state_vectors(elements: &OrbitalElements) -> (Vec3, Vec3) {
        let a = elements.semi_major_axis;
        let e = elements.eccentricity;
        let i = elements.inclination;
        let omega = elements.raan;
        let w = elements.arg_periapsis;
        let nu = elements.true_anomaly;
        
        // Calculate position in orbital plane
        let r = a * (1.0 - e * e) / (1.0 + e * libm::cos(nu));
        let x_orb = r * libm::cos(nu);
        let y_orb = r * libm::sin(nu);
        
        // Calculate velocity in orbital plane
        let h = libm::sqrt(EARTH_MU * a * (1.0 - e * e)); 
        let vx_orb = -EARTH_MU / h * libm::sin(nu);
        let vy_orb = EARTH_MU / h * (e + libm::cos(nu));
        
        // Rotation matrices to transform from orbital plane to ECI frame
        let cos_omega = libm::cos(omega);
        let sin_omega = libm::sin(omega);
        let cos_i = libm::cos(i);
        let sin_i = libm::sin(i);
        let cos_w = libm::cos(w);
        let sin_w = libm::sin(w);
        
        // Position transformation
        let x = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * x_orb
            + (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * y_orb;
        let y = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * x_orb
            + (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * y_orb;
        let z = (sin_w * sin_i) * x_orb + (cos_w * sin_i) * y_orb;
        
        // Velocity transformation
        let vx = (cos_omega * cos_w - sin_omega * sin_w * cos_i) * vx_orb
            + (-cos_omega * sin_w - sin_omega * cos_w * cos_i) * vy_orb;
        let vy = (sin_omega * cos_w + cos_omega * sin_w * cos_i) * vx_orb
            + (-sin_omega * sin_w + cos_omega * cos_w * cos_i) * vy_orb;
        let vz = (sin_w * sin_i) * vx_orb + (cos_w * sin_i) * vy_orb;
        
        (Vec3::new(x, y, z), Vec3::new(vx, vy, vz))
    }
    
    /// Update satellite position using simplified orbital propagation
    /// This uses mean motion for circular/elliptical orbits
    pub fn update(&mut self, delta_time: f64) {
        self.time += delta_time;
        
        // Calculate mean motion (radians per second)
        let n = libm::sqrt(EARTH_MU / libm::pow(self.elements.semi_major_axis, 3.0));
        
        // Update true anomaly (simplified - assumes near-circular orbit)
        self.elements.true_anomaly += n * delta_time;
        self.elements.true_anomaly %= 2.0 * std::f64::consts::PI;
        
        // Recalculate position and velocity
        let (position, velocity) = Self::elements_to_state_vectors(&self.elements);
        self.position = position;
        self.velocity = velocity;
    }
    
    /// Get orbital period in seconds
    pub fn get_orbital_period(&self) -> f64 {
        2.0 * std::f64::consts::PI * libm::sqrt(
            libm::pow(self.elements.semi_major_axis, 3.0) / EARTH_MU
        )
    }
    
    /// Get current velocity magnitude in km/s
    pub fn get_velocity(&self) -> f64 {
        self.velocity.magnitude()
    }
    
    /// Get apoapsis altitude (highest point) in kilometers
    pub fn get_apoapsis(&self) -> f64 {
        self.elements.semi_major_axis * (1.0 + self.elements.eccentricity) - EARTH_RADIUS
    }
    
    /// Get periapsis altitude (lowest point) in kilometers
    pub fn get_periapsis(&self) -> f64 {
        self.elements.semi_major_axis * (1.0 - self.elements.eccentricity) - EARTH_RADIUS
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    
    #[test]
    fn test_circular_orbit() {
        let sat = Satellite::new(6371.0 + 408.0, 0.0, 51.6, 0.0, 0.0, 0.0);
        let period = sat.get_orbital_period();
        
        assert!((period - 5550.0).abs() < 100.0);
    }
}

