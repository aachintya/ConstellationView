/**
 * Main Sky View Screen
 * The primary screen combining optimized star renderer with UI components
 */

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
    View,
    StyleSheet,
    StatusBar,
    SafeAreaView,
} from 'react-native';

// Components
import StarMap from '../components/StarMap';
import InfoPanel from '../components/InfoPanel';
import SearchBar from '../components/SearchBar';
import ControlPanel from '../components/ControlPanel';
import OrientationDisplay from '../components/OrientationDisplay';

// Hooks
import { useGyroscope } from '../hooks/useGyroscope';
import { useCelestialData } from '../hooks/useCelestialData';

// Utils
import { getAllCelestialBodies } from '../utils/PlanetCalculator';

// Theme
import { getTheme } from '../styles/theme';

const SkyViewScreen = () => {
    // State
    const [selectedObject, setSelectedObject] = useState(null);
    const [showConstellations, setShowConstellations] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [isNightMode, setIsNightMode] = useState(false);
    const [dynamicPlanets, setDynamicPlanets] = useState([]);

    // Get theme based on night mode
    const theme = getTheme(isNightMode);

    // Manual touch-based navigation (no gyroscope)
    const {
        orientation,
        isCalibrated,
        location,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    } = useGyroscope();

    const {
        stars,
        constellations,
        planets,
        search,
        isLoading: dataLoading,
    } = useCelestialData();

    // Update planet positions every second using astronomy-engine
    useEffect(() => {
        const updatePlanets = () => {
            try {
                const bodies = getAllCelestialBodies(new Date(), location);
                setDynamicPlanets(bodies);
            } catch (e) {
                // Fallback to static planets if astronomy-engine fails
                console.warn('Using static planet data:', e.message);
            }
        };

        updatePlanets();
        const interval = setInterval(updatePlanets, 1000);

        return () => clearInterval(interval);
    }, [location]);

    // Use dynamic planets if available, otherwise fallback to static
    const activePlanets = useMemo(() => {
        if (dynamicPlanets.length > 0) {
            return dynamicPlanets;
        }
        return planets.list || [];
    }, [dynamicPlanets, planets.list]);

    // Handlers
    const handleSelectObject = useCallback((object) => {
        setSelectedObject(object);
    }, []);

    const handleCloseInfo = useCallback(() => {
        setSelectedObject(null);
    }, []);

    const handleSearchSelect = useCallback((result) => {
        setSelectedObject(result);
    }, []);

    const handleToggleConstellations = useCallback(() => {
        setShowConstellations(prev => !prev);
    }, []);

    const handleToggleLabels = useCallback(() => {
        setShowLabels(prev => !prev);
    }, []);

    const handleToggleNightMode = useCallback(() => {
        setIsNightMode(prev => !prev);
    }, []);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <StatusBar
                barStyle="light-content"
                backgroundColor={theme.background}
                translucent
            />

            {/* Star Map with touch-based pan navigation */}
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
            />

            {/* Search Bar */}
            <SafeAreaView style={styles.searchContainer}>
                <SearchBar
                    onSearch={search}
                    onSelectResult={handleSearchSelect}
                    theme={theme}
                />
            </SafeAreaView>

            {/* Orientation Display */}
            {!selectedObject && (
                <OrientationDisplay
                    orientation={orientation}
                    isCalibrated={isCalibrated}
                    theme={theme}
                />
            )}

            {/* Control Panel */}
            {!selectedObject && (
                <ControlPanel
                    showConstellations={showConstellations}
                    onToggleConstellations={handleToggleConstellations}
                    showLabels={showLabels}
                    onToggleLabels={handleToggleLabels}
                    isNightMode={isNightMode}
                    onToggleNightMode={handleToggleNightMode}
                    theme={theme}
                />
            )}

            {/* Info Panel */}
            <InfoPanel
                object={selectedObject}
                onClose={handleCloseInfo}
                theme={theme}
                visible={!!selectedObject}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    searchContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
    },
});

export default SkyViewScreen;
