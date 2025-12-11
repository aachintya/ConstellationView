/**
 * Time Travel Controls Component
 * Allows viewing the sky at any date/time with animation controls
 */

import React, { useState, useEffect, useRef, memo } from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    StyleSheet,
    Animated,
    Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const formatDate = (date) => {
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours().toString().padStart(2, '0');
    const mins = date.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${year} • ${hours}:${mins}`;
};

const TimeTravelControls = ({
    selectedTime,
    onTimeChange,
    isExpanded,
    onToggleExpand
}) => {
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1); // 1 = 1hr/sec, 2 = 1day/sec
    const animHeight = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
    const playInterval = useRef(null);

    // Handle expand/collapse animation
    useEffect(() => {
        Animated.spring(animHeight, {
            toValue: isExpanded ? 1 : 0,
            useNativeDriver: false,
            tension: 80,
            friction: 12,
        }).start();
    }, [isExpanded]);

    // Handle play animation
    useEffect(() => {
        if (isPlaying) {
            playInterval.current = setInterval(() => {
                onTimeChange(prev => {
                    const newTime = new Date(prev);
                    if (playSpeed === 1) {
                        newTime.setMinutes(newTime.getMinutes() + 10); // 10 min per 100ms = 1hr/sec
                    } else {
                        newTime.setHours(newTime.getHours() + 4); // 4hr per 100ms = 1day/sec
                    }
                    return newTime;
                });
            }, 100);
        } else {
            if (playInterval.current) {
                clearInterval(playInterval.current);
            }
        }

        return () => {
            if (playInterval.current) {
                clearInterval(playInterval.current);
            }
        };
    }, [isPlaying, playSpeed, onTimeChange]);

    const adjustTime = (unit, amount) => {
        onTimeChange(prev => {
            const newTime = new Date(prev);
            switch (unit) {
                case 'minute':
                    newTime.setMinutes(newTime.getMinutes() + amount);
                    break;
                case 'hour':
                    newTime.setHours(newTime.getHours() + amount);
                    break;
                case 'day':
                    newTime.setDate(newTime.getDate() + amount);
                    break;
                case 'month':
                    newTime.setMonth(newTime.getMonth() + amount);
                    break;
            }
            return newTime;
        });
    };

    const resetToNow = () => {
        setIsPlaying(false);
        onTimeChange(new Date());
    };

    const togglePlay = () => {
        setIsPlaying(prev => !prev);
    };

    const cycleSpeed = () => {
        setPlaySpeed(prev => prev === 1 ? 2 : 1);
    };

    const isNow = Math.abs(selectedTime.getTime() - Date.now()) < 60000;

    const expandedHeight = animHeight.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 140],
    });

    return (
        <View style={styles.container}>
            {/* Header - Always visible */}
            <TouchableOpacity
                style={styles.header}
                onPress={onToggleExpand}
                activeOpacity={0.7}
            >
                <Text style={styles.timeIcon}>🕐</Text>
                <View style={styles.headerText}>
                    <Text style={[styles.dateText, !isNow && styles.dateTextActive]}>
                        {isNow ? 'Now' : formatDate(selectedTime)}
                    </Text>
                    {!isNow && (
                        <Text style={styles.timeTravelLabel}>TIME TRAVEL</Text>
                    )}
                </View>
                <Text style={styles.expandIcon}>{isExpanded ? '▼' : '▲'}</Text>
            </TouchableOpacity>

            {/* Expandable Controls */}
            <Animated.View style={[styles.controlsContainer, { height: expandedHeight }]}>
                <View style={styles.controls}>
                    {/* Date Display */}
                    <Text style={styles.fullDate}>{formatDate(selectedTime)}</Text>

                    {/* Time adjustment buttons - Row 1: Days */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('month', -1)}
                        >
                            <Text style={styles.btnText}>−1M</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('day', -1)}
                        >
                            <Text style={styles.btnText}>−1D</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('day', 1)}
                        >
                            <Text style={styles.btnText}>+1D</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('month', 1)}
                        >
                            <Text style={styles.btnText}>+1M</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Time adjustment buttons - Row 2: Hours */}
                    <View style={styles.buttonRow}>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('hour', -6)}
                        >
                            <Text style={styles.btnText}>−6H</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('hour', -1)}
                        >
                            <Text style={styles.btnText}>−1H</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('hour', 1)}
                        >
                            <Text style={styles.btnText}>+1H</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={styles.adjustBtn}
                            onPress={() => adjustTime('hour', 6)}
                        >
                            <Text style={styles.btnText}>+6H</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Play controls */}
                    <View style={styles.playRow}>
                        <TouchableOpacity
                            style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                            onPress={togglePlay}
                        >
                            <Text style={styles.playBtnText}>
                                {isPlaying ? '⏸' : '▶'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={styles.speedBtn}
                            onPress={cycleSpeed}
                        >
                            <Text style={styles.speedBtnText}>
                                {playSpeed === 1 ? '1hr/s' : '1day/s'}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.nowBtn, isNow && styles.nowBtnDisabled]}
                            onPress={resetToNow}
                            disabled={isNow}
                        >
                            <Text style={[styles.nowBtnText, isNow && styles.nowBtnTextDisabled]}>
                                NOW
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Animated.View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        position: 'absolute',
        bottom: 100,
        left: 10,
        right: 10,
        backgroundColor: 'rgba(10, 15, 30, 0.95)',
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(79, 195, 247, 0.3)',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
    },
    timeIcon: {
        fontSize: 18,
        marginRight: 10,
    },
    headerText: {
        flex: 1,
    },
    dateText: {
        color: 'rgba(255,255,255,0.6)',
        fontSize: 14,
        fontWeight: '500',
    },
    dateTextActive: {
        color: '#4fc3f7',
        fontWeight: '600',
    },
    timeTravelLabel: {
        color: '#4fc3f7',
        fontSize: 9,
        fontWeight: '700',
        letterSpacing: 1,
        marginTop: 2,
    },
    expandIcon: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
    },
    controlsContainer: {
        overflow: 'hidden',
    },
    controls: {
        paddingHorizontal: 16,
        paddingBottom: 16,
    },
    fullDate: {
        color: '#ffffff',
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 12,
        fontWeight: '500',
    },
    buttonRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    adjustBtn: {
        flex: 1,
        marginHorizontal: 4,
        paddingVertical: 8,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 8,
        alignItems: 'center',
    },
    btnText: {
        color: '#ffffff',
        fontSize: 12,
        fontWeight: '600',
    },
    playRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 4,
    },
    playBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(79, 195, 247, 0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
    },
    playBtnActive: {
        backgroundColor: '#4fc3f7',
    },
    playBtnText: {
        fontSize: 18,
    },
    speedBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        backgroundColor: 'rgba(255,255,255,0.1)',
        borderRadius: 12,
        marginHorizontal: 8,
    },
    speedBtnText: {
        color: '#4fc3f7',
        fontSize: 11,
        fontWeight: '600',
    },
    nowBtn: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#4fc3f7',
        borderRadius: 16,
        marginHorizontal: 8,
    },
    nowBtnDisabled: {
        backgroundColor: 'rgba(255,255,255,0.1)',
    },
    nowBtnText: {
        color: '#000',
        fontSize: 12,
        fontWeight: '700',
    },
    nowBtnTextDisabled: {
        color: 'rgba(255,255,255,0.4)',
    },
});

export default memo(TimeTravelControls);
