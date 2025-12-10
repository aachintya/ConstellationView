/**
 * Main Sky View Screen
 * Beautiful UI with GPS location and toggle between Touch/Gyro modes
 * Features: Pinch-to-zoom, tap-to-label, click for details modal, search drawer
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert, Share, Text, Animated } from 'react-native';

// Components
import StarMap from '../components/StarMap';
import SearchDrawer from '../components/SearchDrawer';

// Hooks
import { useGyroscope } from '../hooks/useGyroscope';
import { useLocation } from '../hooks/useLocation';
import { useCelestialData } from '../hooks/useCelestialData';

// Utils
import { getAllCelestialBodies } from '../utils/PlanetCalculator';
import { getLocalSiderealTime } from '../utils/CelestialSphere';

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
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);
    const [targetObject, setTargetObject] = useState(null);
    const [showCoordinates, setShowCoordinates] = useState(false);

    // Hint animation
    const hintOpacity = useRef(new Animated.Value(1)).current;

    // GPS Location with fallback
    const { location: rawLocation } = useLocation();
    const location = rawLocation || { latitude: 28.6139, longitude: 77.209 };

    // Gyroscope with mode toggle
    const {
        orientation,
        setOrientation,
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

    // Fade out hint after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(hintOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }, 5000);
        return () => clearTimeout(timer);
    }, []);

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

    // Navigate to a celestial object
    const navigateToObject = useCallback((object) => {
        if (!object || object.ra === undefined || object.dec === undefined) {
            console.log('Cannot navigate: missing coordinates');
            return;
        }

        // Calculate the azimuth and altitude to point at the object
        const lst = getLocalSiderealTime(new Date(), location.longitude);

        // Hour Angle = LST - RA
        const ha = lst - object.ra;
        const haRad = (ha * Math.PI) / 180;
        const decRad = (object.dec * Math.PI) / 180;
        const latRad = (location.latitude * Math.PI) / 180;

        // Calculate altitude
        const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
            Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
        const altitude = (Math.asin(sinAlt) * 180) / Math.PI;

        // Calculate azimuth
        const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
            (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
        let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;

        // Adjust azimuth based on hour angle
        if (Math.sin(haRad) > 0) {
            azimuth = 360 - azimuth;
        }

        // Set the target object for display
        setTargetObject(object);
        setShowCoordinates(true);

        // Update orientation to point at the object (if setOrientation is available)
        if (setOrientation) {
            setOrientation({
                azimuth: azimuth,
                altitude: altitude,
            });
        }

        // Show confirmation
        Alert.alert(
            `🎯 ${object.name || object.id}`,
            `Navigating to ${object.type || 'object'}...\nRA: ${(object.ra / 15).toFixed(2)}h\nDec: ${object.dec >= 0 ? '+' : ''}${object.dec.toFixed(2)}°`,
            [{ text: 'OK' }]
        );

        // Hide coordinates after 10 seconds
        setTimeout(() => {
            setShowCoordinates(false);
            setTargetObject(null);
        }, 10000);
    }, [location, setOrientation]);

    // Handlers
    const handleMenuPress = useCallback(() => {
        setShowConstellations(prev => !prev);
    }, []);

    const handleSearchPress = useCallback(() => {
        setShowSearchDrawer(true);
    }, []);

    const handleCloseSearch = useCallback(() => {
        setShowSearchDrawer(false);
    }, []);

    const handleSelectObject = useCallback((object) => {
        navigateToObject(object);
    }, [navigateToObject]);

    const handleSharePress = useCallback(async () => {
        try {
            await Share.share({
                message: `I'm exploring the night sky with SkyView! 🌟✨`,
            });
        } catch (e) { }
    }, []);

    /**
     * Handle calibrate button press
     */
    const handleCalibratePress = useCallback(() => {
        if (mode === 'touch') {
            toggleMode();
            Alert.alert(
                '🧭 Gyroscope Mode',
                'Now using device sensors!\n\nHold your phone steady and tap "Calibrate" to set your reference point.',
                [{ text: 'OK' }]
            );
        } else if (!isCalibrated) {
            calibrate();
            Alert.alert('✓ Calibrated', 'Your current position is now the reference point.');
        } else {
            toggleMode();
        }
    }, [mode, isCalibrated, toggleMode, calibrate]);

    // Get button text based on mode
    const getModeButtonText = () => {
        if (mode === 'touch') return '👆 Touch Mode';
        if (!isCalibrated) return '⟳ Tap to Calibrate';
        return '🧭 Gyro Mode';
    };

    // Format RA for display
    const formatRA = (ra) => {
        const hours = ra / 15;
        const h = Math.floor(hours);
        const m = Math.floor((hours - h) * 60);
        const s = Math.round(((hours - h) * 60 - m) * 60);
        return `${h}h ${m}m ${s}s`;
    };

    // Format Dec for display
    const formatDec = (dec) => {
        const sign = dec >= 0 ? '+' : '-';
        const absDec = Math.abs(dec);
        const d = Math.floor(absDec);
        const m = Math.floor((absDec - d) * 60);
        const s = Math.round(((absDec - d) * 60 - m) * 60);
        return `${sign}${d}° ${m}' ${s}"`;
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
                targetObject={targetObject}
            />

            {/* Coordinates Display (like SkyView) */}
            {showCoordinates && targetObject && (
                <View style={styles.coordinatesContainer}>
                    <Text style={styles.coordinatesLabel}>RA:</Text>
                    <Text style={styles.coordinatesValue}>{formatRA(targetObject.ra)}</Text>
                    <Text style={styles.coordinatesLabel}>  DEC:</Text>
                    <Text style={styles.coordinatesValue}>{formatDec(targetObject.dec)}</Text>
                </View>
            )}

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

            {/* Pinch hint (fades out) */}
            <Animated.View style={[styles.hintBadge, { opacity: hintOpacity }]}>
                <Text style={styles.hintText}>Pinch to zoom • Tap star for name • Tap again for details</Text>
            </Animated.View>

            {/* Search Drawer */}
            <SearchDrawer
                visible={showSearchDrawer}
                onClose={handleCloseSearch}
                stars={stars.list || []}
                constellations={constellations.list || []}
                planets={activePlanets}
                onSelectObject={handleSelectObject}
                theme={theme}
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
    coordinatesContainer: {
        position: 'absolute',
        top: '45%',
        alignSelf: 'center',
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.7)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 8,
    },
    coordinatesLabel: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    coordinatesValue: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default SkyViewScreen;
