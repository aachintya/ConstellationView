/**
 * Settings Panel - Location management with city selection and manual coordinates
 * Premium dark UI with glassmorphism
 */

import React, { useState, useRef, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    Animated,
    Dimensions,
} from 'react-native';

import { getNightModeColors } from './shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PANEL_HEIGHT = 520;

// Major Indian cities with coordinates
const INDIAN_CITIES = [
    { name: 'Delhi', lat: 28.6139, lon: 77.2090 },
    { name: 'Mumbai', lat: 19.0760, lon: 72.8777 },
    { name: 'Bangalore', lat: 12.9716, lon: 77.5946 },
    { name: 'Chennai', lat: 13.0827, lon: 80.2707 },
    { name: 'Kolkata', lat: 22.5726, lon: 88.3639 },
    { name: 'Hyderabad', lat: 17.3850, lon: 78.4867 },
    { name: 'Pune', lat: 18.5204, lon: 73.8567 },
    { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
    { name: 'Jaipur', lat: 26.9124, lon: 75.7873 },
    { name: 'Lucknow', lat: 26.8467, lon: 80.9462 },
    { name: 'Chandigarh', lat: 30.7333, lon: 76.7794 },
    { name: 'Goa', lat: 15.2993, lon: 74.1240 },
    { name: 'Varanasi', lat: 25.3176, lon: 82.9739 },
    { name: 'Shimla', lat: 31.1048, lon: 77.1734 },
    { name: 'Darjeeling', lat: 27.0410, lon: 88.2663 },
];

const SettingsPanel = ({
    visible,
    onClose,
    nightMode = 'off',
    currentLocation,
    onLocationChange,
    onUseGPS,
}) => {
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;
    const backdropOpacity = useRef(new Animated.Value(0)).current;

    const [manualLat, setManualLat] = useState('');
    const [manualLon, setManualLon] = useState('');
    const [selectedCity, setSelectedCity] = useState(null);

    const colors = useMemo(() => getNightModeColors(nightMode), [nightMode]);

    React.useEffect(() => {
        if (visible) {
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

    const closePanel = () => {
        Animated.parallel([
            Animated.timing(slideAnim, { toValue: PANEL_HEIGHT, duration: 300, useNativeDriver: true }),
            Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
        ]).start(() => onClose());
    };

    const handleCitySelect = (city) => {
        setSelectedCity(city.name);
        setManualLat(city.lat.toFixed(4));
        setManualLon(city.lon.toFixed(4));
        onLocationChange?.(city.lat, city.lon);
    };

    const handleManualApply = () => {
        const lat = parseFloat(manualLat);
        const lon = parseFloat(manualLon);
        if (!isNaN(lat) && !isNaN(lon) && lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
            setSelectedCity(null);
            onLocationChange?.(lat, lon);
        }
    };

    const handleUseGPS = () => {
        setSelectedCity('GPS');
        onUseGPS?.();
    };

    if (!visible) return null;

    return (
        <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]} pointerEvents={visible ? 'auto' : 'none'}>
                <TouchableOpacity style={StyleSheet.absoluteFill} onPress={closePanel} activeOpacity={1} />
            </Animated.View>

            <Animated.View style={[styles.panel, { backgroundColor: colors.background, transform: [{ translateY: slideAnim }] }]}>
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={closePanel} style={styles.backButton}>
                        <Text style={[styles.backIcon, { color: colors.text }]}>←</Text>
                    </TouchableOpacity>
                    <Text style={[styles.title, { color: colors.text }]}>Settings</Text>
                    <View style={styles.placeholder} />
                </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                    {/* Current Location Card */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textDim }]}>CURRENT LOCATION</Text>
                        <Text style={[styles.locationText, { color: colors.text }]}>
                            📍 {currentLocation?.latitude?.toFixed(4) || '—'}°, {currentLocation?.longitude?.toFixed(4) || '—'}°
                        </Text>
                    </View>

                    {/* GPS Button */}
                    <TouchableOpacity
                        style={[styles.gpsButton, { backgroundColor: colors.primary + '22', borderColor: colors.primary }]}
                        onPress={handleUseGPS}
                        activeOpacity={0.7}
                    >
                        <Text style={[styles.gpsButtonText, { color: colors.primary }]}>📡 Use GPS Location</Text>
                    </TouchableOpacity>

                    {/* City Selection */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textDim }]}>SELECT CITY (INDIA)</Text>
                        <View style={styles.cityGrid}>
                            {INDIAN_CITIES.map((city) => (
                                <TouchableOpacity
                                    key={city.name}
                                    style={[
                                        styles.cityChip,
                                        {
                                            backgroundColor: selectedCity === city.name ? colors.primary + '33' : 'transparent',
                                            borderColor: selectedCity === city.name ? colors.primary : colors.border
                                        }
                                    ]}
                                    onPress={() => handleCitySelect(city)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={[
                                        styles.cityName,
                                        { color: selectedCity === city.name ? colors.primary : colors.text }
                                    ]}>
                                        {city.name}
                                    </Text>
                                </TouchableOpacity>
                            ))}
                        </View>
                    </View>

                    {/* Manual Coordinates */}
                    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border }]}>
                        <Text style={[styles.cardTitle, { color: colors.textDim }]}>MANUAL COORDINATES</Text>
                        <View style={styles.inputRow}>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textDim }]}>Latitude</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={manualLat}
                                    onChangeText={setManualLat}
                                    placeholder="-90 to 90"
                                    placeholderTextColor={colors.textDim}
                                    keyboardType="numeric"
                                />
                            </View>
                            <View style={styles.inputGroup}>
                                <Text style={[styles.inputLabel, { color: colors.textDim }]}>Longitude</Text>
                                <TextInput
                                    style={[styles.input, { color: colors.text, borderColor: colors.border, backgroundColor: colors.background }]}
                                    value={manualLon}
                                    onChangeText={setManualLon}
                                    placeholder="-180 to 180"
                                    placeholderTextColor={colors.textDim}
                                    keyboardType="numeric"
                                />
                            </View>
                        </View>
                        <TouchableOpacity
                            style={[styles.applyButton, { backgroundColor: colors.primary }]}
                            onPress={handleManualApply}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.applyButtonText}>Apply</Text>
                        </TouchableOpacity>
                    </View>

                    <View style={{ height: 40 }} />
                </ScrollView>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0, 0, 0, 0.7)'
    },
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: PANEL_HEIGHT,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backIcon: {
        fontSize: 24,
        fontWeight: '300',
    },
    title: {
        fontSize: 18,
        fontWeight: '600',
    },
    placeholder: {
        width: 40,
    },
    content: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },
    card: {
        borderRadius: 16,
        padding: 16,
        marginBottom: 16,
        borderWidth: 1,
    },
    cardTitle: {
        fontSize: 11,
        fontWeight: '600',
        letterSpacing: 1.5,
        marginBottom: 12,
    },
    locationText: {
        fontSize: 16,
        fontWeight: '500',
    },
    gpsButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 14,
        borderRadius: 12,
        borderWidth: 1,
        marginBottom: 16,
    },
    gpsButtonText: {
        fontSize: 15,
        fontWeight: '600',
    },
    cityGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
    },
    cityChip: {
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        borderWidth: 1,
    },
    cityName: {
        fontSize: 13,
        fontWeight: '500',
    },
    inputRow: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 12,
    },
    inputGroup: {
        flex: 1,
    },
    inputLabel: {
        fontSize: 11,
        fontWeight: '500',
        marginBottom: 6,
    },
    input: {
        height: 44,
        borderRadius: 10,
        borderWidth: 1,
        paddingHorizontal: 12,
        fontSize: 15,
    },
    applyButton: {
        paddingVertical: 12,
        borderRadius: 10,
        alignItems: 'center',
    },
    applyButtonText: {
        color: '#fff',
        fontSize: 15,
        fontWeight: '600',
    },
});

export default SettingsPanel;
