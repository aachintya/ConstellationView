/**
 * Main Sky View Screen
 * Modular architecture with extracted hooks and components
 */

import React, { useCallback, useMemo, useEffect } from 'react';
import { View, StyleSheet, StatusBar, Alert, Share, Text, Animated } from 'react-native';

// Components
import NativeSkyView from '../../components/NativeSkyView';
import SearchDrawer from '../../components/SearchDrawer';
import SceneControlsPanel from '../../components/SceneControlsPanel';
import StarDetailsModal from '../../components/StarDetailsModal';
import StarInfoBar from './components/StarInfoBar';
import CoordinatesDisplay from './components/CoordinatesDisplay';

// External Hooks
import { useGyroscope } from '../../hooks/useGyroscope';
import { useLocation } from '../../hooks/useLocation';
import { useCelestialData } from '../../hooks/useCelestialData';

// Local Hooks
import { useSkyViewState } from './hooks/useSkyViewState';
import { useNavigation } from './hooks/useNavigation';
import { useStarInteraction } from './hooks/useStarInteraction';

// Utils
import { getAllCelestialBodies } from '../../utils/PlanetCalculator';

// Theme
const theme = {
    background: '#000000',
    text: '#ffffff',
    accent: '#4fc3f7',
    constellation: '#6699cc',
};

const SkyViewScreen = () => {
    // State management from custom hook
    const state = useSkyViewState();

    // GPS Location with fallback
    const { location: rawLocation } = useLocation();
    const location = rawLocation || { latitude: 28.6139, longitude: 77.209 };

    // Gyroscope hook
    const {
        setOrientation,
        mode,
        gyroEnabled,
        isCalibrated,
        toggleMode,
        calibrate,
    } = useGyroscope();

    // Celestial data
    const { stars, constellations, planets } = useCelestialData();

    // Navigation hook
    const { navigateToObject } = useNavigation(
        location, setOrientation, state.setTargetObject, state.setShowCoordinates
    );

    // Star interaction hook
    const starInteraction = useStarInteraction(
        state.infoBarAnim, state.selectedStar, state.setSelectedStar, state.setShowStarModal
    );

    // Fade out hint after 5 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            Animated.timing(state.hintOpacity, {
                toValue: 0,
                duration: 1000,
                useNativeDriver: true,
            }).start();
        }, 5000);
        return () => clearTimeout(timer);
    }, [state.hintOpacity]);

    // Update planet positions based on selected time
    useEffect(() => {
        try {
            const bodies = getAllCelestialBodies(state.selectedTime, location);
            state.setDynamicPlanets(bodies);
        } catch (e) {
            console.warn('Planet error:', e.message);
        }
    }, [location, state.selectedTime]);

    // Memoize array props
    const stableStarsList = useMemo(() => stars.list || [], [stars.list]);
    const stableConstellationsList = useMemo(() => constellations.list || [], [constellations.list]);
    const activePlanets = useMemo(() => (
        state.dynamicPlanets.length > 0 ? state.dynamicPlanets : (planets.list || [])
    ), [state.dynamicPlanets, planets.list]);

    // Handlers
    const handleMenuPress = useCallback(() => state.setShowSceneControls(true), []);
    const handleCloseSceneControls = useCallback(() => state.setShowSceneControls(false), []);
    const handleToggleNightMode = useCallback(() => state.setNightMode(p => p === 'off' ? 'red' : 'off'), []);
    const handleToggleLabels = useCallback(() => state.setShowLabels(p => !p), []);
    const handleSearchPress = useCallback(() => state.setShowSearchDrawer(true), []);
    const handleCloseSearch = useCallback(() => state.setShowSearchDrawer(false), []);
    const handleSelectObject = useCallback((obj) => navigateToObject(obj), [navigateToObject]);

    const handleSharePress = useCallback(async () => {
        try {
            await Share.share({ message: `I'm exploring the night sky with SkyView! 🌟✨` });
        } catch (e) { }
    }, []);

    const handleCalibratePress = useCallback(() => {
        if (mode === 'touch') {
            toggleMode();
            Alert.alert('🧭 Gyroscope Mode', 'Now using device sensors!', [{ text: 'OK' }]);
        } else if (!isCalibrated) {
            calibrate();
            Alert.alert('✓ Calibrated', 'Your current position is now the reference point.');
        } else {
            toggleMode();
        }
    }, [mode, isCalibrated, toggleMode, calibrate]);

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

            {/* Native Sky View */}
            <NativeSkyView
                stars={stableStarsList}
                constellations={stableConstellationsList}
                planets={activePlanets}
                gyroEnabled={gyroEnabled}
                simulatedTime={state.selectedTime}
                onStarTap={starInteraction.handleStarTap}
                onMenuPress={handleMenuPress}
                onSearchPress={handleSearchPress}
                onSharePress={handleSharePress}
            />

            {/* Coordinates Display */}
            <CoordinatesDisplay visible={state.showCoordinates} targetObject={state.targetObject} />

            {/* Location Badge */}
            <View style={styles.locationBadge}>
                <Text style={styles.locationText}>
                    📍 {location.latitude.toFixed(2)}°, {location.longitude.toFixed(2)}°
                </Text>
            </View>

            {/* Hint Badge */}
            <Animated.View style={[styles.hintBadge, { opacity: state.hintOpacity }]}>
                <Text style={styles.hintText}>Pinch to zoom • Tap star for name</Text>
            </Animated.View>

            {/* Search Drawer */}
            <SearchDrawer
                visible={state.showSearchDrawer}
                onClose={handleCloseSearch}
                stars={stars.list || []}
                constellations={constellations.list || []}
                planets={activePlanets}
                onSelectObject={handleSelectObject}
                theme={theme}
            />

            {/* Scene Controls Panel */}
            <SceneControlsPanel
                visible={state.showSceneControls}
                onClose={handleCloseSceneControls}
                nightMode={state.nightMode}
                onToggleNightMode={handleToggleNightMode}
                gyroEnabled={gyroEnabled}
                onToggleGyro={toggleMode}
                showConstellations={state.showConstellations}
                onToggleConstellations={() => state.setShowConstellations(p => !p)}
                showLabels={state.showLabels}
                onToggleLabels={handleToggleLabels}
                starBrightness={state.starBrightness}
                onStarBrightnessChange={state.setStarBrightness}
                planetVisibility={state.planetVisibility}
                onPlanetVisibilityChange={state.setPlanetVisibility}
                selectedTime={state.selectedTime}
                onTimeChange={state.setSelectedTime}
                theme={theme}
            />

            {/* Star Info Bar */}
            <StarInfoBar
                star={state.selectedStar}
                showModal={state.showStarModal}
                translateY={state.infoBarTranslateY}
                opacity={state.infoBarOpacity}
                onInfoPress={starInteraction.handleOpenStarModal}
                onDismiss={starInteraction.handleDismissStarInfo}
            />

            {/* Star Details Modal */}
            <StarDetailsModal
                visible={state.showStarModal}
                object={state.selectedStar}
                onClose={starInteraction.handleCloseStarModal}
                theme={theme}
                nightMode={state.nightMode}
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
