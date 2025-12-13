package com.skyviewapp.starfield

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.util.Log
import android.view.MotionEvent
import android.view.View
import com.skyviewapp.starfield.input.GestureHandler
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.ConstellationLine
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import com.skyviewapp.starfield.projection.CoordinateProjector
import com.skyviewapp.starfield.rendering.PaintFactory
import com.skyviewapp.starfield.rendering.SkyRenderer
import com.skyviewapp.starfield.rendering.TextureManager
import com.skyviewapp.starfield.data.ConstellationDataLoader
import com.skyviewapp.starfield.sensors.OrientationManager
import kotlin.math.tan

/**
 * Native Star Field View - High-performance star rendering
 * 
 * Renders stars directly on Android Canvas at 60fps without JS Bridge overhead.
 * Uses hardware sensor fusion for smooth orientation tracking.
 * 
 * This is the main orchestrating view that composes:
 * - CelestialModels: Star, Planet, ConstellationLine data classes
 * - CoordinateProjector: 3D projection math
 * - SkyRenderer: Drawing logic
 * - GestureHandler: Touch/zoom handling
 * - OrientationManager: Sensor tracking
 */
class SkyViewNativeView(context: Context) : View(context), SensorEventListener {

    // Data collections
    private val stars = mutableListOf<Star>()
    private val planets = mutableListOf<Planet>()
    private val constellationLines = mutableListOf<ConstellationLine>()
    private val constellationArtworks = mutableListOf<ConstellationArt>()
    private val starMap = mutableMapOf<String, Star>()

    // Event listener
    private var onStarTapListener: ((Map<String, Any?>) -> Unit)? = null
    
    fun setOnStarTapListener(listener: (Map<String, Any?>) -> Unit) {
        onStarTapListener = listener
    }

    // Texture manager - centralized loading
    private val textureManager = TextureManager(context)
    
    // Artwork opacity
    private var artworkOpacity = 0.5f

    // Mode: true = gyro, false = touch/drag
    private var gyroEnabled = true

    // Night mode
    private var nightMode = "off"

    // Selected star
    private var selectedStar: Star? = null
    private var crosshairStar: Star? = null

    // View parameters
    private var fov = 75f
    private var latitude = 28.6f
    private var longitude = 77.2f
    private var simulatedTime = System.currentTimeMillis()
    private var starBrightness = 0.5f
    private var planetScale = 0.5f

    // Paints
    private val starPaint = PaintFactory.createStarPaint()
    private val glowPaint = PaintFactory.createGlowPaint()
    private val linePaint = PaintFactory.createLinePaint()
    private val crosshairPaint = PaintFactory.createCrosshairPaint()
    private val labelPaint = PaintFactory.createLabelPaint()
    private val labelBgPaint = PaintFactory.createLabelBackgroundPaint()

    // Modules
    private val projector = CoordinateProjector()
    private val renderer = SkyRenderer(starPaint, glowPaint, linePaint, crosshairPaint, labelPaint)
    private lateinit var gestureHandler: GestureHandler
    private lateinit var orientationManager: OrientationManager

    // LST tracking
    private var lastLstUpdate = 0L

    init {
        setBackgroundColor(Color.TRANSPARENT)
        textureManager.loadPlanetTextures()
        textureManager.loadConstellationTextures()
        initModules()
    }

    private fun initModules() {
        // Initialize orientation manager
        orientationManager = OrientationManager(context) { azimuth, altitude ->
            projector.smoothAzimuth = azimuth
            projector.smoothAltitude = altitude
            invalidate()
        }

        // Initialize gesture handler
        gestureHandler = GestureHandler(
            context = context,
            view = this,
            onFovChange = { newFov -> 
                fov = newFov
                projector.fov = newFov
                invalidate()
            },
            onOrientationChange = { azimuth, altitude ->
                projector.smoothAzimuth = azimuth
                projector.smoothAltitude = altitude
                invalidate()
            },
            onStarTap = { star ->
                selectedStar = if (selectedStar == star) null else star
                star?.let { 
                    Log.d("SkyViewNativeView", "Tapped star: ${it.name ?: it.id}")
                    onStarTapListener?.invoke(it.toEventMap())
                }
                invalidate()
            },
            onPlanetTap = { planet ->
                planet?.let {
                    Log.d("SkyViewNativeView", "Tapped planet: ${it.name}")
                    onStarTapListener?.invoke(it.toEventMap())
                }
                invalidate()
            },
            getStars = { stars },
            getPlanets = { planets },
            isGyroEnabled = { gyroEnabled }
        )
    }

    // ============= Public API for ViewManager =============

    fun setNightMode(mode: String) {
        nightMode = mode.lowercase()
        invalidate()
    }

    fun setGyroEnabled(enabled: Boolean) {
        Log.d("SkyViewNativeView", "setGyroEnabled: $enabled (was: $gyroEnabled)")
        gyroEnabled = enabled
        if (enabled) {
            orientationManager.start()
        } else {
            orientationManager.stop()
        }
        invalidate()
    }

    fun setStars(starData: List<Map<String, Any>>) {
        stars.clear()
        starMap.clear()
        for (data in starData) {
            val star = Star.fromMap(data)
            stars.add(star)
            starMap[star.id] = star
        }
        invalidate()
    }

    // Modular constellation data loader - loads from JSON assets
    private val constellationLoader = ConstellationDataLoader(context)
    
    fun setConstellations(constData: List<Map<String, Any>>) {
        constellationLines.clear()
        constellationArtworks.clear()
        
        // Load configs from JSON asset (modular, easy to extend)
        constellationLoader.loadConfigs()
        
        for (data in constData) {
            val id = data["id"] as? String ?: ""
            
            // Add artwork if available for this constellation
            constellationLoader.getArtworkConfig(id)?.let { config ->
                constellationArtworks.add(ConstellationArt(
                    id = id,
                    name = data["name"] as? String ?: id,
                    imageName = config.imageName,
                    imageSize = config.imageSize,
                    anchors = config.anchors,
                    lines = config.lines
                ))
            }
        }
        
        Log.d("SkyViewNativeView", "Loaded ${constellationArtworks.size} constellation artworks from JSON")
        invalidate()
    }

    fun setPlanets(planetData: List<Map<String, Any>>) {
        planets.clear()
        for (data in planetData) {
            planets.add(Planet.fromMap(data))
        }
        invalidate()
    }

    fun setFov(newFov: Float) {
        fov = newFov.coerceIn(20f, 120f)
        projector.fov = fov
        gestureHandler.setFov(fov)
        invalidate()
    }

    fun setLocation(lat: Float, lon: Float) {
        latitude = lat
        longitude = lon
        projector.latitude = lat
        projector.longitude = lon
        projector.updateLst(simulatedTime)
        invalidate()
    }

    fun setSimulatedTime(timestamp: Long) {
        simulatedTime = timestamp
        projector.updateLst(timestamp)
        invalidate()
    }

    fun setStarBrightness(brightness: Float) {
        starBrightness = brightness.coerceIn(0f, 1f)
        invalidate()
    }

    fun setPlanetScale(scale: Float) {
        planetScale = scale.coerceIn(0f, 1f)
        invalidate()
    }

    // ============= Touch Handling =============

    override fun onTouchEvent(event: MotionEvent): Boolean {
        return gestureHandler.handleTouchEvent(event) || super.onTouchEvent(event)
    }

    // ============= Rendering =============

    override fun onSizeChanged(w: Int, h: Int, oldw: Int, oldh: Int) {
        super.onSizeChanged(w, h, oldw, oldh)
        projector.setScreenSize(w, h)
        renderer.setScreenSize(w, h)
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Update LST periodically
        if (System.currentTimeMillis() - lastLstUpdate > 2000) {
            projector.updateLst(simulatedTime)
            lastLstUpdate = System.currentTimeMillis()
        }

        val magnitudeLimit = PaintFactory.getMagnitudeLimit(fov)

        // Project all stars
        for (star in stars) {
            if (star.magnitude <= magnitudeLimit) {
                val pos = projector.projectToScreen(star.x, star.y, star.z)
                star.screenX = pos.x
                star.screenY = pos.y
                star.visible = pos.visible
            } else {
                star.visible = false
            }
        }

        // Project all planets
        for (planet in planets) {
            val pos = projector.projectToScreen(planet.x, planet.y, planet.z)
            planet.screenX = pos.x
            planet.screenY = pos.y
            planet.visible = pos.visible
        }

        // Draw constellation artwork only (old constellation lines removed)
        renderer.drawConstellationArtwork(canvas, constellationArtworks, textureManager.getAllConstellationTextures(), starMap, artworkOpacity)

        // Draw stars
        renderer.drawStars(canvas, stars, nightMode, starBrightness, selectedStar)

        // Draw planets
        renderer.drawPlanets(canvas, planets, textureManager.getAllPlanetTextures(), nightMode, planetScale)

        // Draw crosshair
        crosshairPaint.color = PaintFactory.getLineColor(nightMode)
        renderer.drawCrosshair(canvas)

        // Find and draw crosshair info
        val centerX = width / 2f
        val centerY = height / 2f
        val crosshairPlanet = findObjectAt<Planet>(planets, centerX, centerY, 80f)
        if (crosshairPlanet != null) {
            renderer.drawCrosshairInfo(canvas, crosshairPlanet.name, "Planet")
        } else {
            val crosshairStarObj = findObjectAt<Star>(stars, centerX, centerY, 50f)
            crosshairStarObj?.let { star ->
                val subtitle = if (star.spectralType != null) "Star (${star.spectralType}-class)" else "Star"
                renderer.drawCrosshairInfo(canvas, star.name ?: star.id, subtitle)
            }
        }

        // Draw selected star label
        selectedStar?.let { star ->
            if (star.visible) {
                val labelText = star.name ?: star.id
                if (labelText.isNotEmpty()) {
                    val labelY = star.screenY - PaintFactory.getStarRadius(star.magnitude) - 20f
                    val textWidth = labelPaint.measureText(labelText)
                    val bgPadding = 12f
                    canvas.drawRoundRect(
                        star.screenX - textWidth / 2 - bgPadding,
                        labelY - 28f,
                        star.screenX + textWidth / 2 + bgPadding,
                        labelY + 8f,
                        10f, 10f,
                        labelBgPaint
                    )
                    canvas.drawText(labelText, star.screenX, labelY, labelPaint)
                }
            }
        }

        // Request next frame
        postInvalidateOnAnimation()
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

    // ============= Sensor Callbacks (for direct SensorEventListener) =============

    override fun onSensorChanged(event: SensorEvent) {
        // Delegated to OrientationManager
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    // ============= Lifecycle =============

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        if (gyroEnabled) orientationManager.start()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        orientationManager.stop()
    }
}
