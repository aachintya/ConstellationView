/**
 * Theme configuration with night mode support
 */

export const lightTheme = {
    background: '#0A0A1A',  // Deep space blue-black
    surface: 'rgba(20, 20, 40, 0.95)',
    surfaceLight: 'rgba(40, 40, 70, 0.8)',
    text: '#FFFFFF',
    textSecondary: '#B0B0C0',
    textMuted: '#707080',
    accent: '#4A90D9',
    accentLight: '#6AA8E8',
    star: '#FFFFFF',
    constellation: 'rgba(100, 140, 200, 0.4)',
    constellationBright: 'rgba(100, 140, 200, 0.7)',
    grid: 'rgba(60, 80, 120, 0.2)',
    horizon: '#2A3A5A',
    compass: '#FFD700',
};

export const nightTheme = {
    background: '#0A0000',  // Pure dark with red tint
    surface: 'rgba(30, 10, 10, 0.95)',
    surfaceLight: 'rgba(50, 20, 20, 0.8)',
    text: '#FF6B6B',
    textSecondary: '#CC5555',
    textMuted: '#883333',
    accent: '#FF4444',
    accentLight: '#FF6666',
    star: '#FF8888',
    constellation: 'rgba(150, 60, 60, 0.4)',
    constellationBright: 'rgba(180, 80, 80, 0.7)',
    grid: 'rgba(100, 40, 40, 0.2)',
    horizon: '#3A1A1A',
    compass: '#FF8C00',
};

export const getTheme = (isNightMode) => isNightMode ? nightTheme : lightTheme;

export const fonts = {
    regular: 'System',
    bold: 'System',
    mono: 'Courier',
};

export const spacing = {
    xs: 4,
    sm: 8,
    md: 16,
    lg: 24,
    xl: 32,
};

export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 20,
    full: 999,
};

export default {
    lightTheme,
    nightTheme,
    getTheme,
    fonts,
    spacing,
    borderRadius,
};
