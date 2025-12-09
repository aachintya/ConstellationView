/**
 * Gyroscope Hook with Toggle Between Touch and Gyro Modes
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import {
    accelerometer,
    magnetometer,
    setUpdateIntervalForType,
    SensorTypes,
} from 'react-native-sensors';

const DEFAULT_LOCATION = { latitude: 28.6139, longitude: 77.209 };
const INITIAL_AZIMUTH = 180;
const INITIAL_ALTITUDE = 30;

const normalize360 = (angle) => ((angle % 360) + 360) % 360;
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));
const lowPass = (prev, curr, alpha) => prev + alpha * (curr - prev);

export const useGyroscope = () => {
    // Mode: 'touch' or 'gyro'
    const [mode, setMode] = useState('touch');
    const [isCalibrated, setIsCalibrated] = useState(false);

    // Orientation
    const [orientation, setOrientation] = useState({
        azimuth: INITIAL_AZIMUTH,
        altitude: INITIAL_ALTITUDE,
        roll: 0,
    });

    // Calibration offset
    const calibrationOffset = useRef({ azimuth: 0, altitude: 0 });

    // Sensor data
    const accel = useRef({ x: 0, y: 0, z: -9.8 });
    const magnet = useRef({ x: 25, y: 0, z: -45 });

    // Smooth values for gyro mode
    const smoothAz = useRef(INITIAL_AZIMUTH);
    const smoothAlt = useRef(INITIAL_ALTITUDE);

    // Touch tracking
    const lastTouch = useRef({ x: 0, y: 0 });
    const isDragging = useRef(false);

    // Location
    const location = useRef(DEFAULT_LOCATION);

    // Subscriptions
    const accelSub = useRef(null);
    const magnetSub = useRef(null);
    const frameId = useRef(null);

    /**
     * Calculate orientation from sensors
     */
    const calculateOrientation = useCallback(() => {
        const ax = accel.current.x;
        const ay = accel.current.y;
        const az = accel.current.z;
        const mx = magnet.current.x;
        const my = magnet.current.y;
        const mz = magnet.current.z;

        const normG = Math.sqrt(ax * ax + ay * ay + az * az);
        if (normG < 0.1) return null;

        const gx = ax / normG;
        const gy = ay / normG;
        const gz = az / normG;

        // East = M × G
        const hx = my * gz - mz * gy;
        const hy = mz * gx - mx * gz;
        const hz = mx * gy - my * gx;
        const normH = Math.sqrt(hx * hx + hy * hy + hz * hz);
        if (normH < 0.1) return null;

        const ex = hx / normH;
        const ey = hy / normH;

        // North = G × E
        const nx = gy * hz - gz * hy;
        const ny = gz * hx - gx * hz;

        // Azimuth (compass heading)
        let azimuth = Math.atan2(ex, Math.sqrt(nx * nx + ny * ny) * Math.sign(nx)) * (180 / Math.PI);
        azimuth = normalize360(azimuth);

        // Altitude (phone tilt - gz tells us if screen faces up/down)
        let altitude = Math.asin(clamp(-gz, -1, 1)) * (180 / Math.PI);

        // Apply calibration
        azimuth = normalize360(azimuth - calibrationOffset.current.azimuth);
        altitude = clamp(altitude - calibrationOffset.current.altitude, -90, 90);

        return { azimuth, altitude };
    }, []);

    /**
     * Toggle between touch and gyro modes
     */
    const toggleMode = useCallback(() => {
        setMode(prev => {
            const newMode = prev === 'touch' ? 'gyro' : 'touch';
            if (newMode === 'touch') {
                setIsCalibrated(false);
            }
            return newMode;
        });
    }, []);

    /**
     * Calibrate gyroscope (sets current position as reference)
     */
    const calibrate = useCallback(() => {
        if (mode !== 'gyro') return;

        const current = calculateOrientation();
        if (current) {
            calibrationOffset.current = {
                azimuth: current.azimuth - smoothAz.current,
                altitude: current.altitude - smoothAlt.current,
            };
            setIsCalibrated(true);
        }
    }, [mode, calculateOrientation]);

    /**
     * Reset view to initial position
     */
    const resetView = useCallback(() => {
        setOrientation({ azimuth: INITIAL_AZIMUTH, altitude: INITIAL_ALTITUDE, roll: 0 });
        smoothAz.current = INITIAL_AZIMUTH;
        smoothAlt.current = INITIAL_ALTITUDE;
        calibrationOffset.current = { azimuth: 0, altitude: 0 };
        setIsCalibrated(false);
    }, []);

    // Touch handlers (for touch mode)
    const onTouchStart = useCallback((x, y) => {
        if (mode === 'touch') {
            lastTouch.current = { x, y };
            isDragging.current = true;
        }
    }, [mode]);

    const onTouchMove = useCallback((x, y) => {
        if (mode === 'touch' && isDragging.current) {
            const dx = x - lastTouch.current.x;
            const dy = y - lastTouch.current.y;
            const sensitivity = 0.3;

            setOrientation(prev => ({
                azimuth: normalize360(prev.azimuth - dx * sensitivity),
                altitude: clamp(prev.altitude + dy * sensitivity, -90, 90),
                roll: 0,
            }));

            lastTouch.current = { x, y };
        }
    }, [mode]);

    const onTouchEnd = useCallback(() => {
        isDragging.current = false;
    }, []);

    // Gyroscope sensor subscription
    useEffect(() => {
        if (mode !== 'gyro') {
            // Clean up sensors when in touch mode
            accelSub.current?.unsubscribe();
            magnetSub.current?.unsubscribe();
            if (frameId.current) cancelAnimationFrame(frameId.current);
            return;
        }

        // Setup sensors for gyro mode
        setUpdateIntervalForType(SensorTypes.accelerometer, 16);
        setUpdateIntervalForType(SensorTypes.magnetometer, 16);

        accelSub.current = accelerometer.subscribe({
            next: ({ x, y, z }) => {
                accel.current.x = lowPass(accel.current.x, x, 0.3);
                accel.current.y = lowPass(accel.current.y, y, 0.3);
                accel.current.z = lowPass(accel.current.z, z, 0.3);
            },
            error: (e) => console.warn('Accel error:', e),
        });

        magnetSub.current = magnetometer.subscribe({
            next: ({ x, y, z }) => {
                magnet.current.x = lowPass(magnet.current.x, x, 0.15);
                magnet.current.y = lowPass(magnet.current.y, y, 0.15);
                magnet.current.z = lowPass(magnet.current.z, z, 0.15);
            },
            error: (e) => console.warn('Magnet error:', e),
        });

        // Animation loop
        const smoothAngle = (prev, curr, alpha) => {
            let diff = curr - prev;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            return prev + alpha * diff;
        };

        const animate = () => {
            const result = calculateOrientation();
            if (result) {
                smoothAz.current = smoothAngle(smoothAz.current, result.azimuth, 0.1);
                smoothAlt.current = lowPass(smoothAlt.current, result.altitude, 0.1);

                setOrientation({
                    azimuth: normalize360(smoothAz.current),
                    altitude: smoothAlt.current,
                    roll: 0,
                });
            }
            frameId.current = requestAnimationFrame(animate);
        };

        frameId.current = requestAnimationFrame(animate);

        return () => {
            accelSub.current?.unsubscribe();
            magnetSub.current?.unsubscribe();
            if (frameId.current) cancelAnimationFrame(frameId.current);
        };
    }, [mode, calculateOrientation]);

    const getOrientation = useCallback(() => orientation, [orientation]);
    const getLocation = useCallback(() => location.current, []);
    const updateLocation = useCallback((loc) => { location.current = loc; }, []);

    return {
        orientation,
        getOrientation,
        location: location.current,
        getLocation,
        updateLocation,
        // Mode
        mode,
        gyroEnabled: mode === 'gyro',
        isCalibrated,
        // Actions
        toggleMode,
        calibrate,
        resetView,
        // Touch handlers
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
};

export default useGyroscope;
