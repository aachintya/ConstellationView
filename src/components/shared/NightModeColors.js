/**
 * Night Mode Colors - Shared color utility
 * Returns themed color schemes for red, green, or off modes
 */

export const getNightModeColors = (nightMode) => {
    switch (nightMode) {
        case 'red':
            return {
                primary: '#ff4444',
                text: '#ff8888',
                textDim: 'rgba(255, 100, 100, 0.5)',
                background: '#1a0505',
                surface: '#2a0a0a',
                border: 'rgba(255, 100, 100, 0.2)',
            };
        case 'green':
            return {
                primary: '#44ff44',
                text: '#88ff88',
                textDim: 'rgba(100, 255, 100, 0.5)',
                background: '#051a05',
                surface: '#0a2a0a',
                border: 'rgba(100, 255, 100, 0.2)',
            };
        default:
            return {
                primary: '#4fc3f7',
                text: '#fff',
                textDim: 'rgba(255, 255, 255, 0.5)',
                background: '#0a0a0f',
                surface: 'rgba(255,255,255,0.08)',
                border: 'rgba(255, 255, 255, 0.1)',
            };
    }
};

export default getNightModeColors;
