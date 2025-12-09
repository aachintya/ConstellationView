/**
 * Advanced Sensor Smoothing Hook
 * Implements Complementary Filter + SLERP for Stellarium-level smoothness
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

// Complementary filter coefficient (0.98 = 98% gyro, 2% accel)
const ALPHA = 0.98;

// Low-pass filter cutoff (lower = smoother, slower response)
const LOW_PASS_ALPHA = 0.15;

// SLERP interpolation factor (lower = smoother rotation)
const SLERP_FACTOR = 0.12;

/**
 * Quaternion utilities for SLERP interpolation
 */
const Quaternion = {
    fromEuler: (roll, pitch, yaw) => {
        const cy = Math.cos(yaw * 0.5);
        const sy = Math.sin(yaw * 0.5);
        const cp = Math.cos(pitch * 0.5);
        const sp = Math.sin(pitch * 0.5);
        const cr = Math.cos(roll * 0.5);
        const sr = Math.sin(roll * 0.5);

        return {
            w: cr * cp * cy + sr * sp * sy,
            x: sr * cp * cy - cr * sp * sy,
            y: cr * sp * cy + sr * cp * sy,
            z: cr * cp * sy - sr * sp * cy,
        };
    },

    toEuler: (q) => {
        // Roll (x-axis rotation)
        const sinr_cosp = 2 * (q.w * q.x + q.y * q.z);
        const cosr_cosp = 1 - 2 * (q.x * q.x + q.y * q.y);
        const roll = Math.atan2(sinr_cosp, cosr_cosp);

        // Pitch (y-axis rotation)
        const sinp = 2 * (q.w * q.y - q.z * q.x);
        let pitch;
        if (Math.abs(sinp) >= 1) {
            pitch = Math.sign(sinp) * Math.PI / 2;
        } else {
            pitch = Math.asin(sinp);
        }

        // Yaw (z-axis rotation)
        const siny_cosp = 2 * (q.w * q.z + q.x * q.y);
        const cosy_cosp = 1 - 2 * (q.y * q.y + q.z * q.z);
        const yaw = Math.atan2(siny_cosp, cosy_cosp);

        return { roll, pitch, yaw };
    },

    slerp: (qa, qb, t) => {
        // Quaternion dot product
        let dot = qa.w * qb.w + qa.x * qb.x + qa.y * qb.y + qa.z * qb.z;

        // If dot is negative, negate one quaternion to take shorter path
        if (dot < 0) {
            qb = { w: -qb.w, x: -qb.x, y: -qb.y, z: -qb.z };
            dot = -dot;
        }

        // If quaternions are very close, use linear interpolation
        if (dot > 0.9995) {
            return {
                w: qa.w + t * (qb.w - qa.w),
                x: qa.x + t * (qb.x - qa.x),
                y: qa.y + t * (qb.y - qa.y),
                z: qa.z + t * (qb.z - qa.z),
            };
        }

        // SLERP formula
        const theta_0 = Math.acos(dot);
        const theta = theta_0 * t;
        const sin_theta = Math.sin(theta);
        const sin_theta_0 = Math.sin(theta_0);

        const s0 = Math.cos(theta) - dot * sin_theta / sin_theta_0;
        const s1 = sin_theta / sin_theta_0;

        return {
            w: s0 * qa.w + s1 * qb.w,
            x: s0 * qa.x + s1 * qb.x,
            y: s0 * qa.y + s1 * qb.y,
            z: s0 * qa.z + s1 * qb.z,
        };
    },

    normalize: (q) => {
        const len = Math.sqrt(q.w * q.w + q.x * q.x + q.y * q.y + q.z * q.z);
        if (len === 0) return { w: 1, x: 0, y: 0, z: 0 };
        return { w: q.w / len, x: q.x / len, y: q.y / len, z: q.z / len };
    },
};

/**
 * Hook to get device orientation with Stellarium-level smoothness
 */
export const useGyroscope = (options = {}) => {
    const {
        updateInterval = 16,  // ~60fps
        smoothingFactor = SLERP_FACTOR,
    } = options;

    const [orientation, setOrientation] = useState({
        azimuth: 0,
        altitude: 45,
        roll: 0,
    });

    const [isCalibrated, setIsCalibrated] = useState(false);
    const [error, setError] = useState(null);
    const [location, setLocation] = useState(DEFAULT_LOCATION);

    // Sensor data refs
    const accelRef = useRef({ x: 0, y: 0, z: 0 });
    const magnetRef = useRef({ x: 0, y: 0, z: 0 });
    const gyroRef = useRef({ x: 0, y: 0, z: 0 });
    const lastTimestamp = useRef(Date.now());

    // Smoothed orientation (using quaternions for SLERP)
    const currentQuaternion = useRef({ w: 1, x: 0, y: 0, z: 0 });
    const targetQuaternion = useRef({ w: 1, x: 0, y: 0, z: 0 });

    // Complementary filter state
    const filteredPitch = useRef(0);
    const filteredRoll = useRef(0);
    const filteredYaw = useRef(0);

    // Low-pass filtered magnetometer
    const smoothedMagnet = useRef({ x: 0, y: 0, z: 0 });

    const subscriptions = useRef([]);

    /**
     * Low-pass filter for single value
     */
    const lowPass = useCallback((current, target, alpha = LOW_PASS_ALPHA) => {
        return current + alpha * (target - current);
    }, []);

    /**
     * Calculate orientation using Complementary Filter
     */
    const calculateOrientation = useCallback(() => {
        const accel = accelRef.current;
        const gyro = gyroRef.current;

        // Apply low-pass filter to magnetometer
        smoothedMagnet.current = {
            x: lowPass(smoothedMagnet.current.x, magnetRef.current.x, 0.1),
            y: lowPass(smoothedMagnet.current.y, magnetRef.current.y, 0.1),
            z: lowPass(smoothedMagnet.current.z, magnetRef.current.z, 0.1),
        };
        const magnet = smoothedMagnet.current;

        // Normalize accelerometer
        const accelMag = Math.sqrt(accel.x ** 2 + accel.y ** 2 + accel.z ** 2);
        if (accelMag === 0) return;

        const ax = accel.x / accelMag;
        const ay = accel.y / accelMag;
        const az = accel.z / accelMag;

        // Calculate time delta for gyro integration
        const now = Date.now();
        const dt = (now - lastTimestamp.current) / 1000;
        lastTimestamp.current = now;

        // Accelerometer-based angles (stable reference)
        const accelPitch = Math.atan2(-ax, Math.sqrt(ay * ay + az * az));
        const accelRoll = Math.atan2(ay, az);

        // Gyroscope integration (fast response)
        const gyroPitch = filteredPitch.current + gyro.x * dt;
        const gyroRoll = filteredRoll.current + gyro.y * dt;

        // COMPLEMENTARY FILTER: combine gyro (high-freq) + accel (low-freq)
        filteredPitch.current = ALPHA * gyroPitch + (1 - ALPHA) * accelPitch;
        filteredRoll.current = ALPHA * gyroRoll + (1 - ALPHA) * accelRoll;

        // Calculate azimuth from tilt-compensated magnetometer
        const cosPitch = Math.cos(filteredPitch.current);
        const sinPitch = Math.sin(filteredPitch.current);
        const cosRoll = Math.cos(filteredRoll.current);
        const sinRoll = Math.sin(filteredRoll.current);

        const mx = magnet.x * cosPitch + magnet.z * sinPitch;
        const my = magnet.x * sinRoll * sinPitch + magnet.y * cosRoll - magnet.z * sinRoll * cosPitch;

        let rawYaw = Math.atan2(-my, mx);

        // Low-pass filter on yaw to reduce magnetic jitter
        const yawDiff = rawYaw - filteredYaw.current;
        // Handle wrap-around
        const adjustedDiff = Math.atan2(Math.sin(yawDiff), Math.cos(yawDiff));
        filteredYaw.current = filteredYaw.current + LOW_PASS_ALPHA * adjustedDiff;

        // Create target quaternion from Euler angles
        targetQuaternion.current = Quaternion.fromEuler(
            filteredRoll.current,
            filteredPitch.current,
            filteredYaw.current
        );

        // SLERP interpolation for smooth rotation
        currentQuaternion.current = Quaternion.normalize(
            Quaternion.slerp(
                currentQuaternion.current,
                targetQuaternion.current,
                smoothingFactor
            )
        );

        // Convert quaternion back to Euler for output
        const euler = Quaternion.toEuler(currentQuaternion.current);

        // Convert to degrees and astronomical coordinates
        const pitch = euler.pitch * (180 / Math.PI);
        const roll = euler.roll * (180 / Math.PI);
        let azimuth = euler.yaw * (180 / Math.PI);
        azimuth = ((azimuth % 360) + 360) % 360;

        // Convert pitch to altitude (0 = horizon, 90 = zenith)
        let altitude = 90 + pitch;
        altitude = Math.max(0, Math.min(90, altitude));

        setOrientation({
            azimuth,
            altitude,
            roll,
        });
    }, [lowPass, smoothingFactor]);

    // Subscribe to sensors
    useEffect(() => {
        try {
            setUpdateIntervalForType(SensorTypes.accelerometer, updateInterval);
            setUpdateIntervalForType(SensorTypes.magnetometer, updateInterval);
            setUpdateIntervalForType(SensorTypes.gyroscope, updateInterval);

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

            const gyroSub = gyroscope.subscribe({
                next: ({ x, y, z }) => {
                    gyroRef.current = { x, y, z };
                },
                error: (err) => {
                    console.warn('Gyroscope not available, using accelerometer only');
                },
            });

            subscriptions.current = [accelSub, magnetSub, gyroSub];

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
        currentQuaternion.current = { w: 1, x: 0, y: 0, z: 0 };
        targetQuaternion.current = { w: 1, x: 0, y: 0, z: 0 };
        filteredPitch.current = 0;
        filteredRoll.current = 0;
        filteredYaw.current = 0;
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
