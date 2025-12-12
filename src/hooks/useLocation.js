/**
 * GPS Location Hook
 * Gets user's real location for accurate star positions
 */

import { useState, useEffect, useCallback } from 'react';
import { Platform, PermissionsAndroid, Alert } from 'react-native';
import Geolocation from '@react-native-community/geolocation';

// Default location (Delhi, India)
const DEFAULT_LOCATION = {
    latitude: 28.6139,
    longitude: 77.209,
};

/**
 * Request location permission on Android
 */
const requestLocationPermission = async () => {
    if (Platform.OS === 'android') {
        try {
            const granted = await PermissionsAndroid.request(
                PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION,
                {
                    title: 'Location Permission',
                    message: 'SkyView needs access to your location to show accurate star positions for your location.',
                    buttonNeutral: 'Ask Me Later',
                    buttonNegative: 'Cancel',
                    buttonPositive: 'OK',
                },
            );
            return granted === PermissionsAndroid.RESULTS.GRANTED;
        } catch (err) {
            console.warn('Location permission error:', err);
            return false;
        }
    }
    return true; // iOS handles permissions via Info.plist
};

/**
 * Hook to get user's GPS location
 */
export const useLocation = () => {
    const [location, setLocation] = useState(DEFAULT_LOCATION);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [hasPermission, setHasPermission] = useState(false);

    // Get current position
    const getCurrentPosition = useCallback(() => {
        Geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setLocation({ latitude, longitude });
                setLoading(false);
                setError(null);
                console.log(`GPS Location: ${latitude.toFixed(4)}°, ${longitude.toFixed(4)}°`);
            },
            (err) => {
                console.warn('Geolocation error:', err);
                setError(err.message);
                setLoading(false);
                // Keep using default location
            },
            {
                enableHighAccuracy: true,
                timeout: 15000,
                maximumAge: 60000, // Cache for 1 minute
            }
        );
    }, []);

    // Initialize on mount
    useEffect(() => {
        const initLocation = async () => {
            const granted = await requestLocationPermission();
            setHasPermission(granted);

            if (granted) {
                getCurrentPosition();

                // Watch for location changes (for moving users)
                const watchId = Geolocation.watchPosition(
                    (position) => {
                        const { latitude, longitude } = position.coords;
                        setLocation({ latitude, longitude });
                    },
                    (err) => console.warn('Watch position error:', err),
                    {
                        enableHighAccuracy: false,
                        distanceFilter: 1000, // Update every 1km movement
                    }
                );

                return () => {
                    Geolocation.clearWatch(watchId);
                };
            } else {
                setLoading(false);
                console.log('Location permission denied, using default location');
            }
        };

        initLocation();
    }, [getCurrentPosition]);

    // Manual refresh
    const refreshLocation = useCallback(() => {
        if (hasPermission) {
            setLoading(true);
            getCurrentPosition();
        }
    }, [hasPermission, getCurrentPosition]);

    return {
        location,
        loading,
        error,
        hasPermission,
        refreshLocation,
    };
};

export default useLocation;
