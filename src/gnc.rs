use crate::utils::{Vec3, EARTH_MU, EARTH_RADIUS};

#[derive(Clone, Copy, Debug)]
pub struct State {
    pub r: Vec3,   // position (km)
    pub v: Vec3,   // velocity (km/s)
    pub m: f64,    // mass (kg) - include if you want fuel usage; otherwise keep constant
}

#[derive(Clone, Copy, Debug, Default)]
pub struct Control {
    /// Thrust vector in ECI (N). If you prefer body frame + attitude, add attitude and rotate.
    pub thrust_eci: Vec3,
    /// Specific impulse (s) used for mass flow (optional).
    pub isp: f64,
}

#[inline]
fn two_body_accel(mu: f64, r: Vec3) -> Vec3 {
    let rnorm = r.magnitude();
    let inv = 1.0 / (rnorm * rnorm * rnorm);
    r * (-mu * inv)
}

fn j2_accel(r: Vec3) -> Vec3 {
    const J2: f64 = 1.08263e-3;
    const RE: f64 = EARTH_RADIUS; // km
    let z2 = r.z * r.z;
    let r2 = r.dot(r);
    let r1 = r2.sqrt();
    let rx = r.x; let ry = r.y; let rz = r.z;
    let k = 1.5 * J2 * EARTH_MU * (RE * RE) / (r1.powi(5));
    let factor = 5.0 * z2 / r2;
    Vec3::new(
        rx * (factor - 1.0),
        ry * (factor - 1.0),
        rz * (factor - 3.0),
    ) * k
}

/// Mass flow from thrust (Tsiolkovsky; here as continuous mdot = -T/(Isp*g0))
fn mdot_from_thrust(thrust: f64, isp: f64) -> f64 {
    const G0: f64 = 9.80665; // m/s^2
    if isp > 0.0 { -(thrust) / (isp * G0) } else { 0.0 } // N / (s*m/s^2) -> kg/s
}

/// Continuous-time EOM: xdot = f(x, u)
// time included but not used for future simulations
pub fn eom(_t: f64, x: &State, u: &Control) -> State {
    // Forces
    let a_grav = two_body_accel(EARTH_MU, x.r);
    let a_j2 = j2_accel(x.r);

    // Thrust acceleration: a = F/m, convert N to (km/s^2): 1 N = 1 kg·m/s^2; 1 km = 1000 m
    let thrust_km = u.thrust_eci / 1000.0;
    let a_thrust = if x.m > 0.0 { thrust_km / x.m } else { Vec3::ZERO };

    // Mass flow
    let thrust_mag_n = u.thrust_eci.magnitude();
    let mdot = mdot_from_thrust(thrust_mag_n, u.isp);

    State {
        r: x.v,                            // rdot = v
        v: a_grav + a_j2 + a_thrust,       // vdot = a_total
        m: mdot,                           // mdot
    }
}

/// RK4 step
pub fn rk4_step<F>(f: F, t: f64, x: &State, u: &Control, dt: f64) -> State
where
    F: Fn(f64, &State, &Control) -> State,
{
    let k1 = f(t, x, u);
    let x2 = State { r: x.r + k1.r*(dt*0.5), v: x.v + k1.v*(dt*0.5), m: x.m + k1.m*(dt*0.5) };
    let k2 = f(t + 0.5*dt, &x2, u);
    let x3 = State { r: x.r + k2.r*(dt*0.5), v: x.v + k2.v*(dt*0.5), m: x.m + k2.m*(dt*0.5) };
    let k3 = f(t + 0.5*dt, &x3, u);
    let x4 = State { r: x.r + k3.r*dt, v: x.v + k3.v*dt, m: x.m + k3.m*dt };
    let k4 = f(t + dt, &x4, u);

    State {
        r: x.r + (k1.r + k2.r*2.0 + k3.r*2.0 + k4.r) * (dt / 6.0),
        v: x.v + (k1.v + k2.v*2.0 + k3.v*2.0 + k4.v) * (dt / 6.0),
        m: x.m + (k1.m + k2.m*2.0 + k3.m*2.0 + k4.m) * (dt / 6.0),
    }
}
