/**
 * NativeSkyView - React Native wrapper for native Android SkyViewNativeView
 * 
 * This component renders stars using native Android Canvas at 60fps,
 * with built-in sensor fusion for smooth gyroscope tracking.
 * 
 * Usage:
 *   <NativeSkyView
 *     stars={starsArray}
 *     constellations={constellationsArray}
 *     fov={75}
 *     latitude={28.6}
 *     longitude={77.2}
 *     onStarTap={(star) => console.log('Tapped', star)}
 *     style={{ flex: 1 }}
 *   />
 */

import React from 'react';
import { requireNativeComponent, StyleSheet, Platform, View } from 'react-native';

// Import the fallback for non-Android platforms
import OptimizedStarField from './OptimizedStarField';

const NativeView = Platform.OS === 'android'
    ? requireNativeComponent('SkyViewNativeView')
    : null;

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

    // On Android, use the native view
    if (Platform.OS === 'android' && NativeView) {
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
    }

    // Fallback for iOS or if native view not available
    return (
        <View style={[styles.container, style]}>
            <OptimizedStarField
                stars={stars}
                constellations={constellations}
                fov={fov}
                location={{ latitude, longitude }}
                orientation={{ azimuth: 180, altitude: 30 }}
                {...props}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
});

export default NativeSkyView;
