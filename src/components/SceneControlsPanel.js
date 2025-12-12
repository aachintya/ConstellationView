/**
 * Scene Controls Panel - Clean control panel with icon buttons, sliders, and bottom tabs
 * Refactored to use shared components
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
    PanResponder,
} from 'react-native';

import {
    getNightModeColors,
    CustomSlider,
    WheelColumn,
    ITEM_HEIGHT,
    VISIBLE_ITEMS,
    generateDays,
    generateMonths,
    generateYears,
    generateHours,
    generateMinutes,
    generateAmPm,
} from './shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = 520;

const SceneControlsPanel = ({
    visible,
    onClose,
    nightMode = 'off',
    onToggleNightMode,
    gyroEnabled,
    onToggleGyro,
    showConstellations,
    onToggleConstellations,
    showLabels,
    onToggleLabels,
    starBrightness,
    onStarBrightnessChange,
    planetVisibility,
    onPlanetVisibilityChange,
    selectedTime = new Date(),
    onTimeChange,
    theme = {},
}) => {
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;
    const dragY = useRef(new Animated.Value(0)).current;
    const [viewMode, setViewMode] = useState('controls');

    const colors = useMemo(() => getNightModeColors(nightMode), [nightMode]);

    const day = selectedTime?.getDate() || 1;
    const month = selectedTime?.getMonth() || 0;
    const year = selectedTime?.getFullYear() || 2025;
    const hours24 = selectedTime?.getHours() || 0;
    const minutes = selectedTime?.getMinutes() || 0;
    const hour12 = hours24 % 12 || 12;
    const isPm = hours24 >= 12;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (evt, gestureState) => Math.abs(gestureState.dy) > 5,
            onPanResponderGrant: () => { dragY.setValue(0); },
            onPanResponderMove: (evt, gestureState) => {
                if (gestureState.dy > 0) dragY.setValue(gestureState.dy);
            },
            onPanResponderRelease: (evt, gestureState) => {
                if (gestureState.dy > 100 || gestureState.vy > 0.5) {
                    closePanel();
                } else {
                    Animated.spring(dragY, { toValue: 0, useNativeDriver: true, tension: 80, friction: 10 }).start();
                }
            },
        })
    ).current;

    const closePanel = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: PANEL_HEIGHT, duration: 300, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            Animated.timing(dragY, { toValue: 0, duration: 200, useNativeDriver: true }),
        ]).start(() => {
            onClose();
            setViewMode('controls');
        });
    };

    useEffect(() => {
        if (visible) {
            dragY.setValue(0);
            Animated.parallel([
                Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, tension: 80, friction: 12 }),
                Animated.timing(backdropOpacity, { toValue: 1, duration: 250, useNativeDriver: true }),
            ]).start();
        } else {
            Animated.parallel([
                Animated.timing(slideAnim, { toValue: PANEL_HEIGHT, duration: 300, useNativeDriver: true }),
                Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
            ]).start();
        }
    }, [visible]);

    const updateDate = (newDay, newMonth, newYear) => {
        const newTime = new Date(selectedTime);
        newTime.setFullYear(newYear);
        newTime.setMonth(newMonth);
        newTime.setDate(newDay);
        onTimeChange?.(newTime);
    };

    const updateTime = (newHour12, newMinutes, newIsPm) => {
        const newTime = new Date(selectedTime);
        let hour24 = newHour12;
        if (newIsPm && newHour12 !== 12) hour24 += 12;
        if (!newIsPm && newHour12 === 12) hour24 = 0;
        newTime.setHours(hour24, newMinutes);
        onTimeChange?.(newTime);
    };

    const resetToNow = () => {
        onTimeChange?.(new Date());
    };

    const isNow = Math.abs((selectedTime?.getTime() || 0) - Date.now()) < 60000;

    // Control button with icon
    const ControlButton = ({ icon, label, active, onPress }) => (
        <TouchableOpacity
            style={[styles.controlButton, active && { backgroundColor: `${colors.primary}22` }]}
            onPress={onPress}
            activeOpacity={0.6}
        >
            <View style={[styles.iconContainer, active && { borderColor: colors.primary }]}>
                <Text style={styles.buttonIcon}>{icon}</Text>
            </View>
            <Text style={[styles.buttonLabel, { color: active ? colors.text : colors.textDim }]}>{label}</Text>
        </TouchableOpacity>
    );

    // Slider row
    const SliderRow = ({ leftIcon, rightIcon, value, onValueChange }) => (
        <View style={styles.sliderRow}>
            <Text style={[styles.sliderIcon, { color: colors.textDim }]}>{leftIcon}</Text>
            <CustomSlider value={value} onValueChange={onValueChange} trackColor={colors.primary} />
            <Text style={[styles.sliderIcon, { color: colors.primary }]}>{rightIcon}</Text>
        </View>
    );

    // Tab button
    const TabButton = ({ icon, active, onPress }) => (
        <TouchableOpacity style={[styles.tabButton, active && { backgroundColor: `${colors.primary}33` }]} onPress={onPress} activeOpacity={0.6}>
            <Text style={[styles.tabIcon, { color: active ? colors.text : colors.textDim }]}>{icon}</Text>
        </TouchableOpacity>
    );

    if (!visible) return null;

    const panelTranslateY = Animated.add(slideAnim, dragY);

    // Controls view
    const renderControls = () => (
        <>
            <Text style={[styles.title, { color: colors.textDim }]}>SCENE CONTROLS</Text>
            <View style={styles.buttonRow}>
                <ControlButton icon="🌙" label="Night" active={nightMode !== 'off'} onPress={onToggleNightMode} />
                <ControlButton icon={gyroEnabled ? "📡" : "👆"} label={gyroEnabled ? "Gyro" : "Touch"} active={gyroEnabled} onPress={onToggleGyro} />
                <ControlButton icon="✦" label="Lines" active={showConstellations} onPress={onToggleConstellations} />
                <ControlButton icon="Aa" label="Labels" active={showLabels} onPress={onToggleLabels} />
            </View>
            <SliderRow leftIcon="✦" rightIcon="✦✦" value={starBrightness} onValueChange={onStarBrightnessChange} />
            <SliderRow leftIcon="🪐" rightIcon="🪐" value={planetVisibility} onValueChange={onPlanetVisibilityChange} />
        </>
    );

    // Date picker
    const renderDatePicker = () => (
        <>
            <Text style={[styles.title, { color: colors.textDim }]}>SELECT DATE</Text>
            <View style={styles.wheelContainer}>
                <WheelColumn data={generateDays()} selectedIndex={day - 1} onSelect={(idx, val) => updateDate(val, month, year)} width={60} textColor={colors.text} />
                <WheelColumn data={generateMonths()} selectedIndex={month} onSelect={(idx) => updateDate(day, idx, year)} width={80} textColor={colors.text} />
                <WheelColumn data={generateYears()} selectedIndex={year - 2015} onSelect={(idx, val) => updateDate(day, month, val)} width={80} textColor={colors.text} />
            </View>
            <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.border }]} onPress={resetToNow} disabled={isNow}>
                <Text style={[styles.clearBtnText, { color: isNow ? colors.textDim : colors.primary }]}>Reset to Now</Text>
            </TouchableOpacity>
        </>
    );

    // Time picker
    const renderTimePicker = () => (
        <>
            <Text style={[styles.title, { color: colors.textDim }]}>SELECT TIME</Text>
            <View style={styles.wheelContainer}>
                <WheelColumn data={generateHours()} selectedIndex={hour12 - 1} onSelect={(idx, val) => updateTime(val, minutes, isPm)} width={60} textColor={colors.text} />
                <Text style={[styles.timeSeparator, { color: colors.text }]}>:</Text>
                <WheelColumn data={generateMinutes()} selectedIndex={minutes} onSelect={(idx, val) => updateTime(hour12, val, isPm)} width={60} formatItem={(m) => m.toString().padStart(2, '0')} textColor={colors.text} />
                <WheelColumn data={generateAmPm()} selectedIndex={isPm ? 1 : 0} onSelect={(idx) => updateTime(hour12, minutes, idx === 1)} width={60} textColor={colors.text} />
            </View>
            <TouchableOpacity style={[styles.clearBtn, { borderColor: colors.border }]} onPress={resetToNow} disabled={isNow}>
                <Text style={[styles.clearBtnText, { color: isNow ? colors.textDim : colors.primary }]}>Reset to Now</Text>
            </TouchableOpacity>
        </>
    );

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePanel} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={[styles.panel, { backgroundColor: colors.background, transform: [{ translateY: panelTranslateY }] }]}>
                <View style={styles.handleContainer} {...panResponder.panHandlers}>
                    <View style={[styles.handle, { backgroundColor: colors.textDim }]} />
                </View>

                {viewMode === 'controls' && renderControls()}
                {viewMode === 'date' && renderDatePicker()}
                {viewMode === 'time' && renderTimePicker()}

                {/* Bottom tabs */}
                <View style={[styles.tabRow, { borderTopColor: colors.border }]}>
                    <TabButton icon="⚙️" active={viewMode === 'controls'} onPress={() => setViewMode('controls')} />
                    <TabButton icon="✦" active={false} onPress={onToggleConstellations} />
                    <TabButton icon="📅" active={viewMode === 'date'} onPress={() => setViewMode(viewMode === 'date' ? 'controls' : 'date')} />
                    <TabButton icon="🕐" active={viewMode === 'time'} onPress={() => setViewMode(viewMode === 'time' ? 'controls' : 'time')} />
                </View>

                <View style={styles.safeAreaPadding} />
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0, 0, 0, 0.6)' },
    panel: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingHorizontal: 20,
    },
    handleContainer: { alignItems: 'center', paddingVertical: 12, paddingTop: 8 },
    handle: { width: 40, height: 4, borderRadius: 2 },
    title: { fontSize: 11, fontWeight: '600', letterSpacing: 2, textAlign: 'center', marginTop: 8, marginBottom: 20 },
    buttonRow: { flexDirection: 'row', justifyContent: 'space-around', marginBottom: 24 },
    controlButton: { alignItems: 'center', padding: 8, borderRadius: 12 },
    iconContainer: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.08)', justifyContent: 'center', alignItems: 'center', borderWidth: 2, borderColor: 'rgba(255,255,255,0.15)', marginBottom: 6 },
    buttonIcon: { fontSize: 22 },
    buttonLabel: { fontSize: 11, fontWeight: '500' },
    sliderRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 16, paddingHorizontal: 8 },
    sliderIcon: { fontSize: 14, width: 28, textAlign: 'center' },
    tabRow: { flexDirection: 'row', justifyContent: 'space-around', marginTop: 12, marginBottom: 8, paddingTop: 16, borderTopWidth: 1 },
    tabButton: { width: 56, height: 44, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    tabIcon: { fontSize: 18 },
    safeAreaPadding: { height: 10 },
    wheelContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', height: ITEM_HEIGHT * VISIBLE_ITEMS, marginBottom: 16 },
    timeSeparator: { fontSize: 24, fontWeight: '600', marginHorizontal: 4 },
    clearBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 20, borderWidth: 1, alignSelf: 'center', marginBottom: 16 },
    clearBtnText: { fontSize: 14, fontWeight: '500' },
});

export default SceneControlsPanel;
