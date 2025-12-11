/**
 * Gyroscope Hook - SkyView-style sensor tracking
 * Uses proper rotation matrix computation for 360° celestial sphere navigation
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
const toDeg = (rad) => rad * (180 / Math.PI);

export const useGyroscope = () => {
    // Mode: 'touch' or 'gyro'
    const [mode, setMode] = useState('touch');
    const [isCalibrated, setIsCalibrated] = useState(false);

    // Orientation state
    const [orientation, setOrientation] = useState({
        azimuth: INITIAL_AZIMUTH,
        altitude: INITIAL_ALTITUDE,
        roll: 0,
    });

    // Sensor data with smoothing
    const accel = useRef({ x: 0, y: 0, z: -9.8 });
    const magnet = useRef({ x: 30, y: 0, z: -40 });

    // Smoothed output values
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
    const animationRef = useRef(null);

    /**
     * Get orientation from rotation matrix (Android-style)
     * This computes where the phone is pointing in the celestial sphere
     */
    const getDeviceOrientation = useCallback(() => {
        const ax = accel.current.x;
        const ay = accel.current.y;
        const az = accel.current.z;
        const mx = magnet.current.x;
        const my = magnet.current.y;
        const mz = magnet.current.z;

        // Gravity magnitude check
        const gMag = Math.sqrt(ax * ax + ay * ay + az * az);
        if (gMag < 0.5) return null;

        // Normalize gravity (Down direction)
        const gx = ax / gMag;
        const gy = ay / gMag;
        const gz = az / gMag;

        // Compute East = Mag × Gravity (cross product)
        let ex = my * gz - mz * gy;
        let ey = mz * gx - mx * gz;
        let ez = mx * gy - my * gx;
        const eMag = Math.sqrt(ex * ex + ey * ey + ez * ez);
        if (eMag < 0.1) return null;
        ex /= eMag;
        ey /= eMag;
        ez /= eMag;

        // Compute North = Gravity × East (recompute to ensure orthogonal)
        const nx = gy * ez - gz * ey;
        const ny = gz * ex - gx * ez;
        const nz = gx * ey - gy * ex;

        // Now we have a rotation matrix R where:
        // Column 0 = East (ex, ey, ez)
        // Column 1 = North (nx, ny, nz)  
        // Column 2 = Up/Gravity (-gx, -gy, -gz)

        // For portrait phone held upright:
        // Phone's +Y axis (top of phone) is the "look direction"
        // We want to find where phone's Y axis points in world coordinates

        // The look direction in world coords = R * [0, 1, 0]^T 
        // (where [0,1,0] is phone's Y in phone coords)
        // lookWorld = (ey, ny, -gy) since we use the columns

        const lookEast = ey;   // How much we look East
        const lookNorth = ny;  // How much we look North  
        const lookUp = -gy;    // How much we look Up

        // Azimuth = angle from North, measured clockwise (East = 90°)
        // atan2(East, North) gives angle from North
        let azimuth = toDeg(Math.atan2(lookEast, lookNorth));
        azimuth = normalize360(azimuth);

        // Altitude = angle above horizon
        // asin(Up component) gives elevation
        const horizMag = Math.sqrt(lookEast * lookEast + lookNorth * lookNorth);
        let altitude = toDeg(Math.atan2(lookUp, horizMag));
        altitude = clamp(altitude, -90, 90);

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
     * Calibrate (not really needed with this approach, but kept for API)
     */
    const calibrate = useCallback(() => {
        if (mode === 'gyro') {
            setIsCalibrated(true);
        }
    }, [mode]);

    /**
     * Reset view to initial position
     */
    const resetView = useCallback(() => {
        setOrientation({ azimuth: INITIAL_AZIMUTH, altitude: INITIAL_ALTITUDE, roll: 0 });
        smoothAz.current = INITIAL_AZIMUTH;
        smoothAlt.current = INITIAL_ALTITUDE;
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
            // Clean up when in touch mode
            accelSub.current?.unsubscribe();
            magnetSub.current?.unsubscribe();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
                animationRef.current = null;
            }
            return;
        }

        // Setup sensors
        setUpdateIntervalForType(SensorTypes.accelerometer, 16);
        setUpdateIntervalForType(SensorTypes.magnetometer, 16);

        // Subscribe to accelerometer
        accelSub.current = accelerometer.subscribe({
            next: ({ x, y, z }) => {
                // Low-pass filter for stability
                accel.current.x = lowPass(accel.current.x, x, 0.2);
                accel.current.y = lowPass(accel.current.y, y, 0.2);
                accel.current.z = lowPass(accel.current.z, z, 0.2);
            },
            error: (e) => console.warn('Accelerometer error:', e),
        });

        // Subscribe to magnetometer
        magnetSub.current = magnetometer.subscribe({
            next: ({ x, y, z }) => {
                // Low-pass filter for stability
                magnet.current.x = lowPass(magnet.current.x, x, 0.1);
                magnet.current.y = lowPass(magnet.current.y, y, 0.1);
                magnet.current.z = lowPass(magnet.current.z, z, 0.1);
            },
            error: (e) => console.warn('Magnetometer error:', e),
        });

        // Smooth angle interpolation (handles 360° wraparound)
        const smoothAngle = (prev, curr, alpha) => {
            let diff = curr - prev;
            if (diff > 180) diff -= 360;
            if (diff < -180) diff += 360;
            return normalize360(prev + alpha * diff);
        };

        // Animation loop with throttled state updates
        let lastUpdate = 0;
        const UPDATE_RATE = 66; // ~15 FPS for React state (smooth enough, efficient)

        const animate = () => {
            const result = getDeviceOrientation();

            if (result) {
                // Smooth the values for fluid motion
                smoothAz.current = smoothAngle(smoothAz.current, result.azimuth, 0.15);
                smoothAlt.current = lowPass(smoothAlt.current, result.altitude, 0.15);

                // Throttle state updates
                const now = Date.now();
                if (now - lastUpdate > UPDATE_RATE) {
                    lastUpdate = now;
                    setOrientation({
                        azimuth: smoothAz.current,
                        altitude: smoothAlt.current,
                        roll: 0,
                    });
                }
            }

            animationRef.current = requestAnimationFrame(animate);
        };

        animationRef.current = requestAnimationFrame(animate);

        // Cleanup
        return () => {
            accelSub.current?.unsubscribe();
            magnetSub.current?.unsubscribe();
            if (animationRef.current) {
                cancelAnimationFrame(animationRef.current);
            }
        };
    }, [mode, getDeviceOrientation]);

    const getOrientation = useCallback(() => orientation, [orientation]);
    const getLocation = useCallback(() => location.current, []);
    const updateLocation = useCallback((loc) => { location.current = loc; }, []);

    return {
        orientation,
        setOrientation,
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
