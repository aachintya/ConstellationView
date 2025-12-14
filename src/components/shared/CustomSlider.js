/**
 * Custom Slider - Reusable slider component
 * Smooth touch-responsive horizontal slider
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, PanResponder, Animated } from 'react-native';

const CustomSlider = ({ value = 0.5, onValueChange, trackColor = '#4fc3f7' }) => {
    const sliderWidth = useRef(200);
    const animatedValue = useRef(new Animated.Value(value)).current;
    const currentValue = useRef(value);
    const isPressed = useRef(false);

    // Store callback in ref to avoid stale closures in panResponder
    const onValueChangeRef = useRef(onValueChange);
    onValueChangeRef.current = onValueChange;

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                isPressed.current = true;
                const newValue = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidth.current));
                currentValue.current = newValue;
                animatedValue.setValue(newValue);
                onValueChangeRef.current?.(newValue);
            },
            onPanResponderMove: (evt) => {
                const newValue = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidth.current));
                currentValue.current = newValue;
                animatedValue.setValue(newValue);
                onValueChangeRef.current?.(newValue);
            },
            onPanResponderRelease: () => {
                isPressed.current = false;
                onValueChangeRef.current?.(currentValue.current);
            },
            onPanResponderTerminate: () => {
                isPressed.current = false;
            },
        })
    ).current;

    // Sync with external value changes (only when not being dragged)
    useEffect(() => {
        if (!isPressed.current) {
            animatedValue.setValue(value);
            currentValue.current = value;
        }
    }, [value, animatedValue]);

    // Interpolate animated value to percentage for styling
    const fillWidth = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    const thumbPosition = animatedValue.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
    });

    return (
        <View
            style={styles.container}
            onLayout={(e) => { sliderWidth.current = e.nativeEvent.layout.width; }}
            {...panResponder.panHandlers}
        >
            <View style={styles.track}>
                <Animated.View style={[styles.fill, { width: fillWidth, backgroundColor: trackColor }]} />
            </View>
            <Animated.View style={[styles.thumb, { left: thumbPosition }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { height: 44, justifyContent: 'center', flex: 1, marginHorizontal: 8 },
    track: { height: 4, borderRadius: 2, backgroundColor: 'rgba(255,255,255,0.15)', overflow: 'hidden' },
    fill: { height: 4, borderRadius: 2 },
    thumb: {
        position: 'absolute',
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#fff',
        marginLeft: -11,
        top: 11,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 4,
    },
});

export default CustomSlider;
