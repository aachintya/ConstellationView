/**
 * Time Travel Controls Component
 * Beautiful wheel-style date/time picker, refactored to use shared components
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

import {
    WheelColumn,
    ITEM_HEIGHT,
    VISIBLE_ITEMS,
    MONTHS,
    generateDays,
    generateMonths,
    generateYears,
    generateHours,
    generateMinutes,
    generateAmPm,
} from './shared';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const formatDate = (date) => {
    const day = date.getDate();
    const month = MONTHS[date.getMonth()];
    const year = date.getFullYear();
    const hours = date.getHours();
    const mins = date.getMinutes().toString().padStart(2, '0');
    const hour12 = hours % 12 || 12;
    const ampm = hours >= 12 ? 'pm' : 'am';
    return `${month} ${day}, ${year} • ${hour12}:${mins}${ampm}`;
};

const TimeTravelControls = ({
    selectedTime,
    onTimeChange,
    isExpanded,
    onToggleExpand
}) => {
    const [showTimePicker, setShowTimePicker] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [playSpeed, setPlaySpeed] = useState(1);
    const animHeight = useRef(new Animated.Value(isExpanded ? 1 : 0)).current;
    const playInterval = useRef(null);

    // Parse current date
    const day = selectedTime.getDate();
    const month = selectedTime.getMonth();
    const year = selectedTime.getFullYear();
    const hours24 = selectedTime.getHours();
    const minutes = selectedTime.getMinutes();
    const hour12 = hours24 % 12 || 12;
    const isPm = hours24 >= 12;

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
                        newTime.setMinutes(newTime.getMinutes() + 10);
                    } else {
                        newTime.setHours(newTime.getHours() + 4);
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

    const updateDate = (newDay, newMonth, newYear) => {
        onTimeChange(prev => {
            const newTime = new Date(prev);
            newTime.setFullYear(newYear);
            newTime.setMonth(newMonth);
            newTime.setDate(newDay);
            return newTime;
        });
    };

    const updateTime = (newHour12, newMinutes, newIsPm) => {
        onTimeChange(prev => {
            const newTime = new Date(prev);
            let hour24 = newHour12;
            if (newIsPm && newHour12 !== 12) hour24 += 12;
            if (!newIsPm && newHour12 === 12) hour24 = 0;
            newTime.setHours(hour24, newMinutes);
            return newTime;
        });
    };

    const resetToNow = () => {
        setIsPlaying(false);
        onTimeChange(new Date());
    };

    const isNow = Math.abs(selectedTime.getTime() - Date.now()) < 60000;

    const expandedHeight = animHeight.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 280],
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
                    {/* Mode toggle buttons */}
                    <View style={styles.modeToggle}>
                        <TouchableOpacity
                            style={[styles.modeBtn, !showTimePicker && styles.modeBtnActive]}
                            onPress={() => setShowTimePicker(false)}
                        >
                            <Text style={styles.modeIcon}>📅</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.modeBtn, showTimePicker && styles.modeBtnActive]}
                            onPress={() => setShowTimePicker(true)}
                        >
                            <Text style={styles.modeIcon}>🕐</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Title */}
                    <Text style={styles.pickerTitle}>
                        {showTimePicker ? 'SCENE TIME' : 'SCENE DATE'}
                    </Text>

                    {/* Wheel Picker */}
                    <View style={styles.wheelContainer}>
                        {!showTimePicker ? (
                            // Date Picker
                            <>
                                <WheelColumn
                                    data={generateDays()}
                                    selectedIndex={day - 1}
                                    onSelect={(idx, val) => updateDate(val, month, year)}
                                    width={60}
                                />
                                <WheelColumn
                                    data={generateMonths()}
                                    selectedIndex={month}
                                    onSelect={(idx) => updateDate(day, idx, year)}
                                    width={80}
                                />
                                <WheelColumn
                                    data={generateYears()}
                                    selectedIndex={year - 2015}
                                    onSelect={(idx, val) => updateDate(day, month, val)}
                                    width={80}
                                />
                            </>
                        ) : (
                            // Time Picker
                            <>
                                <WheelColumn
                                    data={generateHours()}
                                    selectedIndex={hour12 - 1}
                                    onSelect={(idx, val) => updateTime(val, minutes, isPm)}
                                    width={60}
                                />
                                <Text style={styles.timeSeparator}>:</Text>
                                <WheelColumn
                                    data={generateMinutes()}
                                    selectedIndex={minutes}
                                    onSelect={(idx, val) => updateTime(hour12, val, isPm)}
                                    width={60}
                                    formatItem={(m) => m.toString().padStart(2, '0')}
                                />
                                <WheelColumn
                                    data={generateAmPm()}
                                    selectedIndex={isPm ? 1 : 0}
                                    onSelect={(idx) => updateTime(hour12, minutes, idx === 1)}
                                    width={60}
                                />
                            </>
                        )}
                    </View>

                    {/* Clear button */}
                    <TouchableOpacity
                        style={[styles.clearBtn, isNow && styles.clearBtnDisabled]}
                        onPress={resetToNow}
                        disabled={isNow}
                    >
                        <Text style={[styles.clearBtnText, isNow && styles.clearBtnTextDisabled]}>
                            Clear selected date & time
                        </Text>
                    </TouchableOpacity>
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
        alignItems: 'center',
    },
    modeToggle: {
        position: 'absolute',
        right: 16,
        top: 0,
        flexDirection: 'column',
    },
    modeBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.1)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    modeBtnActive: {
        backgroundColor: 'rgba(79, 195, 247, 0.3)',
    },
    modeIcon: {
        fontSize: 20,
    },
    pickerTitle: {
        color: 'rgba(255,255,255,0.5)',
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 2,
        marginBottom: 8,
    },
    wheelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        height: ITEM_HEIGHT * VISIBLE_ITEMS,
        marginBottom: 16,
    },
    timeSeparator: {
        fontSize: 24,
        color: '#fff',
        fontWeight: '600',
        marginHorizontal: 4,
    },
    clearBtn: {
        backgroundColor: 'rgba(79, 195, 247, 0.2)',
        paddingHorizontal: 24,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: 'rgba(79, 195, 247, 0.4)',
    },
    clearBtnDisabled: {
        backgroundColor: 'rgba(255,255,255,0.05)',
        borderColor: 'rgba(255,255,255,0.1)',
    },
    clearBtnText: {
        color: '#4fc3f7',
        fontSize: 14,
        fontWeight: '500',
    },
    clearBtnTextDisabled: {
        color: 'rgba(255,255,255,0.3)',
    },
});

export default memo(TimeTravelControls);
