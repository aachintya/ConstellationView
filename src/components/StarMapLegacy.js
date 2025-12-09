/**
 * Main 2D Star Map Component
 * Renders stars, constellations, and planets using react-native-svg
 */

import React, { useMemo, useCallback } from 'react';
import { View, StyleSheet, Dimensions } from 'react-native';
import Svg, { Circle, Line, Text as SvgText, G, Defs, RadialGradient, Stop } from 'react-native-svg';

import {
    equatorialToHorizontal,
    horizontalToScreen,
    normalizeAngle,
} from '../utils/coordinates';
import {
    getStarRadius,
    getStarColor,
} from '../utils/astronomy';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const FIELD_OF_VIEW = 60; // degrees

/**
 * StarMap Component
 * 
 * @param {Object} props
 * @param {Object} props.orientation - Current device orientation {azimuth, altitude}
 * @param {Object} props.location - Observer location {latitude, longitude}
 * @param {Array} props.stars - Star data array
 * @param {Array} props.constellations - Constellation data array
 * @param {Array} props.planets - Planet data array
 * @param {Object} props.starMap - Star lookup by ID
 * @param {Function} props.onSelectObject - Callback when object is tapped
 * @param {Object} props.selectedObject - Currently selected object
 * @param {boolean} props.showConstellations - Whether to show constellation lines
 * @param {boolean} props.showLabels - Whether to show star/planet labels
 * @param {Object} props.theme - Theme colors
 */
const StarMap = ({
    orientation,
    location,
    stars = [],
    constellations = [],
    planets = [],
    starMap = {},
    onSelectObject,
    selectedObject,
    showConstellations = true,
    showLabels = true,
    theme,
}) => {
    const date = useMemo(() => new Date(), []);

    // Convert all stars to screen coordinates
    const visibleStars = useMemo(() => {
        return stars.map(star => {
            // Convert RA/Dec to horizontal coordinates
            const { altitude, azimuth } = equatorialToHorizontal(
                star.ra,
                star.dec,
                location.latitude,
                location.longitude,
                date
            );

            // Only show stars above horizon
            if (altitude < 0) {
                return null;
            }

            // Convert to screen coordinates
            const screen = horizontalToScreen(
                azimuth,
                altitude,
                orientation.azimuth,
                orientation.altitude,
                FIELD_OF_VIEW,
                SCREEN_WIDTH,
                SCREEN_HEIGHT
            );

            if (!screen.visible) {
                return null;
            }

            return {
                ...star,
                screenX: screen.x,
                screenY: screen.y,
                radius: getStarRadius(star.magnitude),
                color: getStarColor(star.spectralType),
            };
        }).filter(Boolean);
    }, [stars, location, date, orientation]);

    // Convert planets to screen coordinates
    const visiblePlanets = useMemo(() => {
        return planets.map(planet => {
            if (!planet.ra || planet.id === 'sun') return null; // Don't show sun

            const { altitude, azimuth } = equatorialToHorizontal(
                planet.ra,
                planet.dec,
                location.latitude,
                location.longitude,
                date
            );

            if (altitude < 0) return null;

            const screen = horizontalToScreen(
                azimuth,
                altitude,
                orientation.azimuth,
                orientation.altitude,
                FIELD_OF_VIEW,
                SCREEN_WIDTH,
                SCREEN_HEIGHT
            );

            if (!screen.visible) return null;

            return {
                ...planet,
                screenX: screen.x,
                screenY: screen.y,
                radius: 6, // Planets appear larger
            };
        }).filter(Boolean);
    }, [planets, location, date, orientation]);

    // Get constellation lines with screen coordinates
    const constellationLines = useMemo(() => {
        if (!showConstellations) return [];

        const lines = [];

        constellations.forEach(constellation => {
            if (!constellation.lines) return;

            constellation.lines.forEach(([star1Id, star2Id]) => {
                const star1 = starMap[star1Id];
                const star2 = starMap[star2Id];

                if (!star1 || !star2) return;

                // Get positions for both stars
                const pos1 = equatorialToHorizontal(
                    star1.ra, star1.dec,
                    location.latitude, location.longitude, date
                );
                const pos2 = equatorialToHorizontal(
                    star2.ra, star2.dec,
                    location.latitude, location.longitude, date
                );

                // Skip if either star is below horizon
                if (pos1.altitude < 0 || pos2.altitude < 0) return;

                const screen1 = horizontalToScreen(
                    pos1.azimuth, pos1.altitude,
                    orientation.azimuth, orientation.altitude,
                    FIELD_OF_VIEW, SCREEN_WIDTH, SCREEN_HEIGHT
                );
                const screen2 = horizontalToScreen(
                    pos2.azimuth, pos2.altitude,
                    orientation.azimuth, orientation.altitude,
                    FIELD_OF_VIEW, SCREEN_WIDTH, SCREEN_HEIGHT
                );

                // Only draw if at least one endpoint is visible
                if (screen1.visible || screen2.visible) {
                    lines.push({
                        x1: screen1.x,
                        y1: screen1.y,
                        x2: screen2.x,
                        y2: screen2.y,
                        constellation: constellation.name,
                    });
                }
            });
        });

        return lines;
    }, [constellations, starMap, location, date, orientation, showConstellations]);

    // Handle tap on object
    const handleStarPress = useCallback((star) => {
        if (onSelectObject) {
            onSelectObject({ type: 'star', ...star });
        }
    }, [onSelectObject]);

    const handlePlanetPress = useCallback((planet) => {
        if (onSelectObject) {
            onSelectObject({ type: 'planet', ...planet });
        }
    }, [onSelectObject]);

    // Render compass directions
    const renderCompass = () => {
        const directions = [
            { label: 'N', azimuth: 0 },
            { label: 'E', azimuth: 90 },
            { label: 'S', azimuth: 180 },
            { label: 'W', azimuth: 270 },
        ];

        return directions.map(({ label, azimuth }) => {
            const screen = horizontalToScreen(
                azimuth,
                5, // Near horizon
                orientation.azimuth,
                orientation.altitude,
                FIELD_OF_VIEW,
                SCREEN_WIDTH,
                SCREEN_HEIGHT
            );

            if (!screen.visible) return null;

            return (
                <SvgText
                    key={label}
                    x={screen.x}
                    y={screen.y}
                    fill={theme.compass}
                    fontSize={18}
                    fontWeight="bold"
                    textAnchor="middle"
                >
                    {label}
                </SvgText>
            );
        });
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.background }]}>
            <Svg width={SCREEN_WIDTH} height={SCREEN_HEIGHT}>
                <Defs>
                    <RadialGradient id="starGlow" cx="50%" cy="50%" r="50%">
                        <Stop offset="0%" stopColor="#FFFFFF" stopOpacity="1" />
                        <Stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
                    </RadialGradient>
                </Defs>

                {/* Constellation lines */}
                <G>
                    {constellationLines.map((line, index) => (
                        <Line
                            key={`line-${index}`}
                            x1={line.x1}
                            y1={line.y1}
                            x2={line.x2}
                            y2={line.y2}
                            stroke={theme.constellation}
                            strokeWidth={1}
                        />
                    ))}
                </G>

                {/* Stars */}
                <G>
                    {visibleStars.map((star) => (
                        <G key={star.id}>
                            <Circle
                                cx={star.screenX}
                                cy={star.screenY}
                                r={star.radius}
                                fill={star.color}
                                opacity={selectedObject?.id === star.id ? 1 : 0.9}
                                onPress={() => handleStarPress(star)}
                            />
                            {/* Selection ring */}
                            {selectedObject?.id === star.id && (
                                <Circle
                                    cx={star.screenX}
                                    cy={star.screenY}
                                    r={star.radius + 8}
                                    stroke={theme.accent}
                                    strokeWidth={2}
                                    fill="transparent"
                                />
                            )}
                            {/* Labels for bright stars */}
                            {showLabels && star.magnitude < 1.5 && star.name && (
                                <SvgText
                                    x={star.screenX + star.radius + 5}
                                    y={star.screenY + 4}
                                    fill={theme.textSecondary}
                                    fontSize={11}
                                >
                                    {star.name}
                                </SvgText>
                            )}
                        </G>
                    ))}
                </G>

                {/* Planets */}
                <G>
                    {visiblePlanets.map((planet) => (
                        <G key={planet.id}>
                            <Circle
                                cx={planet.screenX}
                                cy={planet.screenY}
                                r={planet.radius}
                                fill={planet.color}
                                onPress={() => handlePlanetPress(planet)}
                            />
                            {/* Planet ring */}
                            <Circle
                                cx={planet.screenX}
                                cy={planet.screenY}
                                r={planet.radius + 2}
                                stroke={planet.color}
                                strokeWidth={1}
                                fill="transparent"
                                opacity={0.5}
                            />
                            {/* Selection ring */}
                            {selectedObject?.id === planet.id && (
                                <Circle
                                    cx={planet.screenX}
                                    cy={planet.screenY}
                                    r={planet.radius + 10}
                                    stroke={theme.accent}
                                    strokeWidth={2}
                                    fill="transparent"
                                />
                            )}
                            {/* Planet label */}
                            {showLabels && (
                                <SvgText
                                    x={planet.screenX + planet.radius + 6}
                                    y={planet.screenY + 4}
                                    fill={planet.color}
                                    fontSize={12}
                                    fontWeight="bold"
                                >
                                    {planet.name}
                                </SvgText>
                            )}
                        </G>
                    ))}
                </G>

                {/* Compass directions */}
                <G>
                    {renderCompass()}
                </G>
            </Svg>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
});

export default StarMap;
