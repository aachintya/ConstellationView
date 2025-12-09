/**
 * Star Map with Manual Touch Scrolling
 * Drag to pan around the 360-degree sky
 */

import React, { useEffect, useRef, useMemo, useCallback, useState } from 'react';
import { View, StyleSheet, Dimensions, PanResponder } from 'react-native';
import Svg, { Circle, Line, G, Rect, Text as SvgText } from 'react-native-svg';

import { getLocalSiderealTime, raDecToCartesian, getStarColorRGB, getStarSize } from '../utils/CelestialSphere';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CENTER_X = SCREEN_WIDTH / 2;
const CENTER_Y = SCREEN_HEIGHT / 2;
const FIELD_OF_VIEW = 75;
const FOV_RAD = (FIELD_OF_VIEW * Math.PI) / 180;
const CROSSHAIR_SIZE = 40;
const HOVER_RADIUS = 50;

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
            pos: { x, y, z },
            color: `rgb(${Math.round(color.r * 255)}, ${Math.round(color.g * 255)}, ${Math.round(color.b * 255)})`,
            radius: Math.max(1.5, size * 0.7),
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

    // Sidereal rotation
    const cosLst = Math.cos(lstRad), sinLst = Math.sin(lstRad);
    let x1 = x * cosLst - y * sinLst;
    let y1 = x * sinLst + y * cosLst;
    let z1 = z;

    // Latitude rotation
    const cosLat = Math.cos(latRad), sinLat = Math.sin(latRad);
    let y2 = y1 * cosLat - z1 * sinLat;
    let z2 = y1 * sinLat + z1 * cosLat;

    // Azimuth rotation
    const cosAz = Math.cos(azRad), sinAz = Math.sin(azRad);
    let x3 = x1 * cosAz - y2 * sinAz;
    let y3 = x1 * sinAz + y2 * cosAz;

    // Altitude rotation
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
 * Crosshair component
 */
const Crosshair = ({ theme }) => (
    <G>
        <Circle cx={CENTER_X} cy={CENTER_Y} r={CROSSHAIR_SIZE} stroke={theme.accent || '#4fc3f7'} strokeWidth={1} fill="none" opacity={0.5} />
        <Circle cx={CENTER_X} cy={CENTER_Y} r={3} fill={theme.accent || '#4fc3f7'} opacity={0.8} />
        <Line x1={CENTER_X - 15} y1={CENTER_Y} x2={CENTER_X - 8} y2={CENTER_Y} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X + 8} y1={CENTER_Y} x2={CENTER_X + 15} y2={CENTER_Y} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X} y1={CENTER_Y - 15} x2={CENTER_X} y2={CENTER_Y - 8} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
        <Line x1={CENTER_X} y1={CENTER_Y + 8} x2={CENTER_X} y2={CENTER_Y + 15} stroke={theme.accent || '#4fc3f7'} strokeWidth={1.5} opacity={0.7} />
    </G>
);

/**
 * Main StarMap Component with Touch Controls
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    onSelectObject,
    showConstellations = true,
    theme,
    onTouchStart,
    onTouchMove,
    onTouchEnd,
}) => {
    const [hoveredObject, setHoveredObject] = useState(null);

    // Pre-compute star positions
    const precomputed = useMemo(() => precomputeStars(stars), [stars]);

    // LST (update every 2 seconds)
    const [lst, setLst] = useState(() => getLocalSiderealTime(new Date(), location.longitude));
    useEffect(() => {
        const interval = setInterval(() => {
            setLst(getLocalSiderealTime(new Date(), location.longitude));
        }, 2000);
        return () => clearInterval(interval);
    }, [location.longitude]);

    // PanResponder for touch gestures
    const panResponder = useMemo(() => PanResponder.create({
        onStartShouldSetPanResponder: () => true,
        onMoveShouldSetPanResponder: () => true,
        onPanResponderGrant: (evt) => {
            const { pageX, pageY } = evt.nativeEvent;
            onTouchStart?.(pageX, pageY);
        },
        onPanResponderMove: (evt) => {
            const { pageX, pageY } = evt.nativeEvent;
            onTouchMove?.(pageX, pageY);
        },
        onPanResponderRelease: () => {
            onTouchEnd?.();
        },
        onPanResponderTerminate: () => {
            onTouchEnd?.();
        },
    }), [onTouchStart, onTouchMove, onTouchEnd]);

    // Project visible stars
    const visibleStars = useMemo(() => {
        const result = [];
        const az = orientation.azimuth;
        const alt = orientation.altitude;

        for (const star of precomputed) {
            const pos = project(star.pos.x, star.pos.y, star.pos.z, az, alt, lst, location.latitude);
            if (pos) {
                const dx = pos.x - CENTER_X;
                const dy = pos.y - CENTER_Y;
                const distFromCenter = Math.sqrt(dx * dx + dy * dy);
                result.push({
                    ...star,
                    x: pos.x,
                    y: pos.y,
                    depth: pos.depth,
                    isNearCenter: distFromCenter < HOVER_RADIUS,
                });
            }
        }
        return result.sort((a, b) => b.depth - a.depth);
    }, [precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Find closest to center
    const closestToCenter = useMemo(() => {
        let closest = null;
        let minDist = HOVER_RADIUS;
        for (const star of visibleStars) {
            const dx = star.x - CENTER_X;
            const dy = star.y - CENTER_Y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < minDist) {
                minDist = dist;
                closest = star;
            }
        }
        return closest;
    }, [visibleStars]);

    // Project constellation lines
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
                const p1 = cache[id1];
                const p2 = cache[id2];
                if (p1 && p2) {
                    lines.push({ x1: p1.x, y1: p1.y, x2: p2.x, y2: p2.y, key: `${id1}-${id2}` });
                }
            }
        }
        return lines;
    }, [constellations, precomputed, orientation.azimuth, orientation.altitude, lst, location.latitude, showConstellations]);

    // Project planets
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (!planet.ra) return null;
            const pos3d = raDecToCartesian(planet.ra, planet.dec);
            const pos = project(pos3d.x, pos3d.y, pos3d.z, orientation.azimuth, orientation.altitude, lst, location.latitude);
            if (!pos) return null;
            return { ...planet, x: pos.x, y: pos.y };
        }).filter(Boolean);
    }, [planets, orientation.azimuth, orientation.altitude, lst, location.latitude]);

    // Handle object press
    const handlePress = useCallback((obj) => {
        onSelectObject?.(obj.data || obj);
    }, [onSelectObject]);

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]} {...panResponder.panHandlers}>
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                {/* Constellation lines */}
                <G opacity={0.5}>
                    {constellationLines.map((line) => (
                        <Line key={line.key} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke={theme.constellation || '#336699'} strokeWidth={1} />
                    ))}
                </G>

                {/* Stars */}
                <G>
                    {visibleStars.map((star) => (
                        <Circle
                            key={star.id}
                            cx={star.x}
                            cy={star.y}
                            r={star.isNearCenter ? star.radius * 1.5 : star.radius}
                            fill={star.color}
                            opacity={star.isNearCenter ? 1 : 0.9}
                            onPress={() => handlePress(star)}
                        />
                    ))}
                </G>

                {/* Planets */}
                <G>
                    {visiblePlanets.map((planet) => (
                        <Circle key={planet.id} cx={planet.x} cy={planet.y} r={7} fill={planet.color} onPress={() => handlePress(planet)} />
                    ))}
                </G>

                {/* Crosshair */}
                <Crosshair theme={theme} />

                {/* Hovered object label */}
                {closestToCenter && closestToCenter.name && (
                    <G>
                        <Rect x={CENTER_X - 60} y={CENTER_Y + CROSSHAIR_SIZE + 10} width={120} height={24} rx={4} fill="rgba(0,0,0,0.7)" />
                        <SvgText x={CENTER_X} y={CENTER_Y + CROSSHAIR_SIZE + 27} textAnchor="middle" fill={theme.text || '#ffffff'} fontSize={14} fontWeight="600">
                            {closestToCenter.name}
                        </SvgText>
                    </G>
                )}
            </Svg>

            {/* Direction indicator */}
            <View style={styles.directionIndicator}>
                <SvgText style={[styles.directionText, { color: theme.text }]}>
                    {`${Math.round(orientation.azimuth)}° ${orientation.altitude > 0 ? '↑' : '↓'}${Math.abs(Math.round(orientation.altitude))}°`}
                </SvgText>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    directionIndicator: {
        position: 'absolute',
        bottom: 100,
        alignSelf: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    directionText: {
        fontSize: 14,
        fontWeight: '600',
    },
});

export default React.memo(StarMap);
