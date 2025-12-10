/**
 * Star Manager with Level-of-Detail (LOD) Loading
 * 
 * Manages star catalogs like Stellarium does:
 * - Loads catalogs progressively based on zoom/field of view
 * - Only renders stars visible in the current view
 * - Caches loaded stars for performance
 */

import RNFS from 'react-native-fs';
import { parseStellariumCatalog } from './StellariumCatalogParser';

// Catalog configuration matching Stellarium's structure
const CATALOGS = [
    { id: 'stars0', file: 'stars_0_0v0_8.cat', magMax: 6.0, priority: 1 },
    { id: 'stars1', file: 'stars_1_0v0_8.cat', magMax: 7.5, priority: 2 },
    { id: 'stars2', file: 'stars_2_0v0_8.cat', magMax: 9.0, priority: 3 },
    { id: 'stars3', file: 'stars_3_1v0_4.cat', magMax: 10.5, priority: 4 },
    { id: 'stars4', file: 'stars_4_1v0_2.cat', magMax: 12.0, priority: 5 },
    { id: 'stars5', file: 'stars_5_2v0_1.cat', magMax: 13.5, priority: 6 },
];

// Base path for catalog files
const CATALOG_BASE_PATH = RNFS.MainBundlePath + '/mobileData/stars/default';
// For Android:
// const CATALOG_BASE_PATH = RNFS.DocumentDirectoryPath + '/mobileData/stars/default';

class StarManager {
    constructor() {
        this.loadedCatalogs = new Map(); // catalogId -> Star[]
        this.allStars = [];              // Combined stars from all loaded catalogs
        this.isLoading = new Set();      // Catalogs currently being loaded
        this.listeners = [];             // Callbacks when stars update
    }

    /**
     * Subscribe to star data updates
     */
    onStarsUpdated(callback) {
        this.listeners.push(callback);
        return () => {
            this.listeners = this.listeners.filter(cb => cb !== callback);
        };
    }

    /**
     * Notify all listeners of star data changes
     */
    notifyListeners() {
        this.listeners.forEach(cb => cb(this.allStars));
    }

    /**
     * Get the limiting magnitude based on field of view
     * Wider FOV = show fewer (brighter) stars
     * Narrower FOV (zoomed in) = show more (fainter) stars
     */
    getMagnitudeLimitForFOV(fovDegrees) {
        // Typical human naked eye limit is ~6.0 magnitude
        // As we zoom in, we can show fainter stars

        if (fovDegrees > 120) return 4.0;   // Very wide view - only brightest
        if (fovDegrees > 90) return 5.0;
        if (fovDegrees > 60) return 6.0;    // Normal view - naked eye limit
        if (fovDegrees > 40) return 7.5;
        if (fovDegrees > 20) return 9.0;
        if (fovDegrees > 10) return 10.5;
        if (fovDegrees > 5) return 12.0;
        return 13.5;                         // Maximum zoom - faintest stars
    }

    /**
     * Get catalogs needed for current FOV
     */
    getCatalogsForFOV(fovDegrees) {
        const magLimit = this.getMagnitudeLimitForFOV(fovDegrees);
        return CATALOGS.filter(cat => cat.magMax <= magLimit + 1.5);
    }

    /**
     * Load catalogs appropriate for the current field of view
     */
    async loadForFOV(fovDegrees = 60) {
        const neededCatalogs = this.getCatalogsForFOV(fovDegrees);

        for (const catalog of neededCatalogs) {
            if (!this.loadedCatalogs.has(catalog.id) && !this.isLoading.has(catalog.id)) {
                await this.loadCatalog(catalog);
            }
        }
    }

    /**
     * Load a single catalog
     */
    async loadCatalog(catalog) {
        if (this.loadedCatalogs.has(catalog.id) || this.isLoading.has(catalog.id)) {
            return;
        }

        this.isLoading.add(catalog.id);
        console.log(`Loading star catalog: ${catalog.id} (mag < ${catalog.magMax})`);

        try {
            const filePath = `${CATALOG_BASE_PATH}/${catalog.file}`;

            // Check if file exists
            const exists = await RNFS.exists(filePath);
            if (!exists) {
                console.warn(`Catalog file not found: ${filePath}`);
                this.isLoading.delete(catalog.id);
                return;
            }

            // Parse the binary catalog
            const stars = await parseStellariumCatalog(filePath, catalog.magMax);

            this.loadedCatalogs.set(catalog.id, stars);
            this.rebuildAllStars();

            console.log(`Loaded ${stars.length} stars from ${catalog.id}`);
            this.notifyListeners();

        } catch (error) {
            console.error(`Error loading catalog ${catalog.id}:`, error);
        } finally {
            this.isLoading.delete(catalog.id);
        }
    }

    /**
     * Rebuild the combined star array from all loaded catalogs
     */
    rebuildAllStars() {
        this.allStars = [];

        // Combine catalogs in priority order
        const sortedCatalogs = Array.from(this.loadedCatalogs.entries())
            .sort((a, b) => {
                const catA = CATALOGS.find(c => c.id === a[0]);
                const catB = CATALOGS.find(c => c.id === b[0]);
                return (catA?.priority || 99) - (catB?.priority || 99);
            });

        for (const [_, stars] of sortedCatalogs) {
            this.allStars.push(...stars);
        }
    }

    /**
     * Get stars visible in the current view
     * @param {number} centerRA - Center Right Ascension in degrees
     * @param {number} centerDec - Center Declination in degrees
     * @param {number} fov - Field of view in degrees
     * @param {number} maxMag - Maximum magnitude to include
     */
    getVisibleStars(centerRA, centerDec, fov, maxMag = 99) {
        const halfFov = fov / 2;

        return this.allStars.filter(star => {
            // Quick magnitude filter
            if (star.magnitude > maxMag) return false;

            // Check if star is within FOV (simplified rectangular check)
            const dRA = Math.abs(star.ra - centerRA);
            const dDec = Math.abs(star.dec - centerDec);

            // Handle RA wraparound at 360°
            const dRAWrapped = Math.min(dRA, 360 - dRA);

            // Apply cos(dec) correction for RA distance
            const dRACorrected = dRAWrapped * Math.cos(centerDec * Math.PI / 180);

            return dRACorrected <= halfFov && dDec <= halfFov;
        });
    }

    /**
     * Get total number of loaded stars
     */
    getStarCount() {
        return this.allStars.length;
    }

    /**
     * Get catalog loading status
     */
    getStatus() {
        return {
            loadedCatalogs: Array.from(this.loadedCatalogs.keys()),
            totalStars: this.allStars.length,
            isLoading: this.isLoading.size > 0,
            loadingCatalogs: Array.from(this.isLoading),
        };
    }

    /**
     * Clear all loaded data (for memory management)
     */
    clear() {
        this.loadedCatalogs.clear();
        this.allStars = [];
        this.notifyListeners();
    }

    /**
     * Unload fainter catalogs to save memory
     */
    unloadFaintCatalogs(keepMagLimit) {
        for (const catalog of CATALOGS) {
            if (catalog.magMax > keepMagLimit && this.loadedCatalogs.has(catalog.id)) {
                console.log(`Unloading catalog ${catalog.id} to save memory`);
                this.loadedCatalogs.delete(catalog.id);
            }
        }
        this.rebuildAllStars();
        this.notifyListeners();
    }
}

// Singleton instance
export const starManager = new StarManager();

export default StarManager;
