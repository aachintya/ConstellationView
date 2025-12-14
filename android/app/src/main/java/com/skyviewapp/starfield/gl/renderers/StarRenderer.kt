package com.skyviewapp.starfield.gl.renderers

import android.util.Log
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.gl.StarBuffer
import com.skyviewapp.starfield.gl.animation.AnimationClock
import com.skyviewapp.starfield.gl.utils.GLStateManager
import com.skyviewapp.starfield.gl.utils.SpectralColorMapper
import com.skyviewapp.starfield.models.Star

/**
 * Handles rendering of stars in the sky view.
 * 
 * Modular architecture:
 * - Uses AnimationClock for twinkle animation timing
 * - Uses SpectralColorMapper for star colors
 * - Uses GLStateManager for OpenGL state
 * - Uses StarBuffer for GPU vertex data
 * 
 * @see AnimationClock for animation timing
 * @see SpectralColorMapper for spectral type to color conversion
 * @see GLStateManager for render state management
 */
class StarRenderer {
    companion object {
        private const val TAG = "StarRenderer"
    }
    
    // GPU buffer for star vertices
    private val starBuffer = StarBuffer()
    
    // Star data
    private var stars: List<Star> = emptyList()
    private var starsNeedUpdate = false
    
    // Animation clock for twinkle effect (can use shared or private)
    private val animationClock = AnimationClock()
    
    // Debug logging
    private var lastLogTime = 0L

    /**
     * Initialize the star renderer.
     * Must be called on the GL thread after context creation.
     */
    fun initialize() {
        starBuffer.initialize()
        animationClock.reset()
        Log.d(TAG, "StarRenderer initialized with modular architecture")
    }

    /**
     * Set the star data to render.
     * 
     * @param starList List of Star objects with positions, magnitudes, and spectral types
     */
    fun setStars(starList: List<Star>) {
        stars = starList
        starsNeedUpdate = true
    }

    /**
     * Get the current star list.
     */
    fun getStars(): List<Star> = stars

    /**
     * Render all stars with twinkle animation.
     * 
     * @param shader The star shader program
     * @param vpMatrix View-projection matrix
     * @param screenWidth Screen width in pixels
     * @param screenHeight Screen height in pixels
     * @param starBrightness Brightness multiplier (0-1)
     * @param nightModeIntensity Night mode red shift (0-1)
     */
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

        // Get animation time from clock
        val elapsedSeconds = animationClock.elapsedSeconds
        
        // Debug logging (throttled)
        logDebugInfo(elapsedSeconds)

        // Set shader uniforms
        setShaderUniforms(shader, vpMatrix, screenWidth, screenHeight, 
                          starBrightness, nightModeIntensity, elapsedSeconds)

        // Render with proper GL state
        GLStateManager.renderStars {
            starBuffer.draw()
        }
    }
    
    /**
     * Set all shader uniforms for star rendering.
     */
    private fun setShaderUniforms(
        shader: ShaderProgram,
        vpMatrix: FloatArray,
        screenWidth: Int,
        screenHeight: Int,
        starBrightness: Float,
        nightModeIntensity: Float,
        time: Float
    ) {
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        shader.setUniform1f("u_PointSizeBase", 8f + starBrightness * 12f)
        shader.setUniform1f("u_BrightnessMultiplier", 1.0f + starBrightness * 1.5f)
        shader.setUniform2f("u_ScreenSize", screenWidth.toFloat(), screenHeight.toFloat())
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
        shader.setUniform1f("u_Time", time)
    }
    
    /**
     * Log debug info periodically (every 2 seconds).
     */
    private fun logDebugInfo(elapsedSeconds: Float) {
        val currentMs = System.currentTimeMillis()
        if (currentMs - lastLogTime > 2000) {
            Log.d(TAG, "TWINKLE: u_Time = ${"%.2f".format(elapsedSeconds)}s, stars = ${stars.size}")
            lastLogTime = currentMs
        }
    }

    /**
     * Upload star vertex data to GPU.
     * Uses SpectralColorMapper for color conversion.
     */
    private fun uploadStarData() {
        if (stars.isEmpty()) return

        // Pack star data: [x, y, z, magnitude, r, g, b] per star
        val data = FloatArray(stars.size * 7)
        var index = 0

        for (star in stars) {
            // Position
            data[index++] = star.x
            data[index++] = star.y
            data[index++] = star.z
            data[index++] = star.magnitude

            // Color from spectral type using mapper
            val colorComponents = SpectralColorMapper.getColorComponents(star.spectralType)
            data[index++] = colorComponents[0]
            data[index++] = colorComponents[1]
            data[index++] = colorComponents[2]
        }

        starBuffer.uploadData(data, stars.size)
        Log.d(TAG, "Uploaded ${stars.size} stars to GPU")
    }
    
    /**
     * Pause the twinkle animation.
     */
    fun pauseAnimation() {
        animationClock.pause()
    }
    
    /**
     * Resume the twinkle animation.
     */
    fun resumeAnimation() {
        animationClock.resume()
    }
    
    /**
     * Reset the animation clock.
     */
    fun resetAnimation() {
        animationClock.reset()
    }

    /**
     * Clean up GPU resources.
     * Call when renderer is no longer needed.
     */
    fun delete() {
        starBuffer.delete()
        Log.d(TAG, "StarRenderer resources released")
    }
}
