package com.skyviewapp.starfield.gl.utils

import android.opengl.Matrix
import com.skyviewapp.starfield.models.Star
import kotlin.math.*

/**
 * Shared utility for crosshair-based visibility of constellations.
 * Used by both ArtworkRenderer and ConstellationLineRenderer.
 * 
 * Determines which constellations are near the center of the view
 * by transforming constellation centers through the view matrix.
 * 
 * Features smooth fade in/out animation using lerping.
 */
object CrosshairFocusHelper {
    // Angular distance thresholds (in degrees from screen center)
    // Very tight focus: only show the constellation right at crosshair
    private const val FULL_OPACITY_ANGLE = 15f    // Full opacity within this angle  
    private const val FADE_OUT_ANGLE = 30f        // Fully faded beyond this angle
    
    // Animation speed (higher = faster fade, 0.1 = slow, 0.3 = medium, 0.5 = fast)
    private const val FADE_IN_SPEED = 0.12f       // Speed when fading in (appearing)
    private const val FADE_OUT_SPEED = 0.08f      // Speed when fading out (disappearing) - slower for smooth exit
    
    // View matrix (set each frame)
    private val viewMatrix = FloatArray(16)
    
    // Cached constellation centers (in equatorial/world coordinates)
    private val constellationCenters = mutableMapOf<String, FloatArray>()
    
    // Cached transformed centers (in view space, updated each frame)
    private val transformedCenters = mutableMapOf<String, FloatArray>()
    
    // Animated opacity values (smoothly interpolated each frame)
    private val animatedOpacity = mutableMapOf<String, Float>()
    
    // Last frame time for delta time calculation
    private var lastFrameTime = System.nanoTime()
    
    /**
     * Update the view matrix. Called each frame before rendering.
     * Also updates animated opacities.
     */
    fun updateViewMatrix(matrix: FloatArray) {
        System.arraycopy(matrix, 0, viewMatrix, 0, 16)
        
        // Calculate delta time
        val currentTime = System.nanoTime()
        val deltaTime = (currentTime - lastFrameTime) / 1_000_000_000f  // Convert to seconds
        lastFrameTime = currentTime
        
        // Clamp delta time to prevent huge jumps (e.g., after pause)
        val clampedDelta = deltaTime.coerceIn(0f, 0.1f)
        
        // Transform all constellation centers to view space
        transformAllCenters()
        
        // Update animated opacities
        updateAnimatedOpacities(clampedDelta)
    }
    
    /**
     * Transform all constellation centers from world to view space.
     */
    private fun transformAllCenters() {
        for ((id, center) in constellationCenters) {
            val worldPos = floatArrayOf(center[0], center[1], center[2], 1f)
            val viewPos = FloatArray(4)
            Matrix.multiplyMV(viewPos, 0, viewMatrix, 0, worldPos, 0)
            transformedCenters[id] = floatArrayOf(viewPos[0], viewPos[1], viewPos[2])
        }
    }
    
    /**
     * Smoothly interpolate animated opacities toward target values.
     */
    private fun updateAnimatedOpacities(deltaTime: Float) {
        for (id in constellationCenters.keys) {
            val targetOpacity = calculateTargetOpacity(id)
            val currentOpacity = animatedOpacity[id] ?: 0f
            
            // Use different speeds for fading in vs fading out
            val speed = if (targetOpacity > currentOpacity) FADE_IN_SPEED else FADE_OUT_SPEED
            
            // Lerp factor based on delta time (frame-rate independent)
            // Using exponential smoothing: lerp = 1 - (1 - speed)^(deltaTime * 60)
            // This gives consistent animation speed regardless of frame rate
            val lerpFactor = 1f - (1f - speed).pow(deltaTime * 60f)
            
            // Interpolate toward target
            val newOpacity = currentOpacity + (targetOpacity - currentOpacity) * lerpFactor
            
            // Snap to target if very close (avoid floating point drift)
            animatedOpacity[id] = if (abs(newOpacity - targetOpacity) < 0.01f) {
                targetOpacity
            } else {
                newOpacity
            }
        }
    }
    
    /**
     * Calculate the target opacity based on angular distance (no animation).
     */
    private fun calculateTargetOpacity(constellationId: String): Float {
        val viewPos = transformedCenters[constellationId] ?: return 0f
        
        // Check if behind camera (positive Z in view space = behind camera)
        if (viewPos[2] > 0) return 0f
        
        val angle = getAngularDistance(constellationId)
        
        return when {
            angle <= FULL_OPACITY_ANGLE -> 1f
            angle >= FADE_OUT_ANGLE -> 0f
            else -> 1f - (angle - FULL_OPACITY_ANGLE) / (FADE_OUT_ANGLE - FULL_OPACITY_ANGLE)
        }
    }
    
    /**
     * Set constellation center directly from star map and HIP IDs.
     */
    fun setConstellationCenterFromStars(constellationId: String, hipIds: List<Int>, starMap: Map<String, Star>) {
        var sumX = 0f
        var sumY = 0f
        var sumZ = 0f
        var count = 0
        
        for (hipId in hipIds) {
            val star = starMap["HIP$hipId"]
            if (star != null) {
                sumX += star.x
                sumY += star.y
                sumZ += star.z
                count++
            }
        }
        
        if (count > 0) {
            val len = sqrt(sumX * sumX + sumY * sumY + sumZ * sumZ)
            if (len > 0.001f) {
                constellationCenters[constellationId] = floatArrayOf(sumX / len, sumY / len, sumZ / len)
                // Initialize animated opacity to 0 (will fade in)
                if (!animatedOpacity.containsKey(constellationId)) {
                    animatedOpacity[constellationId] = 0f
                }
            }
        }
    }
    
    /**
     * Get the angular distance (in degrees) from screen center to a constellation.
     * Uses the transformed (view-space) position.
     */
    private fun getAngularDistance(constellationId: String): Float {
        val viewPos = transformedCenters[constellationId] ?: return 180f
        
        val x = viewPos[0]
        val y = viewPos[1]  
        val z = viewPos[2]
        
        // Distance from origin in view space
        val len = sqrt(x * x + y * y + z * z)
        if (len < 0.001f) return 0f
        
        // Forward vector in view space is (0, 0, -1)
        // dot((x,y,z)/len, (0,0,-1)) = -z/len
        val forwardDot = -z / len
        
        // Convert to angle (0° = directly in front, 180° = directly behind)
        return Math.toDegrees(acos(forwardDot.coerceIn(-1f, 1f).toDouble())).toFloat()
    }
    
    /**
     * Get the smoothly animated opacity for a constellation.
     * Returns 1.0 for nearby (with smooth fade in), 0.0 for distant (with smooth fade out).
     */
    fun getOpacity(constellationId: String): Float {
        return animatedOpacity[constellationId] ?: 0f
    }
    
    /**
     * Check if a constellation should be rendered at all.
     */
    fun isVisible(constellationId: String): Boolean {
        return getOpacity(constellationId) > 0.01f
    }
    
    /**
     * Get the constellation with the highest opacity (i.e., closest to crosshair).
     * Returns the constellation ID if any has opacity > 0.5, else null.
     */
    fun getFocusedConstellation(): String? {
        var bestId: String? = null
        var bestOpacity = 0.5f  // Threshold for "focused" state
        
        for ((id, opacity) in animatedOpacity) {
            if (opacity > bestOpacity) {
                bestOpacity = opacity
                bestId = id
            }
        }
        
        return bestId
    }
    
    /**
     * Clear all cached data.
     */
    fun clear() {
        constellationCenters.clear()
        transformedCenters.clear()
        animatedOpacity.clear()
    }
}
