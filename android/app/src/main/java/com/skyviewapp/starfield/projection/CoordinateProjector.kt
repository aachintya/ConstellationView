package com.skyviewapp.starfield.projection

import android.opengl.Matrix
import kotlin.math.*

/**
 * Uses Android's Matrix class to match GLSkyRenderer EXACTLY
 */
class CoordinateProjector {
    
    var fov: Float = 75f
    var latitude: Float = 28.6f
    var longitude: Float = 77.2f
    var lst: Float = 0f
    
    var smoothAzimuth: Float = 180f
    var smoothAltitude: Float = 30f
    
    private var screenWidth: Float = 0f
    private var screenHeight: Float = 0f
    
    private val viewMatrix = FloatArray(16)
    private val projectionMatrix = FloatArray(16)
    private val vpMatrix = FloatArray(16)

    data class ScreenPosition(
        val x: Float,
        val y: Float,
        val visible: Boolean
    )

    fun setScreenSize(width: Int, height: Int) {
        screenWidth = width.toFloat()
        screenHeight = height.toFloat()
        updateProjectionMatrix()
    }
    
    private fun updateProjectionMatrix() {
        val aspectRatio = screenWidth / screenHeight
        Matrix.perspectiveM(projectionMatrix, 0, fov, aspectRatio, 0.1f, 100f)
    }
    
    private fun updateViewMatrix() {
        Matrix.setIdentityM(viewMatrix, 0)
        Matrix.rotateM(viewMatrix, 0, -smoothAltitude, 1f, 0f, 0f)
        Matrix.rotateM(viewMatrix, 0, -smoothAzimuth, 0f, 1f, 0f)
    }

    fun updateLst(simulatedTime: Long) {
        val jd = simulatedTime / 86400000.0 + 2440587.5
        val t = (jd - 2451545.0) / 36525.0
        var gmst = 280.46061837 + 360.98564736629 * (jd - 2451545.0) +
                0.000387933 * t * t - t * t * t / 38710000.0
        gmst = ((gmst % 360.0) + 360.0) % 360.0
        lst = ((gmst + longitude + 360.0) % 360.0).toFloat()
    }

    fun projectToScreen(x: Float, y: Float, z: Float): ScreenPosition {
        updateViewMatrix()
        Matrix.multiplyMM(vpMatrix, 0, projectionMatrix, 0, viewMatrix, 0)
        
        val pos = floatArrayOf(x, y, z, 1f)
        val result = FloatArray(4)
        Matrix.multiplyMV(result, 0, vpMatrix, 0, pos, 0)
        
        val w = result[3]
        if (w <= 0.001f) {
            return ScreenPosition(0f, 0f, false)
        }
        
        val ndcX = result[0] / w
        val ndcY = result[1] / w
        val ndcZ = result[2] / w
        
        if (ndcZ > 1f || ndcZ < -1f) {
            return ScreenPosition(0f, 0f, false)
        }
        
        val screenX = (ndcX + 1f) * 0.5f * screenWidth
        val screenY = (1f - ndcY) * 0.5f * screenHeight
        
        val margin = 100f
        if (screenX < -margin || screenX > screenWidth + margin ||
            screenY < -margin || screenY > screenHeight + margin) {
            return ScreenPosition(screenX, screenY, false)
        }

        return ScreenPosition(screenX, screenY, true)
    }
    
    fun getScale(): Float {
        val fovRad = Math.toRadians(fov.toDouble())
        return (screenWidth / (2 * tan(fovRad / 2))).toFloat()
    }
}
