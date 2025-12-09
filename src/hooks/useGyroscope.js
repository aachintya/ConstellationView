/**
 * Ultra-Smooth Gyroscope Hook
 * Optimized for 60fps with minimal overhead
 */

import { useRef, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import {
    accelerometer,
    magnetometer,
    setUpdateIntervalForType,
    SensorTypes,
} from 'react-native-sensors';

// Default location
const DEFAULT_LOCATION = {
    latitude: 28.6139,
    longitude: 77.209,
};

// Very aggressive smoothing for buttery movement
const SMOOTHING = 0.06;

/**
 * Ultra-smooth low-pass filter
 */
const smooth = (current, target, alpha) => {
    return current + alpha * (target - current);
};

/**
 * Handle angle wrap-around
 */
const smoothAngle = (current, target, alpha) => {
    let diff = target - current;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return current + alpha * diff;
};

/**
 * Hook for smooth device orientation
 */
export const useGyroscope = (options = {}) => {
    const { updateInterval = 16, smoothingFactor = SMOOTHING } = options;

    // Use Animated.Values for native driver compatibility
    const azimuthAnim = useRef(new Animated.Value(0)).current;
    const altitudeAnim = useRef(new Animated.Value(45)).current;

    // Raw values for calculations
    const rawAzimuth = useRef(0);
    const rawAltitude = useRef(45);
    const smoothedAzimuth = useRef(0);
    const smoothedAltitude = useRef(45);

    // Sensor refs
    const accel = useRef({ x: 0, y: 0, z: -9.8 });
    const magnet = useRef({ x: 30, y: 0, z: -40 });

    // Location
    const location = useRef(DEFAULT_LOCATION);
    const isCalibrated = useRef(false);

    // Animation frame
    const frameId = useRef(null);
    const lastUpdate = useRef(Date.now());

    // Calculate orientation from sensors
    const calculateOrientation = useCallback(() => {
        const ax = accel.current.x;
        const ay = accel.current.y;
        const az = accel.current.z;
        const mx = magnet.current.x;
        const my = magnet.current.y;
        const mz = magnet.current.z;

        const accelMag = Math.sqrt(ax * ax + ay * ay + az * az);
        if (accelMag < 0.1) return;

        const nax = ax / accelMag;
        const nay = ay / accelMag;
        const naz = az / accelMag;

        // Calculate pitch and roll
        const pitch = Math.atan2(-nax, Math.sqrt(nay * nay + naz * naz));
        const roll = Math.atan2(nay, naz);

        // Tilt-compensated heading
        const cp = Math.cos(pitch);
        const sp = Math.sin(pitch);
        const cr = Math.cos(roll);
        const sr = Math.sin(roll);

        const Mx = mx * cp + mz * sp;
        const My = mx * sr * sp + my * cr - mz * sr * cp;

        let azimuth = Math.atan2(-My, Mx) * (180 / Math.PI);
        azimuth = ((azimuth % 360) + 360) % 360;

        let altitude = 90 + pitch * (180 / Math.PI);

        rawAzimuth.current = azimuth;
        rawAltitude.current = altitude;
    }, []);

    // Smooth animation loop - runs every frame
    const animate = useCallback(() => {
        const now = Date.now();
        const dt = Math.min((now - lastUpdate.current) / 16.67, 2); // Normalize to 60fps
        lastUpdate.current = now;

        const alpha = smoothingFactor * dt;

        // Smooth the values
        smoothedAzimuth.current = smoothAngle(smoothedAzimuth.current, rawAzimuth.current, alpha);
        smoothedAltitude.current = smooth(smoothedAltitude.current, rawAltitude.current, alpha);

        // Update Animated values (no re-render)
        azimuthAnim.setValue(smoothedAzimuth.current);
        altitudeAnim.setValue(Math.max(-90, Math.min(180, smoothedAltitude.current)));

        frameId.current = requestAnimationFrame(animate);
    }, [smoothingFactor, azimuthAnim, altitudeAnim]);

    // Subscribe to sensors
    useEffect(() => {
        setUpdateIntervalForType(SensorTypes.accelerometer, updateInterval);
        setUpdateIntervalForType(SensorTypes.magnetometer, updateInterval);

        const accelSub = accelerometer.subscribe({
            next: ({ x, y, z }) => {
                // Aggressive smoothing on raw data
                accel.current.x = smooth(accel.current.x, x, 0.4);
                accel.current.y = smooth(accel.current.y, y, 0.4);
                accel.current.z = smooth(accel.current.z, z, 0.4);
                calculateOrientation();
            },
            error: (e) => console.warn('Accel error:', e),
        });

        const magnetSub = magnetometer.subscribe({
            next: ({ x, y, z }) => {
                magnet.current.x = smooth(magnet.current.x, x, 0.15);
                magnet.current.y = smooth(magnet.current.y, y, 0.15);
                magnet.current.z = smooth(magnet.current.z, z, 0.15);
                isCalibrated.current = true;
            },
            error: (e) => console.warn('Magnet error:', e),
        });

        // Start animation loop
        frameId.current = requestAnimationFrame(animate);

        return () => {
            accelSub?.unsubscribe();
            magnetSub?.unsubscribe();
            if (frameId.current) cancelAnimationFrame(frameId.current);
        };
    }, [updateInterval, calculateOrientation, animate]);

    // Return getters instead of state to avoid re-renders
    const getOrientation = useCallback(() => ({
        azimuth: smoothedAzimuth.current,
        altitude: smoothedAltitude.current,
        roll: 0,
    }), []);

    const getLocation = useCallback(() => location.current, []);

    const updateLocation = useCallback((newLoc) => {
        location.current = newLoc;
    }, []);

    return {
        // Animated values for native animations
        azimuthAnim,
        altitudeAnim,
        // Getters for imperative access (no re-renders)
        getOrientation,
        getLocation,
        updateLocation,
        isCalibrated: isCalibrated.current,
        location: location.current,
        // For compatibility - these won't update component
        orientation: {
            get azimuth() { return smoothedAzimuth.current; },
            get altitude() { return smoothedAltitude.current; },
            get roll() { return 0; },
        },
    };
};

export default useGyroscope;
