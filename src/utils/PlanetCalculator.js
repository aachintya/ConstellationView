/**
 * PlanetCalculator - Real-time planet position calculations using astronomy-engine
 * Provides accurate positions for Sun, Moon, and all visible planets
 */

// Note: astronomy-engine needs require() for React Native Metro bundler
const Astronomy = require('astronomy-engine');

/**
 * Get positions for all visible planets
 * @param {Date} date - Current date/time
 * @param {Object} observer - Observer location {latitude, longitude}
 * @returns {Array} Planet positions with RA, Dec, altitude, azimuth
 */
export const getPlanetPositions = (date = new Date(), observer) => {
    const observerPoint = new Astronomy.Observer(
        observer.latitude,
        observer.longitude,
        0 // elevation in meters
    );

    const planets = [
        { name: 'Mercury', body: Astronomy.Body.Mercury, color: '#B5B5B5' },
        { name: 'Venus', body: Astronomy.Body.Venus, color: '#FFF8DC' },
        { name: 'Mars', body: Astronomy.Body.Mars, color: '#CD5C5C' },
        { name: 'Jupiter', body: Astronomy.Body.Jupiter, color: '#DEB887' },
        { name: 'Saturn', body: Astronomy.Body.Saturn, color: '#F4A460' },
        { name: 'Uranus', body: Astronomy.Body.Uranus, color: '#AFEEEE' },
        { name: 'Neptune', body: Astronomy.Body.Neptune, color: '#4169E1' },
    ];

    return planets.map(planet => {
        try {
            // Get equatorial coordinates (RA/Dec)
            const equ = Astronomy.Equator(planet.body, date, observerPoint, true, true);

            // Get horizontal coordinates (altitude/azimuth)
            const hor = Astronomy.Horizon(date, observerPoint, equ.ra, equ.dec, 'normal');

            // Get visual magnitude
            const illum = Astronomy.Illumination(planet.body, date);

            return {
                id: planet.name.toLowerCase(),
                name: planet.name,
                ra: equ.ra * 15, // Convert hours to degrees
                dec: equ.dec,
                altitude: hor.altitude,
                azimuth: hor.azimuth,
                magnitude: illum.mag,
                color: planet.color,
                type: 'planet',
                // Additional info
                distance: equ.dist, // AU from Earth
                visible: hor.altitude > 0,
            };
        } catch (e) {
            console.warn(`Failed to calculate ${planet.name} position:`, e);
            return null;
        }
    }).filter(Boolean);
};

/**
 * Get Moon position with phase information
 * @param {Date} date 
 * @param {Object} observer 
 * @returns {Object} Moon position and phase
 */
export const getMoonPosition = (date = new Date(), observer) => {
    const observerPoint = new Astronomy.Observer(
        observer.latitude,
        observer.longitude,
        0
    );

    try {
        const equ = Astronomy.Equator(Astronomy.Body.Moon, date, observerPoint, true, true);
        const hor = Astronomy.Horizon(date, observerPoint, equ.ra, equ.dec, 'normal');
        const illum = Astronomy.Illumination(Astronomy.Body.Moon, date);
        const phase = Astronomy.MoonPhase(date);

        // Determine phase name
        let phaseName;
        if (phase < 22.5) phaseName = 'New Moon';
        else if (phase < 67.5) phaseName = 'Waxing Crescent';
        else if (phase < 112.5) phaseName = 'First Quarter';
        else if (phase < 157.5) phaseName = 'Waxing Gibbous';
        else if (phase < 202.5) phaseName = 'Full Moon';
        else if (phase < 247.5) phaseName = 'Waning Gibbous';
        else if (phase < 292.5) phaseName = 'Last Quarter';
        else if (phase < 337.5) phaseName = 'Waning Crescent';
        else phaseName = 'New Moon';

        return {
            id: 'moon',
            name: 'Moon',
            ra: equ.ra * 15,
            dec: equ.dec,
            altitude: hor.altitude,
            azimuth: hor.azimuth,
            magnitude: illum.mag,
            color: '#F5F5DC',
            type: 'moon',
            phase: phase,
            phaseName: phaseName,
            illumination: (1 + Math.cos((phase * Math.PI) / 180)) / 2,
            visible: hor.altitude > 0,
        };
    } catch (e) {
        console.warn('Failed to calculate Moon position:', e);
        return null;
    }
};

/**
 * Get Sun position (useful for twilight calculations)
 * @param {Date} date 
 * @param {Object} observer 
 * @returns {Object} Sun position
 */
export const getSunPosition = (date = new Date(), observer) => {
    const observerPoint = new Astronomy.Observer(
        observer.latitude,
        observer.longitude,
        0
    );

    try {
        const equ = Astronomy.Equator(Astronomy.Body.Sun, date, observerPoint, true, true);
        const hor = Astronomy.Horizon(date, observerPoint, equ.ra, equ.dec, 'normal');

        return {
            id: 'sun',
            name: 'Sun',
            ra: equ.ra * 15,
            dec: equ.dec,
            altitude: hor.altitude,
            azimuth: hor.azimuth,
            color: '#FFD700',
            type: 'sun',
            visible: hor.altitude > -18, // Include twilight
        };
    } catch (e) {
        console.warn('Failed to calculate Sun position:', e);
        return null;
    }
};

/**
 * Get all celestial bodies (planets + moon)
 * Excludes Sun for night sky rendering
 * @param {Date} date 
 * @param {Object} observer 
 * @returns {Array} All visible celestial bodies
 */
export const getAllCelestialBodies = (date = new Date(), observer) => {
    const planets = getPlanetPositions(date, observer);
    const moon = getMoonPosition(date, observer);

    const bodies = [...planets];
    if (moon) bodies.push(moon);

    // Sort by brightness (brighter first)
    return bodies.sort((a, b) => a.magnitude - b.magnitude);
};

/**
 * Calculate rise/set times for a celestial body
 * @param {string} bodyName - Name of body ('Mars', 'Moon', etc.)
 * @param {Date} date - Date to check
 * @param {Object} observer 
 * @returns {Object} Rise and set times
 */
export const getRiseSetTimes = (bodyName, date = new Date(), observer) => {
    const observerPoint = new Astronomy.Observer(
        observer.latitude,
        observer.longitude,
        0
    );

    const body = Astronomy.Body[bodyName];
    if (!body) return null;

    try {
        const rise = Astronomy.SearchRiseSet(body, observerPoint, +1, date, 1);
        const set = Astronomy.SearchRiseSet(body, observerPoint, -1, date, 1);

        return {
            rise: rise ? rise.date : null,
            set: set ? set.date : null,
        };
    } catch (e) {
        return null;
    }
};

export default {
    getPlanetPositions,
    getMoonPosition,
    getSunPosition,
    getAllCelestialBodies,
    getRiseSetTimes,
};
