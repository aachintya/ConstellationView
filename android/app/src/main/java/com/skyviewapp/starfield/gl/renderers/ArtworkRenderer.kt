package com.skyviewapp.starfield.gl.renderers

import android.opengl.GLES30
import android.util.Log
import com.skyviewapp.starfield.gl.ConstellationArtworkMesh
import com.skyviewapp.starfield.gl.GLTextureLoader
import com.skyviewapp.starfield.gl.ShaderProgram
import com.skyviewapp.starfield.gl.utils.CrosshairFocusHelper
import com.skyviewapp.starfield.models.ConstellationArt
import com.skyviewapp.starfield.models.Star

/**
 * Handles rendering of constellation artwork images anchored to celestial coordinates.
 * Uses crosshair-focused rendering: only shows artwork near view center.
 */
class ArtworkRenderer {
    companion object {
        private const val TAG = "ArtworkRenderer"
    }

    private val artworkMesh = ConstellationArtworkMesh()
    
    private var constellationArtworks: List<ConstellationArt> = emptyList()
    private val constellationTextures = mutableMapOf<String, Int>()
    private var starMap: Map<String, Star> = emptyMap()
    
    private var artworkDebugLogged = false

    fun initialize() {
        artworkMesh.initialize()
    }

    fun setConstellationArtworks(artworks: List<ConstellationArt>, stars: List<Star>) {
        constellationArtworks = artworks
        starMap = stars.associateBy { it.id }
        
        // Calculate centers for crosshair focus
        for (artwork in artworks) {
            val allHipIds = mutableListOf<Int>()
            // Collect all star HIP IDs from anchors and lines
            artwork.anchors.forEach { allHipIds.add(it.hipId) }
            artwork.lines.forEach { line -> allHipIds.addAll(line) }
            CrosshairFocusHelper.setConstellationCenterFromStars(artwork.id, allHipIds.distinct(), starMap)
        }
        
        Log.d(TAG, "Set ${artworks.size} artworks with crosshair focus centers")
    }

    fun loadTexture(textureLoader: GLTextureLoader, imageName: String, assetPath: String): Int {
        val textureId = textureLoader.loadTextureFromAssets(assetPath)
        if (textureId != 0) {
            constellationTextures[imageName] = textureId
            Log.d(TAG, "Loaded constellation texture: $imageName -> $textureId")
        }
        return textureId
    }

    fun setTexture(imageName: String, textureId: Int) {
        if (textureId != 0) {
            constellationTextures[imageName] = textureId
        }
    }

    fun render(
        shader: ShaderProgram?,
        textureLoader: GLTextureLoader,
        vpMatrix: FloatArray,
        artworkOpacity: Float,
        nightModeIntensity: Float,
        showConstellationArtwork: Boolean
    ) {
        if (!showConstellationArtwork) return
        val shader = shader ?: return
        if (constellationArtworks.isEmpty() || starMap.isEmpty()) {
            if (!artworkDebugLogged) {
                Log.d(TAG, "Artwork skip: artworks=${constellationArtworks.size}, stars=${starMap.size}")
            }
            return
        }
        
        shader.use()
        
        // Disable depth writing (artwork is behind stars)
        GLES30.glDepthMask(false)
        GLES30.glDisable(GLES30.GL_CULL_FACE)
        
        // Standard alpha blending
        GLES30.glBlendFunc(GLES30.GL_SRC_ALPHA, GLES30.GL_ONE_MINUS_SRC_ALPHA)
        
        var renderedCount = 0
        var skippedCount = 0
        for (artwork in constellationArtworks) {
            // Check crosshair focus - skip if too far from view center
            val focusOpacity = CrosshairFocusHelper.getOpacity(artwork.id)
            if (focusOpacity < 0.01f) {
                skippedCount++
                continue
            }
            
            val textureId = constellationTextures[artwork.imageName]
            if (textureId == null || textureId == 0) {
                if (!artworkDebugLogged) {
                    Log.d(TAG, "Artwork ${artwork.id}: no texture for ${artwork.imageName}")
                }
                continue
            }
            
            // Get anchor stars (need at least 3 for proper transformation)
            val anchors = artwork.anchors.mapNotNull { anchor ->
                val hipId = "HIP${anchor.hipId}"
                starMap[hipId]?.let { star -> 
                    Triple(anchor, star, floatArrayOf(star.x, star.y, star.z))
                }
            }
            
            if (anchors.size < 3) {
                if (!artworkDebugLogged) {
                    val missingHips = artwork.anchors.filter { starMap["HIP${it.hipId}"] == null }.map { it.hipId }
                    Log.d(TAG, "Artwork ${artwork.id}: only ${anchors.size}/3 anchors, missing: $missingHips")
                }
                continue
            }
            
            // Get 3D positions and texture coordinates
            val (a1, _, p1) = anchors[0]
            val (a2, _, p2) = anchors[1]
            val (a3, _, p3) = anchors[2]
            
            // Normalize texture coordinates (pixel coords to 0-1)
            // OpenGL texture V coordinate is flipped (0=bottom, 1=top)
            val imgW = artwork.imageSize.first.toFloat()
            val imgH = artwork.imageSize.second.toFloat()
            val t1 = floatArrayOf(a1.pixelX / imgW, 1f - a1.pixelY / imgH)
            val t2 = floatArrayOf(a2.pixelX / imgW, 1f - a2.pixelY / imgH)
            val t3 = floatArrayOf(a3.pixelX / imgW, 1f - a3.pixelY / imgH)
            
            // Scale 3D positions to place on celestial sphere
            val scale = 50f
            val sp1 = floatArrayOf(p1[0] * scale, p1[1] * scale, p1[2] * scale)
            val sp2 = floatArrayOf(p2[0] * scale, p2[1] * scale, p2[2] * scale)
            val sp3 = floatArrayOf(p3[0] * scale, p3[1] * scale, p3[2] * scale)
            
            // Update mesh with anchor positions
            artworkMesh.updateQuadFromAnchors(sp1, sp2, sp3, t1, t2, t3)
            
            // Combine base opacity with crosshair focus opacity
            val finalOpacity = artworkOpacity * focusOpacity
            
            // Set uniforms
            shader.setUniformMatrix4fv("u_MVP", vpMatrix)
            shader.setUniform1f("u_Opacity", finalOpacity)
            shader.setUniform1f("u_NightModeIntensity", nightModeIntensity)
            
            // Bind texture
            textureLoader.bindTexture(textureId, GLES30.GL_TEXTURE0)
            shader.setUniform1i("u_Texture", 0)
            
            // Draw
            artworkMesh.draw()
            renderedCount++
        }
        
        if (!artworkDebugLogged) {
            Log.d(TAG, "Artwork: rendered=$renderedCount, skipped=$skippedCount, total=${constellationArtworks.size}")
            artworkDebugLogged = true
        }
        
        // Restore state
        GLES30.glEnable(GLES30.GL_CULL_FACE)
        GLES30.glDepthMask(true)
    }

    fun delete() {
        artworkMesh.destroy()
    }
}
