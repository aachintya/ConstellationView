package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import com.skyviewapp.starfield.gl.LineBuffer
import com.skyviewapp.starfield.gl.ShaderProgram

/**
 * Handles rendering of constellation lines connecting stars.
 * Manages line buffer and line rendering with proper blending.
 */
class ConstellationLineRenderer {
    private val lineBuffer = LineBuffer()
    
    private var lineVertices: FloatArray = FloatArray(0)
    private var lineVertexCount = 0
    private var linesNeedUpdate = false

    fun initialize() {
        lineBuffer.initialize()
    }

    fun setConstellationLines(vertices: FloatArray, count: Int) {
        lineVertices = vertices
        lineVertexCount = count
        linesNeedUpdate = true
    }

    fun render(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        nightModeIntensity: Float
    ) {
        val shader = shader ?: return
        if (lineVertexCount == 0) return

        // Update line buffer if needed
        if (linesNeedUpdate) {
            lineBuffer.uploadData(lineVertices, lineVertexCount)
            linesNeedUpdate = false
        }

        shader.use()

        // Set uniforms
        shader.setUniformMatrix4fv("u_MVP", vpMatrix)
        shader.setUniform4f("u_LineColor", 0.4f, 0.6f, 1f, 0.7f)  // Blue-ish
        shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)

        // Disable depth for lines
        GLES30.glDepthMask(false)

        lineBuffer.draw()

        GLES30.glDepthMask(true)
    }

    fun delete() {
        lineBuffer.delete()
    }
}
