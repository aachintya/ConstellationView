package com.skyviewapp.starfield

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.ColorMatrix
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Rect
import android.graphics.RectF
import android.graphics.Shader
import android.hardware.Sensor
import android.hardware.SensorEvent
import android.hardware.SensorEventListener
import android.hardware.SensorManager
import android.util.Log
import android.view.ScaleGestureDetector
import android.view.View
import kotlin.math.*

/**
 * Native Star Field View - High-performance star rendering
 * 
 * Renders stars directly on Android Canvas at 60fps without JS Bridge overhead.
 * Uses hardware sensor fusion for smooth orientation tracking.
 */
class SkyViewNativeView(context: Context) : View(context), SensorEventListener {

    // Star data
    private data class Star(
        val id: String,
        val name: String?,  // Star name for display
        val ra: Float,
        val dec: Float,
        val magnitude: Float,
        val spectralType: String?,
        val constellation: String?,  // IAU constellation abbreviation
        val distance: Float?,  // Distance in light-years
        // Pre-computed 3D position
        var x: Float = 0f,
        var y: Float = 0f,
        var z: Float = 0f,
        // Screen position (updated each frame)
        var screenX: Float = 0f,
        var screenY: Float = 0f,
        var visible: Boolean = false
    )

    // Constellation line data
    private data class ConstellationLine(
        val starId1: String,
        val starId2: String
    )

    // Planet data
    private data class Planet(
        val id: String,
        val name: String,
        val ra: Float,
        val dec: Float,
        val magnitude: Float,
        // Pre-computed 3D position
        var x: Float = 0f,
        var y: Float = 0f,
        var z: Float = 0f,
        // Screen position
        var screenX: Float = 0f,
        var screenY: Float = 0f,
        var visible: Boolean = false
    )

    private val stars = mutableListOf<Star>()
    private val planets = mutableListOf<Planet>()
    private val constellationLines = mutableListOf<ConstellationLine>()
    private val starMap = mutableMapOf<String, Star>()

    // Star tap listener for React Native events
    private var onStarTapListener: ((Map<String, Any?>) -> Unit)? = null
    
    fun setOnStarTapListener(listener: (Map<String, Any?>) -> Unit) {
        onStarTapListener = listener
    }

    // Planet textures
    private val planetTextures = mutableMapOf<String, Bitmap>()
    private val planetNames = listOf("sun", "moon", "mercury", "venus", "earth", "mars", "jupiter", "saturn", "uranus", "neptune")

    // Sensor
    private var sensorManager: SensorManager? = null
    private var rotationVectorSensor: Sensor? = null

    // Mode: true = gyro, false = touch/drag
    private var gyroEnabled = true

    // Touch tracking
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var isDragging = false
    private val touchSensitivity = 0.15f  // Reduced for smoother feel
    private var touchDownTime = 0L
    private val tapThreshold = 200L  // max ms for a tap
    private val dragThreshold = 10f  // min pixels for drag
    
    // Smooth drag interpolation
    private var targetAzimuth = 180f
    private var targetAltitude = 30f
    private val dragSmoothingFactor = 0.2f  // Lower = smoother (0.1-0.3 ideal)

    // Pinch-to-zoom
    private var scaleGestureDetector: ScaleGestureDetector
    private var isScaling = false

    // Night mode: 'off', 'red', 'green'
    private var nightMode = "off"

    // Selected/highlighted star
    private var selectedStar: Star? = null
    private var crosshairStar: Star? = null
    private val crosshairRadius = 70f  // Detection radius around crosshair

    // Orientation
    private val rotationMatrix = FloatArray(9)
    private val orientationAngles = FloatArray(3)
    private var azimuth = 180f
    private var altitude = 30f
    private var smoothAzimuth = 180f
    private var smoothAltitude = 30f
    private val smoothingFactor = 0.138f

    // View parameters
    private var fov = 75f
    private var latitude = 28.6f
    private var longitude = 77.2f
    private var lst = 0f // Local Sidereal Time
    private var simulatedTime = System.currentTimeMillis() // For time travel feature
    private var starBrightness = 0.5f // 0.0 to 1.0 - controls star brightness/glow
    private var planetScale = 0.5f // 0.0 to 1.0 - controls planet size

    // Paints
    private val starPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val glowPaint = Paint(Paint.ANTI_ALIAS_FLAG)
    private val linePaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(76, 102, 153, 204)
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }
    private val crosshairPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(76, 255, 255, 255)
        strokeWidth = 2f
        style = Paint.Style.STROKE
    }
    private val labelPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.WHITE
        textSize = 36f
        textAlign = Paint.Align.CENTER
        setShadowLayer(4f, 0f, 0f, Color.BLACK)
    }
    private val labelBgPaint = Paint(Paint.ANTI_ALIAS_FLAG).apply {
        color = Color.argb(180, 0, 0, 0)
        style = Paint.Style.FILL
    }

    // Spectral colors
    private val spectralColors = mapOf(
        'O' to Color.rgb(155, 176, 255),
        'B' to Color.rgb(170, 196, 255),
        'A' to Color.rgb(202, 215, 255),
        'F' to Color.rgb(248, 247, 255),
        'G' to Color.rgb(255, 244, 234),
        'K' to Color.rgb(255, 210, 161),
        'M' to Color.rgb(255, 204, 111)
    )

    // LST update
    private var lastLstUpdate = 0L

    init {
        setBackgroundColor(Color.TRANSPARENT)
        setupSensors()
        updateLst()
        loadPlanetTextures()
        
        // Initialize pinch-to-zoom detector
        scaleGestureDetector = ScaleGestureDetector(context, object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
                // Only enable zoom in touch/drag mode
                if (!gyroEnabled) {
                    isScaling = true
                    return true
                }
                return false
            }
            
            override fun onScale(detector: ScaleGestureDetector): Boolean {
                if (!gyroEnabled && isScaling) {
                    // Scale factor: >1 = zoom in (pinch out), <1 = zoom out (pinch in)
                    val scaleFactor = detector.scaleFactor
                    
                    // Update FOV: smaller FOV = more zoom
                    fov = (fov / scaleFactor).coerceIn(20f, 120f)
                    
                    Log.d("SkyViewNativeView", "Pinch zoom: scaleFactor=$scaleFactor, fov=$fov")
                    invalidate()
                    return true
                }
                return false
            }
            
            override fun onScaleEnd(detector: ScaleGestureDetector) {
                isScaling = false
            }
        })
    }

    /**
     * Set night mode: 'off', 'red', 'green'
     */
    fun setNightMode(mode: String) {
        nightMode = mode.lowercase()
        invalidate()
    }

    private fun loadPlanetTextures() {
        val assetManager = context.assets
        
        for (name in planetNames) {
            try {
                val inputStream = assetManager.open("planets/$name.png")
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()
                
                if (bitmap != null) {
                    // Scale to reasonable size (e.g., 128x128 for performance)
                    val scaledBitmap = Bitmap.createScaledBitmap(bitmap, 128, 128, true)
                    planetTextures[name] = scaledBitmap
                    Log.d("SkyViewNativeView", "Loaded texture for $name from assets")
                }
            } catch (e: Exception) {
                Log.w("SkyViewNativeView", "Failed to load texture for $name: ${e.message}")
            }
        }
    }

    private fun setupSensors() {
        sensorManager = context.getSystemService(Context.SENSOR_SERVICE) as SensorManager
        rotationVectorSensor = sensorManager?.getDefaultSensor(Sensor.TYPE_ROTATION_VECTOR)
    }

    /**
     * Set gyro mode enabled/disabled
     */
    fun setGyroEnabled(enabled: Boolean) {
        Log.d("SkyViewNativeView", "setGyroEnabled called with: $enabled (was: $gyroEnabled)")
        gyroEnabled = enabled
        if (enabled) {
            startSensors()
        } else {
            stopSensors()
        }
        invalidate()
    }

    fun startSensors() {
        if (!gyroEnabled) return
        rotationVectorSensor?.let { sensor ->
            sensorManager?.registerListener(this, sensor, SensorManager.SENSOR_DELAY_GAME)
        }
    }

    fun stopSensors() {
        sensorManager?.unregisterListener(this)
    }

    /**
     * Handle touch events for drag mode, star tapping, and pinch-to-zoom
     */
    override fun onTouchEvent(event: android.view.MotionEvent): Boolean {
        // Pass event to scale gesture detector first (for pinch-to-zoom)
        scaleGestureDetector.onTouchEvent(event)
        
        // If scaling is in progress, don't handle other touch events
        if (isScaling) {
            return true
        }
        
        when (event.actionMasked) {
            android.view.MotionEvent.ACTION_DOWN -> {
                touchDownTime = System.currentTimeMillis()
                lastTouchX = event.x
                lastTouchY = event.y
                isDragging = false
                // In gyro mode, still allow tapping stars
                if (!gyroEnabled) {
                    parent?.requestDisallowInterceptTouchEvent(true)
                }
                return true
            }
            android.view.MotionEvent.ACTION_MOVE -> {
                if (!gyroEnabled && !isScaling) {
                    val dx = event.x - lastTouchX
                    val dy = event.y - lastTouchY
                    val distance = sqrt(dx * dx + dy * dy)
                    
                    // Only start dragging if moved beyond threshold
                    if (distance > dragThreshold) {
                        isDragging = true
                        // Update TARGET orientation (will be smoothly interpolated)
                        targetAzimuth = ((targetAzimuth - dx * touchSensitivity) % 360f + 360f) % 360f
                        targetAltitude = (targetAltitude + dy * touchSensitivity).coerceIn(-90f, 90f)
                        
                        // Smooth interpolation toward target
                        smoothAzimuth = smoothAzimuth + (targetAzimuth - smoothAzimuth) * dragSmoothingFactor
                        smoothAltitude = smoothAltitude + (targetAltitude - smoothAltitude) * dragSmoothingFactor
                        
                        lastTouchX = event.x
                        lastTouchY = event.y
                        invalidate()
                    }
                    return true
                }
            }
            android.view.MotionEvent.ACTION_UP -> {
                parent?.requestDisallowInterceptTouchEvent(false)
                val touchDuration = System.currentTimeMillis() - touchDownTime
                
                // Check if this was a tap (short touch, no drag)
                if (touchDuration < tapThreshold && !isDragging) {
                    // Try to find a planet first
                    val tappedPlanet = findPlanetAt(event.x, event.y)
                    if (tappedPlanet != null) {
                        Log.d("SkyViewNativeView", "Tapped planet: ${tappedPlanet.name}")
                        // Emit event to React Native
                        onStarTapListener?.invoke(mapOf(
                            "id" to tappedPlanet.id,
                            "name" to tappedPlanet.name,
                            "magnitude" to tappedPlanet.magnitude,
                            "spectralType" to "",
                            "type" to "planet",
                            "ra" to tappedPlanet.ra,
                            "dec" to tappedPlanet.dec
                        ))
                        invalidate()
                    } else {
                        // Find star at tap location
                        val tappedStar = findStarAt(event.x, event.y)
                        if (tappedStar != null) {
                            selectedStar = if (selectedStar == tappedStar) null else tappedStar
                            Log.d("SkyViewNativeView", "Tapped star: ${tappedStar.name ?: tappedStar.id}")
                            // Emit event to React Native
                            onStarTapListener?.invoke(mapOf(
                                "id" to tappedStar.id,
                                "name" to (tappedStar.name ?: ""),
                                "magnitude" to tappedStar.magnitude,
                                "spectralType" to (tappedStar.spectralType ?: ""),
                                "constellation" to (tappedStar.constellation ?: ""),
                                "distance" to (tappedStar.distance ?: 0f),
                                "type" to "star",
                                "ra" to tappedStar.ra,
                                "dec" to tappedStar.dec
                            ))
                            invalidate()
                        } else {
                            // Tapped empty space - deselect
                            selectedStar = null
                            invalidate()
                        }
                    }
                }
                isDragging = false
                return true
            }
            android.view.MotionEvent.ACTION_CANCEL -> {
                parent?.requestDisallowInterceptTouchEvent(false)
                isDragging = false
                return true
            }
        }
        return super.onTouchEvent(event)
    }

    /**
     * Find a star at the given screen coordinates
     */
    private fun findStarAt(x: Float, y: Float): Star? {
        val searchRadius = 50f  // Tap detection radius in pixels
        var closestStar: Star? = null
        var closestDistance = Float.MAX_VALUE
        
        for (star in stars) {
            if (!star.visible) continue
            val dx = star.screenX - x
            val dy = star.screenY - y
            val distance = sqrt(dx * dx + dy * dy)
            if (distance < searchRadius && distance < closestDistance) {
                closestDistance = distance
                closestStar = star
            }
        }
        return closestStar
    }

    /**
     * Find a planet at the given screen coordinates
     */
    private fun findPlanetAt(x: Float, y: Float): Planet? {
        val searchRadius = 80f  // Larger detection radius for planets
        var closestPlanet: Planet? = null
        var closestDistance = Float.MAX_VALUE
        
        for (planet in planets) {
            if (!planet.visible) continue
            val dx = planet.screenX - x
            val dy = planet.screenY - y
            val distance = sqrt(dx * dx + dy * dy)
            if (distance < searchRadius && distance < closestDistance) {
                closestDistance = distance
                closestPlanet = planet
            }
        }
        return closestPlanet
    }

    /**
     * Set stars from React Native
     */
    fun setStars(starData: List<Map<String, Any>>) {
        stars.clear()
        starMap.clear()

        for (data in starData) {
            val star = Star(
                id = data["id"] as? String ?: "",
                name = data["name"] as? String,  // Get star name
                ra = (data["ra"] as? Number)?.toFloat() ?: 0f,
                dec = (data["dec"] as? Number)?.toFloat() ?: 0f,
                magnitude = (data["magnitude"] as? Number)?.toFloat() ?: 6f,
                spectralType = data["spectralType"] as? String,
                constellation = data["constellation"] as? String,
                distance = (data["distance"] as? Number)?.toFloat()
            )
            // Pre-compute 3D position
            val raRad = Math.toRadians(star.ra.toDouble())
            val decRad = Math.toRadians(star.dec.toDouble())
            star.x = (cos(decRad) * cos(raRad)).toFloat()
            star.y = (cos(decRad) * sin(raRad)).toFloat()
            star.z = sin(decRad).toFloat()

            stars.add(star)
            starMap[star.id] = star
        }
        invalidate()
    }

    /**
     * Set constellation lines from React Native
     */
    fun setConstellations(constData: List<Map<String, Any>>) {
        constellationLines.clear()
        for (data in constData) {
            @Suppress("UNCHECKED_CAST")
            val lines = data["lines"] as? List<List<String>> ?: continue
            for (line in lines) {
                if (line.size >= 2) {
                    constellationLines.add(ConstellationLine(line[0], line[1]))
                }
            }
        }
        invalidate()
    }

    /**
     * Set planets from React Native
     */
    fun setPlanets(planetData: List<Map<String, Any>>) {
        planets.clear()

        for (data in planetData) {
            val id = (data["id"] as? String ?: data["name"] as? String ?: "").lowercase()
            val planet = Planet(
                id = id,
                name = data["name"] as? String ?: id,
                ra = (data["ra"] as? Number)?.toFloat() ?: 0f,
                dec = (data["dec"] as? Number)?.toFloat() ?: 0f,
                magnitude = (data["magnitude"] as? Number)?.toFloat() ?: 0f
            )
            // Pre-compute 3D position
            val raRad = Math.toRadians(planet.ra.toDouble())
            val decRad = Math.toRadians(planet.dec.toDouble())
            planet.x = (cos(decRad) * cos(raRad)).toFloat()
            planet.y = (cos(decRad) * sin(raRad)).toFloat()
            planet.z = sin(decRad).toFloat()

            planets.add(planet)
        }
        invalidate()
    }

    /**
     * Set field of view
     */
    fun setFov(newFov: Float) {
        fov = newFov.coerceIn(20f, 120f)
        invalidate()
    }

    /**
     * Set location
     */
    fun setLocation(lat: Float, lon: Float) {
        latitude = lat
        longitude = lon
        updateLst()
        invalidate()
    }

    /**
     * Set simulated time for time travel feature
     */
    fun setSimulatedTime(timestamp: Long) {
        simulatedTime = timestamp
        updateLst()
        invalidate()
    }

    /**
     * Set star brightness (0.0 to 1.0)
     */
    fun setStarBrightness(brightness: Float) {
        starBrightness = brightness.coerceIn(0f, 1f)
        invalidate()
    }

    /**
     * Set planet scale (0.0 to 1.0)
     */
    fun setPlanetScale(scale: Float) {
        planetScale = scale.coerceIn(0f, 1f)
        invalidate()
    }

    private fun updateLst() {
        val now = simulatedTime
        val jd = now / 86400000.0 + 2440587.5
        val t = (jd - 2451545.0) / 36525.0
        var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                0.000387933 * t * t - t * t * t / 38710000.0
        gmst = ((gmst % 360.0) + 360.0) % 360.0
        lst = ((gmst + longitude + 360.0) % 360.0).toFloat()
        lastLstUpdate = System.currentTimeMillis()
    }

    private fun getStarColor(spectralType: String?): Int {
        // Apply night mode color override
        return when (nightMode) {
            "red" -> Color.rgb(255, 80, 80)    // Red mode - red stars
            "green" -> Color.rgb(80, 255, 80)  // Green mode - green stars
            else -> {
                // Normal mode - use spectral colors
                if (spectralType.isNullOrEmpty()) Color.WHITE
                else spectralColors[spectralType[0].uppercaseChar()] ?: Color.WHITE
            }
        }
    }

    // Get night mode line/UI color
    private fun getNightModeColor(): Int {
        return when (nightMode) {
            "red" -> Color.rgb(255, 60, 60)
            "green" -> Color.rgb(60, 255, 60)
            else -> Color.argb(76, 102, 153, 204)  // Default constellation line color
        }
    }

    // Get night mode accent color for labels
    private fun getNightModeTextColor(): Int {
        return when (nightMode) {
            "red" -> Color.rgb(255, 100, 100)
            "green" -> Color.rgb(100, 255, 100)
            else -> Color.WHITE
        }
    }

    private fun getStarRadius(magnitude: Float): Float {
        val minRadius = 1.5f
        val maxRadius = 8f
        val normalized = (6f - magnitude.coerceAtMost(6f)) / 7.5f
        return minRadius + normalized.coerceIn(0f, 1f) * (maxRadius - minRadius)
    }

    private fun getMagnitudeLimit(): Float {
        return when {
            fov > 100 -> 3.0f
            fov > 80 -> 4.0f
            fov > 60 -> 5.0f
            fov > 40 -> 5.5f
            fov > 25 -> 6.0f
            else -> 6.5f
        }
    }

    /**
     * Project star to screen coordinates
     */
    private fun projectStar(star: Star, centerX: Float, centerY: Float, scale: Float): Boolean {
        val x = star.x
        val y = star.y
        val z = star.z

        val azRad = Math.toRadians(smoothAzimuth.toDouble())
        val altRad = Math.toRadians(smoothAltitude.toDouble())
        val lstRad = Math.toRadians(-lst.toDouble())
        val latRad = Math.toRadians((90 - latitude).toDouble())

        // Rotate by LST
        val cosLst = cos(lstRad)
        val sinLst = sin(lstRad)
        val x1 = x * cosLst - y * sinLst
        val y1 = x * sinLst + y * cosLst
        val z1 = z.toDouble()

        // Rotate by latitude
        val cosLat = cos(latRad)
        val sinLat = sin(latRad)
        val y2 = y1 * cosLat - z1 * sinLat
        val z2 = y1 * sinLat + z1 * cosLat

        // Rotate by azimuth
        val cosAz = cos(azRad)
        val sinAz = sin(azRad)
        val x3 = x1 * cosAz - y2 * sinAz
        val y3 = x1 * sinAz + y2 * cosAz

        // Rotate by altitude
        val cosAlt = cos(altRad)
        val sinAlt = sin(altRad)
        val y4 = y3 * cosAlt - z2 * sinAlt
        val z4 = y3 * sinAlt + z2 * cosAlt

        // Cull if behind camera
        if (y4 <= 0.01) {
            star.visible = false
            return false
        }

        // Perspective projection
        star.screenX = (centerX + (x3 / y4) * scale).toFloat()
        star.screenY = (centerY - (z4 / y4) * scale).toFloat()

        // Cull if off screen
        val margin = 50f
        if (star.screenX < -margin || star.screenX > width + margin ||
            star.screenY < -margin || star.screenY > height + margin) {
            star.visible = false
            return false
        }

        star.visible = true
        return true
    }

    /**
     * Project planet to screen coordinates
     */
    private fun projectPlanet(planet: Planet, centerX: Float, centerY: Float, scale: Float): Boolean {
        val x = planet.x
        val y = planet.y
        val z = planet.z

        val azRad = Math.toRadians(smoothAzimuth.toDouble())
        val altRad = Math.toRadians(smoothAltitude.toDouble())
        val lstRad = Math.toRadians(-lst.toDouble())
        val latRad = Math.toRadians((90 - latitude).toDouble())

        // Rotate by LST
        val cosLst = cos(lstRad)
        val sinLst = sin(lstRad)
        val x1 = x * cosLst - y * sinLst
        val y1 = x * sinLst + y * cosLst
        val z1 = z.toDouble()

        // Rotate by latitude
        val cosLat = cos(latRad)
        val sinLat = sin(latRad)
        val y2 = y1 * cosLat - z1 * sinLat
        val z2 = y1 * sinLat + z1 * cosLat

        // Rotate by azimuth
        val cosAz = cos(azRad)
        val sinAz = sin(azRad)
        val x3 = x1 * cosAz - y2 * sinAz
        val y3 = x1 * sinAz + y2 * cosAz

        // Rotate by altitude
        val cosAlt = cos(altRad)
        val sinAlt = sin(altRad)
        val y4 = y3 * cosAlt - z2 * sinAlt
        val z4 = y3 * sinAlt + z2 * cosAlt

        // Cull if behind camera
        if (y4 <= 0.01) {
            planet.visible = false
            return false
        }

        // Perspective projection
        planet.screenX = (centerX + (x3 / y4) * scale).toFloat()
        planet.screenY = (centerY - (z4 / y4) * scale).toFloat()

        // Cull if off screen (with larger margin for planets)
        val margin = 100f
        if (planet.screenX < -margin || planet.screenX > width + margin ||
            planet.screenY < -margin || planet.screenY > height + margin) {
            planet.visible = false
            return false
        }

        planet.visible = true
        return true
    }

    override fun onDraw(canvas: Canvas) {
        super.onDraw(canvas)

        // Update LST periodically
        if (System.currentTimeMillis() - lastLstUpdate > 2000) {
            updateLst()
        }

        val centerX = width / 2f
        val centerY = height / 2f
        val fovRad = Math.toRadians(fov.toDouble())
        val scale = (width / (2 * tan(fovRad / 2))).toFloat()

        val magnitudeLimit = getMagnitudeLimit()

        // Project all stars
        for (star in stars) {
            if (star.magnitude <= magnitudeLimit) {
                projectStar(star, centerX, centerY, scale)
            } else {
                star.visible = false
            }
        }

        // Project all planets
        for (planet in planets) {
            projectPlanet(planet, centerX, centerY, scale)
        }

        // Draw constellation lines with night mode color
        linePaint.color = getNightModeColor()
        for (line in constellationLines) {
            val star1 = starMap[line.starId1]
            val star2 = starMap[line.starId2]
            if (star1?.visible == true && star2?.visible == true) {
                canvas.drawLine(star1.screenX, star1.screenY, star2.screenX, star2.screenY, linePaint)
            }
        }

        // Draw stars (sorted by magnitude for proper layering)
        // Apply brightness multiplier: 0.0 = dim, 1.0 = bright
        val brightnessMultiplier = 0.5f + starBrightness * 1.0f // Range: 0.5 to 1.5
        
        for (star in stars.sortedByDescending { it.magnitude }) {
            if (!star.visible) continue

            val baseRadius = getStarRadius(star.magnitude)
            val radius = baseRadius * brightnessMultiplier
            val color = getStarColor(star.spectralType)

            // Glow for bright stars - intensity scales with brightness slider
            val glowThreshold = 4f - starBrightness * 3f // Range: 1.0 to 4.0 magnitude threshold
            if (star.magnitude < glowThreshold) {
                val glowAlpha = (102 * brightnessMultiplier).toInt().coerceIn(50, 200)
                glowPaint.shader = RadialGradient(
                    star.screenX, star.screenY, radius * 4f,
                    intArrayOf(Color.argb(glowAlpha, Color.red(color), Color.green(color), Color.blue(color)), Color.TRANSPARENT),
                    floatArrayOf(0f, 1f),
                    Shader.TileMode.CLAMP
                )
                canvas.drawCircle(star.screenX, star.screenY, radius * 4f, glowPaint)
            }

            // Main star (sharper rendering - no blur)
            starPaint.color = color
            canvas.drawCircle(star.screenX, star.screenY, radius, starPaint)
            
            // Draw highlight ring for selected star
            if (star == selectedStar) {
                crosshairPaint.color = Color.argb(200, 79, 195, 247)  // Cyan highlight
                crosshairPaint.strokeWidth = 3f
                canvas.drawCircle(star.screenX, star.screenY, radius + 15f, crosshairPaint)
                crosshairPaint.color = Color.argb(76, 255, 255, 255)  // Reset
                crosshairPaint.strokeWidth = 2f
            }
        }

        // Draw planets with textures
        // Apply planet scale: 0.0 = small, 1.0 = large (but not too large)
        val scaleMultiplier = 0.5f + planetScale * 0.8f // Range: 0.5 to 1.3
        
        for (planet in planets) {
            if (!planet.visible) continue

            val texture = planetTextures[planet.id.lowercase()]
            if (texture != null) {
                // Calculate base planet size based on magnitude - reduced sizes
                val baseSize = when {
                    planet.id == "sun" -> 50f
                    planet.id == "moon" -> 45f
                    planet.magnitude < -2 -> 40f
                    planet.magnitude < 0 -> 32f
                    planet.magnitude < 2 -> 25f
                    else -> 20f
                }
                
                // Apply scale multiplier with max cap
                val size = (baseSize * scaleMultiplier).coerceAtMost(70f)
                
                // Saturn needs slightly wider rect for rings (1.6x maintains proportion)
                if (planet.id.lowercase() == "saturn") {
                    val ringWidth = size * 1.6f
                    val ringHeight = size * 0.8f  // Slightly flatten vertically
                    val destRect = RectF(
                        planet.screenX - ringWidth,
                        planet.screenY - ringHeight,
                        planet.screenX + ringWidth,
                        planet.screenY + ringHeight
                    )
                    canvas.drawBitmap(texture, null, destRect, starPaint)
                } else {
                    // Standard square rect for other planets
                    val destRect = RectF(
                        planet.screenX - size,
                        planet.screenY - size,
                        planet.screenX + size,
                        planet.screenY + size
                    )
                    canvas.drawBitmap(texture, null, destRect, starPaint)
                }
            } else {
                // Fallback: draw as a colored circle if texture not loaded
                val color = if (nightMode != "off") {
                    getStarColor(null)
                } else when (planet.id.lowercase()) {
                    "sun" -> Color.rgb(255, 220, 50)
                    "moon" -> Color.rgb(220, 220, 220)
                    "mars" -> Color.rgb(200, 100, 80)
                    "venus" -> Color.rgb(255, 230, 200)
                    "jupiter" -> Color.rgb(200, 170, 130)
                    "saturn" -> Color.rgb(230, 200, 150)
                    "uranus" -> Color.rgb(180, 220, 230)
                    "neptune" -> Color.rgb(100, 150, 230)
                    else -> Color.WHITE
                }
                starPaint.color = color
                canvas.drawCircle(planet.screenX, planet.screenY, 25f, starPaint)
            }
        }

        // Find star at crosshair center
        crosshairStar = findStarAt(centerX, centerY)
        
        // Find planet at crosshair center
        val crosshairPlanet = findPlanetAt(centerX, centerY)

        // Draw crosshair
        canvas.drawCircle(centerX, centerY, crosshairRadius, crosshairPaint)

        // Draw bottom-left info for crosshair object (planet takes priority over star)
        if (crosshairPlanet != null) {
            val leftMargin = 24f
            val bottomMargin = 140f
            
            // Planet name - larger text
            labelPaint.textSize = 48f
            labelPaint.textAlign = Paint.Align.LEFT
            labelPaint.color = Color.rgb(79, 195, 247) // Cyan
            canvas.drawText(crosshairPlanet.name, leftMargin, height - bottomMargin, labelPaint)
            
            // Subtitle - smaller text
            labelPaint.textSize = 28f
            labelPaint.color = Color.argb(150, 255, 255, 255)
            canvas.drawText("Planet", leftMargin, height - bottomMargin + 36f, labelPaint)
            
            // Reset paint
            labelPaint.textSize = 36f
            labelPaint.textAlign = Paint.Align.CENTER
            labelPaint.color = Color.WHITE
        } else {
            crosshairStar?.let { star ->
                val labelText = star.name ?: star.id
                if (labelText.isNotEmpty()) {
                    val leftMargin = 24f
                    val bottomMargin = 140f
                    
                    // Star name - larger text
                    labelPaint.textSize = 48f
                    labelPaint.textAlign = Paint.Align.LEFT
                    labelPaint.color = Color.rgb(79, 195, 247) // Cyan
                    canvas.drawText(labelText, leftMargin, height - bottomMargin, labelPaint)
                    
                    // Subtitle - smaller text
                    labelPaint.textSize = 28f
                    labelPaint.color = Color.argb(150, 255, 255, 255)
                    val subtitle = if (star.spectralType != null) "Star (${star.spectralType}-class)" else "Star"
                    canvas.drawText(subtitle, leftMargin, height - bottomMargin + 36f, labelPaint)
                    
                    // Reset paint
                    labelPaint.textSize = 36f
                    labelPaint.textAlign = Paint.Align.CENTER
                    labelPaint.color = Color.WHITE
                }
            }
        }

        // Draw highlight ring and label for selected/tapped star
        selectedStar?.let { star ->
            val labelText = star.name ?: star.id
            if (labelText.isNotEmpty() && star.visible) {
                val labelY = star.screenY - getStarRadius(star.magnitude) - 20f
                
                // Draw label background
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
                
                // Draw label text
                canvas.drawText(labelText, star.screenX, labelY, labelPaint)
            }
        }

        // Update crosshair to use night mode color
        crosshairPaint.color = getNightModeColor()

        // Request next frame
        postInvalidateOnAnimation()
    }

    override fun onSensorChanged(event: SensorEvent) {
        if (event.sensor.type != Sensor.TYPE_ROTATION_VECTOR) return

        SensorManager.getRotationMatrixFromVector(rotationMatrix, event.values)

        // Remap for portrait orientation
        val remappedMatrix = FloatArray(9)
        SensorManager.remapCoordinateSystem(
            rotationMatrix,
            SensorManager.AXIS_X,
            SensorManager.AXIS_Z,
            remappedMatrix
        )

        SensorManager.getOrientation(remappedMatrix, orientationAngles)

        azimuth = Math.toDegrees(orientationAngles[0].toDouble()).toFloat()
        altitude = Math.toDegrees(orientationAngles[1].toDouble()).toFloat()

        // Normalize
        azimuth = ((azimuth % 360f) + 360f) % 360f
        altitude = altitude.coerceIn(-90f, 90f)

        // Smooth azimuth with wraparound handling
        var azDiff = azimuth - smoothAzimuth
        if (azDiff > 180) azDiff -= 360
        if (azDiff < -180) azDiff += 360
        smoothAzimuth = ((smoothAzimuth + smoothingFactor * azDiff) % 360f + 360f) % 360f

        // Smooth altitude
        smoothAltitude += smoothingFactor * (altitude - smoothAltitude)

        // View invalidation happens in onDraw via postInvalidateOnAnimation
    }

    override fun onAccuracyChanged(sensor: Sensor?, accuracy: Int) {}

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        startSensors()
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        stopSensors()
    }
}
