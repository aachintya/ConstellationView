/**
 * Manual Orientation Hook
 * Uses touch gestures for 360-degree sky navigation (like Google Maps)
 */

import { useRef, useCallback, useState } from 'react';

const DEFAULT_LOCATION = {
    latitude: 28.6139,
    longitude: 77.209,
};

// Initial view direction
const INITIAL_AZIMUTH = 180; // South
const INITIAL_ALTITUDE = 30; // Slightly above horizon

export const useGyroscope = (options = {}) => {
    const [orientation, setOrientation] = useState({
        azimuth: INITIAL_AZIMUTH,
        altitude: INITIAL_ALTITUDE,
        roll: 0,
    });

    const location = useRef(DEFAULT_LOCATION);

    // For touch handling
    const lastTouch = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    /**
     * Start touch/drag
     */
    const onTouchStart = useCallback((x, y) => {
        lastTouch.current = { x, y };
        isDragging.current = true;
    }, []);

    /**
     * Handle touch move - pan the view
     */
    const onTouchMove = useCallback((x, y) => {
        if (!isDragging.current) return;

        const dx = x - lastTouch.current.x;
        const dy = y - lastTouch.current.y;

        // Sensitivity (pixels per degree)
        const sensitivity = 0.3;

        setOrientation(prev => {
            // Azimuth: horizontal swipe rotates around
            let newAzimuth = prev.azimuth - dx * sensitivity;
            newAzimuth = ((newAzimuth % 360) + 360) % 360;

            // Altitude: vertical swipe looks up/down
            let newAltitude = prev.altitude + dy * sensitivity;
            // Clamp to -90 (straight down) to 90 (straight up)
            newAltitude = Math.max(-90, Math.min(90, newAltitude));

            return {
                ...prev,
                azimuth: newAzimuth,
                altitude: newAltitude,
            };
        });

        lastTouch.current = { x, y };
    }, []);

    /**
     * End touch
     */
    const onTouchEnd = useCallback(() => {
        isDragging.current = false;
    }, []);

    /**
     * Reset to initial view
     */
    const resetView = useCallback(() => {
        setOrientation({
            azimuth: INITIAL_AZIMUTH,
            altitude: INITIAL_ALTITUDE,
            roll: 0,
        });
    }, []);

    /**
     * Look at specific direction
     */
    const lookAt = useCallback((azimuth, altitude) => {
        setOrientation({
            azimuth: ((azimuth % 360) + 360) % 360,
            altitude: Math.max(-90, Math.min(90, altitude)),
            roll: 0,
        });
    }, []);

    // Imperative getter for compatibility
    const getOrientation = useCallback(() => orientation, [orientation]);
    const getLocation = useCallback(() => location.current, []);

    const updateLocation = useCallback((newLoc) => {
        location.current = newLoc;
    }, []);

    return {
        orientation,
        getOrientation,
        location: location.current,
        getLocation,
        updateLocation,
        isCalibrated: true,
        // Touch handlers to be used by StarMap
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        resetView,
        lookAt,
    };
};

export default useGyroscope;
