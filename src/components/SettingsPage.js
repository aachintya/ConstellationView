/**
 * Settings Page - Full screen settings with premium banner, sections, and app info
 */

import React from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ScrollView,
    StatusBar,
    Image,
    Linking,
    Share,
    SafeAreaView,
} from 'react-native';

const SettingsPage = ({ visible, onClose, nightMode = 'off' }) => {
    if (!visible) return null;

    const accentColor = nightMode === 'red' ? '#ff4466' : nightMode === 'green' ? '#44ff66' : '#e91e8c';
    const backgroundColor = '#121218';
    const textColor = '#fff';
    const dimTextColor = 'rgba(255,255,255,0.5)';

    const handleReviewPress = () => {
        // Open Google Play Store
        Linking.openURL('https://play.google.com/store/apps/details?id=com.skyviewapp');
    };

    const handleSharePress = async () => {
        try {
            await Share.share({
                message: 'Check out SkyView - an amazing star gazing app! https://play.google.com/store/apps/details?id=com.skyviewapp',
            });
        } catch (error) {
            console.log('Share error:', error);
        }
    };

    const handleFeedbackPress = () => {
        Linking.openURL('mailto:support@skyviewapp.com?subject=SkyView Feedback');
    };

    const SettingItem = ({ icon, label, onPress }) => (
        <TouchableOpacity style={styles.settingItem} onPress={onPress} activeOpacity={0.6}>
            <View style={[styles.iconContainer, { borderColor: accentColor }]}>
                <Text style={styles.icon}>{icon}</Text>
            </View>
            <Text style={styles.settingLabel}>{label}</Text>
        </TouchableOpacity>
    );

    const SectionHeader = ({ title }) => (
        <Text style={styles.sectionHeader}>{title}</Text>
    );

    return (
        <View style={[styles.container, { backgroundColor }]}>
            <StatusBar barStyle="light-content" backgroundColor={backgroundColor} />

            {/* Header */}
            <SafeAreaView style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={onClose}>
                    <Text style={styles.backArrow}>←</Text>
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Settings</Text>
                <View style={styles.headerSpacer} />
            </SafeAreaView>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Premium Banner */}
                <View style={styles.premiumBanner}>
                    <View style={styles.premiumGradient}>
                        <View style={styles.premiumContent}>
                            <View style={styles.premiumIcon}>
                                <Text style={styles.premiumIconText}>🔭</Text>
                            </View>
                            <View style={styles.premiumTextContainer}>
                                <Text style={styles.premiumTitle}>Upgrade to SkyView</Text>
                                <Text style={styles.premiumTitleBold}>Premium</Text>
                                <Text style={styles.premiumSubtitle}>One-time purchase · No ads ·</Text>
                                <Text style={styles.premiumSubtitle}>1,100+ more objects</Text>
                            </View>
                            <TouchableOpacity style={styles.upgradeButton}>
                                <Text style={styles.upgradeButtonText}>Upgrade</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Settings Section */}
                <SettingItem icon="📊" label="Display" onPress={() => { }} />
                <SettingItem icon="📍" label="Location" onPress={() => { }} />
                <SettingItem icon="🎵" label="Music & Sounds" onPress={() => { }} />

                {/* Support Us Section */}
                <SectionHeader title="Support Us" />
                <SettingItem icon="⭐" label="Review on Google Play" onPress={handleReviewPress} />
                <SettingItem icon="📤" label="Share with Friends" onPress={handleSharePress} />
                <SettingItem icon="💬" label="Send Feedback" onPress={handleFeedbackPress} />

                {/* Information Section */}
                <SectionHeader title="Information" />
                <SettingItem icon="📰" label="What's New" onPress={() => { }} />
                <SettingItem icon="🔒" label="Privacy" onPress={() => { }} />
                <SettingItem icon="❓" label="Help" onPress={() => { }} />
                <SettingItem icon="ℹ️" label="About" onPress={() => { }} />
                <SettingItem icon="🏛️" label="Acknowledgements" onPress={() => { }} />

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.appIconContainer}>
                        <Text style={styles.appIcon}>🌌</Text>
                    </View>
                    <Text style={styles.versionText}>SkyView® Lite v1.0.0 (1)</Text>
                </View>
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
        zIndex: 1000,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 16,
        paddingTop: 48,
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backArrow: {
        fontSize: 24,
        color: '#fff',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '600',
        color: '#fff',
        marginLeft: 8,
    },
    headerSpacer: {
        flex: 1,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 16,
        paddingBottom: 40,
    },
    premiumBanner: {
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 24,
    },
    premiumGradient: {
        backgroundColor: '#2a1f3d',
        backgroundImage: 'linear-gradient(135deg, #1a1030 0%, #3d2060 50%, #1a1030 100%)',
        padding: 20,
    },
    premiumContent: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    premiumIcon: {
        width: 60,
        height: 60,
        borderRadius: 12,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    premiumIconText: {
        fontSize: 32,
    },
    premiumTextContainer: {
        flex: 1,
    },
    premiumTitle: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '400',
    },
    premiumTitleBold: {
        fontSize: 18,
        color: '#fff',
        fontWeight: '700',
        marginBottom: 4,
    },
    premiumSubtitle: {
        fontSize: 12,
        color: 'rgba(255,255,255,0.7)',
    },
    upgradeButton: {
        backgroundColor: '#00bcd4',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 25,
    },
    upgradeButtonText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
    },
    iconContainer: {
        width: 40,
        height: 40,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    icon: {
        fontSize: 22,
    },
    settingLabel: {
        fontSize: 16,
        color: '#fff',
        fontWeight: '400',
    },
    sectionHeader: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
        fontWeight: '500',
        marginTop: 24,
        marginBottom: 8,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    footer: {
        alignItems: 'center',
        marginTop: 40,
        paddingBottom: 20,
    },
    appIconContainer: {
        width: 80,
        height: 80,
        borderRadius: 16,
        backgroundColor: '#1a1a2e',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.1)',
    },
    appIcon: {
        fontSize: 40,
    },
    versionText: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.5)',
    },
});

export default SettingsPage;
