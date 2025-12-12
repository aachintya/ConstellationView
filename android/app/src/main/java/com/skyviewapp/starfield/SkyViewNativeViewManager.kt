package com.skyviewapp.starfield

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.common.MapBuilder
import com.facebook.react.uimanager.SimpleViewManager
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.uimanager.events.RCTEventEmitter

/**
 * ViewManager to expose SkyViewNativeView to React Native
 */
class SkyViewNativeViewManager : SimpleViewManager<SkyViewNativeView>() {

    override fun getName(): String = "SkyViewNativeView"

    override fun createViewInstance(reactContext: ThemedReactContext): SkyViewNativeView {
        val view = SkyViewNativeView(reactContext)
        
        // Set up star tap listener
        view.setOnStarTapListener { starData ->
            val event = Arguments.createMap()
            event.putString("id", starData["id"] as? String ?: "")
            event.putString("name", starData["name"] as? String ?: "")
            event.putDouble("magnitude", (starData["magnitude"] as? Number)?.toDouble() ?: 0.0)
            event.putString("spectralType", starData["spectralType"] as? String ?: "")
            event.putString("type", starData["type"] as? String ?: "star")
            event.putDouble("ra", (starData["ra"] as? Number)?.toDouble() ?: 0.0)
            event.putDouble("dec", (starData["dec"] as? Number)?.toDouble() ?: 0.0)
            
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onStarTap", event)
        }
        
        return view
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put("onStarTap", MapBuilder.of("registrationName", "onStarTap"))
            .build()
    }

    @ReactProp(name = "stars")
    fun setStars(view: SkyViewNativeView, stars: ReadableArray?) {
        stars ?: return
        val starList = mutableListOf<Map<String, Any>>()
        for (i in 0 until stars.size()) {
            val starMap = stars.getMap(i) ?: continue
            starList.add(readableMapToMap(starMap))
        }
        view.setStars(starList)
    }

    @ReactProp(name = "constellations")
    fun setConstellations(view: SkyViewNativeView, constellations: ReadableArray?) {
        constellations ?: return
        val constList = mutableListOf<Map<String, Any>>()
        for (i in 0 until constellations.size()) {
            val constMap = constellations.getMap(i) ?: continue
            constList.add(readableMapToMap(constMap))
        }
        view.setConstellations(constList)
    }

    @ReactProp(name = "fov")
    fun setFov(view: SkyViewNativeView, fov: Float) {
        view.setFov(fov)
    }

    @ReactProp(name = "latitude")
    fun setLatitude(view: SkyViewNativeView, latitude: Float) {
        view.setLocation(latitude, 77.2f)
    }

    @ReactProp(name = "longitude")
    fun setLongitude(view: SkyViewNativeView, longitude: Float) {
        view.setLocation(28.6f, longitude)
    }

    @ReactProp(name = "gyroEnabled")
    fun setGyroEnabled(view: SkyViewNativeView, enabled: Boolean) {
        view.setGyroEnabled(enabled)
    }

    @ReactProp(name = "planets")
    fun setPlanets(view: SkyViewNativeView, planets: ReadableArray?) {
        planets ?: return
        val planetList = mutableListOf<Map<String, Any>>()
        for (i in 0 until planets.size()) {
            val planetMap = planets.getMap(i) ?: continue
            planetList.add(readableMapToMap(planetMap))
        }
        view.setPlanets(planetList)
    }

    @ReactProp(name = "nightMode")
    fun setNightMode(view: SkyViewNativeView, mode: String?) {
        view.setNightMode(mode ?: "off")
    }

    @ReactProp(name = "simulatedTime")
    fun setSimulatedTime(view: SkyViewNativeView, timestamp: Double) {
        view.setSimulatedTime(timestamp.toLong())
    }

    @ReactProp(name = "starBrightness")
    fun setStarBrightness(view: SkyViewNativeView, brightness: Float) {
        view.setStarBrightness(brightness)
    }

    @ReactProp(name = "planetScale")
    fun setPlanetScale(view: SkyViewNativeView, scale: Float) {
        view.setPlanetScale(scale)
    }

    private fun readableMapToMap(readableMap: ReadableMap): Map<String, Any> {
        val map = mutableMapOf<String, Any>()
        val iterator = readableMap.keySetIterator()
        while (iterator.hasNextKey()) {
            val key = iterator.nextKey()
            when (readableMap.getType(key)) {
                com.facebook.react.bridge.ReadableType.Null -> {}
                com.facebook.react.bridge.ReadableType.Boolean -> map[key] = readableMap.getBoolean(key)
                com.facebook.react.bridge.ReadableType.Number -> map[key] = readableMap.getDouble(key)
                com.facebook.react.bridge.ReadableType.String -> map[key] = readableMap.getString(key) ?: ""
                com.facebook.react.bridge.ReadableType.Map -> map[key] = readableMapToMap(readableMap.getMap(key)!!)
                com.facebook.react.bridge.ReadableType.Array -> {
                    val array = readableMap.getArray(key)!!
                    val list = mutableListOf<Any>()
                    for (i in 0 until array.size()) {
                        when (array.getType(i)) {
                            com.facebook.react.bridge.ReadableType.String -> list.add(array.getString(i) ?: "")
                            com.facebook.react.bridge.ReadableType.Number -> list.add(array.getDouble(i))
                            com.facebook.react.bridge.ReadableType.Array -> {
                                val innerArray = array.getArray(i) ?: continue
                                val innerList = mutableListOf<String>()
                                for (j in 0 until innerArray.size()) {
                                    innerList.add(innerArray.getString(j) ?: "")
                                }
                                list.add(innerList)
                            }
                            else -> {}
                        }
                    }
                    map[key] = list
                }
            }
        }
        return map
    }
}
