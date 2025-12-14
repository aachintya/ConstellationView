package com.skyviewapp.starfield.managers

import android.content.Context
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.util.Log
import com.skyviewapp.starfield.GLSkyView
import com.skyviewapp.starfield.rendering.OverlayView

/**
 * Manages texture loading for constellations
 * Handles both Canvas (overlay) and OpenGL textures
 */
class TextureManager(
    private val context: Context,
    private val glSkyView: GLSkyView,
    private val overlayView: OverlayView
) {
    companion object {
        private const val TAG = "TextureManager"
        
        private val CONSTELLATION_ASSETS = listOf(
            "leo", "aries", "taurus", "gemini", "cancer",
            "virgo", "libra", "scorpius", "sagittarius", "ursa-major"
        )
    }

    /**
     * Load all constellation textures for both Canvas and GL rendering
     */
    fun loadConstellationTextures() {
        val textures = mutableMapOf<String, Bitmap>()
        val assetManager = context.assets

        for (name in CONSTELLATION_ASSETS) {
            try {
                val inputStream = assetManager.open("constellations/$name.png")
                val bitmap = BitmapFactory.decodeStream(inputStream)
                inputStream.close()

                if (bitmap != null) {
                    textures[name] = bitmap
                    Log.d(TAG, "Loaded texture: $name (${bitmap.width}x${bitmap.height})")
                    glSkyView.loadConstellationTexture(name, "constellations/$name.png")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Failed to load texture: $name - ${e.message}")
            }
        }

        overlayView.setConstellationTextures(textures)
        Log.d(TAG, "Loaded ${textures.size} constellation textures")
    }
}
