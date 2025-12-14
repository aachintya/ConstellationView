/**
 * Hook to load and manage celestial data
 * Uses tiered star catalog: ~2000 stars organized by magnitude for dynamic loading
 * 
 * Star Tiers (visible based on FOV):
 * - Tier 1 (mag < 2.0): Always visible - brightest 50 stars
 * - Tier 2 (mag < 3.5): FOV < 60° - 238 stars
 * - Tier 3 (mag < 4.5): FOV < 30° - 400 stars
 * - Tier 4 (mag < 5.5): FOV < 15° - 600 stars
 * - Tier 5 (mag < 6.5): FOV < 5° - 800 stars (naked eye limit)
 */

import { useState, useEffect, useMemo } from 'react';

// Import bundled data - tiered star catalog for dynamic loading
import planetsData from '../data/planets.json';
import tieredStarsData from '../data/stars_tiered.json';

import {
    getPlanetPosition,
    getMoonPosition,
    getSunPosition
} from '../utils/astronomy';

/**
 * Hook to access all celestial data with computed positions
 */
export const useCelestialData = () => {
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mark as loaded on mount
    useEffect(() => {
        const counts = tieredStarsData.metadata?.counts || {};
        console.log(`Celestial data loaded - ${counts.total || 0} tiered stars for dynamic loading`);
        console.log(`  Tier 1: ${counts.tier1} | Tier 2: ${counts.tier2} | Tier 3: ${counts.tier3}`);
        console.log(`  Tier 4: ${counts.tier4} | Tier 5: ${counts.tier5}`);
        setIsLoading(false);
    }, []);

    // Stars from tiered catalog - flatten for native side
    // Native DynamicStarManager will handle FOV-based filtering
    const stars = useMemo(() => {
        const tiers = tieredStarsData.stars || {};
        
        // Flatten all tiers into a single list
        const starsList = [
            ...(tiers.tier1 || []),
            ...(tiers.tier2 || []),
            ...(tiers.tier3 || []),
            ...(tiers.tier4 || []),
            ...(tiers.tier5 || []),
        ];
        
        // Build lookup map
        const starMap = {};
        starsList.forEach(star => {
            starMap[star.id] = star;
        });
        
        console.log(`Loaded ${starsList.length} stars from tiered catalog`);
        
        return {
            list: starsList,
            byId: starMap,
            // Also expose tiers for any tier-aware operations
            tiers: {
                tier1: tiers.tier1 || [],
                tier2: tiers.tier2 || [],
                tier3: tiers.tier3 || [],
                tier4: tiers.tier4 || [],
                tier5: tiers.tier5 || [],
            },
            counts: tieredStarsData.metadata?.counts || {},
        };
    }, []);

    // Minimal constellation data for artwork rendering (no lines, just IDs for native artwork mapping)
    const constellations = useMemo(() => {
        // These IDs must match the artwork configs in constellations_artwork.json
        const artworkConstellations = [
            { id: 'LEO', name: 'Leo', lines: [] },
            { id: 'ARI', name: 'Aries', lines: [] },
            { id: 'TAU', name: 'Taurus', lines: [] },
            { id: 'GEM', name: 'Gemini', lines: [] },
            { id: 'CNC', name: 'Cancer', lines: [] },
            { id: 'VIR', name: 'Virgo', lines: [] },
            { id: 'LIB', name: 'Libra', lines: [] },
            { id: 'SCO', name: 'Scorpius', lines: [] },
            { id: 'SGR', name: 'Sagittarius', lines: [] },
            { id: 'UMA', name: 'Ursa Major', lines: [] },
            { id: 'CAS', name: 'Cassiopeia', lines: [] },
            { id: 'PER', name: 'Perseus', lines: [] },
            { id: 'AND', name: 'Andromeda', lines: [] },
            { id: 'CYG', name: 'Cygnus', lines: [] },
            { id: 'AQL', name: 'Aquila', lines: [] },
            { id: 'BOO', name: 'Boötes', lines: [] },
            { id: 'HER', name: 'Hercules', lines: [] },
            { id: 'CEN', name: 'Centaurus', lines: [] },
            { id: 'ORI', name: 'Orion', lines: [] },
            { id: 'AQR', name: 'Aquarius', lines: [] },
            { id: 'PSC', name: 'Pisces', lines: [] },
        ];
        return {
            list: artworkConstellations,
        };
    }, []);

    // Planets with computed current positions
    // Note: Only calculate once at init - SkyViewScreen manages its own dynamic planets
    // via selectedTime and getAllCelestialBodies() for time-based updates
    const planets = useMemo(() => {
        const initDate = new Date(); // Calculate once at mount
        const planetsWithPositions = planetsData.planets.map(planet => {
            let position;

            switch (planet.id) {
                case 'sun':
                    position = getSunPosition(initDate);
                    break;
                case 'moon':
                    position = getMoonPosition(initDate);
                    break;
                default:
                    position = getPlanetPosition(planet.name, initDate);
            }

            return {
                ...planet,
                ...position,
            };
        });

        return {
            list: planetsWithPositions,
        };
    }, []); // Empty dependency - only calculate once on mount

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
