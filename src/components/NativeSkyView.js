/**
 * NativeSkyView - React Native wrapper for native Android SkyViewNativeView
 * 
 * This component renders stars using native Android Canvas at 60fps,
 * with built-in sensor fusion for smooth gyroscope tracking.
 * 
 * Note: This component is Android-only. iOS is not supported.
 */

import React from 'react';
import { requireNativeComponent, StyleSheet } from 'react-native';

const NativeView = requireNativeComponent('SkyViewNativeView');

const NativeSkyView = ({
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
    onStarTap,
    style,
    ...props
}) => {
    // Convert Date to timestamp for native layer
    const simulatedTimestamp = simulatedTime ? simulatedTime.getTime() : Date.now();

    // Handle star tap event from native
    const handleStarTap = (event) => {
        if (onStarTap) {
            onStarTap(event.nativeEvent);
        }
    };

    return (
        <NativeView
            style={[styles.container, style]}
            stars={stars}
            constellations={constellations}
            planets={planets}
            fov={fov}
            latitude={latitude}
            longitude={longitude}
            gyroEnabled={gyroEnabled}
            nightMode={nightMode}
            simulatedTime={simulatedTimestamp}
            starBrightness={starBrightness}
            planetScale={planetScale}
            onStarTap={handleStarTap}
            {...props}
        />
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});

export default NativeSkyView;
