/**
 * Hook to load and manage celestial data
 */

import { useState, useEffect, useMemo } from 'react';

// Import bundled data
import starsData from '../data/stars.json';
import constellationsData from '../data/constellations.json';
import planetsData from '../data/planets.json';

import {
    getPlanetPosition,
    getMoonPosition,
    getSunPosition
} from '../utils/astronomy';

/**
 * Hook to access all celestial data with computed positions
 * @param {Date} date - Date for position calculations (for planets)
 * @returns {Object} Celestial data
 */
export const useCelestialData = (date = new Date()) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Stars with lookup by ID
    const stars = useMemo(() => {
        const starMap = {};
        starsData.stars.forEach(star => {
            starMap[star.id] = star;
        });
        return {
            list: starsData.stars,
            byId: starMap,
        };
    }, []);

    // Constellations
    const constellations = useMemo(() => {
        return {
            list: constellationsData.constellations,
        };
    }, []);

    // Planets with computed current positions
    const planets = useMemo(() => {
        const planetsWithPositions = planetsData.planets.map(planet => {
            let position;

            switch (planet.id) {
                case 'sun':
                    position = getSunPosition(date);
                    break;
                case 'moon':
                    const moonPos = getMoonPosition(date);
                    position = { ...moonPos };
                    break;
                default:
                    position = getPlanetPosition(planet.name, date);
            }

            return {
                ...planet,
                ...position,
            };
        });

        return {
            list: planetsWithPositions,
        };
    }, [date]);

    // Mark as loaded
    useEffect(() => {
        setIsLoading(false);
    }, []);

    // Search across all celestial objects
    const search = (query) => {
        if (!query || query.length < 2) return [];

        const lowerQuery = query.toLowerCase();
        const results = [];

        // Search stars
        stars.list.forEach(star => {
            if (star.name.toLowerCase().includes(lowerQuery)) {
                results.push({ type: 'star', ...star });
            }
        });

        // Search constellations
        constellations.list.forEach(constellation => {
            if (constellation.name.toLowerCase().includes(lowerQuery)) {
                results.push({ type: 'constellation', ...constellation });
            }
        });

        // Search planets
        planets.list.forEach(planet => {
            if (planet.name.toLowerCase().includes(lowerQuery)) {
                results.push({ type: 'planet', ...planet });
            }
        });

        return results.slice(0, 10); // Limit results
    };

    // Find object by ID
    const findById = (id) => {
        // Check stars
        if (stars.byId[id]) {
            return { type: 'star', ...stars.byId[id] };
        }

        // Check constellations
        const constellation = constellations.list.find(c => c.id === id);
        if (constellation) {
            return { type: 'constellation', ...constellation };
        }

        // Check planets
        const planet = planets.list.find(p => p.id === id);
        if (planet) {
            return { type: 'planet', ...planet };
        }

        return null;
    };

    // Get constellation for a star
    const getConstellationForStar = (starId) => {
        const star = stars.byId[starId];
        if (!star) return null;

        return constellations.list.find(c => c.id === star.constellation);
    };

    return {
        stars,
        constellations,
        planets,
        isLoading,
        error,
        search,
        findById,
        getConstellationForStar,
    };
};

export default useCelestialData;
