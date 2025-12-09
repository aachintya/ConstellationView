/**
 * Main Sky View Screen
 * Beautiful UI with GPS location and toggle between Touch/Gyro modes
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Alert, Share, Text } from 'react-native';

// Components
import StarMap from '../components/StarMap';
import InfoPanel from '../components/InfoPanel';

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
    const [selectedObject, setSelectedObject] = useState(null);
    const [showConstellations, setShowConstellations] = useState(true);
    const [dynamicPlanets, setDynamicPlanets] = useState([]);
    const [showInfoPanel, setShowInfoPanel] = useState(false);

    // GPS Location
    const { location } = useLocation();

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
    const handleSelectObject = useCallback((object) => {
        setSelectedObject(object);
        setShowInfoPanel(true);
    }, []);

    const handleCloseInfo = useCallback(() => {
        setShowInfoPanel(false);
        setSelectedObject(null);
    }, []);

    const handleMenuPress = useCallback(() => {
        setShowConstellations(prev => !prev);
    }, []);

    const handleSearchPress = useCallback(() => {
        Alert.prompt('Search', 'Enter star or planet name:', (text) => {
            if (text) {
                const results = search(text);
                if (results.length > 0) {
                    setSelectedObject(results[0]);
                    setShowInfoPanel(true);
                } else {
                    Alert.alert('Not found', `No results for "${text}"`);
                }
            }
        });
    }, [search]);

    const handleSharePress = useCallback(async () => {
        try {
            await Share.share({
                message: `I'm exploring ${selectedObject?.name || 'the night sky'} with SkyView! 🌟`,
            });
        } catch (e) { }
    }, [selectedObject]);

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

            {/* Star Map */}
            <StarMap
                orientation={orientation}
                location={location}
                stars={stars.list || []}
                constellations={constellations.list || []}
                planets={activePlanets}
                onSelectObject={handleSelectObject}
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

            {/* Location */}
            <View style={styles.locationBadge}>
                <Text style={styles.locationText}>
                    📍 {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </Text>
            </View>

            {/* Mode indicator */}
            <View style={styles.modeBadge}>
                <Text style={styles.modeText}>{getModeButtonText()}</Text>
            </View>

            {/* Info Panel */}
            <InfoPanel
                object={selectedObject}
                onClose={handleCloseInfo}
                theme={theme}
                visible={showInfoPanel}
            />
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
});

export default SkyViewScreen;
