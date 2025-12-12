/**
 * Custom Slider - Reusable slider component
 * Touch-responsive horizontal slider with customizable colors
 */

import React, { useEffect, useRef, useState } from 'react';
import { View, StyleSheet, PanResponder } from 'react-native';

const CustomSlider = ({ value = 0.5, onValueChange, trackColor = '#4fc3f7' }) => {
    const sliderWidth = useRef(0);
    const [localValue, setLocalValue] = useState(value);

    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: () => true,
            onPanResponderGrant: (evt) => {
                const newValue = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidth.current));
                setLocalValue(newValue);
                onValueChange?.(newValue);
            },
            onPanResponderMove: (evt) => {
                const newValue = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderWidth.current));
                setLocalValue(newValue);
                onValueChange?.(newValue);
            },
        })
    ).current;

    useEffect(() => {
        setLocalValue(value);
    }, [value]);

    return (
        <View
            style={styles.container}
            onLayout={(e) => { sliderWidth.current = e.nativeEvent.layout.width; }}
            {...panResponder.panHandlers}
        >
            <View style={styles.track}>
                <View style={[styles.fill, { width: `${localValue * 100}%`, backgroundColor: trackColor }]} />
            </View>
            <View style={[styles.thumb, { left: `${localValue * 100}%` }]} />
        </View>
    );
};

const styles = StyleSheet.create({
    container: { height: 40, justifyContent: 'center', flex: 1, marginHorizontal: 8 },
    track: { height: 3, borderRadius: 1.5, backgroundColor: 'rgba(255,255,255,0.15)' },
    fill: { height: 3, borderRadius: 1.5 },
    thumb: { position: 'absolute', width: 18, height: 18, borderRadius: 9, backgroundColor: '#fff', marginLeft: -9, top: 11, elevation: 3 },
});

export default CustomSlider;
