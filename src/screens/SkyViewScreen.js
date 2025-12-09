/**
 * Main Sky View Screen
 * The primary screen of the application combining all components
 */

import React, { useState, useCallback } from 'react';
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

// Theme
import { getTheme } from '../styles/theme';

const SkyViewScreen = () => {
    // State
    const [selectedObject, setSelectedObject] = useState(null);
    const [showConstellations, setShowConstellations] = useState(true);
    const [showLabels, setShowLabels] = useState(true);
    const [isNightMode, setIsNightMode] = useState(false);

    // Get theme based on night mode
    const theme = getTheme(isNightMode);

    // Custom hooks
    const {
        orientation,
        isCalibrated,
        location,
        error: gyroError
    } = useGyroscope({
        updateInterval: 50,
        smoothingFactor: 0.2,
    });

    const {
        stars,
        constellations,
        planets,
        search,
        isLoading: dataLoading,
    } = useCelestialData();

    // Handlers
    const handleSelectObject = useCallback((object) => {
        setSelectedObject(object);
    }, []);

    const handleCloseInfo = useCallback(() => {
        setSelectedObject(null);
    }, []);

    const handleSearchSelect = useCallback((result) => {
        // Set the selected object from search
        setSelectedObject(result);

        // TODO: Could also pan the view to center on the object
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

            {/* Main Star Map */}
            <StarMap
                orientation={orientation}
                location={location}
                stars={stars.list}
                constellations={constellations.list}
                planets={planets.list}
                starMap={stars.byId}
                onSelectObject={handleSelectObject}
                selectedObject={selectedObject}
                showConstellations={showConstellations}
                showLabels={showLabels}
                theme={theme}
            />

            {/* Search Bar */}
            <SafeAreaView style={styles.searchContainer}>
                <SearchBar
                    onSearch={search}
                    onSelectResult={handleSearchSelect}
                    theme={theme}
                />
            </SafeAreaView>

            {/* Orientation Display - hidden when search results might overlap */}
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
