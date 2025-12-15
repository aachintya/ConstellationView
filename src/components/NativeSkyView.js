/**
 * NativeSkyView - React Native wrapper for native Android SkyViewNativeView
 * 
 * This component renders stars using native Android Canvas at 60fps,
 * with built-in sensor fusion for smooth gyroscope tracking.
 * 
 * Note: This component is Android-only. iOS is not supported.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { requireNativeComponent, StyleSheet } from 'react-native';

const NativeView = requireNativeComponent('SkyViewNativeView');

/**
 * Deep equality check for arrays - avoids re-sending data to native when content is the same
 */
const areArraysEqual = (arr1, arr2) => {
    if (arr1 === arr2) return true;
    if (!arr1 || !arr2) return false;
    if (arr1.length !== arr2.length) return false;
    // For performance, just compare the first few items and length
    // Full deep compare would be too expensive for large star arrays
    for (let i = 0; i < Math.min(3, arr1.length); i++) {
        if (JSON.stringify(arr1[i]) !== JSON.stringify(arr2[i])) return false;
    }
    return true;
};

const NativeSkyView = React.memo(({
    stars = [],
    constellations = [],
    planets = [],
    fov = 75,
    latitude = 28.6,
    longitude = 77.2,
    gyroEnabled = true,
    nightMode = 'off',
    simulatedTime = null,
    starBrightness = 0.5,
    planetScale = 0.5,
    navigateToCoordinates = null,
    onStarTap,
    onMenuPress,
    onSearchPress,
    onSharePress,
    style,
}) => {
    // Use refs to cache the last sent arrays to prevent unnecessary bridge calls
    const lastStarsRef = useRef(stars);
    const lastConstellationsRef = useRef(constellations);
    // Note: planets are NOT cached - they update during time travel

    // Only update refs if data has actually changed
    const stableStars = useMemo(() => {
        if (areArraysEqual(lastStarsRef.current, stars)) {
            return lastStarsRef.current;
        }
        lastStarsRef.current = stars;
        return stars;
    }, [stars]);

    const stableConstellations = useMemo(() => {
        if (areArraysEqual(lastConstellationsRef.current, constellations)) {
            return lastConstellationsRef.current;
        }
        lastConstellationsRef.current = constellations;
        return constellations;
    }, [constellations]);

    // For planets: DON'T use aggressive caching - they update during time travel
    // Simply pass the new planets array each time it changes
    const stablePlanets = planets;

    // Memoize the timestamp to prevent unnecessary native updates
    // Use a ref to only update when time actually changes
    const lastTimestampRef = useRef(0);
    const stableTimestamp = useMemo(() => {
        const newTimestamp = simulatedTime ? simulatedTime.getTime() : 0;
        // Only use a new timestamp if it's significantly different (more than 100ms)
        // This prevents flicker from tiny timestamp differences
        if (newTimestamp === 0 || Math.abs(newTimestamp - lastTimestampRef.current) > 100) {
            lastTimestampRef.current = newTimestamp || Date.now();
        }
        return lastTimestampRef.current;
    }, [simulatedTime]);

    // Handle star tap event from native - memoized to prevent re-renders
    const handleStarTap = useCallback((event) => {
        if (onStarTap) {
            onStarTap(event.nativeEvent);
        }
    }, [onStarTap]);

    return (
        <NativeView
            style={[styles.container, style]}
            stars={stableStars}
            constellations={stableConstellations}
            planets={stablePlanets}
            fov={fov}
            latitude={latitude}
            longitude={longitude}
            gyroEnabled={gyroEnabled}
            nightMode={nightMode}
            simulatedTime={stableTimestamp}
            starBrightness={starBrightness}
            planetScale={planetScale}
            navigateToCoordinates={navigateToCoordinates}
            onStarTap={handleStarTap}
            onMenuPress={onMenuPress}
            onSearchPress={onSearchPress}
            onSharePress={onSharePress}
        />
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if important props change
    // Skip array comparison here since it's handled by useMemo inside the component
    return (
        prevProps.fov === nextProps.fov &&
        prevProps.latitude === nextProps.latitude &&
        prevProps.longitude === nextProps.longitude &&
        prevProps.gyroEnabled === nextProps.gyroEnabled &&
        prevProps.nightMode === nextProps.nightMode &&
        prevProps.starBrightness === nextProps.starBrightness &&
        prevProps.planetScale === nextProps.planetScale &&
        prevProps.simulatedTime?.getTime?.() === nextProps.simulatedTime?.getTime?.() &&
        // Navigation target - must re-render when this changes
        prevProps.navigateToCoordinates === nextProps.navigateToCoordinates &&
        // Shallow compare arrays - deep compare is done inside component
        prevProps.stars === nextProps.stars &&
        prevProps.constellations === nextProps.constellations &&
        prevProps.planets === nextProps.planets
    );
});

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});

export default NativeSkyView;
