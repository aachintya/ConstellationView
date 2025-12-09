/**
 * Orientation Display Component
 * Shows current compass heading and altitude
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
} from 'react-native';

import { spacing, borderRadius } from '../styles/theme';

/**
 * OrientationDisplay Component
 * 
 * @param {Object} props
 * @param {Object} props.orientation - Current orientation {azimuth, altitude}
 * @param {boolean} props.isCalibrated - Whether sensors are calibrated
 * @param {Object} props.theme - Theme colors
 */
const OrientationDisplay = ({ orientation, isCalibrated, theme }) => {
    const getCompassDirection = (azimuth) => {
        const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
        const index = Math.round(azimuth / 45) % 8;
        return directions[index];
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            {!isCalibrated && (
                <Text style={[styles.calibrating, { color: theme.accent }]}>
                    Calibrating...
                </Text>
            )}

            <View style={styles.row}>
                <View style={styles.item}>
                    <Text style={[styles.value, { color: theme.text }]}>
                        {getCompassDirection(orientation.azimuth)}
                    </Text>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        {Math.round(orientation.azimuth)}°
                    </Text>
                </View>

                <View style={[styles.divider, { backgroundColor: theme.textMuted }]} />

                <View style={styles.item}>
                    <Text style={[styles.value, { color: theme.text }]}>
                        {Math.round(orientation.altitude)}°
                    </Text>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        Alt
                    </Text>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        top: 60,
        right: spacing.md,
        borderRadius: borderRadius.md,
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        minWidth: 100,
    },
    calibrating: {
        fontSize: 10,
        textAlign: 'center',
        marginBottom: spacing.xs,
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    item: {
        alignItems: 'center',
        paddingHorizontal: spacing.sm,
    },
    value: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    label: {
        fontSize: 10,
        marginTop: 2,
    },
    divider: {
        width: 1,
        height: 30,
        opacity: 0.3,
    },
});

export default OrientationDisplay;
