package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.util.Log
import com.skyviewapp.starfield.gl.LineBuffer
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.gl.utils.CrosshairFocusHelper
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star

/**
 * Handles rendering of constellation lines connecting stars.
 * Uses crosshair-focused rendering: only shows lines for constellations near view center.
 */
class ConstellationLineRenderer {
    companion object {
        private const val TAG = "ConstellationLineRenderer"
    }
    
    // Store lines per constellation
    private data class ConstellationLines(
        val id: String,
        val vertices: FloatArray,
        val vertexCount: Int
    )
    
    private val constellationLines = mutableListOf<ConstellationLines>()
    private val lineBuffer = LineBuffer()
    private var debugLogged = false

    fun initialize() {
        lineBuffer.initialize()
    }

    /**
     * Set constellation lines from artwork data (preferred method - preserves constellation grouping)
     */
    fun setConstellationLinesFromArtwork(artworks: List<ConstellationArt>, starMap: Map<String, Star>) {
        constellationLines.clear()
        
        for (artwork in artworks) {
            val vertices = mutableListOf<Float>()
            
            for (lineArray in artwork.lines) {
                if (lineArray.size < 2) continue
                
                for (i in 0 until lineArray.size - 1) {
                    val star1 = starMap["HIP${lineArray[i]}"]
                    val star2 = starMap["HIP${lineArray[i + 1]}"]
                    
                    if (star1 != null && star2 != null) {
                        vertices.addAll(listOf(star1.x, star1.y, star1.z, star2.x, star2.y, star2.z))
                    }
                }
            }
            
            if (vertices.isNotEmpty()) {
                constellationLines.add(ConstellationLines(
                    id = artwork.id,
                    vertices = vertices.toFloatArray(),
                    vertexCount = vertices.size / 3
                ))
            }
        }
        
        Log.d(TAG, "Built lines for ${constellationLines.size} constellations")
    }

    /**
     * Legacy method: set all lines at once (no crosshair focus)
     * @deprecated Use setConstellationLinesFromArtwork instead
     */
    fun setConstellationLines(vertices: FloatArray, count: Int) {
        // Legacy compatibility: treat as single constellation "ALL"
        constellationLines.clear()
        if (vertices.isNotEmpty()) {
            constellationLines.add(ConstellationLines(
                id = "ALL",
                vertices = vertices,
                vertexCount = count
            ))
        }
    }

    fun render(
        shader: ShaderProgram?,
        vpMatrix: FloatArray,
        nightModeIntensity: Float
    ) {
        val shader = shader ?: return
        if (constellationLines.isEmpty()) return

        shader.use()

        // Disable depth for lines
        GLES30.glDepthMask(false)
        
        var renderedCount = 0
        
        for (lines in constellationLines) {
            // Check crosshair focus
            val focusOpacity = CrosshairFocusHelper.getOpacity(lines.id)
            
            // Skip if too far from view center
            if (focusOpacity < 0.01f) {
                continue
            }
            
            // Upload line data
            lineBuffer.uploadData(lines.vertices, lines.vertexCount)
            
            // Set uniforms with focus-based alpha
            shader.setUniformMatrix4fv("u_MVP", vpMatrix)
            shader.setUniform4f("u_LineColor", 0.4f, 0.6f, 1f, 0.7f * focusOpacity)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)

            lineBuffer.draw()
            renderedCount++
        }
        
        if (!debugLogged && constellationLines.isNotEmpty()) {
            Log.d(TAG, "Rendered $renderedCount/${constellationLines.size} constellation lines (crosshair-focused)")
            debugLogged = true
        }

        GLES30.glDepthMask(true)
    }

    fun delete() {
        lineBuffer.delete()
    }
}
