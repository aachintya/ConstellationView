/**
 * StarInfoBar - Bottom info bar showing tapped star details
 */
import React from 'react';
import { View, Text, TouchableOpacity, Animated, StyleSheet } from 'react-native';

const StarInfoBar = ({
    star,
    showModal,
    translateY,
    opacity,
    onInfoPress,
    onDismiss,
}) => {
    if (!star || showModal) return null;

    const subtitle = star.type === 'planet' ? 'Planet' :
        star.constellation ? `Star in ${star.constellation}` :
            star.spectralType ? `Star (${star.spectralType}-class)` : 'Star';

    return (
        <Animated.View style={[
            styles.container,
            { transform: [{ translateY }], opacity }
        ]}>
            <View style={styles.content}>
                <Text style={styles.name}>{star.name || star.id}</Text>
                <Text style={styles.subtitle}>{subtitle}</Text>
            </View>
            <View style={styles.buttons}>
                <TouchableOpacity style={styles.infoButton} onPress={onInfoPress} activeOpacity={0.7}>
                    <Text style={styles.infoButtonText}>ℹ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.closeButton} onPress={onDismiss} activeOpacity={0.7}>
                    <Text style={styles.closeButtonText}>✕</Text>
                </TouchableOpacity>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(15, 25, 45, 0.98)',
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 18,
        paddingBottom: 36,
        borderTopWidth: 1,
        borderTopColor: 'rgba(79, 195, 247, 0.4)',
        shadowColor: '#4fc3f7',
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        elevation: 20,
    },
    content: { flex: 1 },
    name: {
        color: '#4fc3f7',
        fontSize: 22,
        fontWeight: '600',
        marginBottom: 4,
    },
    subtitle: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
    },
    buttons: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    infoButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#4fc3f7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    infoButtonText: {
        color: '#000',
        fontSize: 22,
        fontWeight: '700',
    },
    closeButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    closeButtonText: {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 18,
    },
});

export default StarInfoBar;
