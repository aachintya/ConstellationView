/**
 * Control Panel Component
 * Toggle buttons for constellation lines, labels, night mode, etc.
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
} from 'react-native';

import { spacing, borderRadius } from '../styles/theme';

/**
 * ControlPanel Component
 * 
 * @param {Object} props
 * @param {boolean} props.showConstellations - Whether constellation lines are shown
 * @param {Function} props.onToggleConstellations - Toggle constellation lines
 * @param {boolean} props.showLabels - Whether labels are shown
 * @param {Function} props.onToggleLabels - Toggle labels
 * @param {boolean} props.isNightMode - Whether night mode is active
 * @param {Function} props.onToggleNightMode - Toggle night mode
 * @param {Object} props.theme - Theme colors
 */
const ControlPanel = ({
    showConstellations,
    onToggleConstellations,
    showLabels,
    onToggleLabels,
    isNightMode,
    onToggleNightMode,
    theme,
}) => {
    const ToggleButton = ({ active, onPress, icon, label }) => (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: active ? theme.accent : theme.surface },
            ]}
            onPress={onPress}
        >
            <Text style={[styles.buttonIcon, { color: active ? '#FFF' : theme.text }]}>
                {icon}
            </Text>
            <Text style={[styles.buttonLabel, { color: active ? '#FFF' : theme.textSecondary }]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <ToggleButton
                active={showConstellations}
                onPress={onToggleConstellations}
                icon="✧"
                label="Lines"
            />
            <ToggleButton
                active={showLabels}
                onPress={onToggleLabels}
                icon="Aa"
                label="Labels"
            />
            <ToggleButton
                active={isNightMode}
                onPress={onToggleNightMode}
                icon="🌙"
                label="Night"
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: spacing.xl,
        right: spacing.md,
        flexDirection: 'column',
        gap: spacing.sm,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.full,
        minWidth: 90,
    },
    buttonIcon: {
        fontSize: 16,
        marginRight: spacing.sm,
    },
    buttonLabel: {
        fontSize: 12,
        fontWeight: '600',
    },
});

export default ControlPanel;
