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

    const calibrate = useCallback(() => {
        // Native handles calibration
    }, []);

    const toggleMode = useCallback(() => {
        setMode(prev => prev === 'gyro' ? 'touch' : 'gyro');
    }, []);

    return {
        orientation,
        isAvailable,
        mode,
        calibrate,
        toggleMode,
    };
};
