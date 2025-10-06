use crate::utils;
use crate::utils::{Vec3, EARTH_MU, EARTH_RADIUS};
use crate::gnc;


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
    pub state: gnc::State,
    pub control: gnc::Control,
    pub time: f64,
    pub thrust_limit_n: f64,
    pub j2_on: bool,
}

impl Satellite {
    pub fn new(
        semi_major_axis: f64,
        eccentricity: f64,
        inclination: f64,
        raan: f64,
        arg_periapsis: f64,
        true_anomaly: f64,
        mass: f64,
        isp: f64,
        thrust_limit_n: f64,
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
            state: gnc::State { r: position, v: velocity, m: mass },
            control: gnc::Control { thrust_eci: Vec3::ZERO, isp: isp },
            time: 0.0,
            thrust_limit_n,
            j2_on: true,
        }
    }
    
    // https://en.wikipedia.org/wiki/Orbital_elements
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

    // https://en.wikipedia.org/wiki/Orbital_elements
    pub fn state_vectors_to_elements(r: Vec3, v: Vec3) -> OrbitalElements {
        // Constants & helpers
        const EPS: f64 = 1e-10;
    
        let r_norm = r.magnitude();
        let v_norm2 = v.dot(v);
        let h_vec = r.cross(v);
        let h_norm = h_vec.magnitude();
    
        // Inclination
        let i = (h_vec.z / h_norm).acos();
    
        // Node vector (pointing to ascending node): n = k × h
        let n_vec = Vec3::new(-h_vec.y, h_vec.x, 0.0);
        let n_norm = n_vec.magnitude();
    
        let e_vec = (v.cross(h_vec) / EARTH_MU) - (r / r_norm);
        let e = e_vec.magnitude();
    
        let a = 1.0 / (2.0 / r_norm - v_norm2 / EARTH_MU);
    
        let raan = if n_norm > EPS {
            utils::normalize_angle(libm::atan2(n_vec.y, n_vec.x))
        } else {
            0.0 
        };
    
        // Argument of periapsis (ω)
        let arg_periapsis = if e > EPS && n_norm > EPS {
            let cos_w = (n_vec.dot(e_vec)) / (n_norm * e);
            let sin_w = (n_vec.cross(e_vec)).z / (n_norm * e);
            utils::normalize_angle(libm::atan2(sin_w, cos_w))
        } else if e > EPS && n_norm <= EPS {
            // Equatorial but eccentric: measure from x-axis
            utils::normalize_angle(libm::atan2(e_vec.y, e_vec.x))
        } else {
            0.0
        };
    
        // True anomaly (ν)
        let true_anomaly = if e > EPS {
            // cosν = (e·r)/(e|r|)
            let cos_nu = (e_vec.dot(r)) / (e * r_norm);
            let cos_nu = cos_nu.clamp(-1.0, 1.0);
            let mut nu = libm::acos(cos_nu);
            // Resolve quadrant using r·v
            if r.dot(v) < 0.0 {
                nu = 2.0 * std::f64::consts::PI - nu;
            }
            utils::normalize_angle(nu)
        } else if n_norm > EPS {
            let cos_u = (n_vec.dot(r)) / (n_norm * r_norm);
            let sin_u = (n_vec.cross(r)).z / (n_norm * r_norm);
            utils::normalize_angle(libm::atan2(sin_u, cos_u))
        } else {
            utils::normalize_angle(libm::atan2(r.y, r.x))
        };
    
        OrbitalElements::new(a, e, i, raan, arg_periapsis, true_anomaly)
    }
    
    pub fn set_thrust_eci(&mut self, thrust_n_eci: Vec3) {
        // clamp to actuator capability
        let mag = thrust_n_eci.magnitude();
        self.control.thrust_eci = if mag > self.thrust_limit_n {
            thrust_n_eci * (self.thrust_limit_n / mag)
        } else { thrust_n_eci };
    }

    pub fn update(&mut self, dt: f64) {
        // integrate one step
        self.state = gnc::rk4_step(gnc::eom, self.time, &self.state, &self.control, dt);
        self.time += dt;

        self.elements = Self::state_vectors_to_elements(self.state.r, self.state.v);
    }
    
    /// Get orbital period in seconds
    pub fn get_orbital_period(&self) -> f64 {
        2.0 * std::f64::consts::PI * libm::sqrt(
            libm::pow(self.elements.semi_major_axis, 3.0) / EARTH_MU
        )
    }
    
    /// Get current velocity magnitude in km/s
    pub fn get_velocity(&self) -> f64 {
        self.state.v.magnitude()
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

