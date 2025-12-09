/**
 * Custom hook for gyroscope/device orientation tracking
 * Converts device sensor data to sky viewing direction
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Platform } from 'react-native';
import {
    accelerometer,
    magnetometer,
    gyroscope,
    setUpdateIntervalForType,
    SensorTypes,
} from 'react-native-sensors';

// Default observer location (can be updated with GPS)
const DEFAULT_LOCATION = {
    latitude: 28.6139, // Delhi, India
    longitude: 77.209,
};

/**
 * Hook to get device orientation and convert to sky coordinates
 * @param {Object} options - Configuration options
 * @param {number} options.updateInterval - Sensor update interval in ms
 * @param {number} options.smoothingFactor - Smoothing factor (0-1), higher = more smoothing
 * @returns {Object} Orientation data and controls
 */
export const useGyroscope = (options = {}) => {
    const {
        updateInterval = 50,
        smoothingFactor = 0.3
    } = options;

    const [orientation, setOrientation] = useState({
        azimuth: 0,    // 0-360, 0=North
        altitude: 45,  // 0-90 (looking straight up = 90)
        roll: 0,       // Device roll
    });

    const [isCalibrated, setIsCalibrated] = useState(false);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(DEFAULT_LOCATION);

    // Refs for sensor data
    const accelRef = useRef({ x: 0, y: 0, z: 0 });
    const magnetRef = useRef({ x: 0, y: 0, z: 0 });
    const smoothedOrientation = useRef({ azimuth: 0, altitude: 45, roll: 0 });
    const subscriptions = useRef([]);

    // Apply exponential smoothing
    const smooth = useCallback((current, target, factor) => {
        return current + factor * (target - current);
    }, []);

    // Calculate orientation from accelerometer and magnetometer
    const calculateOrientation = useCallback(() => {
        const accel = accelRef.current;
        const magnet = magnetRef.current;

        // Normalize accelerometer
        const accelMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
        if (accelMag === 0) return;

        const ax = accel.x / accelMag;
        const ay = accel.y / accelMag;
        const az = accel.z / accelMag;

        // Calculate pitch (altitude) from accelerometer
        // When phone is flat, pitch = 0. When pointing up, pitch = 90
        const pitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az)) * (180 / Math.PI);

        // Calculate roll
        const roll = Math.atan2(ay, az) * (180 / Math.PI);

        // Calculate azimuth from magnetometer (compass heading)
        // Compensate for device tilt
        const cosRoll = Math.cos(roll * Math.PI / 180);
        const sinRoll = Math.sin(roll * Math.PI / 180);
        const cosPitch = Math.cos(pitch * Math.PI / 180);
        const sinPitch = Math.sin(pitch * Math.PI / 180);

        const mx = magnet.x * cosPitch + magnet.z * sinPitch;
        const my = magnet.x * sinRoll * sinPitch + magnet.y * cosRoll - magnet.z * sinRoll * cosPitch;

        let azimuth = Math.atan2(-my, mx) * (180 / Math.PI);
        azimuth = ((azimuth % 360) + 360) % 360;

        // Convert pitch to altitude (how high we're looking in the sky)
        // Phone vertical pointing at horizon = altitude 0
        // Phone horizontal facing up = altitude 90
        let altitude = 90 + pitch;
        altitude = Math.max(0, Math.min(90, altitude));

        // Apply smoothing
        smoothedOrientation.current.azimuth = smooth(
            smoothedOrientation.current.azimuth,
            azimuth,
            smoothingFactor
        );
        smoothedOrientation.current.altitude = smooth(
            smoothedOrientation.current.altitude,
            altitude,
            smoothingFactor
        );
        smoothedOrientation.current.roll = smooth(
            smoothedOrientation.current.roll,
            roll,
            smoothingFactor
        );

        setOrientation({
            azimuth: smoothedOrientation.current.azimuth,
            altitude: smoothedOrientation.current.altitude,
            roll: smoothedOrientation.current.roll,
        });
    }, [smooth, smoothingFactor]);

    // Subscribe to sensors
    useEffect(() => {
        try {
            // Set update interval
            setUpdateIntervalForType(SensorTypes.accelerometer, updateInterval);
            setUpdateIntervalForType(SensorTypes.magnetometer, updateInterval);

            // Subscribe to accelerometer
            const accelSub = accelerometer.subscribe({
                next: ({ x, y, z }) => {
                    accelRef.current = { x, y, z };
                    calculateOrientation();
                },
                error: (err) => {
                    console.error('Accelerometer error:', err);
                    setError('Accelerometer not available');
                },
            });

            // Subscribe to magnetometer
            const magnetSub = magnetometer.subscribe({
                next: ({ x, y, z }) => {
                    magnetRef.current = { x, y, z };
                    setIsCalibrated(true);
                },
                error: (err) => {
                    console.error('Magnetometer error:', err);
                    setError('Magnetometer not available');
                },
            });

            subscriptions.current = [accelSub, magnetSub];

        } catch (err) {
            console.error('Sensor initialization error:', err);
            setError('Sensors not available on this device');
        }

        return () => {
            subscriptions.current.forEach(sub => {
                if (sub && sub.unsubscribe) {
                    sub.unsubscribe();
                }
            });
        };
    }, [calculateOrientation, updateInterval]);

    // Manual calibration reset
    const recalibrate = useCallback(() => {
        smoothedOrientation.current = { azimuth: 0, altitude: 45, roll: 0 };
        setIsCalibrated(false);
        setTimeout(() => setIsCalibrated(true), 1000);
    }, []);

    // Update location
    const updateLocation = useCallback((newLocation) => {
        setLocation(newLocation);
    }, []);

    return {
        orientation,
        isCalibrated,
        error,
        location,
        recalibrate,
        updateLocation,
    };
};

export default useGyroscope;
