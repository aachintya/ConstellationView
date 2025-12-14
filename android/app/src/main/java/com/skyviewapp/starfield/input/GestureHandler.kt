package com.skyviewapp.starfield.input

import android.content.Context
import android.util.Log
import android.view.MotionEvent
import android.view.ScaleGestureDetector
import android.view.View
import com.skyviewapp.starfield.models.Planet
import com.skyviewapp.starfield.models.Star
import kotlin.math.abs
import kotlin.math.sqrt

/**
 * Handles all touch gestures: drag, tap, pinch-to-zoom, and inertial scrolling
 */
class GestureHandler(
    context: Context,
    private val view: View,
    private val onFovChange: (Float) -> Unit,
    private val onOrientationChange: (azimuth: Float, altitude: Float) -> Unit,
    private val onStarTap: (Star?) -> Unit,
    private val onPlanetTap: (Planet?) -> Unit,
    private val getStars: () -> List<Star>,
    private val getPlanets: () -> List<Planet>,
    private val isGyroEnabled: () -> Boolean
) {
    // Touch tracking
    private var lastTouchX = 0f
    private var lastTouchY = 0f
    private var isDragging = false
    private val baseTouchSensitivity = 0.15f  // Base sensitivity at FOV 75°
    private val referenceFov = 75f             // FOV at which base sensitivity applies
    private var touchDownTime = 0L
    private val tapThreshold = 200L
    private val dragThreshold = 10f
    
    /**
     * Calculate effective touch sensitivity based on current FOV
     * When zoomed in (low FOV), sensitivity decreases for finer control
     * When zoomed out (high FOV), sensitivity increases
     */
    private fun getEffectiveSensitivity(): Float {
        // Linear scaling: sensitivity proportional to FOV
        // At FOV 75° = base sensitivity (0.15)
        // At FOV 30° = 0.06 (much finer control when zoomed in)
        // At FOV 150° = 0.30 (faster movement when zoomed out)
        val effectiveSens = baseTouchSensitivity * (currentFov / referenceFov)
        return effectiveSens.coerceIn(0.005f, 0.4f)  // Extended range for ultra-wide/deep zoom
    }

    // Drag interpolation targets
    private var targetAzimuth = 180f
    private var targetAltitude = 30f
    private val dragSmoothingFactor = 0.2f

    // Current smooth values (for interpolation)
    var smoothAzimuth = 180f
        private set
    var smoothAltitude = 30f
        private set

    // Zoom handling
    private var isScaling = false
    private var currentFov = 75f
    private var justEndedScaling = false  // Flag to ignore spurious drag after zoom
    
    // ============= Inertial Scrolling =============
    private var velocityAzimuth = 0f
    private var velocityAltitude = 0f
    private var lastMoveTime = 0L
    private val friction = 0.92f           // How fast it slows (lower = faster stop)
    private val minVelocity = 0.5f         // Stop when velocity is below this
    private val velocityScale = 0.8f       // Scale factor for velocity calculation
    private var isInertiaActive = false

    val scaleGestureDetector: ScaleGestureDetector = ScaleGestureDetector(
        context,
        object : ScaleGestureDetector.SimpleOnScaleGestureListener() {
            override fun onScaleBegin(detector: ScaleGestureDetector): Boolean {
                // Allow zoom even when gyro is enabled - zoom is independent of orientation
                isScaling = true
                Log.d("GestureHandler", "ZOOM: Scale begin, gyro=${isGyroEnabled()}")
                return true
            }

            override fun onScale(detector: ScaleGestureDetector): Boolean {
                if (isScaling) {
                    val rawScaleFactor = detector.scaleFactor
                    val oldFov = currentFov
                    
                    // ===== STELLARIUM-STYLE WEIGHTED ZOOM =====
                    // Apply resistance/damping to make zoom feel more solid
                    // 1. Dampen the scale factor (reduces "floaty" feeling)
                    // 2. Use logarithmic response at extreme zoom levels
                    // 3. Add slight resistance to prevent overshooting
                    
                    // Damping factor: 0.7 = more resistance, 1.0 = no resistance
                    val dampingFactor = 0.65f
                    val dampedScale = 1f + (rawScaleFactor - 1f) * dampingFactor
                    
                    // Extended FOV range: 0.1° (extreme zoom) to 150° (ultra-wide)
                    val minFov = 0.1f
                    val maxFov = 150f
                    
                    // Calculate new FOV with progressive resistance at extremes
                    val newFov = when {
                        currentFov < 1f -> {
                            // Extreme zoom - logarithmic response for precision
                            val logScale = Math.pow(dampedScale.toDouble(), 0.4).toFloat()
                            (currentFov / logScale).coerceIn(minFov, maxFov)
                        }
                        currentFov < 10f -> {
                            // Close zoom - moderate damping
                            val logScale = Math.pow(dampedScale.toDouble(), 0.6).toFloat()
                            (currentFov / logScale).coerceIn(minFov, maxFov)
                        }
                        currentFov < 30f -> {
                            // Medium zoom - slight damping
                            val logScale = Math.pow(dampedScale.toDouble(), 0.8).toFloat()
                            (currentFov / logScale).coerceIn(minFov, maxFov)
                        }
                        else -> {
                            // Wide view - full response but still damped
                            (currentFov / dampedScale).coerceIn(minFov, maxFov)
                        }
                    }
                    
                    // Smooth transition: interpolate toward target for extra weight
                    val smoothingFactor = 0.85f  // Higher = more lag/weight
                    currentFov = currentFov + (newFov - currentFov) * (1f - smoothingFactor) + 
                                 (newFov - currentFov) * smoothingFactor
                    
                    // Clamp final value
                    currentFov = currentFov.coerceIn(minFov, maxFov)
                    
                    // Debug logging
                    if (abs(oldFov - currentFov) > 0.05f || currentFov < 5f) {
                        Log.d("GestureHandler", "ZOOM: FOV ${oldFov.format(2)} -> ${currentFov.format(2)}, raw=${"%.3f".format(rawScaleFactor)}, damped=${"%.3f".format(dampedScale)}")
                    }
                    
                    onFovChange(currentFov)
                    return true
                }
                return false
            }

            override fun onScaleEnd(detector: ScaleGestureDetector) {
                Log.d("GestureHandler", "ZOOM: Scale end, final FOV=${currentFov.format(2)}")
                isScaling = false
                justEndedScaling = true  // Ignore the next drag event
            }
        }
    )
    
    private fun Float.format(decimals: Int) = "%.${decimals}f".format(this)

    fun setFov(fov: Float) {
        val oldFov = currentFov
        currentFov = fov
        if (kotlin.math.abs(oldFov - fov) > 1f) {
            Log.d("GestureHandler", "FOV SET: ${"%.1f".format(oldFov)}° -> ${"%.1f".format(fov)}°, " +
                "new sensitivity=${"%.4f".format(getEffectiveSensitivity())}")
        }
    }

    fun setOrientation(azimuth: Float, altitude: Float) {
        smoothAzimuth = azimuth
        smoothAltitude = altitude
        targetAzimuth = azimuth
        targetAltitude = altitude
    }

    /**
     * Handle touch events - returns true if consumed
     */
    fun handleTouchEvent(event: MotionEvent): Boolean {
        scaleGestureDetector.onTouchEvent(event)

        if (isScaling) return true

        when (event.actionMasked) {
            MotionEvent.ACTION_DOWN -> {
                touchDownTime = System.currentTimeMillis()
                lastTouchX = event.x
                lastTouchY = event.y
                lastMoveTime = touchDownTime
                isDragging = false
                justEndedScaling = false  // Reset flag on new touch
                // Stop any ongoing inertia when user touches
                velocityAzimuth = 0f
                velocityAltitude = 0f
                isInertiaActive = false
                if (!isGyroEnabled()) {
                    view.parent?.requestDisallowInterceptTouchEvent(true)
                }
                return true
            }

            MotionEvent.ACTION_MOVE -> {
                if (!isGyroEnabled() && !isScaling) {
                    // Skip spurious drag after zoom ends - just reset tracking
                    if (justEndedScaling) {
                        Log.d("GestureHandler", "DRAG IGNORED: Resetting after zoom end")
                        lastTouchX = event.x
                        lastTouchY = event.y
                        lastMoveTime = System.currentTimeMillis()
                        justEndedScaling = false
                        isDragging = false
                        return true
                    }
                    
                    val dx = event.x - lastTouchX
                    val dy = event.y - lastTouchY
                    val distance = sqrt(dx * dx + dy * dy)

                    if (distance > dragThreshold || isDragging) {
                        isDragging = true
                        
                        // Calculate time delta for velocity
                        val currentTime = System.currentTimeMillis()
                        val deltaTime = (currentTime - lastMoveTime).coerceAtLeast(1L)
                        lastMoveTime = currentTime
                        
                        // Get FOV-adjusted sensitivity (lower when zoomed in for finer control)
                        val sensitivity = getEffectiveSensitivity()
                        
                        // Calculate actual angular movement
                        val deltaAzimuth = -dx * sensitivity
                        val deltaAltitude = dy * sensitivity
                        
                        // DEBUG: Log drag details
                        Log.d("GestureHandler", "DRAG: FOV=${"%.1f".format(currentFov)}° " +
                            "sens=${"%.4f".format(sensitivity)} " +
                            "dx=${"%.1f".format(dx)} dy=${"%.1f".format(dy)} " +
                            "-> dAz=${"%.2f".format(deltaAzimuth)}° dAlt=${"%.2f".format(deltaAltitude)}°")
                        
                        // Track velocity (pixels per millisecond, scaled)
                        velocityAzimuth = deltaAzimuth * velocityScale * (1000f / deltaTime)
                        velocityAltitude = deltaAltitude * velocityScale * (1000f / deltaTime)
                        
                        // Apply rotation directly with sensitivity scaling
                        smoothAzimuth = ((smoothAzimuth + deltaAzimuth) % 360f + 360f) % 360f
                        smoothAltitude = (smoothAltitude + deltaAltitude).coerceIn(-90f, 90f)
                        
                        // Update targets to match (for external sync)
                        targetAzimuth = smoothAzimuth
                        targetAltitude = smoothAltitude

                        // Immediately update orientation for responsiveness
                        onOrientationChange(smoothAzimuth, smoothAltitude)

                        lastTouchX = event.x
                        lastTouchY = event.y
                    }
                    return true
                }
            }

            MotionEvent.ACTION_UP -> {
                view.parent?.requestDisallowInterceptTouchEvent(false)
                val touchDuration = System.currentTimeMillis() - touchDownTime

                if (touchDuration < tapThreshold && !isDragging) {
                    // Check for planet tap first
                    val tappedPlanet = findPlanetAt(event.x, event.y)
                    if (tappedPlanet != null) {
                        onPlanetTap(tappedPlanet)
                    } else {
                        // Check for star tap
                        val tappedStar = findStarAt(event.x, event.y)
                        onStarTap(tappedStar)
                    }
                    // Reset velocity on tap (no inertia)
                    velocityAzimuth = 0f
                    velocityAltitude = 0f
                } else if (isDragging && !isGyroEnabled()) {
                    // Start inertial scrolling if there's enough velocity
                    Log.d("GestureHandler", "ACTION_UP - velocity: az=$velocityAzimuth, alt=$velocityAltitude, gyro=${isGyroEnabled()}")
                    if (abs(velocityAzimuth) > minVelocity || abs(velocityAltitude) > minVelocity) {
                        isInertiaActive = true
                        Log.d("GestureHandler", "INERTIA STARTED - velocity above threshold ($minVelocity)")
                    } else {
                        Log.d("GestureHandler", "Inertia NOT started - velocity below threshold")
                    }
                }
                isDragging = false
                return true
            }

            MotionEvent.ACTION_CANCEL -> {
                view.parent?.requestDisallowInterceptTouchEvent(false)
                isDragging = false
                return true
            }
        }

        return false
    }

    private fun findStarAt(x: Float, y: Float): Star? {
        val searchRadius = 50f
        var closest: Star? = null
        var closestDist = Float.MAX_VALUE

        for (star in getStars()) {
            if (!star.visible) continue
            val dx = star.screenX - x
            val dy = star.screenY - y
            val dist = sqrt(dx * dx + dy * dy)
            if (dist < searchRadius && dist < closestDist) {
                closestDist = dist
                closest = star
            }
        }
        return closest
    }

    private fun findPlanetAt(x: Float, y: Float): Planet? {
        val searchRadius = 80f
        var closest: Planet? = null
        var closestDist = Float.MAX_VALUE

        for (planet in getPlanets()) {
            if (!planet.visible) continue
            val dx = planet.screenX - x
            val dy = planet.screenY - y
            val dist = sqrt(dx * dx + dy * dy)
            if (dist < searchRadius && dist < closestDist) {
                closestDist = dist
                closest = planet
            }
        }
        return closest
    }
    
    // ============= Inertial Scrolling Update =============
    
    /**
     * Update inertial scrolling - call this every frame from the render loop.
     * Returns true if inertia is still active and view needs updating.
     */
    fun updateInertia(): Boolean {
        if (!isInertiaActive || isGyroEnabled()) {
            return false
        }
        
        // Check if velocity is still significant
        if (abs(velocityAzimuth) < minVelocity && abs(velocityAltitude) < minVelocity) {
            Log.d("GestureHandler", "INERTIA STOPPED - velocity decayed below threshold")
            isInertiaActive = false
            velocityAzimuth = 0f
            velocityAltitude = 0f
            return false
        }
        
        // Apply velocity (scaled for ~60fps frame time)
        val frameTime = 0.016f  // Approximately 16ms per frame
        smoothAzimuth = ((smoothAzimuth + velocityAzimuth * frameTime) % 360f + 360f) % 360f
        smoothAltitude = (smoothAltitude + velocityAltitude * frameTime).coerceIn(-90f, 90f)
        
        // Update targets
        targetAzimuth = smoothAzimuth
        targetAltitude = smoothAltitude
        
        // Apply friction (exponential decay)
        velocityAzimuth *= friction
        velocityAltitude *= friction
        
        // Log every ~30 frames to avoid spam
        if ((System.currentTimeMillis() % 500) < 20) {
            Log.d("GestureHandler", "INERTIA UPDATE - vel: az=${velocityAzimuth.toInt()}, alt=${velocityAltitude.toInt()}")
        }
        
        // Notify listener
        onOrientationChange(smoothAzimuth, smoothAltitude)
        
        return true
    }
    
    /**
     * Check if inertia is currently active
     */
    fun isInertiaActive(): Boolean = isInertiaActive
    
    /**
     * Stop inertia immediately
     */
    fun stopInertia() {
        isInertiaActive = false
        velocityAzimuth = 0f
        velocityAltitude = 0f
    }
}
