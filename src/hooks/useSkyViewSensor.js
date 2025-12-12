/**
 * useSkyViewSensor - Hook to use native sensor module
 * 
 * This hook provides orientation data from the native Android sensor fusion,
 * which is more accurate and smoother than the JS-based implementation.
 * 
 * Note: This is OPTIONAL if you're using NativeSkyView, since that component
 * handles sensors internally. Use this hook if you need orientation data
 * in JS for other purposes (e.g., displaying compass, passing to other components).
 */

import { useEffect, useState, useCallback, useRef } from 'react';
import { NativeModules, NativeEventEmitter, Platform } from 'react-native';

const { SkyViewSensorModule } = NativeModules;

const DEFAULT_ORIENTATION = {
    azimuth: 180,
    altitude: 30,
    roll: 0,
};

export const useSkyViewSensor = (enabled = true) => {
    const [orientation, setOrientation] = useState(DEFAULT_ORIENTATION);
    const [isActive, setIsActive] = useState(false);
    const eventEmitterRef = useRef(null);

    useEffect(() => {
        if (Platform.OS !== 'android' || !SkyViewSensorModule) {
            console.warn('SkyViewSensorModule is only available on Android');
            return;
        }

        if (!enabled) {
            if (isActive) {
                SkyViewSensorModule.stopListening();
                setIsActive(false);
            }
            return;
        }

        // Create event emitter
        eventEmitterRef.current = new NativeEventEmitter(SkyViewSensorModule);

        // Subscribe to orientation updates
        const subscription = eventEmitterRef.current.addListener(
            'onSensorOrientation',
            (data) => {
                setOrientation({
                    azimuth: data.azimuth,
                    altitude: data.altitude,
                    roll: data.roll,
                });
            }
        );

        // Start listening
        SkyViewSensorModule.startListening();
        setIsActive(true);

        return () => {
            subscription.remove();
            SkyViewSensorModule.stopListening();
            setIsActive(false);
        };
    }, [enabled]);

    const resetOrientation = useCallback(() => {
        if (Platform.OS === 'android' && SkyViewSensorModule) {
            SkyViewSensorModule.resetOrientation();
        }
        setOrientation(DEFAULT_ORIENTATION);
    }, []);

    return {
        orientation,
        isActive,
        resetOrientation,
        isNative: Platform.OS === 'android' && !!SkyViewSensorModule,
    };
};

export default useSkyViewSensor;
