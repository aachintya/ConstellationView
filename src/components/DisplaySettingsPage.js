/**
 * Display Settings Page - Comprehensive display configuration
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

// Reusable Toggle Switch Row
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

// Reusable Segment Control
const SegmentControl = ({ options, selectedIndex, onSelect }) => (
    <View style={styles.segmentContainer}>
        {options.map((option, index) => (
            <TouchableOpacity
                key={option}
                style={[
                    styles.segmentButton,
                    selectedIndex === index && styles.segmentButtonActive,
                ]}
                onPress={() => onSelect(index)}
            >
                <Text style={[
                    styles.segmentText,
                    selectedIndex === index && styles.segmentTextActive,
                ]}>
                    {option}
                </Text>
            </TouchableOpacity>
        ))}
    </View>
);

// Slider Component
const SettingsSlider = ({ value, onValueChange }) => {
    const [localValue, setLocalValue] = React.useState(value);
    const sliderRef = React.useRef(null);

    const handleLayout = (e) => {
        sliderRef.current = e.nativeEvent.layout.width;
    };

    const handleTouch = (evt) => {
        if (sliderRef.current) {
            const newValue = Math.max(0, Math.min(1, evt.nativeEvent.locationX / sliderRef.current));
            setLocalValue(newValue);
            onValueChange?.(newValue);
        }
    };

    return (
        <View
            style={styles.sliderContainer}
            onLayout={handleLayout}
            onStartShouldSetResponder={() => true}
            onMoveShouldSetResponder={() => true}
            onResponderGrant={handleTouch}
            onResponderMove={handleTouch}
        >
            <View style={styles.sliderTrack}>
                <View style={[styles.sliderFill, { width: `${localValue * 100}%` }]} />
            </View>
            <View style={[styles.sliderThumb, { left: `${localValue * 100}%` }]} />
        </View>
    );
};

const DisplaySettingsPage = ({
    visible,
    onClose,
    nightMode = 'off',
    // Display settings props
    settings = {},
    onSettingsChange,
}) => {
    if (!visible) return null;

    const accentColor = '#4fc3f7';
    const backgroundColor = '#121218';

    // Local state for all settings (with defaults)
    const [arCamera, setArCamera] = useState(settings.arCamera ?? false);
    const [keepScreenOn, setKeepScreenOn] = useState(settings.keepScreenOn ?? true);
    const [constellationArt, setConstellationArt] = useState(settings.constellationArt ?? true);
    const [constellationLines, setConstellationLines] = useState(settings.constellationLines ?? true);
    const [satellites, setSatellites] = useState(settings.satellites ?? true);
    const [objectTrajectories, setObjectTrajectories] = useState(settings.objectTrajectories ?? true);
    const [starMagnitude, setStarMagnitude] = useState(settings.starMagnitude ?? 0.5);
    const [planetSize, setPlanetSize] = useState(settings.planetSize ?? 0.5);
    const [coordinateDisplay, setCoordinateDisplay] = useState(settings.coordinateDisplay ?? 0);
    const [horizonLine, setHorizonLine] = useState(settings.horizonLine ?? true);
    const [compass, setCompass] = useState(settings.compass ?? true);
    const [nightModeIndex, setNightModeIndex] = useState(
        nightMode === 'red' ? 1 : nightMode === 'green' ? 2 : 0
    );
    const [accessoryMode, setAccessoryMode] = useState(settings.accessoryMode ?? 0);

    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    const SliderRow = ({ title, subtitle, value, onValueChange }) => (
        <View style={styles.sliderRow}>
            <Text style={styles.toggleTitle}>{title}</Text>
            {subtitle && <Text style={styles.toggleSubtitle}>{subtitle}</Text>}
            <SettingsSlider value={value} onValueChange={onValueChange} />
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Display</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Augmented Reality */}
                <SectionHeader title="Augmented Reality" />
                <ToggleRow
                    title="AR Camera"
                    subtitle="Disabling will turn off the background camera view, showing only a black background and Milky Way"
                    value={arCamera}
                    onValueChange={setArCamera}
                    accentColor={accentColor}
                />

                {/* Device Settings */}
                <SectionHeader title="Device Settings" />
                <ToggleRow
                    title="Keep Screen On"
                    subtitle="Prevent the screen from turning off while using SkyView"
                    value={keepScreenOn}
                    onValueChange={setKeepScreenOn}
                    accentColor={accentColor}
                />

                {/* Sky Objects */}
                <SectionHeader title="Sky Objects" />
                <ToggleRow
                    title="Constellation Art"
                    subtitle="Show artistic representations of constellations"
                    value={constellationArt}
                    onValueChange={setConstellationArt}
                    accentColor={accentColor}
                />
                <ToggleRow
                    title="Constellation Lines"
                    subtitle="Show lines connecting constellation stars"
                    value={constellationLines}
                    onValueChange={setConstellationLines}
                    accentColor={accentColor}
                />
                <ToggleRow
                    title="Satellites"
                    subtitle="Show artificial satellites in orbit"
                    value={satellites}
                    onValueChange={setSatellites}
                    accentColor={accentColor}
                />
                <ToggleRow
                    title="Object Trajectories"
                    subtitle="Show movement paths for celestial objects"
                    value={objectTrajectories}
                    onValueChange={setObjectTrajectories}
                    accentColor={accentColor}
                />

                {/* Star and Planet Display */}
                <SectionHeader title="Star and Planet Display" />
                <SliderRow
                    title="Visible Star Magnitude"
                    subtitle="Adjust the faintest stars visible in the sky"
                    value={starMagnitude}
                    onValueChange={setStarMagnitude}
                />
                <SliderRow
                    title="Planet Size"
                    subtitle="Adjust the size of planets in the sky view"
                    value={planetSize}
                    onValueChange={setPlanetSize}
                />

                {/* Heads Up Display */}
                <SectionHeader title="Heads Up Display" />
                <View style={styles.settingBlock}>
                    <Text style={styles.toggleTitle}>Coordinate Display</Text>
                    <Text style={styles.toggleSubtitle}>Show astronomical coordinates on screen</Text>
                    <SegmentControl
                        options={['None', 'RA / Dec', 'Az / El']}
                        selectedIndex={coordinateDisplay}
                        onSelect={setCoordinateDisplay}
                    />
                </View>
                <ToggleRow
                    title="Horizon Line"
                    subtitle="Show the horizon line in the sky view"
                    value={horizonLine}
                    onValueChange={setHorizonLine}
                    accentColor={accentColor}
                />
                <ToggleRow
                    title="Compass"
                    subtitle="Show compass directions on screen"
                    value={compass}
                    onValueChange={setCompass}
                    accentColor={accentColor}
                />

                {/* Night Mode */}
                <SectionHeader title="Night Mode" />
                <View style={styles.settingBlock}>
                    <Text style={styles.toggleTitle}>Night Mode</Text>
                    <Text style={styles.toggleSubtitle}>Preserve night vision with colored filters</Text>
                    <SegmentControl
                        options={['Off', 'Red', 'Green']}
                        selectedIndex={nightModeIndex}
                        onSelect={setNightModeIndex}
                    />
                </View>

                {/* Accessories */}
                <SectionHeader title="Accessories" />
                <View style={styles.settingBlock}>
                    <Text style={styles.toggleTitle}>Accessory Mode</Text>
                    <Text style={styles.toggleSubtitle}>
                        Configure display for telescope or binocular cradles. Telescope mode shifts view 90° up to align with eyepiece. Binoculars mode locks landscape orientation. Also compatible with legacy Space Navigator accessories.
                    </Text>
                    <SegmentControl
                        options={['None', 'Binocul...', 'Telescope']}
                        selectedIndex={accessoryMode}
                        onSelect={setAccessoryMode}
                    />
                </View>

                <View style={styles.bottomSpacer} />
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
    settingBlock: {
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    segmentContainer: {
        flexDirection: 'row',
        backgroundColor: '#2a2a2e',
        borderRadius: 8,
        marginTop: 12,
        padding: 2,
    },
    segmentButton: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        borderRadius: 6,
        alignItems: 'center',
    },
    segmentButtonActive: {
        backgroundColor: '#4a4a4e',
    },
    segmentText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.6)',
        fontWeight: '500',
    },
    segmentTextActive: {
        color: '#fff',
    },
    sliderRow: {
        paddingVertical: 16,
        borderBottomWidth: 0.5,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    sliderContainer: {
        height: 40,
        justifyContent: 'center',
        marginTop: 8,
    },
    sliderTrack: {
        height: 3,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 1.5,
        overflow: 'hidden',
    },
    sliderFill: {
        height: 3,
        backgroundColor: '#4fc3f7',
        borderRadius: 1.5,
    },
    sliderThumb: {
        position: 'absolute',
        width: 18,
        height: 18,
        borderRadius: 9,
        backgroundColor: '#fff',
        marginLeft: -9,
        top: 11,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3,
    },
    bottomSpacer: {
        height: 40,
    },
});

export default DisplaySettingsPage;
