/**
 * CelestialSphere - Pre-computed celestial coordinate calculations
 * Handles conversion from RA/Dec to 3D positions on a unit sphere
 */

/**
 * Convert Right Ascension and Declination to 3D Cartesian coordinates
 * on a unit sphere (radius = 1)
 * 
 * @param {number} ra - Right Ascension in degrees (0-360)
 * @param {number} dec - Declination in degrees (-90 to 90)
 * @returns {{x: number, y: number, z: number}} Unit sphere coordinates
 */
export const raDecToCartesian = (ra, dec) => {
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;

    // Standard astronomical convention:
    // X points to vernal equinox (RA=0, Dec=0)
    // Y points to RA=90°, Dec=0
    // Z points to north celestial pole (Dec=90°)
    return {
        x: Math.cos(decRad) * Math.cos(raRad),
        y: Math.cos(decRad) * Math.sin(raRad),
        z: Math.sin(decRad),
    };
};

/**
 * Calculate Local Sidereal Time (LST)
 * @param {Date} date - Current date/time
 * @param {number} longitude - Observer longitude in degrees (east positive)
 * @returns {number} LST in degrees (0-360)
 */
export const getLocalSiderealTime = (date, longitude) => {
    // Julian Date
    const jd = date.getTime() / 86400000 + 2440587.5;
    const T = (jd - 2451545.0) / 36525;

    // Greenwich Mean Sidereal Time in degrees
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
        0.000387933 * T * T - T * T * T / 38710000;
    gmst = ((gmst % 360) + 360) % 360;

    // Local Sidereal Time
    const lst = (gmst + longitude + 360) % 360;
    return lst;
};

/**
 * Create a rotation matrix for the celestial sphere
 * Rotates sphere based on LST and observer latitude
 * 
 * @param {number} lst - Local Sidereal Time in degrees
 * @param {number} latitude - Observer latitude in degrees
 * @returns {number[]} 4x4 rotation matrix as Float32Array
 */
export const createCelestialRotationMatrix = (lst, latitude) => {
    const lstRad = (lst * Math.PI) / 180;
    const latRad = (latitude * Math.PI) / 180;

    // First rotate around Z-axis by -LST (hour angle)
    const cosLst = Math.cos(-lstRad);
    const sinLst = Math.sin(-lstRad);

    // Then rotate around Y-axis by (90 - latitude) to align zenith
    const coLat = (90 - latitude) * Math.PI / 180;
    const cosCo = Math.cos(-coLat);
    const sinCo = Math.sin(-coLat);

    // Combined rotation matrix (Z then Y)
    // This is the transpose because we're rotating the coordinate system
    return new Float32Array([
        cosLst * cosCo, -sinLst, cosLst * sinCo, 0,
        sinLst * cosCo, cosLst, sinLst * sinCo, 0,
        -sinCo, 0, cosCo, 0,
        0, 0, 0, 1,
    ]);
};

/**
 * Pre-compute all star positions as typed arrays for GPU efficiency
 * @param {Array} stars - Array of star objects with ra, dec, magnitude, spectralType
 * @returns {Object} Typed arrays for positions, colors, and sizes
 */
export const precomputeStarBuffers = (stars) => {
    const count = stars.length;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);

    stars.forEach((star, i) => {
        // Position on unit sphere (scaled up for 3D scene)
        const sphereRadius = 100;
        const { x, y, z } = raDecToCartesian(star.ra, star.dec);
        positions[i * 3] = x * sphereRadius;
        positions[i * 3 + 1] = y * sphereRadius;
        positions[i * 3 + 2] = z * sphereRadius;

        // Color based on spectral type
        const color = getStarColorRGB(star.spectralType);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;

        // Size based on magnitude (brighter = larger)
        sizes[i] = getStarSize(star.magnitude);
    });

    return { positions, colors, sizes, count };
};

/**
 * Get star color as RGB values (0-1) based on spectral type
 */
export const getStarColorRGB = (spectralType) => {
    if (!spectralType) return { r: 1, g: 1, b: 1 };

    const type = spectralType.charAt(0).toUpperCase();

    const colorMap = {
        'O': { r: 0.61, g: 0.69, b: 1.0 },   // Blue
        'B': { r: 0.67, g: 0.77, b: 1.0 },   // Blue-white
        'A': { r: 0.79, g: 0.84, b: 1.0 },   // White
        'F': { r: 0.97, g: 0.97, b: 1.0 },   // Yellow-white
        'G': { r: 1.0, g: 0.96, b: 0.92 },   // Yellow (Sun-like)
        'K': { r: 1.0, g: 0.82, b: 0.63 },   // Orange
        'M': { r: 1.0, g: 0.80, b: 0.44 },   // Red-orange
    };

    return colorMap[type] || { r: 1, g: 1, b: 1 };
};

/**
 * Get star size based on apparent magnitude
 * Range: -1.5 (Sirius) to +6 (barely visible)
 */
export const getStarSize = (magnitude) => {
    // Inverse log scale: brighter stars (lower mag) are bigger
    const minSize = 1;
    const maxSize = 8;
    const normalized = (6 - magnitude) / 7.5;
    return minSize + Math.max(0, Math.min(1, normalized)) * (maxSize - minSize);
};

/**
 * Transform 3D position by device orientation (azimuth, altitude)
 * @param {Object} position - {x, y, z} coordinates
 * @param {number} azimuth - Device azimuth in degrees (0 = North)
 * @param {number} altitude - Device altitude in degrees (0 = horizon, 90 = zenith)
 * @returns {Object} Transformed {x, y, z}
 */
export const applyDeviceOrientation = (x, y, z, azimuth, altitude) => {
    const azRad = (-azimuth * Math.PI) / 180;
    const altRad = (-altitude * Math.PI) / 180;

    // Rotate around Z (azimuth)
    const x1 = x * Math.cos(azRad) - y * Math.sin(azRad);
    const y1 = x * Math.sin(azRad) + y * Math.cos(azRad);
    const z1 = z;

    // Rotate around X (altitude)
    const x2 = x1;
    const y2 = y1 * Math.cos(altRad) - z1 * Math.sin(altRad);
    const z2 = y1 * Math.sin(altRad) + z1 * Math.cos(altRad);

    return { x: x2, y: y2, z: z2 };
};

export default {
    raDecToCartesian,
    getLocalSiderealTime,
    createCelestialRotationMatrix,
    precomputeStarBuffers,
    getStarColorRGB,
    getStarSize,
    applyDeviceOrientation,
};
