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
            event.putString("constellation", starData["constellation"] as? String ?: "")
            event.putDouble("distance", (starData["distance"] as? Number)?.toDouble() ?: 0.0)
            event.putString("type", starData["type"] as? String ?: "star")
            event.putDouble("ra", (starData["ra"] as? Number)?.toDouble() ?: 0.0)
            event.putDouble("dec", (starData["dec"] as? Number)?.toDouble() ?: 0.0)
            
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onStarTap", event)
        }
        
        // Set up button press listeners
        view.setOnMenuPressListener {
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onMenuPress", Arguments.createMap())
        }
        
        view.setOnSearchPressListener {
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onSearchPress", Arguments.createMap())
        }
        
        view.setOnSharePressListener {
            reactContext.getJSModule(RCTEventEmitter::class.java)
                .receiveEvent(view.id, "onSharePress", Arguments.createMap())
        }
        
        return view
    }

    override fun getExportedCustomDirectEventTypeConstants(): Map<String, Any> {
        return MapBuilder.builder<String, Any>()
            .put("onStarTap", MapBuilder.of("registrationName", "onStarTap"))
            .put("onMenuPress", MapBuilder.of("registrationName", "onMenuPress"))
            .put("onSearchPress", MapBuilder.of("registrationName", "onSearchPress"))
            .put("onSharePress", MapBuilder.of("registrationName", "onSharePress"))
            .build()
    }

    @ReactProp(name = "stars")
    fun setStars(view: SkyViewNativeView, stars: ReadableArray?) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setStars called with ${stars?.size() ?: 0} items")
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
        android.util.Log.d("DEBUG_FLICKER", ">>> setConstellations called with ${constellations?.size() ?: 0} items")
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
        android.util.Log.d("DEBUG_FLICKER", ">>> setFov called: $fov")
        view.setFov(fov)
    }

    @ReactProp(name = "latitude")
    fun setLatitude(view: SkyViewNativeView, latitude: Float) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setLatitude called: $latitude")
        view.setLocation(latitude, 77.2f)
    }

    @ReactProp(name = "longitude")
    fun setLongitude(view: SkyViewNativeView, longitude: Float) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setLongitude called: $longitude")
        view.setLocation(28.6f, longitude)
    }

    @ReactProp(name = "gyroEnabled")
    fun setGyroEnabled(view: SkyViewNativeView, enabled: Boolean) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setGyroEnabled called: $enabled")
        view.setGyroEnabled(enabled)
    }

    @ReactProp(name = "cardinalPointsVisible")
    fun setCardinalPointsVisible(view: SkyViewNativeView, visible: Boolean) {
        view.setCardinalPointsVisible(visible)
    }

    @ReactProp(name = "azimuthalGridVisible")
    fun setAzimuthalGridVisible(view: SkyViewNativeView, visible: Boolean) {
        view.setAzimuthalGridVisible(visible)
    }

    @ReactProp(name = "showConstellationArtwork")
    fun setShowConstellationArtwork(view: SkyViewNativeView, visible: Boolean) {
        view.setShowConstellationArtwork(visible)
    }

    @ReactProp(name = "showConstellationLines")
    fun setShowConstellationLines(view: SkyViewNativeView, visible: Boolean) {
        view.setShowConstellationLines(visible)
    }

    @ReactProp(name = "planets")
    fun setPlanets(view: SkyViewNativeView, planets: ReadableArray?) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setPlanets called with ${planets?.size() ?: 0} items")
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
        android.util.Log.d("DEBUG_FLICKER", ">>> setNightMode called: $mode")
        view.setNightMode(mode ?: "off")
    }

    @ReactProp(name = "simulatedTime")
    fun setSimulatedTime(view: SkyViewNativeView, timestamp: Double) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setSimulatedTime called: $timestamp")
        view.setSimulatedTime(timestamp.toLong())
    }

    @ReactProp(name = "starBrightness")
    fun setStarBrightness(view: SkyViewNativeView, brightness: Float) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setStarBrightness called: $brightness")
        view.setStarBrightness(brightness)
    }

    @ReactProp(name = "planetScale")
    fun setPlanetScale(view: SkyViewNativeView, scale: Float) {
        android.util.Log.d("DEBUG_FLICKER", ">>> setPlanetScale called: $scale")
        view.setPlanetScale(scale)
    }
    
    @ReactProp(name = "navigateToCoordinates")
    fun setNavigateToCoordinates(view: SkyViewNativeView, coords: ReadableMap?) {
        coords ?: return
        val ra = coords.getDouble("ra")
        val dec = coords.getDouble("dec")
        android.util.Log.d("SkyViewManager", ">>> navigateToCoordinates: ra=$ra, dec=$dec")
        view.navigateToCoordinates(ra, dec)
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
