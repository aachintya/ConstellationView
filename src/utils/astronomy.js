/**
 * Astronomy utility functions for celestial calculations
 */

import { degToRad, radToDeg, getJulianDate } from './coordinates';

/**
 * Calculate planet position (simplified - uses mean orbital elements)
 * For a production app, use more accurate ephemeris calculations
 * 
 * @param {string} planetName - Name of the planet
 * @param {Date} date - Date for calculation
 * @returns {{ra: number, dec: number}} Equatorial coordinates
 */
export const getPlanetPosition = (planetName, date = new Date()) => {
    // Simplified planetary positions - returns approximate ecliptic longitude
    // For accurate positions, use JPL Horizons or VSOP87

    const jd = getJulianDate(date);
    const T = (jd - 2451545.0) / 36525; // Julian centuries from J2000

    // Mean orbital elements (simplified)
    const planets = {
        mercury: { L0: 252.251, Lrate: 149472.6746 },
        venus: { L0: 181.979, Lrate: 58517.8157 },
        mars: { L0: 355.433, Lrate: 19140.2993 },
        jupiter: { L0: 34.351, Lrate: 3034.9057 },
        saturn: { L0: 50.077, Lrate: 1222.1138 },
        uranus: { L0: 314.055, Lrate: 428.4670 },
        neptune: { L0: 304.349, Lrate: 218.4862 },
    };

    const planet = planets[planetName.toLowerCase()];
    if (!planet) {
        return { ra: 0, dec: 0 };
    }

    // Mean longitude
    let L = planet.L0 + planet.Lrate * T;
    L = ((L % 360) + 360) % 360;

    // Simplified conversion from ecliptic to equatorial
    // Obliquity of the ecliptic (J2000)
    const obliquity = degToRad(23.439);
    const eclLon = degToRad(L);
    const eclLat = 0; // Simplified - planets close to ecliptic

    // Convert ecliptic to equatorial
    const ra = radToDeg(Math.atan2(
        Math.sin(eclLon) * Math.cos(obliquity) - Math.tan(eclLat) * Math.sin(obliquity),
        Math.cos(eclLon)
    ));

    const dec = radToDeg(Math.asin(
        Math.sin(eclLat) * Math.cos(obliquity) +
        Math.cos(eclLat) * Math.sin(obliquity) * Math.sin(eclLon)
    ));

    return {
        ra: ((ra % 360) + 360) % 360,
        dec
    };
};

/**
 * Calculate Moon position (simplified)
 * @param {Date} date 
 * @returns {{ra: number, dec: number, phase: number}}
 */
export const getMoonPosition = (date = new Date()) => {
    const jd = getJulianDate(date);
    const T = (jd - 2451545.0) / 36525;

    // Mean elements
    const L0 = 218.3165 + 481267.8813 * T; // Mean longitude
    const M = 134.9634 + 477198.8675 * T;  // Mean anomaly
    const D = 297.8502 + 445267.1115 * T;  // Mean elongation

    // Simplified longitude correction
    let lon = L0 + 6.289 * Math.sin(degToRad(M));
    lon = ((lon % 360) + 360) % 360;

    // Latitude (simplified)
    const lat = 5.128 * Math.sin(degToRad(93.3 + 483202.0175 * T));

    // Convert to equatorial
    const obliquity = degToRad(23.439);
    const eclLon = degToRad(lon);
    const eclLat = degToRad(lat);

    const ra = radToDeg(Math.atan2(
        Math.sin(eclLon) * Math.cos(obliquity) - Math.tan(eclLat) * Math.sin(obliquity),
        Math.cos(eclLon)
    ));

    const dec = radToDeg(Math.asin(
        Math.sin(eclLat) * Math.cos(obliquity) +
        Math.cos(eclLat) * Math.sin(obliquity) * Math.sin(eclLon)
    ));

    // Calculate phase (0-1, 0=new, 0.5=full)
    const phase = (1 - Math.cos(degToRad(D))) / 2;

    return {
        ra: ((ra % 360) + 360) % 360,
        dec,
        phase: phase.toFixed(2)
    };
};

/**
 * Calculate Sun position
 * @param {Date} date 
 * @returns {{ra: number, dec: number}}
 */
export const getSunPosition = (date = new Date()) => {
    const jd = getJulianDate(date);
    const n = jd - 2451545.0;

    // Mean longitude
    let L = 280.46 + 0.9856474 * n;
    L = ((L % 360) + 360) % 360;

    // Mean anomaly
    let g = 357.528 + 0.9856003 * n;
    g = ((g % 360) + 360) % 360;

    // Ecliptic longitude
    let lambda = L + 1.915 * Math.sin(degToRad(g)) + 0.02 * Math.sin(degToRad(2 * g));
    lambda = ((lambda % 360) + 360) % 360;

    // Obliquity
    const eps = 23.439 - 0.0000004 * n;

    // Equatorial coordinates
    const ra = radToDeg(Math.atan2(
        Math.cos(degToRad(eps)) * Math.sin(degToRad(lambda)),
        Math.cos(degToRad(lambda))
    ));

    const dec = radToDeg(Math.asin(
        Math.sin(degToRad(eps)) * Math.sin(degToRad(lambda))
    ));

    return {
        ra: ((ra % 360) + 360) % 360,
        dec
    };
};

/**
 * Get star radius based on apparent magnitude
 * Brighter stars (lower/negative magnitude) appear larger
 * 
 * @param {number} magnitude - Apparent magnitude
 * @param {number} minRadius - Minimum star radius in pixels
 * @param {number} maxRadius - Maximum star radius in pixels
 * @returns {number} Radius in pixels
 */
export const getStarRadius = (magnitude, minRadius = 1, maxRadius = 5) => {
    // Magnitude range: -1.5 (brightest, Sirius) to +6 (barely visible)
    // Invert so brighter = larger
    const normalized = (6 - magnitude) / 7.5;
    return minRadius + Math.max(0, Math.min(1, normalized)) * (maxRadius - minRadius);
};

/**
 * Get star color based on spectral type
 * @param {string} spectralType - Spectral classification (e.g., "A1V", "K5III")
 * @returns {string} Hex color code
 */
export const getStarColor = (spectralType) => {
    if (!spectralType) return '#FFFFFF';

    const type = spectralType.charAt(0).toUpperCase();

    const colors = {
        'O': '#9BB0FF', // Blue
        'B': '#AAC4FF', // Blue-white
        'A': '#CAD7FF', // White
        'F': '#F8F7FF', // Yellow-white
        'G': '#FFF4EA', // Yellow (like Sun)
        'K': '#FFD2A1', // Orange
        'M': '#FFCC6F', // Red-orange
    };

    return colors[type] || '#FFFFFF';
};

/**
 * Format Right Ascension for display
 * @param {number} ra - RA in degrees
 * @returns {string} Formatted RA (e.g., "6h 45m 8s")
 */
export const formatRA = (ra) => {
    const hours = ra / 15;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.round(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
};

/**
 * Format Declination for display
 * @param {number} dec - Dec in degrees
 * @returns {string} Formatted Dec (e.g., "+45° 30' 15\"")
 */
export const formatDec = (dec) => {
    const sign = dec >= 0 ? '+' : '-';
    const absDec = Math.abs(dec);
    const d = Math.floor(absDec);
    const m = Math.floor((absDec - d) * 60);
    const s = Math.round(((absDec - d) * 60 - m) * 60);
    return `${sign}${d}° ${m}' ${s}"`;
};
