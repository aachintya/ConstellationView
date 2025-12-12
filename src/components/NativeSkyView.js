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
    style,
    ...props
}) => {
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
                {...props}
            />
        );
    }

    // Fallback for iOS or if native view not available
    // Note: The native view handles sensors internally, 
    // so for fallback we'd need to pass orientation from useGyroscope
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
