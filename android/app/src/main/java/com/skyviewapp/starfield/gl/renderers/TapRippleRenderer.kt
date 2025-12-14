package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import com.skyviewapp.starfield.gl.LineBuffer
import com.skyviewapp.starfield.gl.ShaderProgram

/**
 * Handles rendering of the tap ripple effect - an expanding ring animation
 * shown when the user taps on a star or planet.
 */
class TapRippleRenderer {
    private var rippleLineBuffer: LineBuffer? = null
    
    // Tap ripple effect state
    private var tapRippleActive = false
    private var tapRippleX = 0f
    private var tapRippleY = 0f
    private var tapRippleZ = 0f
    private var tapRippleProgress = 0f
    private var tapRippleStartTime = 0L
    private val tapRippleDuration = 400L // milliseconds

    /**
     * Trigger a new tap ripple animation at the specified celestial coordinates.
     */
    fun trigger(x: Float, y: Float, z: Float) {
        tapRippleX = x
        tapRippleY = y
        tapRippleZ = z
        tapRippleProgress = 0f
        tapRippleStartTime = System.currentTimeMillis()
        tapRippleActive = true
    }

    fun render(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        nightModeIntensity: Float
    ) {
        if (!tapRippleActive) return
        
        val shader = shader ?: return
        
        // Initialize ripple buffer if needed
        if (rippleLineBuffer == null) {
            rippleLineBuffer = LineBuffer()
            rippleLineBuffer?.initialize()
        }
        
        // Calculate progress (0 to 1)
        val elapsed = System.currentTimeMillis() - tapRippleStartTime
        tapRippleProgress = elapsed.toFloat() / tapRippleDuration.toFloat()
        
        if (tapRippleProgress >= 1f) {
            tapRippleActive = false
            return
        }
        
        // Ease out the animation
        val easeOut = 1f - (1f - tapRippleProgress) * (1f - tapRippleProgress)
        
        // Ring expands from 0.01 to 0.05 radius (smaller, more subtle)
        val radius = 0.01f + easeOut * 0.04f
        
        // Opacity fades out
        val alpha = 1f - easeOut
        
        shader.use()
        
        // Generate ring vertices around the tap point
        val segments = 32
        val ringVertices = FloatArray(segments * 2 * 3) // line segments * 2 points * 3 coords
        
        for (i in 0 until segments) {
            val angle1 = (i.toFloat() / segments) * 2f * Math.PI.toFloat()
            val angle2 = ((i + 1).toFloat() / segments) * 2f * Math.PI.toFloat()
            
            // Calculate perpendicular vectors to the tap direction
            val tapDir = floatArrayOf(tapRippleX, tapRippleY, tapRippleZ)
            val len = kotlin.math.sqrt(tapDir[0]*tapDir[0] + tapDir[1]*tapDir[1] + tapDir[2]*tapDir[2])
            if (len > 0) {
                tapDir[0] /= len; tapDir[1] /= len; tapDir[2] /= len
            }
            
            // Create orthogonal basis (tangent vectors)
            val up = if (kotlin.math.abs(tapDir[1]) < 0.9f) floatArrayOf(0f, 1f, 0f) else floatArrayOf(1f, 0f, 0f)
            val tangent1 = floatArrayOf(
                up[1] * tapDir[2] - up[2] * tapDir[1],
                up[2] * tapDir[0] - up[0] * tapDir[2],
                up[0] * tapDir[1] - up[1] * tapDir[0]
            )
            val t1Len = kotlin.math.sqrt(tangent1[0]*tangent1[0] + tangent1[1]*tangent1[1] + tangent1[2]*tangent1[2])
            tangent1[0] /= t1Len; tangent1[1] /= t1Len; tangent1[2] /= t1Len
            
            val tangent2 = floatArrayOf(
                tapDir[1] * tangent1[2] - tapDir[2] * tangent1[1],
                tapDir[2] * tangent1[0] - tapDir[0] * tangent1[2],
                tapDir[0] * tangent1[1] - tapDir[1] * tangent1[0]
            )
            
            // Points on the ring
            val scale = 50f // Same scale as stars
            val idx = i * 6
            ringVertices[idx + 0] = (tapDir[0] + radius * (tangent1[0] * kotlin.math.cos(angle1) + tangent2[0] * kotlin.math.sin(angle1))) * scale
            ringVertices[idx + 1] = (tapDir[1] + radius * (tangent1[1] * kotlin.math.cos(angle1) + tangent2[1] * kotlin.math.sin(angle1))) * scale
            ringVertices[idx + 2] = (tapDir[2] + radius * (tangent1[2] * kotlin.math.cos(angle1) + tangent2[2] * kotlin.math.sin(angle1))) * scale
            ringVertices[idx + 3] = (tapDir[0] + radius * (tangent1[0] * kotlin.math.cos(angle2) + tangent2[0] * kotlin.math.sin(angle2))) * scale
            ringVertices[idx + 4] = (tapDir[1] + radius * (tangent1[1] * kotlin.math.cos(angle2) + tangent2[1] * kotlin.math.sin(angle2))) * scale
            ringVertices[idx + 5] = (tapDir[2] + radius * (tangent1[2] * kotlin.math.cos(angle2) + tangent2[2] * kotlin.math.sin(angle2))) * scale
        }
        
        // Upload and draw
        rippleLineBuffer?.uploadData(ringVertices, segments * 2)
        
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        
        // Cyan color with fading alpha (shifts to red in night mode)
        val r = 0.31f + nightModeIntensity * 0.69f
        val g = 0.76f * (1f - nightModeIntensity)
        val b = 0.97f * (1f - nightModeIntensity)
        shader.setUniform4f("u_Color", r, g, b, alpha * 0.8f)
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
        
        GLES30.glLineWidth(2.5f)
        rippleLineBuffer?.draw()
    }

    fun delete() {
        rippleLineBuffer?.delete()
    }
}
