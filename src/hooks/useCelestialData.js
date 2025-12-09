/**
 * Hook to load and manage celestial data
 * Uses embedded Stellarium star catalog for reliability
 */

import { useState, useEffect, useMemo } from 'react';

// Import bundled constellation data
import constellationsDataFallback from '../data/constellations.json';
import planetsData from '../data/planets.json';

// Import Stellarium star catalog (embedded)
import { buildStarCatalog, BRIGHT_STARS_CATALOG } from '../utils/StellariumParser';

import {
    getPlanetPosition,
    getMoonPosition,
    getSunPosition
} from '../utils/astronomy';

/**
 * Hook to access all celestial data with computed positions
 */
export const useCelestialData = (date = new Date()) => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mark as loaded on mount
    useEffect(() => {
        console.log('Celestial data loaded - using embedded Stellarium catalog');
        setIsLoading(false);
    }, []);

    // Stars from embedded Stellarium catalog (120+ brightest stars)
    const stars = useMemo(() => {
        const starsList = buildStarCatalog();
        const starMap = {};
        starsList.forEach(star => {
            starMap[star.id] = star;
        });
        console.log(`Loaded ${starsList.length} stars from embedded catalog`);
        return {
            list: starsList,
            byId: starMap,
        };
    }, []);

    // Constellations from JSON
    const constellations = useMemo(() => {
        return {
            list: constellationsDataFallback.constellations,
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
                    position = getMoonPosition(date);
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

    // Search across all celestial objects
    const search = (query) => {
        if (!query || query.length < 2) return [];

        const lowerQuery = query.toLowerCase();
        const results = [];

        // Search stars
        stars.list.forEach(star => {
            if (star.name && star.name.toLowerCase().includes(lowerQuery)) {
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

        return results.slice(0, 10);
    };

    // Find object by ID
    const findById = (id) => {
        if (stars.byId[id]) {
            return { type: 'star', ...stars.byId[id] };
        }

        const constellation = constellations.list.find(c => c.id === id);
        if (constellation) {
            return { type: 'constellation', ...constellation };
        }

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
