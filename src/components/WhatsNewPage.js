/**
 * What's New Page - Shows latest features and updates
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    SafeAreaView,
    Image,
} from 'react-native';

const WhatsNewPage = ({
    visible,
    onClose,
    nightMode = 'off',
}) => {
    if (!visible) return null;

    const accentColor = '#4fc3f7';
    const backgroundColor = '#121218';

    const FeatureItem = ({ icon, title, description }) => (
        <View style={styles.featureItem}>
            <View style={styles.featureIconContainer}>
                <Text style={styles.featureIcon}>{icon}</Text>
            </View>
            <View style={styles.featureContent}>
                <Text style={styles.featureTitle}>{title}</Text>
                <Text style={styles.featureDescription}>{description}</Text>
            </View>
        </View>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <SafeAreaView style={styles.headerSection}>
                    <Text style={styles.headerLabel}>WHAT'S NEW IN SKYVIEW</Text>
                    <Text style={styles.versionText}>Version 1.0.0</Text>
                </SafeAreaView>

                {/* Main Title */}
                <Text style={styles.mainTitle}>Enhanced Accuracy & Manual Calibration</Text>

                {/* Hero Image/Placeholder */}
                <View style={styles.heroImageContainer}>
                    <View style={styles.heroImagePlaceholder}>
                        <Text style={styles.heroImageText}>🌍</Text>
                        <View style={styles.mapOverlay}>
                            <View style={[styles.mapLine, styles.mapLine1]} />
                            <View style={[styles.mapLine, styles.mapLine2]} />
                            <View style={[styles.mapLine, styles.mapLine3]} />
                        </View>
                    </View>
                </View>

                {/* Features */}
                <FeatureItem
                    icon="⚠️"
                    title="World Magnetic Model HR 2025"
                    description="Now using NOAA's high-resolution World Magnetic Model for significantly more accurate magnetic declination calculations and compass alignment worldwide."
                />

                <FeatureItem
                    icon="📡"
                    title="Manual Calibration"
                    description="Correct for magnetic interference in your local area that the WMM cannot account for. Access manual calibration via Scene Controls ≡ to adjust compass alignment and save custom settings."
                />

                {/* Spacer */}
                <View style={styles.spacer} />

                {/* Got it Button */}
                <TouchableOpacity
                    style={[styles.gotItButton, { backgroundColor: 'rgba(255,255,255,0.1)' }]}
                    onPress={onClose}
                >
                    <Text style={[styles.gotItButtonText, { color: accentColor }]}>Got it</Text>
                </TouchableOpacity>

                <View style={styles.bottomSpacer} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 1001,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 60,
        paddingBottom: 40,
    },
    headerSection: {
        marginBottom: 16,
    },
    headerLabel: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
        letterSpacing: 1,
        marginBottom: 4,
    },
    versionText: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
    },
    mainTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: '#fff',
        marginBottom: 24,
        lineHeight: 36,
    },
    heroImageContainer: {
        height: 200,
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 32,
    },
    heroImagePlaceholder: {
        flex: 1,
        backgroundColor: '#1a2a40',
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    heroImageText: {
        fontSize: 80,
        opacity: 0.3,
    },
    mapOverlay: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    mapLine: {
        position: 'absolute',
        height: 2,
        backgroundColor: 'rgba(255,100,100,0.4)',
        borderRadius: 1,
    },
    mapLine1: {
        top: '30%',
        left: '10%',
        width: '80%',
        transform: [{ rotate: '-5deg' }],
    },
    mapLine2: {
        top: '50%',
        left: '5%',
        width: '90%',
        backgroundColor: 'rgba(100,255,100,0.4)',
        transform: [{ rotate: '3deg' }],
    },
    mapLine3: {
        top: '70%',
        left: '15%',
        width: '70%',
        backgroundColor: 'rgba(100,100,255,0.4)',
        transform: [{ rotate: '-2deg' }],
    },
    featureItem: {
        flexDirection: 'row',
        marginBottom: 28,
    },
    featureIconContainer: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    featureIcon: {
        fontSize: 24,
    },
    featureContent: {
        flex: 1,
    },
    featureTitle: {
        fontSize: 17,
        fontWeight: '600',
        color: '#fff',
        marginBottom: 8,
    },
    featureDescription: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.6)',
        lineHeight: 22,
    },
    spacer: {
        flex: 1,
        minHeight: 40,
    },
    gotItButton: {
        borderRadius: 25,
        paddingVertical: 16,
        alignItems: 'center',
        marginTop: 20,
    },
    gotItButtonText: {
        fontSize: 16,
        fontWeight: '600',
    },
    bottomSpacer: {
        height: 20,
    },
});

export default WhatsNewPage;
