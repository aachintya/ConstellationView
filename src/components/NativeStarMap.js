/**
 * NativeStarMap - Drop-in replacement for StarMap using native Android rendering
 * 
 * This component wraps NativeSkyView (native Android Canvas-based rendering)
 * while preserving the UI overlays and interactions from the original StarMap.
 * 
 * Features:
 * - 60fps native Canvas rendering
 * - Hardware sensor fusion for gyro mode
 * - Touch drag mode for manual navigation
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
    Platform,
} from 'react-native';
import NativeSkyView from './NativeSkyView';
import StarDetailsModal from './StarDetailsModal';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const NativeStarMap = ({
    location = { latitude: 28.6139, longitude: 77.209 },
    stars = [],
    constellations = [],
    planets = [],
    showConstellations = true,
    theme = {},
    onMenuPress,
    onSearchPress,
    onSharePress,
    onCalibratePress,
    targetObject,
    simulatedTime = null,
}) => {
    // Mode state: true = gyro, false = touch/drag
    const [gyroEnabled, setGyroEnabled] = useState(true);

    // State for star details modal
    const [selectedStar, setSelectedStar] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);

    // Toggle between gyro and touch mode
    const handleModeToggle = useCallback(() => {
        setGyroEnabled(prev => {
            console.log('[NativeStarMap] Toggling gyro mode from', prev, 'to', !prev);
            return !prev;
        });
    }, []);

    // Combine stars and planets for rendering
    const allObjects = useMemo(() => {
        const planetObjects = planets.map(p => ({
            ...p,
            type: 'planet',
        }));
        return [...stars, ...planetObjects];
    }, [stars, planets]);

    // Handle star tap (would need native callback - placeholder for now)
    const handleStarTap = useCallback((star) => {
        setSelectedStar(star);
        setShowDetailsModal(true);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowDetailsModal(false);
        setSelectedStar(null);
    }, []);

    return (
        <View style={styles.container}>
            {/* Native Star Field - handles sensors internally */}
            <NativeSkyView
                stars={stars}
                planets={planets}
                constellations={showConstellations ? constellations : []}
                fov={75}
                latitude={location.latitude}
                longitude={location.longitude}
                gyroEnabled={gyroEnabled}
                style={styles.starField}
            />

            {/* Control Bar */}
            <View style={styles.controlBar}>
                <TouchableOpacity style={styles.controlButton} onPress={onMenuPress}>
                    <Text style={styles.controlIcon}>☰</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={onSearchPress}>
                    <Text style={styles.controlIcon}>🔍</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={onSharePress}>
                    <Text style={styles.controlIcon}>📤</Text>
                </TouchableOpacity>
            </View>

            {/* Mode Toggle Button */}
            <TouchableOpacity
                style={[styles.modeToggle, gyroEnabled ? styles.gyroMode : styles.touchMode]}
                onPress={handleModeToggle}
            >
                <Text style={styles.modeToggleText}>
                    {gyroEnabled ? '🧭 Gyro' : '👆 Touch'}
                </Text>
            </TouchableOpacity>

            {/* Target Object Indicator */}
            {targetObject && (
                <View style={styles.targetIndicator}>
                    <Text style={styles.targetText}>
                        🎯 {targetObject.name || targetObject.id}
                    </Text>
                </View>
            )}

            {/* Mode hint - shows briefly */}
            <View style={styles.nativeBadge}>
                <Text style={styles.nativeBadgeText}>
                    {gyroEnabled ? '⚡ Native 60fps' : '👆 Drag to pan'}
                </Text>
            </View>

            {/* Star Details Modal */}
            <StarDetailsModal
                visible={showDetailsModal}
                star={selectedStar}
                onClose={handleCloseModal}
                theme={theme}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#000',
    },
    starField: {
        ...StyleSheet.absoluteFillObject,
    },
    controlBar: {
        position: 'absolute',
        bottom: 40,
        left: 0,
        right: 0,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
    },
    controlButton: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    controlIcon: {
        fontSize: 22,
    },
    targetIndicator: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        backgroundColor: 'rgba(79, 195, 247, 0.3)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: '#4fc3f7',
    },
    targetText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    nativeBadge: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(76, 175, 80, 0.3)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 12,
    },
    nativeBadgeText: {
        color: '#4caf50',
        fontSize: 11,
        fontWeight: '600',
    },
    modeToggle: {
        position: 'absolute',
        top: 50,
        right: 20,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        borderWidth: 1,
    },
    gyroMode: {
        backgroundColor: 'rgba(79, 195, 247, 0.2)',
        borderColor: '#4fc3f7',
    },
    touchMode: {
        backgroundColor: 'rgba(255, 193, 7, 0.2)',
        borderColor: '#ffc107',
    },
    modeToggleText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
});

export default NativeStarMap;
