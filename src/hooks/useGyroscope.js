/**
 * Gyroscope Hook - Stub version
 * Native view handles gyroscope internally, this is just for API compatibility
 */
import { useState, useEffect, useCallback } from 'react';

export const useGyroscope = () => {
    const [orientation, setOrientation] = useState({
        azimuth: 180,
        altitude: 30,
    });
    const [isAvailable, setIsAvailable] = useState(true);
    const [mode, setMode] = useState('touch');
    const [isCalibrated, setIsCalibrated] = useState(false);

    // Derive gyroEnabled from mode
    const gyroEnabled = mode === 'gyro';

    const calibrate = useCallback(() => {
        // Native handles calibration
        setIsCalibrated(true);
    }, []);

    const toggleMode = useCallback(() => {
        setMode(prev => prev === 'gyro' ? 'touch' : 'gyro');
    }, []);

    // Touch handlers (stubs - native handles these)
    const onTouchStart = useCallback(() => {}, []);
    const onTouchMove = useCallback(() => {}, []);
    const onTouchEnd = useCallback(() => {}, []);

    return {
        orientation,
        setOrientation,
        isAvailable,
        mode,
        gyroEnabled,
        isCalibrated,
        calibrate,
        toggleMode,
        onTouchStart,
        onTouchMove,
        onTouchEnd,
    };
};
