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
    private val touchSensitivity = 0.15f
    private var touchDownTime = 0L
    private val tapThreshold = 200L
    private val dragThreshold = 10f

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
                if (!isGyroEnabled()) {
                    isScaling = true
                    return true
                }
                return false
            }

            override fun onScale(detector: ScaleGestureDetector): Boolean {
                if (!isGyroEnabled() && isScaling) {
                    currentFov = (currentFov / detector.scaleFactor).coerceIn(20f, 120f)
                    onFovChange(currentFov)
                    return true
                }
                return false
            }

            override fun onScaleEnd(detector: ScaleGestureDetector) {
                isScaling = false
            }
        }
    )

    fun setFov(fov: Float) {
        currentFov = fov
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
                    val dx = event.x - lastTouchX
                    val dy = event.y - lastTouchY
                    val distance = sqrt(dx * dx + dy * dy)

                    if (distance > dragThreshold || isDragging) {
                        isDragging = true
                        
                        // Calculate time delta for velocity
                        val currentTime = System.currentTimeMillis()
                        val deltaTime = (currentTime - lastMoveTime).coerceAtLeast(1L)
                        lastMoveTime = currentTime
                        
                        // Track velocity (pixels per millisecond, scaled)
                        velocityAzimuth = -dx * touchSensitivity * velocityScale * (1000f / deltaTime)
                        velocityAltitude = dy * touchSensitivity * velocityScale * (1000f / deltaTime)
                        
                        // Apply rotation directly with sensitivity scaling
                        smoothAzimuth = ((smoothAzimuth - dx * touchSensitivity) % 360f + 360f) % 360f
                        smoothAltitude = (smoothAltitude + dy * touchSensitivity).coerceIn(-90f, 90f)
                        
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
