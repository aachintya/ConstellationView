/**
 * Beautiful Star Map with Milky Way Background
 * Features: Planet textures, star glow, calibration button, minimal UI
 */

import React, { useMemo, useCallback, useState, useEffect } from 'react';
import { View, StyleSheet, Dimensions, Image, TouchableOpacity, Text, PanResponder } from 'react-native';
import Svg, { Circle, Line, G, Defs, RadialGradient, Stop, Text as SvgText, Rect } from 'react-native-svg';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';

// Background
const MilkyWayBg = require('../assets/milkyway.png');

// Planet textures
const PlanetTextures = {
    mars: require('../assets/mars.png'),
    venus: require('../assets/venus.png'),
    jupiter: require('../assets/jupiter.png'),
    saturn: require('../assets/saturn.png'),
    mercury: require('../assets/mercury.png'),
    neptune: require('../assets/neptune.png'),
    uranus: require('../assets/uranus.png'),
    moon: require('../assets/moon.png'),
    sun: require('../assets/sun.png'),
};

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const FIELD_OF_VIEW = 75;
const FOV_RAD = (FIELD_OF_VIEW * Math.PI) / 180;
const CROSSHAIR_SIZE = 35;
const HOVER_RADIUS = 60;

// Default theme
const DEFAULT_THEME = {
    background: '#000',
    text: '#fff',
    accent: '#4fc3f7',
    constellation: '#6699cc',
};

/**
 * Pre-compute star data
 */
const precomputeStars = (stars) => {
    return stars.map(star => {
        const { x, y, z } = raDecToCartesian(star.ra, star.dec);
        const color = getStarColorRGB(star.spectralType);
        const size = getStarSize(star.magnitude);
        return {
            id: star.id,
            name: star.name,
            magnitude: star.magnitude,
            constellation: star.constellation,
            pos: { x, y, z },
            color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
            radius: Math.max(1.2, size * 0.6),
            data: star,
        };
    });
};

/**
 * Project 3D to screen
 */
const project = (x, y, z, azimuth, altitude, lst, latitude) => {
    const azRad = (-azimuth * Math.PI) / 180;
    const altRad = (altitude * Math.PI) / 180;
    const lstRad = (-lst * Math.PI) / 180;
    const latRad = ((90 - latitude) * Math.PI) / 180;

    const cosLst = Math.cos(lstRad), sinLst = Math.sin(lstRad);
    let x1 = x * cosLst - y * sinLst;
    let y1 = x * sinLst + y * cosLst;
    let z1 = z;

    const cosLat = Math.cos(latRad), sinLat = Math.sin(latRad);
    let y2 = y1 * cosLat - z1 * sinLat;
    let z2 = y1 * sinLat + z1 * cosLat;

    const cosAz = Math.cos(azRad), sinAz = Math.sin(azRad);
    let x3 = x1 * cosAz - y2 * sinAz;
    let y3 = x1 * sinAz + y2 * cosAz;

    const cosAlt = Math.cos(altRad), sinAlt = Math.sin(altRad);
    let y4 = y3 * cosAlt - z2 * sinAlt;
    let z4 = y3 * sinAlt + z2 * cosAlt;

    if (y4 <= 0.02) return null;

    const scale = SCREEN_WIDTH / (2 * Math.tan(FOV_RAD / 2));
    const sx = CENTER_X + (x3 / y4) * scale;
    const sy = CENTER_Y - (z4 / y4) * scale;

    if (sx < -100 || sx > SCREEN_WIDTH + 100 || sy < -100 || sy > SCREEN_HEIGHT + 100) {
        return null;
    }

    return { x: sx, y: sy, depth: y4 };
};

/**
 * Crosshair
 */
const Crosshair = ({ theme }) => (
    <G>
        <Circle cx={CENTER_X} cy={CENTER_Y} r={CROSSHAIR_SIZE} stroke="rgba(255,255,255,0.3)" strokeWidth={1} fill="none" />
    </G>
);

/**
 * Object Info (bottom left)
 */
const ObjectInfo = ({ object, theme }) => {
    if (!object) return null;

    const getDescription = (obj) => {
        if (obj.type === 'planet') {
            const desc = {
                mercury: 'Closest planet to the Sun',
                venus: 'Second planet from the Sun',
                mars: 'The Red Planet',
                jupiter: 'Largest planet',
                saturn: 'The Ringed Planet',
                uranus: 'The Tilted Planet',
                neptune: 'The Windiest Planet',
                moon: 'Earth\'s natural satellite',
                sun: 'Our star',
            };
            return desc[obj.id] || 'Solar System body';
        }
        return obj.constellation ? `Star in ${obj.constellation}` : `Magnitude ${obj.magnitude?.toFixed(1) || '?'}`;
    };

    return (
        <View style={styles.objectInfo}>
            <Text style={[styles.objectName, { color: theme.accent }]}>{object.name || object.id}</Text>
            <Text style={styles.objectDescription}>{getDescription(object)}</Text>
        </View>
    );
};

/**
 * Main StarMap Component
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    onSelectObject,
    showConstellations = true,
    theme = DEFAULT_THEME,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
    onMenuPress,
    onSearchPress,
    onSharePress,
    onCalibratePress,
    gyroEnabled = false,
    isCalibrated = false,
}) => {
    const [selectedObject, setSelectedObject] = useState(null);

    // Pre-compute
    const precomputed = useMemo(() => precomputeStars(stars), [stars]);

    // LST
    const [lst, setLst] = useState(() => getLocalSiderealTime(new Date(), location.longitude));
    useEffect(() => {
        const interval = setInterval(() => {
            setLst(getLocalSiderealTime(new Date(), location.longitude));
        }, 2000);
        return () => clearInterval(interval);
    }, [location.longitude]);

    // Pan gesture
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            onTouchStart?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderMove: (evt) => {
            onTouchMove?.(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
        },
        onPanResponderRelease: () => onTouchEnd?.(),
        onPanResponderTerminate: () => onTouchEnd?.(),
    }), [onTouchStart, onTouchMove, onTouchEnd]);

    // Project visible stars
    const visibleStars = useMemo(() => {
        const result = [];
        for (const star of precomputed) {
            const pos = project(star.pos.x, star.pos.y, star.pos.z, orientation.azimuth, orientation.altitude, lst, location.latitude);
            if (pos) {
                const dx = pos.x - CENTER_X;
                const dy = pos.y - CENTER_Y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                result.push({ ...star, x: pos.x, y: pos.y, depth: pos.depth, isNearCenter: dist < HOVER_RADIUS, distFromCenter: dist });
            }
        }
        return result.sort((a, b) => b.depth - a.depth);
    }, [precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Find object under crosshair
    const objectUnderCrosshair = useMemo(() => {
        let closest = null;
        let minDist = HOVER_RADIUS;

        for (const star of visibleStars) {
            if (star.distFromCenter < minDist && star.name) {
                minDist = star.distFromCenter;
                closest = { ...star, type: 'star' };
            }
        }

        for (const planet of planets) {
            if (!planet.ra) continue;
            const pos3d = raDecToCartesian(planet.ra, planet.dec);
            const pos = project(pos3d.x, pos3d.y, pos3d.z, orientation.azimuth, orientation.altitude, lst, location.latitude);
            if (pos) {
                const dist = Math.sqrt((pos.x - CENTER_X) ** 2 + (pos.y - CENTER_Y) ** 2);
                if (dist < minDist) {
                    minDist = dist;
                    closest = { ...planet, x: pos.x, y: pos.y, type: 'planet' };
                }
            }
        }
        return closest;
    }, [visibleStars, planets, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    useEffect(() => { setSelectedObject(objectUnderCrosshair); }, [objectUnderCrosshair]);

    // Constellation lines
    const constellationLines = useMemo(() => {
        if (!showConstellations) return [];
        const lines = [];
        const cache = {};
        for (const star of precomputed) {
            const pos = project(star.pos.x, star.pos.y, star.pos.z, orientation.azimuth, orientation.altitude, lst, location.latitude);
            if (pos) cache[star.id] = pos;
        }
        for (const c of constellations) {
            if (!c.lines) continue;
            for (const [id1, id2] of c.lines) {
                if (cache[id1] && cache[id2]) {
                    lines.push({ x1: cache[id1].x, y1: cache[id1].y, x2: cache[id2].x, y2: cache[id2].y, key: `${id1}-${id2}` });
                }
            }
        }
        return lines;
    }, [constellations, precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude, showConstellations]);

    // Visible planets
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (!planet.ra) return null;
            const pos3d = raDecToCartesian(planet.ra, planet.dec);
            const pos = project(pos3d.x, pos3d.y, pos3d.z, orientation.azimuth, orientation.altitude, lst, location.latitude);
            if (!pos) return null;
            return { ...planet, x: pos.x, y: pos.y };
        }).filter(Boolean);
    }, [planets, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Background offset
    const bgOffsetX = -(orientation.azimuth / 360) * SCREEN_WIDTH * 2;

    return (
        <View style={styles.container} {...panResponder.panHandlers}>
            {/* Milky Way Background */}
            <Image source={MilkyWayBg} style={[styles.background, { transform: [{ translateX: bgOffsetX }] }]} resizeMode="cover" />

            {/* Star Field */}
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT} style={styles.starField}>
                <Defs>
                    <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#ffffff" stopOpacity="1" />
                        <Stop offset="50%" stopColor="#ffffff" stopOpacity="0.5" />
                        <Stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Constellation lines */}
                <G opacity={0.3}>
                    {constellationLines.map(line => (
                        <Line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#6699cc" strokeWidth={0.8} />
                    ))}
                </G>

                {/* Stars */}
                <G>
                    {visibleStars.map(star => (
                        <G key={star.id}>
                            {star.magnitude < 2 && (
                                <Circle cx={star.x} cy={star.y} r={star.radius * 4} fill="url(#starGlow)" opacity={0.4} />
                            )}
                            <Circle cx={star.x} cy={star.y} r={star.isNearCenter ? star.radius * 1.5 : star.radius} fill={star.color} />
                        </G>
                    ))}
                </G>

                {/* Crosshair */}
                <Crosshair theme={theme} />
            </Svg>

            {/* Planets as Images */}
            {visiblePlanets.map(planet => {
                const texture = PlanetTextures[planet.id];
                const size = planet.id === 'sun' ? 50 : planet.id === 'jupiter' ? 35 : 25;
                return (
                    <View key={planet.id} style={[styles.planet, { left: planet.x - size / 2, top: planet.y - size / 2 }]}>
                        {texture ? (
                            <Image source={texture} style={{ width: size, height: size, borderRadius: size / 2 }} />
                        ) : (
                            <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: planet.color || '#fff' }} />
                        )}
                    </View>
                );
            })}

            {/* Object Info */}
            <ObjectInfo object={selectedObject} theme={theme} />

            {/* Side Buttons */}
            <View style={styles.sideButtons}>
                <TouchableOpacity style={styles.sideButton} onPress={onMenuPress}>
                    <Text style={styles.sideButtonIcon}>☰</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sideButton} onPress={onSearchPress}>
                    <Text style={styles.sideButtonIcon}>🔍</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.sideButton} onPress={onSharePress}>
                    <Text style={styles.sideButtonIcon}>↗</Text>
                </TouchableOpacity>
            </View>

            {/* Gyro/Calibrate Button */}
            <TouchableOpacity style={[styles.calibrateButton, gyroEnabled && styles.calibrateActive]} onPress={onCalibratePress}>
                <Text style={styles.calibrateText}>{gyroEnabled ? (isCalibrated ? '✓ Calibrated' : '⟳ Calibrate') : '📱 Gyro Off'}</Text>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    background: { position: 'absolute', width: SCREEN_WIDTH * 3, height: SCREEN_HEIGHT, opacity: 0.6 },
    starField: { position: 'absolute', top: 0, left: 0 },
    planet: { position: 'absolute' },
    objectInfo: { position: 'absolute', bottom: 80, left: 20 },
    objectName: { fontSize: 24, fontWeight: '600' },
    objectDescription: { color: 'rgba(255,255,255,0.7)', fontSize: 14, marginTop: 4 },
    sideButtons: { position: 'absolute', right: 20, top: SCREEN_HEIGHT / 2 - 80, gap: 25 },
    sideButton: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center' },
    sideButtonIcon: { fontSize: 20, color: 'rgba(255,255,255,0.8)' },
    calibrateButton: { position: 'absolute', bottom: 30, alignSelf: 'center', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20 },
    calibrateActive: { backgroundColor: 'rgba(79, 195, 247, 0.3)' },
    calibrateText: { color: '#fff', fontSize: 14, fontWeight: '500' },
});

export default React.memo(StarMap);
