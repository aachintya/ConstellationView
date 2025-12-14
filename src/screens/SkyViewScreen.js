/**
 * Main Sky View Screen
 * Beautiful UI with GPS location and toggle between Touch/Gyro modes
 * Features: Pinch-to-zoom, tap-to-label, click for details modal, search drawer
 */

import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { View, StyleSheet, StatusBar, Alert, Share, Text, Animated, TouchableOpacity } from 'react-native';

// Components
import NativeSkyView from '../components/NativeSkyView';
import SearchDrawer from '../components/SearchDrawer';
import TimeTravelControls from '../components/TimeTravelControls';
import SceneControlsPanel from '../components/SceneControlsPanel';
import StarDetailsModal from '../components/StarDetailsModal';

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

// Helper: Calculate Local Sidereal Time
const getLocalSiderealTime = (date, longitude) => {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const t = (jd - 2451545.0) / 36525.0;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
        0.000387933 * t * t - t * t * t / 38710000.0;
    gmst = ((gmst % 360.0) + 360.0) % 360.0;
    return ((gmst + longitude + 360.0) % 360.0);
};

const SkyViewScreen = () => {
    // State
    const [showConstellations, setShowConstellations] = useState(true);
    const [dynamicPlanets, setDynamicPlanets] = useState([]);
    const [showSearchDrawer, setShowSearchDrawer] = useState(false);
    const [targetObject, setTargetObject] = useState(null);
    const [showCoordinates, setShowCoordinates] = useState(false);
    const [showSceneControls, setShowSceneControls] = useState(false);
    const [nightMode, setNightMode] = useState('off');
    const [showLabels, setShowLabels] = useState(true);
    const [starBrightness, setStarBrightness] = useState(0.7);
    const [planetVisibility, setPlanetVisibility] = useState(0.7);

    // Time Travel state
    const [selectedTime, setSelectedTime] = useState(() => new Date());
    const [showTimeTravel, setShowTimeTravel] = useState(false);

    // Star details modal state
    const [selectedStar, setSelectedStar] = useState(null);
    const [showStarModal, setShowStarModal] = useState(false);

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

    // Update planet positions based on selected time
    useEffect(() => {
        const updatePlanets = () => {
            try {
                console.log('[SkyView] Updating planets for time:', selectedTime.toISOString());
                const bodies = getAllCelestialBodies(selectedTime, location);
                console.log('[SkyView] Calculated', bodies.length, 'planets. First:', bodies[0]?.name, 'RA:', bodies[0]?.ra?.toFixed(2));
                setDynamicPlanets(bodies);
            } catch (e) {
                console.warn('Planet error:', e.message);
            }
        };
        updatePlanets();
    }, [location, selectedTime]);

    // Toggle time travel panel
    const handleTimeTravelToggle = useCallback(() => {
        setShowTimeTravel(prev => !prev);
    }, []);

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
        console.log('[SkyView] handleMenuPress called! Opening scene controls...');
        setShowSceneControls(true);
    }, []);

    const handleCloseSceneControls = useCallback(() => {
        setShowSceneControls(false);
    }, []);

    const handleToggleNightMode = useCallback(() => {
        setNightMode(prev => prev === 'off' ? 'red' : 'off');
    }, []);

    const handleToggleLabels = useCallback(() => {
        setShowLabels(prev => !prev);
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

    // Handle star tap from native view - show bottom info bar
    const handleStarTap = useCallback((starData) => {
        console.log('[SkyView] Star tapped:', starData);
        if (starData && (starData.name || starData.id)) {
            setSelectedStar(starData);
            // Don't open modal directly - just show the info bar
        }
    }, []);

    // Open full modal when "i" button is pressed
    const handleOpenStarModal = useCallback(() => {
        if (selectedStar) {
            setShowStarModal(true);
        }
    }, [selectedStar]);

    // Close star details modal
    const handleCloseStarModal = useCallback(() => {
        setShowStarModal(false);
    }, []);

    // Dismiss the bottom info bar
    const handleDismissStarInfo = useCallback(() => {
        setSelectedStar(null);
        setShowStarModal(false);
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

            {/* Native Sky View - handles sensors internally at 60fps */}
            <NativeSkyView
                location={location}
                stars={stars.list || []}
                constellations={constellations.list || []}
                planets={activePlanets}
                showConstellations={showConstellations}
                gyroEnabled={gyroEnabled}
                theme={theme}
                onMenuPress={handleMenuPress}
                onSearchPress={handleSearchPress}
                onSharePress={handleSharePress}
                onCalibratePress={handleCalibratePress}
                selectedTime={selectedTime}
                onTimeChange={setSelectedTime}
                targetObject={targetObject}
                simulatedTime={selectedTime}
                onStarTap={handleStarTap}
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

            {/* Scene Controls Panel */}
            <SceneControlsPanel
                visible={showSceneControls}
                onClose={handleCloseSceneControls}
                nightMode={nightMode}
                onToggleNightMode={handleToggleNightMode}
                gyroEnabled={gyroEnabled}
                onToggleGyro={toggleMode}
                showConstellations={showConstellations}
                onToggleConstellations={() => setShowConstellations(prev => !prev)}
                showLabels={showLabels}
                onToggleLabels={handleToggleLabels}
                starBrightness={starBrightness}
                onStarBrightnessChange={setStarBrightness}
                planetVisibility={planetVisibility}
                onPlanetVisibilityChange={setPlanetVisibility}
                selectedTime={selectedTime}
                onTimeChange={setSelectedTime}
                theme={theme}
            />

            {/* Bottom Star Info Bar */}
            {selectedStar && !showStarModal && (
                <View style={styles.starInfoBar}>
                    <View style={styles.starInfoContent}>
                        <Text style={styles.starInfoName}>{selectedStar.name || selectedStar.id}</Text>
                        <Text style={styles.starInfoSubtitle}>
                            {selectedStar.type === 'planet' ? 'Planet' : 
                             selectedStar.constellation ? `Star in ${selectedStar.constellation}` : 
                             selectedStar.spectralType ? `Star (${selectedStar.spectralType}-class)` : 'Star'}
                        </Text>
                    </View>
                    <View style={styles.starInfoButtons}>
                        <TouchableOpacity style={styles.infoButton} onPress={handleOpenStarModal} activeOpacity={0.7}>
                            <Text style={styles.infoButtonText}>ℹ</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.closeInfoButton} onPress={handleDismissStarInfo} activeOpacity={0.7}>
                            <Text style={styles.closeInfoText}>✕</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* Star Details Modal */}
            <StarDetailsModal
                visible={showStarModal}
                object={selectedStar}
                onClose={handleCloseStarModal}
                theme={theme}
                nightMode={nightMode}
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
    // Star Info Bar styles
    starInfoBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(20, 30, 50, 0.95)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 32,
        borderTopWidth: 1,
        borderTopColor: 'rgba(79, 195, 247, 0.3)',
    },
    starInfoContent: {
        flex: 1,
    },
    starInfoName: {
        color: '#4fc3f7',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 4,
    },
    starInfoSubtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    starInfoButtons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4fc3f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoButtonText: {
        color: '#000',
        fontSize: 22,
        fontWeight: '700',
    },
    closeInfoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeInfoText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
    },
});

export default SkyViewScreen;
