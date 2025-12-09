/**
 * Info Panel Component
 * Displays details about selected celestial objects
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Animated,
    Dimensions,
} from 'react-native';

import { formatRA, formatDec } from '../utils/astronomy';
import { spacing, borderRadius } from '../styles/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * InfoPanel Component
 * 
 * @param {Object} props
 * @param {Object} props.object - Selected celestial object
 * @param {Function} props.onClose - Callback to close panel
 * @param {Object} props.theme - Theme colors
 * @param {boolean} props.visible - Whether panel is visible
 */
const InfoPanel = ({ object, onClose, theme, visible }) => {
    if (!visible || !object) {
        return null;
    }

    const renderStarInfo = () => (
        <>
            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Constellation
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.constellation || 'Unknown'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Magnitude
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.magnitude?.toFixed(2) || 'N/A'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Distance
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.distance ? `${object.distance} light years` : 'Unknown'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Spectral Type
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.spectralType || 'Unknown'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Right Ascension
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.ra ? formatRA(object.ra) : 'N/A'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Declination
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.dec ? formatDec(object.dec) : 'N/A'}
                </Text>
            </View>
        </>
    );

    const renderPlanetInfo = () => (
        <>
            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Type
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.type?.charAt(0).toUpperCase() + object.type?.slice(1) || 'Planet'}
                </Text>
            </View>

            {object.description && (
                <View style={styles.descriptionContainer}>
                    <Text style={[styles.description, { color: theme.textSecondary }]}>
                        {object.description}
                    </Text>
                </View>
            )}

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Orbital Period
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.orbitalPeriodDays
                        ? object.orbitalPeriodDays > 365
                            ? `${(object.orbitalPeriodDays / 365.25).toFixed(1)} years`
                            : `${object.orbitalPeriodDays.toFixed(1)} days`
                        : 'N/A'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Distance from Sun
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.distanceFromSunAU ? `${object.distanceFromSunAU} AU` : 'N/A'}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Radius
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.radiusKm ? `${object.radiusKm.toLocaleString()} km` : 'N/A'}
                </Text>
            </View>

            {object.phase !== undefined && (
                <View style={styles.row}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        Phase
                    </Text>
                    <Text style={[styles.value, { color: theme.text }]}>
                        {(parseFloat(object.phase) * 100).toFixed(0)}% illuminated
                    </Text>
                </View>
            )}
        </>
    );

    const renderConstellationInfo = () => (
        <>
            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Latin Name
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.latinName || object.name}
                </Text>
            </View>

            <View style={styles.row}>
                <Text style={[styles.label, { color: theme.textSecondary }]}>
                    Meaning
                </Text>
                <Text style={[styles.value, { color: theme.text }]}>
                    {object.meaning || 'Unknown'}
                </Text>
            </View>

            {object.mainStars && object.mainStars.length > 0 && (
                <View style={styles.starsContainer}>
                    <Text style={[styles.label, { color: theme.textSecondary }]}>
                        Main Stars
                    </Text>
                    <Text style={[styles.starsList, { color: theme.text }]}>
                        {object.mainStars.join(', ')}
                    </Text>
                </View>
            )}
        </>
    );

    const getTypeIcon = () => {
        switch (object.type) {
            case 'star':
                return '★';
            case 'planet':
                return object.symbol || '●';
            case 'constellation':
                return '✧';
            default:
                return '•';
        }
    };

    const getTypeColor = () => {
        if (object.type === 'planet' && object.color) {
            return object.color;
        }
        return theme.accent;
    };

    return (
        <View style={[styles.container, { backgroundColor: theme.surface }]}>
            {/* Header */}
            <View style={styles.header}>
                <View style={styles.titleContainer}>
                    <Text style={[styles.typeIcon, { color: getTypeColor() }]}>
                        {getTypeIcon()}
                    </Text>
                    <View>
                        <Text style={[styles.name, { color: theme.text }]}>
                            {object.name}
                        </Text>
                        <Text style={[styles.type, { color: theme.textSecondary }]}>
                            {object.type?.charAt(0).toUpperCase() + object.type?.slice(1)}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity
                    onPress={onClose}
                    style={[styles.closeButton, { backgroundColor: theme.surfaceLight }]}
                >
                    <Text style={[styles.closeText, { color: theme.text }]}>✕</Text>
                </TouchableOpacity>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {object.type === 'star' && renderStarInfo()}
                {object.type === 'planet' && renderPlanetInfo()}
                {object.type === 'constellation' && renderConstellationInfo()}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        borderTopLeftRadius: borderRadius.lg,
        borderTopRightRadius: borderRadius.lg,
        paddingTop: spacing.md,
        paddingBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
        maxHeight: '50%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.md,
    },
    titleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
    },
    typeIcon: {
        fontSize: 32,
        marginRight: spacing.md,
    },
    name: {
        fontSize: 22,
        fontWeight: 'bold',
    },
    type: {
        fontSize: 14,
        marginTop: 2,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeText: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    content: {
        paddingTop: spacing.sm,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    label: {
        fontSize: 14,
    },
    value: {
        fontSize: 14,
        fontWeight: '600',
    },
    descriptionContainer: {
        paddingVertical: spacing.sm,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    description: {
        fontSize: 14,
        lineHeight: 20,
    },
    starsContainer: {
        paddingVertical: spacing.sm,
    },
    starsList: {
        fontSize: 14,
        marginTop: spacing.xs,
        lineHeight: 20,
    },
});

export default InfoPanel;
