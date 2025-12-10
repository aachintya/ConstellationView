/**
 * Main Sky View Screen
 * Beautiful UI with GPS location and toggle between Touch/Gyro modes
 * Features: Pinch-to-zoom, tap-to-label, click for details modal
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Alert, Share, Text } from 'react-native';

// Components
import StarMap from '../components/StarMap';

// Hooks
import { useGyroscope } from '../hooks/useGyroscope';
import { useLocation } from '../hooks/useLocation';
import { useCelestialData } from '../hooks/useCelestialData';

// Utils
import { getAllCelestialBodies } from '../utils/PlanetCalculator';

// Theme
const theme = {
    background: '#000000',
    text: '#ffffff',
    accent: '#4fc3f7',
    constellation: '#6699cc',
};

const SkyViewScreen = () => {
    // State
    const [showConstellations, setShowConstellations] = useState(true);
    const [dynamicPlanets, setDynamicPlanets] = useState([]);

    // GPS Location with fallback
    const { location: rawLocation } = useLocation();
    const location = rawLocation || { latitude: 28.6139, longitude: 77.209 };

    // Gyroscope with mode toggle
    const {
        orientation,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
        mode,
        gyroEnabled,
        isCalibrated,
        toggleMode,
        calibrate,
    } = useGyroscope();

    // Celestial data
    const { stars, constellations, planets, search } = useCelestialData();

    // Update planet positions
    useEffect(() => {
        const updatePlanets = () => {
            try {
                const bodies = getAllCelestialBodies(new Date(), location);
                setDynamicPlanets(bodies);
            } catch (e) {
                console.warn('Planet error:', e.message);
            }
        };
        updatePlanets();
        const interval = setInterval(updatePlanets, 5000);
        return () => clearInterval(interval);
    }, [location]);

    const activePlanets = useMemo(() => {
        return dynamicPlanets.length > 0 ? dynamicPlanets : (planets.list || []);
    }, [dynamicPlanets, planets.list]);

    // Handlers
    const handleMenuPress = useCallback(() => {
        setShowConstellations(prev => !prev);
    }, []);

    const handleSearchPress = useCallback(() => {
        Alert.prompt('Search', 'Enter star or planet name:', (text) => {
            if (text) {
                const results = search(text);
                if (results.length > 0) {
                    Alert.alert(
                        results[0].name || results[0].id,
                        `Found: ${results[0].type}\n${results[0].constellation ? `Constellation: ${results[0].constellation}` : ''}`
                    );
                } else {
                    Alert.alert('Not found', `No results for "${text}"`);
                }
            }
        });
    }, [search]);

    const handleSharePress = useCallback(async () => {
        try {
            await Share.share({
                message: `I'm exploring the night sky with SkyView! 🌟✨`,
            });
        } catch (e) { }
    }, []);

    /**
     * Handle calibrate button press
     * - If in touch mode: switch to gyro mode
     * - If in gyro mode but not calibrated: calibrate
     * - If in gyro mode and calibrated: switch back to touch mode
     */
    const handleCalibratePress = useCallback(() => {
        if (mode === 'touch') {
            // Switch to gyro mode
            toggleMode();
            Alert.alert(
                '🧭 Gyroscope Mode',
                'Now using device sensors!\n\nHold your phone steady and tap "Calibrate" to set your reference point.',
                [{ text: 'OK' }]
            );
        } else if (!isCalibrated) {
            // Calibrate
            calibrate();
            Alert.alert('✓ Calibrated', 'Your current position is now the reference point.');
        } else {
            // Switch back to touch mode
            toggleMode();
        }
    }, [mode, isCalibrated, toggleMode, calibrate]);

    // Get button text based on mode
    const getModeButtonText = () => {
        if (mode === 'touch') return '👆 Touch Mode';
        if (!isCalibrated) return '⟳ Tap to Calibrate';
        return '🧭 Gyro Mode';
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Star Map with integrated details modal */}
            <StarMap
                orientation={orientation}
                location={location}
                stars={stars.list || []}
                constellations={constellations.list || []}
                planets={activePlanets}
                showConstellations={showConstellations}
                theme={theme}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                onMenuPress={handleMenuPress}
                onSearchPress={handleSearchPress}
                onSharePress={handleSharePress}
                onCalibratePress={handleCalibratePress}
                gyroEnabled={gyroEnabled}
                isCalibrated={isCalibrated}
            />

            {/* Location Badge */}
            <View style={styles.locationBadge}>
                <Text style={styles.locationText}>
                    📍 {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </Text>
            </View>

            {/* Mode indicator */}
            <View style={styles.modeBadge}>
                <Text style={styles.modeText}>{getModeButtonText()}</Text>
            </View>

            {/* Pinch hint (shown briefly) */}
            <View style={styles.hintBadge}>
                <Text style={styles.hintText}>Pinch to zoom • Tap star for name • Tap again for details</Text>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    locationBadge: {
        position: 'absolute',
        top: 50,
        left: 20,
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    locationText: { color: 'rgba(255,255,255,0.7)', fontSize: 12 },
    modeBadge: {
        position: 'absolute',
        top: 50,
        right: 20,
        backgroundColor: 'rgba(79,195,247,0.2)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 12,
    },
    modeText: { color: '#4fc3f7', fontSize: 12 },
    hintBadge: {
        position: 'absolute',
        top: 90,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 16,
    },
    hintText: { color: 'rgba(255,255,255,0.5)', fontSize: 11 },
});

export default SkyViewScreen;
