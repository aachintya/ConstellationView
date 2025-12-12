package com.skyviewapp

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager
import com.skyviewapp.sensors.SkyViewSensorModule
import com.skyviewapp.starfield.SkyViewNativeViewManager

/**
 * React Native Package that registers the SkyView native modules and views
 */
class SkyViewPackage : ReactPackage {

    override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> {
        return listOf(
            SkyViewSensorModule(reactContext)
        )
    }

    override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> {
        return listOf(
            SkyViewNativeViewManager()
        )
    }
}
