/**
 * NativeStarMap - Drop-in replacement for StarMap using native Android rendering
 * 
 * Features:
 * - 60fps native Canvas rendering
 * - Hardware sensor fusion for gyro mode
 * - Touch drag mode for manual navigation
 * - Star info panel at bottom
 * - Right-side control buttons
 * - Full-screen night mode (red/green tint)
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
    View,
    StyleSheet,
    Dimensions,
    TouchableOpacity,
    Text,
} from 'react-native';
import NativeSkyView from './NativeSkyView';
import StarDetailsModal from './StarDetailsModal';
import SceneControlsPanel from './SceneControlsPanel';
import SettingsPage from './SettingsPage';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Night mode color helper
const getNightModeColors = (nightMode) => {
    switch (nightMode) {
        case 'red':
            return {
                primary: '#ff3333',
                secondary: 'rgba(255, 50, 50, 0.8)',
                dim: 'rgba(255, 50, 50, 0.4)',
                overlay: 'rgba(50, 0, 0, 0.3)',
                icon: '#ff6666',
            };
        case 'green':
            return {
                primary: '#33ff33',
                secondary: 'rgba(50, 255, 50, 0.8)',
                dim: 'rgba(50, 255, 50, 0.4)',
                overlay: 'rgba(0, 50, 0, 0.3)',
                icon: '#66ff66',
            };
        default:
            return {
                primary: '#fff',
                secondary: 'rgba(255, 255, 255, 0.9)',
                dim: 'rgba(255, 255, 255, 0.4)',
                overlay: 'transparent',
                icon: '#fff',
            };
    }
};

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
    selectedTime,
    onTimeChange,
    targetObject,
    simulatedTime = null,
}) => {
    const [gyroEnabled, setGyroEnabled] = useState(true);
    const [selectedStar, setSelectedStar] = useState(null);
    const [showDetailsModal, setShowDetailsModal] = useState(false);
    const [crosshairStar, setCrosshairStar] = useState(null);
    const [tappedStar, setTappedStar] = useState(null);
    const [showSceneControls, setShowSceneControls] = useState(false);
    const [showSettings, setShowSettings] = useState(false);
    const [nightMode, setNightMode] = useState('off');
    const [showLabels, setShowLabels] = useState(true);
    const [starBrightness, setStarBrightness] = useState(0.5);
    const [planetVisibility, setPlanetVisibility] = useState(0.4);
    const [constellationsEnabled, setConstellationsEnabled] = useState(showConstellations);

    // Get night mode colors
    const nightColors = useMemo(() => getNightModeColors(nightMode), [nightMode]);

    const handleMenuPress = useCallback(() => {
        setShowSceneControls(true);
        if (onMenuPress) onMenuPress();
    }, [onMenuPress]);

    const handleCloseSceneControls = useCallback(() => {
        setShowSceneControls(false);
    }, []);

    const handleCycleNightMode = useCallback(() => {
        setNightMode(prev => {
            if (prev === 'off') return 'red';
            if (prev === 'red') return 'green';
            return 'off';
        });
    }, []);

    const handleModeToggle = useCallback(() => {
        setGyroEnabled(prev => !prev);
    }, []);

    const handleStarTap = useCallback((star) => {
        setTappedStar(star);
    }, []);

    const handleShowFullDetails = useCallback(() => {
        if (tappedStar) {
            setSelectedStar(tappedStar);
            setShowDetailsModal(true);
        }
    }, [tappedStar]);

    const handleCloseStarInfo = useCallback(() => {
        setTappedStar(null);
    }, []);

    const handleCloseModal = useCallback(() => {
        setShowDetailsModal(false);
        setSelectedStar(null);
    }, []);

    const displayStar = tappedStar || crosshairStar;

    return (
        <View style={styles.container}>
            {/* Native Star Field */}
            <NativeSkyView
                stars={stars}
                planets={planets}
                constellations={constellationsEnabled ? constellations : []}
                fov={75}
                latitude={location.latitude}
                longitude={location.longitude}
                gyroEnabled={gyroEnabled}
                nightMode={nightMode}
                simulatedTime={selectedTime}
                starBrightness={starBrightness}
                planetScale={planetVisibility}
                onStarTap={handleStarTap}
                style={styles.starField}
            />

            {/* Night Mode Overlay */}
            {nightMode !== 'off' && (
                <View
                    style={[styles.nightOverlay, { backgroundColor: nightColors.overlay }]}
                    pointerEvents="none"
                />
            )}

            {/* Right Side Control Buttons - Minimal style */}
            <View style={styles.rightControlBar}>
                <TouchableOpacity style={styles.controlButton} onPress={handleMenuPress}>
                    <View style={styles.menuIcon}>
                        <View style={[styles.menuLine, { backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.menuLine, { backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.menuLine, { backgroundColor: nightColors.secondary }]} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={onSearchPress}>
                    <View style={styles.searchIcon}>
                        <View style={[styles.searchCircle, { borderColor: nightColors.secondary }]} />
                        <View style={[styles.searchHandle, { backgroundColor: nightColors.secondary }]} />
                    </View>
                </TouchableOpacity>
                <TouchableOpacity style={styles.controlButton} onPress={onSharePress}>
                    <View style={styles.shareIcon}>
                        <View style={[styles.shareDot, { top: 0, right: 0, backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.shareDot, { left: 0, top: 9, backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.shareDot, { right: 0, bottom: 0, backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.shareLine1, { backgroundColor: nightColors.secondary }]} />
                        <View style={[styles.shareLine2, { backgroundColor: nightColors.secondary }]} />
                    </View>
                </TouchableOpacity>
            </View>

            {/* Star Info Panel at Bottom */}
            {displayStar && (
                <View style={[styles.starInfoPanel, nightMode !== 'off' && { backgroundColor: nightMode === 'red' ? 'rgba(30, 5, 5, 0.95)' : 'rgba(5, 30, 5, 0.95)' }]}>
                    <View style={styles.starInfoContent}>
                        <View style={styles.starInfoText}>
                            <Text style={[styles.starName, { color: nightColors.primary }]}>
                                {displayStar.name || displayStar.id || 'Unknown Star'}
                            </Text>
                            <Text style={[styles.starSubtitle, { color: nightColors.dim }]}>
                                {displayStar.constellation
                                    ? `Star in ${displayStar.constellation}`
                                    : displayStar.type === 'planet'
                                        ? 'Planet'
                                        : 'Star'}
                            </Text>
                        </View>
                        <View style={styles.starInfoActions}>
                            <TouchableOpacity
                                style={[styles.infoButton, { backgroundColor: `${nightColors.primary}22`, borderColor: nightColors.primary }]}
                                onPress={handleShowFullDetails}
                            >
                                <Text style={styles.infoButtonIcon}>ℹ️</Text>
                            </TouchableOpacity>
                            {tappedStar && (
                                <TouchableOpacity
                                    style={styles.closeButton}
                                    onPress={handleCloseStarInfo}
                                >
                                    <Text style={[styles.closeButtonIcon, { color: nightColors.primary }]}>✕</Text>
                                </TouchableOpacity>
                            )}
                        </View>
                    </View>
                    {tappedStar && (
                        <Text style={[styles.starDescription, { color: nightColors.dim }]}>
                            {tappedStar.description ||
                                `Located in the night sky, ${tappedStar.name || tappedStar.id} is a ${tappedStar.spectralType ? `${tappedStar.spectralType}-class` : ''
                                } star with magnitude ${tappedStar.magnitude?.toFixed(1) || 'unknown'}.`}
                        </Text>
                    )}
                </View>
            )}

            {/* Target Object Indicator */}
            {targetObject && (
                <View style={[styles.targetIndicator, { backgroundColor: `${nightColors.primary}33`, borderColor: nightColors.primary }]}>
                    <Text style={[styles.targetText, { color: nightColors.primary }]}>
                        🎯 {targetObject.name || targetObject.id}
                    </Text>
                </View>
            )}

            {/* Star Details Modal */}
            <StarDetailsModal
                visible={showDetailsModal}
                object={selectedStar}
                onClose={handleCloseModal}
                theme={theme}
                nightMode={nightMode}
            />

            <SceneControlsPanel
                visible={showSceneControls}
                onClose={handleCloseSceneControls}
                nightMode={nightMode}
                onToggleNightMode={handleCycleNightMode}
                gyroEnabled={gyroEnabled}
                onToggleGyro={handleModeToggle}
                showConstellations={constellationsEnabled}
                onToggleConstellations={() => setConstellationsEnabled(prev => !prev)}
                showLabels={showLabels}
                onToggleLabels={() => setShowLabels(prev => !prev)}
                starBrightness={starBrightness}
                onStarBrightnessChange={setStarBrightness}
                planetVisibility={planetVisibility}
                onPlanetVisibilityChange={setPlanetVisibility}
                selectedTime={selectedTime}
                onTimeChange={onTimeChange}
                onOpenSettings={() => setShowSettings(true)}
                theme={theme}
            />

            <SettingsPage
                visible={showSettings}
                onClose={() => setShowSettings(false)}
                nightMode={nightMode}
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
    // Night mode overlay
    nightOverlay: {
        ...StyleSheet.absoluteFillObject,
    },
    // Right side control bar
    rightControlBar: {
        position: 'absolute',
        right: 16,
        top: '50%',
        transform: [{ translateY: -80 }],
        flexDirection: 'column',
        gap: 16,
    },
    controlButton: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuIcon: {
        width: 24,
        height: 18,
        justifyContent: 'space-between',
    },
    menuLine: {
        width: 24,
        height: 2,
        borderRadius: 1,
    },
    searchIcon: {
        width: 24,
        height: 24,
        position: 'relative',
    },
    searchCircle: {
        width: 16,
        height: 16,
        borderRadius: 8,
        borderWidth: 2,
        position: 'absolute',
        top: 0,
        left: 0,
    },
    searchHandle: {
        width: 8,
        height: 2,
        position: 'absolute',
        bottom: 3,
        right: 0,
        transform: [{ rotate: '45deg' }],
        borderRadius: 1,
    },
    shareIcon: {
        width: 24,
        height: 24,
        position: 'relative',
    },
    shareDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        position: 'absolute',
    },
    shareLine1: {
        width: 10,
        height: 2,
        position: 'absolute',
        top: 7,
        left: 6,
        transform: [{ rotate: '-35deg' }],
    },
    shareLine2: {
        width: 10,
        height: 2,
        position: 'absolute',
        bottom: 7,
        left: 6,
        transform: [{ rotate: '35deg' }],
    },
    // Star info panel at bottom
    starInfoPanel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(10, 15, 30, 0.95)',
        paddingHorizontal: 20,
        paddingTop: 16,
        paddingBottom: 20,
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
    },
    starInfoContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    starInfoText: {
        flex: 1,
    },
    starName: {
        fontSize: 24,
        fontWeight: '600',
    },
    starSubtitle: {
        fontSize: 14,
        marginTop: 2,
    },
    starInfoActions: {
        flexDirection: 'row',
        gap: 12,
    },
    infoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
    },
    infoButtonIcon: {
        fontSize: 20,
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonIcon: {
        fontSize: 20,
    },
    starDescription: {
        fontSize: 13,
        fontStyle: 'italic',
        marginTop: 12,
        lineHeight: 18,
    },
    targetIndicator: {
        position: 'absolute',
        top: '40%',
        alignSelf: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    targetText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default NativeStarMap;
