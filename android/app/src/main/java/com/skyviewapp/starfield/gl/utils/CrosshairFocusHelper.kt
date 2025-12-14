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
 * In OpenGL, the camera looks down -Z axis, so objects in front
 * of the camera have negative Z values in view space.
 */
object CrosshairFocusHelper {
    // Angular distance thresholds (in degrees from screen center)
    // Very tight focus: only show the constellation right at crosshair
    const val FULL_OPACITY_ANGLE = 15f    // Full opacity within this angle  
    const val FADE_OUT_ANGLE = 30f        // Fully faded beyond this angle
    
    // View matrix (set each frame)
    private val viewMatrix = FloatArray(16)
    
    // Cached constellation centers (in equatorial/world coordinates)
    private val constellationCenters = mutableMapOf<String, FloatArray>()
    
    // Cached transformed centers (in view space, updated each frame)
    private val transformedCenters = mutableMapOf<String, FloatArray>()
    
    /**
     * Update the view matrix. Called each frame before rendering.
     */
    fun updateViewMatrix(matrix: FloatArray) {
        System.arraycopy(matrix, 0, viewMatrix, 0, 16)
        
        // Transform all constellation centers to view space
        transformAllCenters()
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
            }
        }
    }
    
    /**
     * Get the angular distance (in degrees) from screen center to a constellation.
     * Uses the transformed (view-space) position.
     * 
     * In OpenGL view space:
     * - Camera is at origin looking down -Z axis
     * - Objects in front have z < 0
     * - Screen center corresponds to the -Z direction
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
        // Dot product with normalized view position
        // dot((x,y,z)/len, (0,0,-1)) = -z/len
        val forwardDot = -z / len
        
        // Convert to angle (0° = directly in front, 180° = directly behind)
        val angle = Math.toDegrees(acos(forwardDot.coerceIn(-1f, 1f).toDouble())).toFloat()
        
        return angle
    }
    
    /**
     * Calculate opacity for a constellation based on angular distance from crosshair.
     * Returns 1.0 for nearby, fading to 0.0 for distant.
     */
    fun getOpacity(constellationId: String): Float {
        val viewPos = transformedCenters[constellationId]
        
        // If no transform data yet, show everything
        if (viewPos == null) return 1f
        
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
     * Check if a constellation should be rendered at all.
     */
    fun isVisible(constellationId: String): Boolean {
        return getOpacity(constellationId) > 0.01f
    }
    
    /**
     * Clear all cached data.
     */
    fun clear() {
        constellationCenters.clear()
        transformedCenters.clear()
    }
}
