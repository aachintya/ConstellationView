/**
 * SkyView App - Main Entry Point
 * A 2D star map application with gyroscope-based navigation
 */

import React from 'react';
import { LogBox } from 'react-native';

import SkyViewScreen from './screens/SkyViewScreen';

// Ignore specific warnings that might come from libraries
LogBox.ignoreLogs([
    'Sending `accelerometerUpdates`',
    'Sending `magnetometerUpdates`',
]);

const App = () => {
    return <SkyViewScreen />;
};

export default App;


