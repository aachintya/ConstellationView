/**
 * Scene Controls Panel
 * Beautiful sliding control panel with drag-to-dismiss support
 * Matches the design from professional astronomy apps
 */

import React, { useEffect, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    Platform,
    PanResponder,
} from 'react-native';
import Slider from '@react-native-community/slider';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Panel height for smooth animations
const PANEL_HEIGHT = 480;

const SceneControlsPanel = ({
    visible,
    onClose,
    // Toggle states
    nightMode,
    onToggleNightMode,
    gyroEnabled,
    onToggleGyro,
    showConstellations,
    onToggleConstellations,
    showLabels,
    onToggleLabels,
    // Slider values
    starBrightness,
    onStarBrightnessChange,
    planetVisibility,
    onPlanetVisibilityChange,
    // Theme
    theme = {},
}) => {
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const dragY = useRef(new Animated.Value(0)).current;

    // Pan responder for drag-to-dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => {
                // Only activate if dragging down from near the top
                return Math.abs(gestureState.dy) > 5;
            },
            onPanResponderGrant: () => {
                dragY.setValue(0);
            },
            onPanResponderMove: (evt, gestureState) => {
                // Only allow dragging down
                if (gestureState.dy > 0) {
                    dragY.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (evt, gestureState) => {
                // If dragged down more than 100px, close the panel
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    closePanel();
                } else {
                    // Snap back to position
                    Animated.spring(dragY, {
                        toValue: 0,
                        useNativeDriver: true,
                        tension: 80,
                        friction: 10,
                    }).start();
                }
            },
        })
    ).current;

    const closePanel = () => {
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: PANEL_HEIGHT,
                duration: 300,
                useNativeDriver: true,
            }),
            Animated.timing(backdropOpacity, {
                toValue: 0,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(dragY, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => {
            onClose();
        });
    };

    useEffect(() => {
        if (visible) {
            // Reset drag position
            dragY.setValue(0);

            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    tension: 80,
                    friction: 12,
                    overshootClamping: false,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 1,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, {
                    toValue: PANEL_HEIGHT,
                    duration: 300,
                    useNativeDriver: true,
                }),
                Animated.timing(backdropOpacity, {
                    toValue: 0,
                    duration: 250,
                    useNativeDriver: true,
                }),
            ]).start();
        }
    }, [visible]);

    // Control button component
    const ControlButton = ({ icon, label, active, onPress, color }) => (
        <TouchableOpacity
            style={[
                styles.controlButton,
                active && styles.controlButtonActive,
                active && color && { backgroundColor: `${color}33` },
            ]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={[
                styles.iconContainer,
                active && styles.iconContainerActive,
                active && color && { borderColor: color },
            ]}>
                <Text style={[styles.buttonIcon, active && color && { color }]}>
                    {icon}
                </Text>
            </View>
            <Text style={[styles.buttonLabel, active && styles.buttonLabelActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    // Slider row component
    const SliderRow = ({ leftIcon, rightIcon, value, onValueChange, leftColor, rightColor }) => (
        <View style={styles.sliderRow}>
            <Text style={[styles.sliderIcon, { color: leftColor || '#666' }]}>{leftIcon}</Text>
            <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1}
                value={value}
                onValueChange={onValueChange}
                minimumTrackTintColor="#4fc3f7"
                maximumTrackTintColor="#333"
                thumbTintColor="#fff"
            />
            <Text style={[styles.sliderIcon, { color: rightColor || '#4fc3f7' }]}>{rightIcon}</Text>
        </View>
    );

    // Bottom tab button component
    const TabButton = ({ icon, active, onPress }) => (
        <TouchableOpacity
            style={[styles.tabButton, active && styles.tabButtonActive]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <Text style={[styles.tabIcon, active && styles.tabIconActive]}>{icon}</Text>
        </TouchableOpacity>
    );

    if (!visible) return null;

    // Combine slide and drag animations
    const panelTranslateY = Animated.add(slideAnim, dragY);

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {/* Backdrop */}
            <Animated.View
                style={[styles.backdrop, { opacity: backdropOpacity }]}
                pointerEvents={visible ? 'auto' : 'none'}
            >
                <TouchableOpacity
                    style={StyleSheet.absoluteFill}
                    onPress={closePanel}
                    activeOpacity={1}
                />
            </Animated.View>

            {/* Panel */}
            <Animated.View
                style={[
                    styles.panel,
                    { transform: [{ translateY: panelTranslateY }] },
                ]}
            >
                {/* Drag handle - interactive area */}
                <View style={styles.handleContainer} {...panResponder.panHandlers}>
                    <View style={styles.handle} />
                </View>

                {/* Title */}
                <Text style={styles.title}>SCENE CONTROLS</Text>

                {/* Main control buttons row */}
                <View style={styles.buttonRow}>
                    <ControlButton
                        icon="🌙"
                        label="Night"
                        active={nightMode !== 'off'}
                        onPress={onToggleNightMode}
                        color="#ff6b6b"
                    />
                    <ControlButton
                        icon={gyroEnabled ? "📡" : "👆"}
                        label={gyroEnabled ? "Gyro" : "Touch"}
                        active={gyroEnabled}
                        onPress={onToggleGyro}
                        color="#4fc3f7"
                    />
                    <ControlButton
                        icon="◇"
                        label="Lines"
                        active={showConstellations}
                        onPress={onToggleConstellations}
                        color="#9c88ff"
                    />
                    <ControlButton
                        icon="🏷️"
                        label="Labels"
                        active={showLabels}
                        onPress={onToggleLabels}
                        color="#ffc107"
                    />
                </View>

                {/* Star brightness slider */}
                <SliderRow
                    leftIcon="✦"
                    rightIcon="✦✦"
                    value={starBrightness}
                    onValueChange={onStarBrightnessChange}
                    leftColor="#666"
                    rightColor="#4fc3f7"
                />

                {/* Planet visibility slider */}
                <SliderRow
                    leftIcon="🪐"
                    rightIcon="🪐"
                    value={planetVisibility}
                    onValueChange={onPlanetVisibilityChange}
                    leftColor="#666"
                    rightColor="#4fc3f7"
                />

                {/* Bottom tabs */}
                <View style={styles.tabRow}>
                    <TabButton icon="⚙️" active={true} onPress={() => { }} />
                    <TabButton icon="◇" active={false} onPress={onToggleConstellations} />
                    <TabButton icon="📅" active={false} onPress={() => { }} />
                    <TabButton icon="📡" active={false} onPress={onToggleGyro} />
                </View>

                {/* Safe area padding for bottom */}
                <View style={styles.safeAreaPadding} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#1a1a2e',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        paddingTop: 0,
        paddingHorizontal: 20,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 24,
    },
    handleContainer: {
        alignItems: 'center',
        paddingVertical: 12,
        paddingTop: 8,
    },
    handle: {
        width: 40,
        height: 4,
        backgroundColor: '#555',
        borderRadius: 2,
    },
    title: {
        color: '#888',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
        textAlign: 'center',
        marginTop: 8,
        marginBottom: 20,
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 24,
    },
    controlButton: {
        alignItems: 'center',
        padding: 8,
        borderRadius: 12,
    },
    controlButtonActive: {
        backgroundColor: 'rgba(79, 195, 247, 0.1)',
    },
    iconContainer: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#2a2a3e',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#3a3a4e',
        marginBottom: 8,
    },
    iconContainerActive: {
        borderColor: '#4fc3f7',
        backgroundColor: '#2a3a4e',
    },
    buttonIcon: {
        fontSize: 24,
    },
    buttonLabel: {
        color: '#666',
        fontSize: 11,
        fontWeight: '500',
    },
    buttonLabelActive: {
        color: '#fff',
    },
    sliderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingHorizontal: 8,
    },
    sliderIcon: {
        fontSize: 16,
        width: 30,
        textAlign: 'center',
    },
    slider: {
        flex: 1,
        height: 40,
        marginHorizontal: 8,
    },
    tabRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginTop: 8,
        marginBottom: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: '#2a2a3e',
    },
    tabButton: {
        width: 60,
        height: 48,
        borderRadius: 12,
        backgroundColor: '#2a2a3e',
        justifyContent: 'center',
        alignItems: 'center',
    },
    tabButtonActive: {
        backgroundColor: '#3a3a4e',
    },
    tabIcon: {
        fontSize: 20,
        color: '#666',
    },
    tabIconActive: {
        color: '#fff',
    },
    safeAreaPadding: {
        height: Platform.OS === 'ios' ? 20 : 10,
    },
});

export default SceneControlsPanel;
