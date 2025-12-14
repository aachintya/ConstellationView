package com.skyviewapp.starfield

import android.content.Context
import android.os.Handler
import android.os.Looper
import android.util.Log
import android.view.MotionEvent
import android.widget.FrameLayout
import com.skyviewapp.starfield.data.ConstellationDataLoader
import com.skyviewapp.starfield.input.GestureHandler
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import com.skyviewapp.starfield.projection.CoordinateProjector
import com.skyviewapp.starfield.rendering.OverlayView
import com.skyviewapp.starfield.sensors.OrientationManager

/**
 * Native Star Field View - High-performance OpenGL ES 3.0 rendering
 * 
 * Wraps GLSkyView for hardware-accelerated star rendering at 60fps.
 * Uses OverlayView for 2D UI elements (crosshair, labels).
 * Uses hardware sensor fusion for smooth orientation tracking.
 */
class SkyViewNativeView(context: Context) : FrameLayout(context) {
    companion object {
        private const val TAG = "SkyViewNativeView"
    }

    // OpenGL rendering view
    private val glSkyView: GLSkyView
    
    // Overlay for crosshair and labels
    private val overlayView: OverlayView

    // Data collections
    private val stars = mutableListOf<Star>()
    private val planets = mutableListOf<Planet>()
    private val constellationArtworks = mutableListOf<ConstellationArt>()
    private val starMap = mutableMapOf<String, Star>()

    // Event listeners
    private var onStarTapListener: ((Map<String, Any?>) -> Unit)? = null
    private var onMenuPressListener: (() -> Unit)? = null
    private var onSearchPressListener: (() -> Unit)? = null
    private var onSharePressListener: (() -> Unit)? = null

    fun setOnStarTapListener(listener: (Map<String, Any?>) -> Unit) {
        onStarTapListener = listener
    }
    
    fun setOnMenuPressListener(listener: () -> Unit) {
        onMenuPressListener = listener
        overlayView.onMenuPress = listener
    }
    
    fun setOnSearchPressListener(listener: () -> Unit) {
        onSearchPressListener = listener
        overlayView.onSearchPress = listener
    }
    
    fun setOnSharePressListener(listener: () -> Unit) {
        onSharePressListener = listener
        overlayView.onSharePress = listener
    }

    // Mode: true = gyro, false = touch/drag
    private var gyroEnabled = true

    // Night mode
    private var nightMode = "off"

    // Selected star
    private var selectedStar: Star? = null

    // View parameters
    private var fov = 75f
    private var latitude = 28.6f
    private var longitude = 77.2f
    private var simulatedTime = System.currentTimeMillis()
    private var starBrightness = 0.5f
    private var planetScale = 0.5f

    // Modules
    private val projector = CoordinateProjector()
    private lateinit var gestureHandler: GestureHandler
    private lateinit var orientationManager: OrientationManager

    // Handler for UI updates
    private val uiHandler = Handler(Looper.getMainLooper())
    private val crosshairUpdateRunnable = object : Runnable {
        override fun run() {
            updateCrosshairInfo()
            uiHandler.postDelayed(this, 100) // Update every 100ms
        }
    }

    // Constellation data loader
    private val constellationLoader = ConstellationDataLoader(context)

    init {
        // Create and add GLSkyView (bottom layer)
        glSkyView = GLSkyView(context)
        addView(glSkyView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))
        
        // Create and add OverlayView (top layer for crosshair/labels)
        overlayView = OverlayView(context)
        addView(overlayView, LayoutParams(LayoutParams.MATCH_PARENT, LayoutParams.MATCH_PARENT))

        initModules()
        loadPlanetTextures()
        
        // Initialize celestial coordinate transformation parameters
        projector.updateLst(simulatedTime)
        glSkyView.setLatitude(latitude)
        glSkyView.setLst(projector.lst)

        Log.d(TAG, "SkyViewNativeView initialized with OpenGL ES 3.0 renderer + Canvas overlay")
    }

    private fun initModules() {
        // Initialize orientation manager
        orientationManager = OrientationManager(context) { azimuth, altitude ->
            projector.smoothAzimuth = azimuth
            projector.smoothAltitude = altitude
            glSkyView.setOrientation(azimuth, altitude)
        }

        // Initialize gesture handler
        gestureHandler = GestureHandler(
            context = context,
            view = this,
            onFovChange = { newFov ->
                fov = newFov
                projector.fov = newFov
                glSkyView.setFov(newFov)
            },
            onOrientationChange = { azimuth, altitude ->
                projector.smoothAzimuth = azimuth
                projector.smoothAltitude = altitude
                glSkyView.setOrientation(azimuth, altitude)
            },
            onStarTap = { star ->
                selectedStar = if (selectedStar == star) null else star
                updateSelectedLabel()
                star?.let {
                    Log.d(TAG, "Tapped star: ${it.name ?: it.id}")
                    // Trigger visual feedback ripple at star position
                    glSkyView.triggerTapRipple(it.x, it.y, it.z)
                    onStarTapListener?.invoke(it.toEventMap())
                }
            },
            onPlanetTap = { planet ->
                selectedStar = null
                updateSelectedLabel()
                planet?.let {
                    Log.d(TAG, "Tapped planet: ${it.name}")
                    // Trigger visual feedback ripple at planet position
                    glSkyView.triggerTapRipple(it.x, it.y, it.z)
                    onStarTapListener?.invoke(it.toEventMap())
                }
            },
            getStars = { stars },
            getPlanets = { planets },
            isGyroEnabled = { gyroEnabled }
        )

        // Set gesture handler on GL view
        glSkyView.setGestureHandler(gestureHandler)
    }
    
    /**
     * Intercept touch events for button handling
     * Return true if touch is on a button, false otherwise to let gesture handler process
     */
    override fun onInterceptTouchEvent(ev: MotionEvent): Boolean {
        // Check if touch is on overlay buttons
        if (overlayView.isTouchOnButton(ev.x, ev.y)) {
            Log.d(TAG, "Intercepting touch for button at (${ev.x}, ${ev.y})")
            return false // Let overlay handle it
        }
        return super.onInterceptTouchEvent(ev)
    }
    
    override fun dispatchTouchEvent(ev: MotionEvent): Boolean {
        // Check if touch is on overlay buttons - let overlay handle first
        if (overlayView.isTouchOnButton(ev.x, ev.y)) {
            Log.d(TAG, "Dispatching button touch to overlay at (${ev.x}, ${ev.y})")
            if (overlayView.onTouchEvent(ev)) {
                return true
            }
        }
        return super.dispatchTouchEvent(ev)
    }
    
    private fun updateCrosshairInfo() {
        if (width == 0 || height == 0) return
        
        val centerX = width / 2f
        val centerY = height / 2f
        
        // Update star/planet screen positions based on current view
        for (star in stars) {
            val pos = projector.projectToScreen(star.x, star.y, star.z)
            star.screenX = pos.x
            star.screenY = pos.y
            star.visible = pos.visible
        }
        
        for (planet in planets) {
            val pos = projector.projectToScreen(planet.x, planet.y, planet.z)
            planet.screenX = pos.x
            planet.screenY = pos.y
            planet.visible = pos.visible
        }
        
        // Pass debug stars to overlay for visualization
        val debugStars = stars.map { star ->
            OverlayView.DebugStar(star.screenX, star.screenY, star.name ?: star.id, star.visible)
        }
        overlayView.setDebugStars(debugStars)
        
        // Update star map in overlay for constellation artwork rendering
        overlayView.updateStarMap(starMap)
        
        // Find object at crosshair
        val crosshairPlanet = findObjectAt<Planet>(planets, centerX, centerY, 80f)
        val crosshairStar = if (crosshairPlanet == null) findObjectAt<Star>(stars, centerX, centerY, 50f) else null
        
        // Update crosshair info display
        if (crosshairPlanet != null) {
            val planetType = when (crosshairPlanet.id.lowercase()) {
                "moon" -> "Moon"
                "sun" -> "Star"
                else -> "Planet"
            }
            overlayView.setCrosshairInfo(crosshairPlanet.name, planetType)
        } else if (crosshairStar != null) {
            val subtitle = if (crosshairStar.spectralType != null) 
                "Star (${crosshairStar.spectralType}-class)" else "Star"
            overlayView.setCrosshairInfo(crosshairStar.name ?: crosshairStar.id, subtitle)
        } else {
            overlayView.setCrosshairInfo(null, null)
        }
        
        // Also update selected star label position
        updateSelectedLabel()
    }
    
    private fun updateSelectedLabel() {
        selectedStar?.let { star ->
            if (star.visible) {
                overlayView.setSelectedLabel(star.name ?: star.id, star.screenX, star.screenY, star.magnitude)
            } else {
                overlayView.clearSelectedLabel()
            }
        } ?: overlayView.clearSelectedLabel()
    }
    
    private inline fun <reified T> findObjectAt(objects: List<T>, x: Float, y: Float, radius: Float): T? {
        var closest: T? = null
        var closestDist = Float.MAX_VALUE
        for (obj in objects) {
            val (screenX, screenY, visible) = when (obj) {
                is Star -> Triple(obj.screenX, obj.screenY, obj.visible)
                is Planet -> Triple(obj.screenX, obj.screenY, obj.visible)
                else -> continue
            }
            if (!visible) continue
            val dx = screenX - x
            val dy = screenY - y
            val dist = kotlin.math.sqrt(dx * dx + dy * dy)
            if (dist < radius && dist < closestDist) {
                closestDist = dist
                closest = obj
            }
        }
        return closest
    }

    private fun loadPlanetTextures() {
        // Planet textures are now procedurally generated in the shader
        // No texture files needed - this reduces app size significantly
        
        // Load constellation textures for artwork (these are still needed)
        loadConstellationTextures()
    }
    
    private fun loadConstellationTextures() {
        val constellationAssets = listOf(
            "leo", "aries", "taurus", "gemini", "cancer",
            "virgo", "libra", "scorpius", "sagittarius", "ursa-major"
        )
        
        val textures = mutableMapOf<String, android.graphics.Bitmap>()
        val assetManager = context.assets
        
        for (name in constellationAssets) {
            try {
                val inputStream = assetManager.open("constellations/$name.png")
                val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                if (bitmap != null) {
                    textures[name] = bitmap
                    Log.d(TAG, "Loaded constellation texture: $name (${bitmap.width}x${bitmap.height})")
                    
                    // Also load for OpenGL rendering
                    glSkyView.loadConstellationTexture(name, "constellations/$name.png")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load constellation texture: $name - ${e.message}")
            }
        }
        
        overlayView.setConstellationTextures(textures)
        Log.d(TAG, "Loaded ${textures.size} constellation textures")
    }

    // ============= Public API for ViewManager =============

    fun setNightMode(mode: String) {
        nightMode = mode.lowercase()
        glSkyView.setNightMode(nightMode)
        overlayView.setNightMode(nightMode)
    }

    fun setGyroEnabled(enabled: Boolean) {
        Log.d(TAG, "setGyroEnabled: $enabled (was: $gyroEnabled)")
        gyroEnabled = enabled
        if (enabled) {
            orientationManager.start()
        } else {
            orientationManager.stop()
        }
    }

    fun setStars(starData: List<Map<String, Any>>) {
        stars.clear()
        starMap.clear()
        for (data in starData) {
            val star = Star.fromMap(data)
            stars.add(star)
            starMap[star.id] = star
        }

        // Upload to GL renderer
        glSkyView.setStars(stars)
        
        // Update constellation lines with new star positions
        updateConstellationLines()
    }

    fun setConstellations(constData: List<Map<String, Any>>) {
        constellationArtworks.clear()

        // Load configs from JSON asset (modular, easy to extend)
        constellationLoader.loadConfigs()

        for (data in constData) {
            val id = data["id"] as? String ?: ""

            // Add artwork if available for this constellation
            constellationLoader.getArtworkConfig(id)?.let { config ->
                constellationArtworks.add(
                    ConstellationArt(
                        id = id,
                        name = data["name"] as? String ?: id,
                        imageName = config.imageName,
                        imageSize = config.imageSize,
                        anchors = config.anchors,
                        lines = config.lines
                    )
                )
            }
        }

        Log.d(TAG, "Loaded ${constellationArtworks.size} constellation artworks from JSON")
        
        // Pass artworks to overlay view for Canvas-based rendering (backup)
        overlayView.setConstellationArtworks(constellationArtworks)
        
        // Pass artworks to GL renderer for smooth OpenGL-based rendering
        glSkyView.setConstellationArtworks(constellationArtworks, stars)
        
        updateConstellationLines()
    }

    private fun updateConstellationLines() {
        // Build line vertex data from constellation artwork lines
        val lineVertices = mutableListOf<Float>()

        for (artwork in constellationArtworks) {
            for (lineArray in artwork.lines) {
                if (lineArray.size < 2) continue

                for (i in 0 until lineArray.size - 1) {
                    val hipId1 = "HIP${lineArray[i]}"
                    val hipId2 = "HIP${lineArray[i + 1]}"

                    val star1 = starMap[hipId1]
                    val star2 = starMap[hipId2]

                    if (star1 != null && star2 != null) {
                        // Add line segment vertices (3D positions)
                        lineVertices.add(star1.x)
                        lineVertices.add(star1.y)
                        lineVertices.add(star1.z)
                        lineVertices.add(star2.x)
                        lineVertices.add(star2.y)
                        lineVertices.add(star2.z)
                    }
                }
            }
        }

        val vertexArray = lineVertices.toFloatArray()
        glSkyView.setConstellationLines(vertexArray, vertexArray.size / 3)
    }

    fun setPlanets(planetData: List<Map<String, Any>>) {
        planets.clear()
        for (data in planetData) {
            planets.add(Planet.fromMap(data))
        }
        glSkyView.setPlanets(planets)

        // Calculate sun direction for lighting
        updateSunDirection()
    }

    private fun updateSunDirection() {
        // Find the sun and use its position as light direction
        val sun = planets.find { it.id.lowercase() == "sun" }
        if (sun != null) {
            // Normalize the sun position as light direction
            val length = kotlin.math.sqrt(sun.x * sun.x + sun.y * sun.y + sun.z * sun.z)
            if (length > 0.001f) {
                glSkyView.setSunDirection(sun.x / length, sun.y / length, sun.z / length)
            }
        }
    }

    fun setFov(newFov: Float) {
        fov = newFov.coerceIn(20f, 120f)
        projector.fov = fov
        gestureHandler.setFov(fov)
        glSkyView.setFov(fov)
    }

    fun setLocation(lat: Float, lon: Float) {
        latitude = lat
        longitude = lon
        projector.latitude = lat
        projector.longitude = lon
        projector.updateLst(simulatedTime)
        // Update GL renderer with new latitude and LST for celestial coordinate transformation
        glSkyView.setLatitude(lat)
        glSkyView.setLst(projector.lst)
    }

    fun setSimulatedTime(timestamp: Long) {
        simulatedTime = timestamp
        projector.updateLst(timestamp)
        // Update GL renderer with new LST for celestial coordinate transformation
        // This makes stars rotate as time changes (Earth's rotation effect)
        glSkyView.setLst(projector.lst)
    }

    fun setStarBrightness(brightness: Float) {
        starBrightness = brightness.coerceIn(0f, 1f)
        glSkyView.setStarBrightness(starBrightness)
    }

    fun setPlanetScale(scale: Float) {
        planetScale = scale.coerceIn(0f, 1f)
        glSkyView.setPlanetScale(planetScale)
    }

    // ============= Touch Handling =============

    override fun onTouchEvent(event: MotionEvent): Boolean {
        return gestureHandler.handleTouchEvent(event) || super.onTouchEvent(event)
    }

    // ============= Lifecycle =============

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (gyroEnabled) orientationManager.start()
        glSkyView.onResume()
        // Start crosshair update loop
        uiHandler.post(crosshairUpdateRunnable)
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        orientationManager.stop()
        glSkyView.onPause()
        // Stop crosshair update loop
        uiHandler.removeCallbacks(crosshairUpdateRunnable)
    }
    
    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        projector.setScreenSize(w, h)
    }
}
