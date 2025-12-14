/**
 * Location Settings Page - Location configuration for star viewing
 */

import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    SafeAreaView,
    PermissionsAndroid,
    Platform,
} from 'react-native';

const LocationSettingsPage = ({
    visible,
    onClose,
    nightMode = 'off',
    currentLocation = { latitude: 28.6139, longitude: 77.209 },
    onLocationChange,
}) => {
    if (!visible) return null;

    const [locationMode, setLocationMode] = useState('auto'); // 'auto' or 'city'
    const [cityName, setCityName] = useState('New Delhi, India (IN)');
    const [coordinates, setCoordinates] = useState({
        lat: currentLocation.latitude,
        lon: currentLocation.longitude,
    });
    const [magneticDeclination, setMagneticDeclination] = useState('0.09° W');

    const accentColor = '#4fc3f7';
    const backgroundColor = '#121218';

    // Format coordinates to DMS format
    const formatDMS = (decimal, isLat) => {
        const absolute = Math.abs(decimal);
        const degrees = Math.floor(absolute);
        const minutesFloat = (absolute - degrees) * 60;
        const minutes = Math.floor(minutesFloat);
        const seconds = ((minutesFloat - minutes) * 60).toFixed(2);
        const direction = isLat
            ? (decimal >= 0 ? 'N' : 'S')
            : (decimal >= 0 ? 'E' : 'W');
        return `${degrees}° ${minutes}' ${seconds}" ${direction}`;
    };

    const handleSetLocationAutomatically = async () => {
        // In a real app, this would request location permissions and get GPS coordinates
        setLocationMode('auto');
        // Simulate getting current location
        setCoordinates({
            lat: currentLocation.latitude,
            lon: currentLocation.longitude,
        });
    };

    const handleChooseNearestCity = () => {
        setLocationMode('city');
        // In a real app, this would open a city picker
    };

    return (
        <View style={[styles.container, { backgroundColor }]}>
            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Location</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <View style={styles.content}>
                {/* Location Icon */}
                <View style={styles.locationIconContainer}>
                    <Text style={styles.locationIcon}>📍</Text>
                </View>

                {/* City Name */}
                <Text style={styles.cityName}>{cityName}</Text>

                {/* Coordinates */}
                <Text style={styles.coordinates}>
                    {formatDMS(coordinates.lat, true)}, {formatDMS(coordinates.lon, false)}
                </Text>

                {/* Magnetic Declination */}
                <Text style={styles.declination}>
                    Magnetic Declination: {magneticDeclination}
                </Text>

                {/* Description */}
                <Text style={styles.description}>
                    Your location determines which stars, satellites, and celestial objects are visible in the sky. Using your current location provides the most accurate view.
                </Text>

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Set Location Automatically Button */}
                <TouchableOpacity
                    style={[styles.autoButton, { borderColor: accentColor }]}
                    onPress={handleSetLocationAutomatically}
                >
                    <Text style={[styles.autoButtonText, { color: accentColor }]}>
                        Set Location Automatically
                    </Text>
                </TouchableOpacity>

                {/* Choose Nearest City Option */}
                <TouchableOpacity
                    style={styles.cityOption}
                    onPress={handleChooseNearestCity}
                >
                    <Text style={[styles.checkmark, { color: locationMode === 'city' ? accentColor : 'transparent' }]}>
                        ✓
                    </Text>
                    <Text style={[styles.cityOptionText, { color: accentColor }]}>
                        Choose Nearest City
                    </Text>
                </TouchableOpacity>
            </View>
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
    content: {
        flex: 1,
        paddingHorizontal: 24,
        paddingTop: 24,
    },
    locationIconContainer: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#2a2a2e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    locationIcon: {
        fontSize: 28,
    },
    cityName: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 8,
    },
    coordinates: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.7)',
        marginBottom: 8,
    },
    declination: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.5)',
        marginBottom: 32,
    },
    description: {
        fontSize: 15,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 24,
    },
    spacer: {
        flex: 1,
    },
    autoButton: {
        borderWidth: 1.5,
        borderRadius: 25,
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        marginBottom: 20,
    },
    autoButtonText: {
        fontSize: 16,
        fontWeight: '500',
    },
    cityOption: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        marginBottom: 40,
    },
    checkmark: {
        fontSize: 18,
        marginRight: 8,
    },
    cityOptionText: {
        fontSize: 16,
        fontWeight: '500',
    },
});

export default LocationSettingsPage;
