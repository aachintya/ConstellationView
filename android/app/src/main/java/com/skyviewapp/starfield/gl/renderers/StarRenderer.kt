package com.skyviewapp.starfield.gl.renderers

import android.graphics.Color
import android.opengl.GLES30
import android.util.Log
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.gl.StarBuffer
import com.skyviewapp.starfield.models.Star

/**
 * Handles rendering of stars in the sky view.
 * Manages star buffer, data upload, and star rendering with proper blending.
 * Includes twinkle animation for realistic star appearance.
 */
class StarRenderer {
    companion object {
        private const val TAG = "StarRenderer"
    }
    
    private val starBuffer = StarBuffer()
    private var stars: List<Star> = emptyList()
    private var starsNeedUpdate = false
    
    // Time tracking for twinkle animation
    private var startTime = System.nanoTime()
    private var lastLogTime = 0L

    fun initialize() {
        starBuffer.initialize()
        startTime = System.nanoTime()
        Log.d(TAG, "StarRenderer initialized with twinkle animation support")
    }

    fun setStars(starList: List<Star>) {
        stars = starList
        starsNeedUpdate = true
    }

    fun getStars(): List<Star> = stars

    fun render(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        screenWidth: Int,
        screenHeight: Int,
        starBrightness: Float,
        nightModeIntensity: Float
    ) {
        val shader = shader ?: return
        if (stars.isEmpty()) return

        // Update star buffer if needed
        if (starsNeedUpdate) {
            uploadStarData()
            starsNeedUpdate = false
        }

        shader.use()

        // Calculate time in seconds for twinkle animation
        val currentTime = System.nanoTime()
        val elapsedSeconds = (currentTime - startTime) / 1_000_000_000f
        
        // Log twinkle time periodically (every 2 seconds)
        val currentMs = System.currentTimeMillis()
        if (currentMs - lastLogTime > 2000) {
            Log.d(TAG, "TWINKLE: u_Time = ${"%.2f".format(elapsedSeconds)}s, stars = ${stars.size}")
            lastLogTime = currentMs
        }

        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        shader.setUniform1f("u_PointSizeBase", 8f + starBrightness * 12f)
        shader.setUniform1f("u_BrightnessMultiplier", 1.0f + starBrightness * 1.5f)
        shader.setUniform2f("u_ScreenSize", screenWidth.toFloat(), screenHeight.toFloat())
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
        shader.setUniform1f("u_Time", elapsedSeconds)  // Time for twinkle animation

        // Disable depth writing for stars (they're all at infinity)
        GLES30.glDepthMask(false)

        // Additive blending for bright star glow
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE)

        starBuffer.draw()

        // Restore default blending
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        GLES30.glDepthMask(true)
    }

    private fun uploadStarData() {
        if (stars.isEmpty()) return

        // Pack star data: [x, y, z, magnitude, r, g, b] per star
        val data = FloatArray(stars.size * 7)
        var index = 0

        for (star in stars) {
            data[index++] = star.x
            data[index++] = star.y
            data[index++] = star.z
            data[index++] = star.magnitude

            // Convert spectral type to color
            val color = getStarColor(star.spectralType)
            data[index++] = Color.red(color) / 255f
            data[index++] = Color.green(color) / 255f
            data[index++] = Color.blue(color) / 255f
        }

        starBuffer.uploadData(data, stars.size)
    }

    private fun getStarColor(spectralType: String?): Int {
        return when (spectralType?.firstOrNull()?.uppercaseChar()) {
            'O' -> Color.rgb(155, 176, 255)  // Blue
            'B' -> Color.rgb(170, 191, 255)  // Blue-white
            'A' -> Color.rgb(202, 215, 255)  // White
            'F' -> Color.rgb(248, 247, 255)  // Yellow-white
            'G' -> Color.rgb(255, 244, 234)  // Yellow (Sun)
            'K' -> Color.rgb(255, 210, 161)  // Orange
            'M' -> Color.rgb(255, 204, 111)  // Red
            else -> Color.WHITE
        }
    }

    fun delete() {
        starBuffer.delete()
    }
}
