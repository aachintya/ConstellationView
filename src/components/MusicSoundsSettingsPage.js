/**
 * Music & Sounds Settings Page - Audio configuration
 */

import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    Switch,
    SafeAreaView,
} from 'react-native';

// Toggle Switch Row
const ToggleRow = ({ title, subtitle, value, onValueChange, accentColor }) => (
    <View style={styles.toggleRow}>
        <View style={styles.toggleTextContainer}>
            <Text style={styles.toggleTitle}>{title}</Text>
            {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
        </View>
        <Switch
            value={value}
            onValueChange={onValueChange}
            trackColor={{ false: '#3a3a3a', true: accentColor }}
            thumbColor={value ? '#fff' : '#888'}
        />
    </View>
);

const MusicSoundsSettingsPage = ({
    visible,
    onClose,
    nightMode = 'off',
    settings = {},
    onSettingsChange,
}) => {
    if (!visible) return null;

    const accentColor = '#4fc3f7';
    const backgroundColor = '#121218';

    // Local state for settings
    const [backgroundMusic, setBackgroundMusic] = useState(settings.backgroundMusic ?? true);
    const [uiSounds, setUiSounds] = useState(settings.uiSounds ?? true);
    const [beacon, setBeacon] = useState(settings.beacon ?? false);

    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Music & Sounds</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Stargazing Music */}
                <SectionHeader title="Stargazing Music" />
                <ToggleRow
                    title="Background Music"
                    subtitle="Play ambient space music while stargazing"
                    value={backgroundMusic}
                    onValueChange={setBackgroundMusic}
                    accentColor={accentColor}
                />

                {/* Sound Effects */}
                <SectionHeader title="Sound Effects" />
                <ToggleRow
                    title="User Interface Sounds"
                    subtitle="Play sounds for button taps, object selection, and view transitions"
                    value={uiSounds}
                    onValueChange={setUiSounds}
                    accentColor={accentColor}
                />
                <ToggleRow
                    title="Beacon"
                    subtitle="Helps you find selected sky objects by playing a sound that gets progressively faster as you get closer in the sky"
                    value={beacon}
                    onValueChange={setBeacon}
                    accentColor={accentColor}
                />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1001,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 48,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: {
        fontSize: 24,
        color: '#fff',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    headerSpacer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
        marginTop: 24,
        marginBottom: 12,
        textTransform: 'capitalize',
    },
    toggleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    toggleTextContainer: {
        flex: 1,
        marginRight: 16,
    },
    toggleTitle: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '500',
        marginBottom: 4,
    },
    toggleSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        lineHeight: 18,
    },
});

export default MusicSoundsSettingsPage;
