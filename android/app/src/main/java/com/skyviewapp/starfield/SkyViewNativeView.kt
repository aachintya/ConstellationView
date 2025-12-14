package com.skyviewapp.starfield

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.MotionEvent
import android.widget.FrameLayout
import com.skyviewapp.starfield.data.ConstellationDataLoader
import com.skyviewapp.starfield.input.GestureHandler
import com.skyviewapp.starfield.managers.CelestialDataManager
import com.skyviewapp.starfield.managers.CrosshairManager
import com.skyviewapp.starfield.managers.DynamicStarManager
import com.skyviewapp.starfield.managers.TextureManager
import com.skyviewapp.starfield.projection.CoordinateProjector
import com.skyviewapp.starfield.rendering.OverlayView
import com.skyviewapp.starfield.sensors.OrientationManager

/**
 * Native Star Field View - High-performance OpenGL ES 3.0 rendering
 * 
 * Main orchestrator that delegates to specialized managers:
 * - CelestialDataManager: stars, planets, constellations
 * - CrosshairManager: object detection and label updates
 * - TextureManager: asset loading
 */
class SkyViewNativeView(context: Context) : FrameLayout(context) {
    companion object {
        private const val TAG = "SkyViewNativeView"
    }

    // Child views
    private val glSkyView: GLSkyView
    private val overlayView: OverlayView

    // Managers
    private val dataManager: CelestialDataManager
    private val dynamicStarManager: DynamicStarManager
    private val crosshairManager: CrosshairManager
    private val textureManager: TextureManager
    private val projector = CoordinateProjector()

    // Event listeners
    private var onStarTapListener: ((Map<String, Any?>) -> Unit)? = null

    // Settings
    private var gyroEnabled = true
    private var nightMode = "off"
    private var fov = 75f
    private var latitude = 28.6f
    private var longitude = 77.2f
    private var simulatedTime = System.currentTimeMillis()
    private var starBrightness = 0.5f
    private var planetScale = 0.5f

    // Modules
    private lateinit var gestureHandler: GestureHandler
    private lateinit var orientationManager: OrientationManager

    // Handler for UI updates
    private val uiHandler = Handler(Looper.getMainLooper())
    private val crosshairUpdateRunnable = object : Runnable {
        override fun run() {
            crosshairManager.updateCrosshairInfo(
                dynamicStarManager.getVisibleStars(),
                dataManager.planets,
                dynamicStarManager.starMap,
                width, height
            )
            uiHandler.postDelayed(this, 100)
        }
    }
    
    // Inertia update runnable - runs at ~60fps for smooth scrolling
    private val inertiaUpdateRunnable = object : Runnable {
        override fun run() {
            if (::gestureHandler.isInitialized && gestureHandler.updateInertia()) {
                // Inertia is still active, schedule next frame
                uiHandler.postDelayed(this, 16)  // ~60fps
            }
            // If inertia stopped, don't reschedule - will be started again on next fling
        }
    }

    init {
        setWillNotDraw(true)

        // Create child views
        glSkyView = GLSkyView(context)
        addView(glSkyView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        overlayView = OverlayView(context)
        addView(overlayView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        // Create managers
        val constellationLoader = ConstellationDataLoader(context)
        dataManager = CelestialDataManager(glSkyView, constellationLoader)
        dynamicStarManager = DynamicStarManager(glSkyView)
        crosshairManager = CrosshairManager(projector, overlayView)
        textureManager = TextureManager(context, glSkyView, overlayView)
        
        // Connect dynamic star manager to data manager
        dynamicStarManager.onStarsUpdated = {
            // Update constellation lines when stars change
            // NOTE: Use ALL stars from dataManager for constellation anchors, not filtered visible stars
            if (dataManager.constellationArtworks.isNotEmpty() && dataManager.stars.isNotEmpty()) {
                glSkyView.setConstellationArtworks(
                    dataManager.constellationArtworks, 
                    dataManager.stars  // Use ALL stars for anchor lookups
                )
            }
        }

        initModules()
        textureManager.loadConstellationTextures()

        // Initialize celestial coordinate transformation
        projector.updateLst(simulatedTime)
        glSkyView.setLatitude(latitude)
        glSkyView.setLst(projector.lst)

        Log.d(TAG, "SkyViewNativeView initialized with modular architecture")
    }

    // ============= Listener Setup =============

    fun setOnStarTapListener(listener: (Map<String, Any?>) -> Unit) {
        onStarTapListener = listener
    }

    fun setOnMenuPressListener(listener: () -> Unit) {
        overlayView.onMenuPress = listener
    }

    fun setOnSearchPressListener(listener: () -> Unit) {
        overlayView.onSearchPress = listener
    }

    fun setOnSharePressListener(listener: () -> Unit) {
        overlayView.onSharePress = listener
    }

    // ============= Module Initialization =============

    private fun initModules() {
        orientationManager = OrientationManager(context) { azimuth, altitude ->
            projector.smoothAzimuth = azimuth
            projector.smoothAltitude = altitude
            glSkyView.setOrientation(azimuth, altitude)
        }

        gestureHandler = GestureHandler(
            context = context,
            view = this,
            onFovChange = { newFov ->
                val oldFov = fov
                fov = newFov
                projector.fov = newFov
                glSkyView.setFov(newFov)
                // Update visible stars based on new FOV
                dynamicStarManager.updateVisibleStars(newFov)
                
                // Debug logging for significant FOV changes
                if (kotlin.math.abs(oldFov - newFov) > 1f || newFov < 10f) {
                    Log.d(TAG, "FOV changed: ${"%.2f".format(oldFov)}° -> ${"%.2f".format(newFov)}°")
                }
            },
            onOrientationChange = { azimuth, altitude ->
                projector.smoothAzimuth = azimuth
                projector.smoothAltitude = altitude
                glSkyView.setOrientation(azimuth, altitude)
            },
            onStarTap = { star ->
                crosshairManager.setSelectedStar(star)
                star?.let {
                    Log.d(TAG, "Tapped star: ${it.name ?: it.id}")
                    glSkyView.triggerTapRipple(it.x, it.y, it.z)
                    onStarTapListener?.invoke(it.toEventMap())
                }
            },
            onPlanetTap = { planet ->
                crosshairManager.clearSelection()
                planet?.let {
                    Log.d(TAG, "Tapped planet: ${it.name}")
                    glSkyView.triggerTapRipple(it.x, it.y, it.z)
                    onStarTapListener?.invoke(it.toEventMap())
                }
            },
            getStars = { dynamicStarManager.getVisibleStars() },
            getPlanets = { dataManager.planets },
            isGyroEnabled = { gyroEnabled }
        )

        glSkyView.setGestureHandler(gestureHandler)
    }

    // ============= Touch Handling =============

    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        if (overlayView.isTouchOnButton(ev.x, ev.y)) {
            Log.d(TAG, "Intercepting touch for button at (${ev.x}, ${ev.y})")
            return false
        }
        return super.onInterceptTouchEvent(ev)
    }

    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        if (overlayView.isTouchOnButton(ev.x, ev.y)) {
            Log.d(TAG, "Dispatching button touch to overlay")
            if (overlayView.onTouchEvent(ev)) return true
        }
        return super.dispatchTouchEvent(ev)
    }

    override fun onTouchEvent(event: MotionEvent): Boolean {
        val handled = gestureHandler.handleTouchEvent(event)
        
        // Start inertia loop on touch release if inertia is active
        if (event.actionMasked == MotionEvent.ACTION_UP && gestureHandler.isInertiaActive()) {
            Log.d(TAG, "Starting inertia runnable loop")
            uiHandler.removeCallbacks(inertiaUpdateRunnable)
            uiHandler.post(inertiaUpdateRunnable)
        }
        
        return handled || super.onTouchEvent(event)
    }

    // ============= Public API for ViewManager =============

    fun setNightMode(mode: String) {
        nightMode = mode.lowercase()
        glSkyView.setNightMode(nightMode)
        overlayView.setNightMode(nightMode)
    }

    fun setGyroEnabled(enabled: Boolean) {
        Log.d(TAG, "setGyroEnabled: $enabled")
        gyroEnabled = enabled
        if (enabled) orientationManager.start() else orientationManager.stop()
    }

    fun setStars(starData: List<Map<String, Any>>) {
        Log.d(TAG, ">>> setStars called with ${starData.size} stars, current FOV=${"%.2f".format(fov)}")
        
        // First, store ALL stars in data manager for constellation anchor lookups
        dataManager.setStars(starData)
        
        // Then use dynamic star manager for FOV-based filtering (uploads filtered list to GL)
        dynamicStarManager.setStars(starData)
        
        // Log counts
        val counts = dynamicStarManager.getStarCounts()
        Log.d(TAG, "Stars: ${counts["visible"]}/${counts["total"]} visible, limiting mag=${dynamicStarManager.getLimitingMagnitude()}")
    }
    
    /**
     * Set tiered star data for dynamic loading
     * Stars are organized by magnitude tiers and loaded based on FOV
     */
    fun setTieredStars(tieredData: Map<String, List<Map<String, Any>>>) {
        dynamicStarManager.setTieredStars(tieredData)
    }

    fun setConstellations(constData: List<Map<String, Any>>) {
        dataManager.setConstellations(constData) { artworks ->
            overlayView.setConstellationArtworks(artworks)
        }
    }

    fun setPlanets(planetData: List<Map<String, Any>>) = dataManager.setPlanets(planetData)

    fun setFov(newFov: Float) {
        // Extended FOV range for extreme zoom: 0.01° to 120°
        fov = newFov.coerceIn(0.01f, 120f)
        projector.fov = fov
        gestureHandler.setFov(fov)
        glSkyView.setFov(fov)
        // Update visible stars based on FOV
        dynamicStarManager.updateVisibleStars(fov)
    }

    fun setLocation(lat: Float, lon: Float) {
        latitude = lat
        longitude = lon
        projector.latitude = lat
        projector.longitude = lon
        projector.updateLst(simulatedTime)
        glSkyView.setLatitude(lat)
        glSkyView.setLst(projector.lst)
    }

    fun setSimulatedTime(timestamp: Long) {
        simulatedTime = timestamp
        projector.updateLst(timestamp)
        glSkyView.setLst(projector.lst)
        
        // Update moon positions based on simulated time
        // Convert timestamp to Julian Date for orbital calculations
        val julianDate = timestampToJulianDate(timestamp)
        glSkyView.updateMoonPositions(julianDate)
    }
    
    /**
     * Convert Unix timestamp (milliseconds) to Julian Date
     */
    private fun timestampToJulianDate(timestamp: Long): Double {
        // Unix epoch (1970-01-01 00:00:00 UTC) in Julian Date = 2440587.5
        val daysSinceUnixEpoch = timestamp / 86400000.0  // milliseconds to days
        return 2440587.5 + daysSinceUnixEpoch
    }

    fun setStarBrightness(brightness: Float) {
        starBrightness = brightness.coerceIn(0f, 1f)
        glSkyView.setStarBrightness(starBrightness)
    }

    fun setPlanetScale(scale: Float) {
        planetScale = scale.coerceIn(0f, 1f)
        glSkyView.setPlanetScale(planetScale)
    }

    // ============= Lifecycle =============

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (gyroEnabled) orientationManager.start()
        glSkyView.onResume()
        uiHandler.post(crosshairUpdateRunnable)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        orientationManager.stop()
        glSkyView.onPause()
        uiHandler.removeCallbacks(crosshairUpdateRunnable)
        uiHandler.removeCallbacks(inertiaUpdateRunnable)
    }

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        projector.setScreenSize(w, h)
    }
}
