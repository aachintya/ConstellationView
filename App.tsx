/**
 * ConstellationView App
 */

import React from 'react';
import { StatusBar, StyleSheet, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import SkyViewScreen from './src/screens/SkyViewScreen';

function App() {
    return (
        <SafeAreaProvider>
            <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
            <View style={styles.container}>
                <SkyViewScreen />
            </View>
        </SafeAreaProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#0a0a1a',
    },
});

export default App;
