/**
 * useNavigation - Object navigation logic for SkyViewScreen
 */
import { useCallback } from 'react';
import { Alert } from 'react-native';

// Calculate Local Sidereal Time
export const getLocalSiderealTime = (date, longitude) => {
    const jd = date.getTime() / 86400000 + 2440587.5;
    const t = (jd - 2451545.0) / 36525.0;
    let gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
        0.000387933 * t * t - t * t * t / 38710000.0;
    gmst = ((gmst % 360.0) + 360.0) % 360.0;
    return ((gmst + longitude + 360.0) % 360.0);
};

// Format RA for display
export const formatRA = (ra) => {
    const hours = ra / 15;
    const h = Math.floor(hours);
    const m = Math.floor((hours - h) * 60);
    const s = Math.round(((hours - h) * 60 - m) * 60);
    return `${h}h ${m}m ${s}s`;
};

// Format Dec for display
export const formatDec = (dec) => {
    const sign = dec >= 0 ? '+' : '-';
    const absDec = Math.abs(dec);
    const d = Math.floor(absDec);
    const m = Math.floor((absDec - d) * 60);
    const s = Math.round(((absDec - d) * 60 - m) * 60);
    return `${sign}${d}° ${m}' ${s}"`;
};

/**
 * Hook for celestial object navigation
 */
export const useNavigation = (location, setOrientation, setTargetObject, setShowCoordinates) => {
    const navigateToObject = useCallback((object) => {
        if (!object || object.ra === undefined || object.dec === undefined) {
            console.log('Cannot navigate: missing coordinates');
            return;
        }

        // Calculate the azimuth and altitude
        const lst = getLocalSiderealTime(new Date(), location.longitude);
        const ha = lst - object.ra;
        const haRad = (ha * Math.PI) / 180;
        const decRad = (object.dec * Math.PI) / 180;
        const latRad = (location.latitude * Math.PI) / 180;

        // Calculate altitude
        const sinAlt = Math.sin(decRad) * Math.sin(latRad) +
            Math.cos(decRad) * Math.cos(latRad) * Math.cos(haRad);
        const altitude = (Math.asin(sinAlt) * 180) / Math.PI;

        // Calculate azimuth
        const cosAz = (Math.sin(decRad) - Math.sin(latRad) * sinAlt) /
            (Math.cos(latRad) * Math.cos(Math.asin(sinAlt)));
        let azimuth = (Math.acos(Math.max(-1, Math.min(1, cosAz))) * 180) / Math.PI;

        if (Math.sin(haRad) > 0) {
            azimuth = 360 - azimuth;
        }

        setTargetObject(object);
        setShowCoordinates(true);

        if (setOrientation) {
            setOrientation({ azimuth, altitude });
        }

        Alert.alert(
            `🎯 ${object.name || object.id}`,
            `Navigating to ${object.type || 'object'}...\nRA: ${(object.ra / 15).toFixed(2)}h\nDec: ${object.dec >= 0 ? '+' : ''}${object.dec.toFixed(2)}°`,
            [{ text: 'OK' }]
        );

        setTimeout(() => {
            setShowCoordinates(false);
            setTargetObject(null);
        }, 10000);
    }, [location, setOrientation, setTargetObject, setShowCoordinates]);

    return { navigateToObject };
};

export default useNavigation;
